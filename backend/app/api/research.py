
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.core.database import get_supabase_client
from app.services.perplexity_service import (
    PerplexityService,
    PerplexityServiceError,
)

router = APIRouter(prefix="/research", tags=["Research"])


class SearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=1000)
    max_results: int = Field(default=10, ge=1, le=20)
    search_context_size: str = "medium"
    country: str | None = None


@router.post("/search")
async def search_research(request: SearchRequest):

    try:
        service = PerplexityService()

        result = await service.search(
            query=request.query,
            max_results=request.max_results,
            search_context_size=request.search_context_size,
            country=request.country,
        )

        return {
            "success": True,
            "data": result,
        }

    except PerplexityServiceError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
from app.services.research_service import ResearchService


class ResearchChatRequest(BaseModel):
    query: str = Field(min_length=3, max_length=1000)
    max_results: int = Field(default=5, ge=1, le=20)


@router.post("/chat")
async def research_chat(request: ResearchChatRequest):

    try:
        service = ResearchService()

        result = await service.create_research(
            query=request.query,
            max_results=request.max_results,
        )

        return {
            "success": True,
            "message": "Research completed and saved successfully.",
            "data": result,
        }

    except PerplexityServiceError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Research processing failed: {str(exc)}",
        ) from exc

@router.get("/conversations")
async def get_conversations():

    try:
        db = get_supabase_client()

        response = (
            db.table("research_conversations")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "success": True,
            "total": len(response.data),
            "conversations": response.data,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve conversations: {str(exc)}",
        ) from exc


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):

    try:
        db = get_supabase_client()

        conversation_response = (
            db.table("research_conversations")
            .select("*")
            .eq("id", conversation_id)
            .execute()
        )

        if not conversation_response.data:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

        messages_response = (
            db.table("research_messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .execute()
        )

        messages = messages_response.data
        message_ids = [message["id"] for message in messages]

        sources = []

        if message_ids:
            sources_response = (
                db.table("research_sources")
                .select("*")
                .in_("message_id", message_ids)
                .order("result_rank")
                .execute()
            )

            sources = sources_response.data

        return {
            "success": True,
            "conversation": conversation_response.data[0],
            "messages": messages,
            "sources": sources,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve conversation: {str(exc)}",
        ) from exc