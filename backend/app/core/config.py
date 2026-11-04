
import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve backend directory and explicitly load backend/.env
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=False)


class Settings:
    APP_NAME: str = os.getenv(
        "APP_NAME",
        "RID-OS Research Intelligence System"
    )

    APP_ENV: str = os.getenv("APP_ENV", "development")

    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    PERPLEXITY_API_KEY: str = os.getenv(
        "PERPLEXITY_API_KEY",
        ""
    )

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")

    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")


settings = Settings()
