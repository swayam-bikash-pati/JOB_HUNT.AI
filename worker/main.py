"""
Worker main entry point — orchestrates the full job processing pipeline.

This is what GitHub Actions runs on a schedule. It:
  1. Fetches jobs from all configured sources
  2. Deduplicates
  3. Saves new jobs to Supabase
  4. Generates embeddings (Sprint 4)
  5. Runs matching engine (Sprint 4)
  6. AI analysis for high-scoring jobs (Sprint 5)
  7. Creates notifications for shortlisted jobs (Sprint 6)
  8. Logs execution summary

Designed to be idempotent — safe to run multiple times.
One failed source does NOT stop the rest of the pipeline.
"""
import asyncio
import uuid
from datetime import datetime, timezone

from worker.config.settings import settings
from worker.discovery.source_registry import load_sources
from worker.deduplication.dedup_engine import DedupEngine
from worker.database.db_client import DatabaseClient
from worker.cost_guard.cost_guard import CostGuard


async def run_pipeline():
    """Execute the full job discovery and processing pipeline."""
    execution_id = f"worker-{uuid.uuid4().hex[:8]}"
    started_at = datetime.now(timezone.utc)

    print(f"\n{'='*60}")
    print(f"JOB WORKER #{execution_id}")
    print(f"Started: {started_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"{'='*60}\n")

    # Validate settings
    errors = settings.validate()
    if errors:
        print("[Worker] Configuration errors:")
        for err in errors:
            print(f"  ✗ {err}")
        print("[Worker] Aborting.")
        return

    # Initialize
    db = DatabaseClient()
    cost_guard = CostGuard(db)
    cost_guard.initialize()

    # Create execution log
    log_entry = db.create_execution_log(execution_id)
    log_id = log_entry["id"] if log_entry else None

    # Stats
    stats = {
        "sources_tried": 0,
        "sources_succeeded": 0,
        "jobs_discovered": 0,
        "jobs_duplicates": 0,
        "jobs_new": 0,
        "jobs_processed": 0,
        "errors": 0,
        "error_details": [],
    }

    # ================================================================
    # Step 1: Load source adapters
    # ================================================================
    print("[Step 1] Loading job sources...")
    adapters = load_sources()

    if not adapters:
        print("[Worker] No sources configured. Nothing to do.")
        return

    # ================================================================
    # Step 2: Load existing job identifiers for dedup
    # ================================================================
    print("[Step 2] Loading existing jobs for dedup...")
    hashes, source_ids, urls = db.get_existing_job_identifiers()
    dedup = DedupEngine(
        existing_hashes=hashes,
        existing_source_ids=source_ids,
        existing_urls=urls,
    )
    print(f"  Loaded {len(hashes)} hashes, {len(source_ids)} source IDs, {len(urls)} URLs")

    # ================================================================
    # Step 3: Fetch jobs from all sources
    # ================================================================
    print("[Step 3] Fetching jobs from sources...")
    all_jobs = []

    for adapter in adapters:
        source_name = adapter.get_source_name()
        stats["sources_tried"] += 1

        try:
            print(f"  Fetching from {source_name}...")
            jobs = await adapter.fetch_jobs()
            all_jobs.extend(jobs)
            stats["sources_succeeded"] += 1
            print(f"  ✓ {source_name}: {len(jobs)} jobs found")
        except Exception as e:
            stats["errors"] += 1
            stats["error_details"].append({
                "source": source_name,
                "error": str(e),
            })
            print(f"  ✗ {source_name} failed: {e}")
            # Continue with other sources — don't stop the pipeline
            continue

    stats["jobs_discovered"] = len(all_jobs)
    print(f"\n  Total jobs discovered: {stats['jobs_discovered']}")

    # ================================================================
    # Step 4: Deduplicate and save new jobs
    # ================================================================
    print("\n[Step 4] Deduplicating and saving...")
    new_jobs = []

    for job in all_jobs:
        if dedup.is_duplicate(job):
            stats["jobs_duplicates"] += 1
            continue

        # Compute content hash for the DB
        content_hash = DedupEngine.compute_content_hash(job)

        # Save to database
        result = db.insert_job(job, content_hash)
        if result:
            new_jobs.append(result)
            stats["jobs_new"] += 1

    stats["jobs_duplicates"] += dedup.duplicates_found - stats["jobs_duplicates"]
    print(f"  New jobs saved: {stats['jobs_new']}")
    print(f"  Duplicates skipped: {stats['jobs_duplicates']}")

    # ================================================================
    # Step 5: Embeddings
    # ================================================================
    print("\n[Step 5] Generating embeddings for new jobs...")
    embedding_service = None
    try:
        from worker.embeddings.embedding_service import EmbeddingService
        embedding_service = EmbeddingService(settings.EMBEDDING_MODEL)
        for job_record in new_jobs:
            try:
                emb = embedding_service.embed_job(job_record)
                db.upsert_job_embedding(job_record["id"], emb, settings.EMBEDDING_MODEL)
            except Exception as e:
                print(f"  Failed embedding for {job_record.get('id')}: {e}")
    except Exception as e:
        print(f"  Embedding service not available or skipped: {e}")

    # ================================================================
    # Step 6: Matching & Ranking across all users
    # ================================================================
    print("\n[Step 6] Running matching engine across users...")
    from worker.matching.match_engine import MatchEngine
    from worker.ranking.ranker import Ranker
    from worker.notifications.notifier import Notifier
    from worker.ai.provider_factory import get_ai_provider

    notifier = Notifier(db)
    ai_provider = get_ai_provider() if settings.ai_enabled() and cost_guard.check_ai_budget() else None

    users = db.get_all_users()
    print(f"  Matching against {len(users)} user profiles...")

    for user in users:
        user_id = user["user_id"]
        threshold = user.get("minimum_match_score") or settings.MINIMUM_MATCH_SCORE
        user_skills = db.get_user_skills(user_id)
        user_projects = db.get_user_projects(user_id)
        user_resumes = db.get_user_resumes(user_id)

        match_engine = MatchEngine(minimum_score=threshold)

        user_vec = None
        if embedding_service:
            try:
                user_vec = embedding_service.embed_profile(user, user_skills, user_projects)
            except Exception:
                user_vec = None

        for job_record in new_jobs:
            if not match_engine.passes_hard_filters(job_record, user):
                continue

            semantic_sim = 0.0
            if user_vec and embedding_service:
                try:
                    job_vec = embedding_service.embed_job(job_record)
                    semantic_sim = embedding_service.cosine_similarity(user_vec, job_vec)
                except Exception:
                    pass

            match_res = match_engine.calculate_match(
                job=job_record,
                profile=user,
                user_skills=user_skills,
                user_projects=user_projects,
                semantic_score=semantic_sim,
            )

            freshness = Ranker.calculate_freshness(job_record.get("posted_at"))
            rank_score = Ranker.calculate_rank_score(match_res["final_score"], freshness)

            match_row = {
                "job_id": job_record["id"],
                "user_id": user_id,
                "skill_score": match_res["skill_score"],
                "experience_score": match_res["experience_score"],
                "role_score": match_res["role_score"],
                "project_score": match_res["project_score"],
                "location_score": match_res["location_score"],
                "education_score": match_res["education_score"],
                "semantic_score": match_res["semantic_score"],
                "freshness_score": freshness,
                "final_score": match_res["final_score"],
                "rank_score": rank_score,
                "matching_skills": match_res["matching_skills"],
                "missing_skills": match_res["missing_skills"],
                "explanation": match_res["explanation"],
            }
            db.upsert_job_match(match_row)

            # High match action
            if match_res["final_score"] >= threshold:
                stats["jobs_shortlisted"] = stats.get("jobs_shortlisted", 0) + 1
                db.update_job_status(job_record["id"], "shortlisted")

                notifier.notify_new_match(
                    user_id=user_id,
                    job_id=job_record["id"],
                    job_title=job_record["title"],
                    company=job_record["company"],
                    match_score=match_res["final_score"],
                    matching_skills=match_res["matching_skills"],
                    missing_skills=match_res["missing_skills"],
                )

                # ====================================================
                # Step 7: Application Prep via AI (if budget permits)
                # ====================================================
                if ai_provider and cost_guard.check_ai_budget():
                    try:
                        cover_letter = await ai_provider.generate_cover_letter(
                            job_title=job_record["title"],
                            company=job_record["company"],
                            job_description=job_record.get("description", ""),
                            candidate_name=user.get("full_name", ""),
                            candidate_skills=[s["name"] for s in user_skills],
                            candidate_experience=user.get("experience_level", ""),
                            relevant_projects=[p["name"] for p in user_projects],
                        )
                        cost_guard.record_ai_call(
                            provider=ai_provider.get_provider_name(),
                            operation="generate_cover_letter",
                            tokens_in=len(job_record.get("description", "")),
                            tokens_out=len(cover_letter),
                            model=getattr(ai_provider, "model_name", "default"),
                            success=True,
                        )
                        stats["ai_requests"] = stats.get("ai_requests", 0) + 1

                        db.create_application({
                            "user_id": user_id,
                            "job_id": job_record["id"],
                            "status": "shortlisted",
                            "cover_letter": cover_letter,
                            "notes": f"Auto-prepared application. Match score: {match_res['final_score']}%",
                        })
                    except Exception as e:
                        print(f"  AI application prep skipped/failed: {e}")

    stats["jobs_processed"] = stats["jobs_new"]

    # ================================================================
    # Print Summary
    # ================================================================
    ended_at = datetime.now(timezone.utc)
    duration = (ended_at - started_at).total_seconds()

    print(f"\n{'='*60}")
    print(f"JOB WORKER #{execution_id} — COMPLETE")
    print(f"{'='*60}")
    print(f"  Duration:        {duration:.1f}s")
    print(f"  Sources Tried:   {stats['sources_tried']}")
    print(f"  Sources OK:      {stats['sources_succeeded']}")
    print(f"  Jobs Discovered: {stats['jobs_discovered']}")
    print(f"  Duplicates:      {stats['jobs_duplicates']}")
    print(f"  New Jobs Saved:  {stats['jobs_new']}")
    print(f"  Errors:          {stats['errors']}")
    print(f"  Status:          {'SUCCESS' if stats['errors'] == 0 else 'PARTIAL_FAILURE'}")
    print(f"{'='*60}\n")

    # Cost guard report
    cost_guard.print_report()

    # Update execution log
    if log_id:
        db.update_execution_log(log_id, {
            "ended_at": ended_at.isoformat(),
            "jobs_discovered": stats["jobs_discovered"],
            "jobs_processed": stats["jobs_processed"],
            "jobs_duplicates": stats["jobs_duplicates"],
            "jobs_shortlisted": 0,  # Future: from matching
            "ai_requests": 0,       # Future: from cost_guard
            "errors": stats["errors"],
            "error_details": stats["error_details"],
            "status": "success" if stats["errors"] == 0 else "partial_failure",
        })


def main():
    """Entry point for `python -m worker.main`."""
    asyncio.run(run_pipeline())


if __name__ == "__main__":
    main()
