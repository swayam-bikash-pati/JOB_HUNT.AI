import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { extractText } from "unpdf";

// 100+ Known Tech Skills to extract
const KNOWN_SKILLS = [
  // Languages
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP",
  "Swift", "Kotlin", "Scala", "R", "SQL", "HTML", "CSS", "Bash", "Shell",
  // ML & AI
  "PyTorch", "TensorFlow", "Keras", "scikit-learn", "Pandas", "NumPy", "OpenCV",
  "Hugging Face", "LangChain", "NLP", "Natural Language Processing", "Computer Vision",
  "Deep Learning", "Machine Learning", "LLM", "Transformers", "BERT", "GPT", "RAG",
  "XGBoost", "LightGBM", "NLTK", "spaCy", "MLOps",
  // Web & Backend Frameworks
  "React", "Next.js", "Node.js", "Express", "FastAPI", "Django", "Flask",
  "Spring Boot", "Angular", "Vue", "NestJS", "TailwindCSS", "Redux", "GraphQL", "REST API",
  // Cloud & DevOps
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD", "Git", "GitHub",
  "GitLab", "Linux", "Kafka", "RabbitMQ", "Airflow", "Datadog",
  // Databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Supabase", "Firebase",
  "DynamoDB", "Cassandra", "SQLite"
];

// Target Roles keywords
const COMMON_ROLES = [
  "Software Engineer", "Machine Learning Engineer", "AI Engineer",
  "Data Scientist", "Data Analyst", "Data Engineer", "Frontend Developer",
  "Backend Developer", "Full Stack Developer", "DevOps Engineer", "Cloud Engineer"
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filePath, resumeId } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: "filePath is required" }, { status: 400 });
    }

    // 1. Download PDF from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: downloadError?.message || "Failed to download resume file" },
        { status: 500 }
      );
    }

    // 2. Parse text from PDF using unpdf
    const arrayBuffer = await fileData.arrayBuffer();
    const { text: extractedPages } = await extractText(new Uint8Array(arrayBuffer));
    const resumeText = Array.isArray(extractedPages)
      ? extractedPages.join("\n")
      : (extractedPages || "");

    // 3. Extract Skills
    const extractedSkills: string[] = [];
    for (const skill of KNOWN_SKILLS) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(resumeText)) {
        extractedSkills.push(skill);
      }
    }

    // 4. Extract Target Roles
    const detectedRoles: string[] = [];
    for (const role of COMMON_ROLES) {
      const regex = new RegExp(`\\b${role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(resumeText)) {
        detectedRoles.push(role);
      }
    }

    // 5. Extract Phone
    const phoneMatch = resumeText.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{4,10}/);
    const extractedPhone = phoneMatch ? phoneMatch[0].trim() : "";

    // 6. Experience Level heuristic
    let expLevel = "fresher";
    const expMatch = resumeText.match(/(\d+)\s*(?:\+)?\s*(?:years|yrs)/i);
    if (expMatch) {
      const yrs = parseInt(expMatch[1], 10);
      if (yrs >= 5) expLevel = "senior";
      else if (yrs >= 2) expLevel = "mid";
      else if (yrs >= 1) expLevel = "junior";
    }

    // 7. Update profiles table
    const profileUpdates: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (extractedPhone) profileUpdates.phone = extractedPhone;
    if (detectedRoles.length > 0) profileUpdates.target_roles = detectedRoles;
    profileUpdates.experience_level = expLevel;

    await supabase.from("profiles").update(profileUpdates).eq("user_id", user.id);

    // 8. Insert extracted skills into skills table
    if (extractedSkills.length > 0) {
      const skillRows = extractedSkills.map((s) => ({
        user_id: user.id,
        name: s,
        category: "general",
        proficiency: "intermediate",
      }));

      await supabase.from("skills").upsert(skillRows, { onConflict: "user_id,name" });
    }

    // 9. Save extracted skills onto resumes table if resumeId provided
    if (resumeId) {
      await supabase
        .from("resumes")
        .update({ extracted_skills: extractedSkills })
        .eq("id", resumeId);
    }

    return NextResponse.json({
      success: true,
      skills: extractedSkills,
      roles: detectedRoles,
      phone: extractedPhone,
      experienceLevel: expLevel,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error parsing resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
