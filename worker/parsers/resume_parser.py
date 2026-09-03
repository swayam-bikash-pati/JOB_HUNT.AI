"""
Resume PDF parser — extracts text from uploaded PDFs.

Uses PyMuPDF (fitz) for PDF text extraction (free, no external API).
Text can then be fed to an AI provider for structured data extraction.
"""
import re
from typing import Optional

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False


class ResumeParser:
    """Parse PDF resumes and extract structured information."""

    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes) -> str:
        """
        Extract all text from a PDF file.

        Args:
            pdf_bytes: Raw PDF file bytes.

        Returns:
            Extracted text content.
        """
        if not PYMUPDF_AVAILABLE:
            raise ImportError(
                "PyMuPDF not installed. Run: pip install PyMuPDF"
            )

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []

        for page in doc:
            text_parts.append(page.get_text())

        doc.close()
        return "\n".join(text_parts)

    @staticmethod
    def extract_skills_basic(text: str) -> list[str]:
        """
        Basic regex-based skill extraction (fallback when AI is unavailable).

        This is NOT as good as AI extraction but works without any API.
        """
        # Common tech skills to look for
        known_skills = [
            # Programming languages
            "Python", "Java", "JavaScript", "TypeScript", "C\\+\\+", "C#",
            "Go", "Rust", "Scala", "Kotlin", "Ruby", "PHP", "Swift", "R",
            "SQL", "Bash", "Shell",

            # ML/AI
            "TensorFlow", "PyTorch", "Keras", "scikit-learn", "sklearn",
            "OpenCV", "Hugging Face", "LangChain", "NLTK", "spaCy",
            "XGBoost", "LightGBM", "Pandas", "NumPy", "SciPy",
            "Matplotlib", "Seaborn",

            # Frameworks
            "React", "Next\\.js", "Node\\.js", "Express", "Django", "Flask",
            "FastAPI", "Spring", "Angular", "Vue",

            # Cloud
            "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
            "Lambda", "S3", "EC2", "SageMaker",

            # Databases
            "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
            "DynamoDB", "Cassandra", "Firebase", "Supabase",

            # Tools
            "Git", "GitHub", "GitLab", "Jira", "Jenkins", "CI/CD",
            "Linux", "Kafka", "RabbitMQ", "Airflow",

            # ML concepts
            "NLP", "Computer Vision", "Deep Learning", "Machine Learning",
            "Reinforcement Learning", "GANs", "Transformers", "BERT",
            "GPT", "LLM", "RAG", "MLOps",
        ]

        found = []
        for skill in known_skills:
            pattern = re.compile(r'\b' + skill + r'\b', re.IGNORECASE)
            if pattern.search(text):
                # Clean the skill name (remove regex escapes)
                clean = skill.replace("\\", "")
                if clean not in found:
                    found.append(clean)

        return sorted(found)

    @staticmethod
    def extract_email(text: str) -> Optional[str]:
        """Extract email address from resume text."""
        match = re.search(
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text
        )
        return match.group(0) if match else None

    @staticmethod
    def extract_phone(text: str) -> Optional[str]:
        """Extract phone number from resume text."""
        match = re.search(
            r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{4,10}',
            text,
        )
        return match.group(0).strip() if match else None
