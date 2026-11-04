
from fastapi import FastAPI

from app.core.config import settings
from app.api.research import router as research_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.APP_NAME,
    description="Research Intelligence & Decision Operating System API",
    version="1.0.0",
    debug=settings.DEBUG,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporary public demo only
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "success": True,
        "application": settings.APP_NAME,
        "message": "RID-OS Backend is running.",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "RID-OS Backend",
    }


app.include_router(research_router, prefix="/api/v1")
