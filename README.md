# JobHunter AI

**AI-powered job discovery & application assistant — ₹0 cost architecture.**

## What it does

```
Discover → Deduplicate → Filter → Embed → Match → Rank → Notify → Prepare Application → Track
```

JobHunter AI continuously finds relevant AI/ML, Data Science, and Software Engineering jobs from multiple sources, matches them against your profile, and prepares high-quality application materials — all while your PC is off.

## Architecture

| Component | Technology | Cost |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS | Netlify Free |
| Database | PostgreSQL + pgvector | Supabase Free |
| Auth | Supabase Auth | Free |
| Storage | Supabase Storage | Free |
| Worker | Python (scheduled) | GitHub Actions Free |
| AI | Configurable (Gemini / Ollama / etc.) | Free tier |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Open source |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) account (free)
- A [Netlify](https://netlify.com) account (free)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/YOUR_USERNAME/jobhunt.git
   cd jobhunt
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Fill in your Supabase credentials
   ```

3. **Run database migration**
   - Go to Supabase Dashboard → SQL Editor
   - Paste and run `supabase/migrations/001_initial_schema.sql`

4. **Start the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Run the worker locally**
   ```bash
   cd worker
   pip install -r requirements.txt
   python -m worker.main
   ```

## Project Structure

```
jobhunt/
├── frontend/          # Next.js dashboard
├── worker/            # Python job discovery worker
├── supabase/          # Database migrations
├── .github/workflows/ # GitHub Actions (scheduled worker)
└── tests/             # Test suite
```

## License

MIT
