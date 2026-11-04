
import os
from dotenv import load_dotenv

load_dotenv()


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
