
import httpx

from app.core.config import settings


PERPLEXITY_SEARCH_URL = "https://api.perplexity.ai/search"


class PerplexityServiceError(Exception):
    """Raised when the Perplexity Search API request fails."""


class PerplexityService:

    def __init__(self):
        if not settings.PERPLEXITY_API_KEY:
            raise PerplexityServiceError(
                "PERPLEXITY_API_KEY is not configured."
            )

        self.api_key = settings.PERPLEXITY_API_KEY

    async def search(
        self,
        query: str | list[str],
        max_results: int = 10,
        search_context_size: str = "medium",
        country: str | None = None,
    ) -> dict:

        if not isinstance(query, (str, list)):
            raise ValueError("Query must be a string or list.")

        if isinstance(query, list):
            if not 1 <= len(query) <= 5:
                raise ValueError("Provide between 1 and 5 queries.")

        if not 1 <= max_results <= 20:
            raise ValueError("max_results must be between 1 and 20.")

        payload = {
            "query": query,
            "max_results": max_results,
            "search_context_size": search_context_size,
        }

        if country:
            payload["country"] = country

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    PERPLEXITY_SEARCH_URL,
                    headers=headers,
                    json=payload,
                )

            if response.status_code == 401:
                raise PerplexityServiceError(
                    "Authentication failed. Check your API key."
                )

            if response.status_code == 429:
                raise PerplexityServiceError(
                    "Perplexity rate limit reached. Retry later."
                )

            response.raise_for_status()
            data = response.json()

            results = data.get("results", [])

            return {
                "query": query,
                "total_results": len(results),
                "results": [
                    {
                        "title": item["title"],
                        "url": item["url"],
                        "snippet": item["snippet"],
                        "date": item.get("date"),
                        "last_updated": item.get("last_updated"),
                    }
                    for item in results
                ],
            }

        except httpx.TimeoutException as exc:
            raise PerplexityServiceError(
                "Perplexity request timed out."
            ) from exc

        except httpx.HTTPStatusError as exc:
            raise PerplexityServiceError(
                f"Perplexity API returned HTTP {exc.response.status_code}."
            ) from exc

        except httpx.RequestError as exc:
            raise PerplexityServiceError(
                "Could not connect to Perplexity API."
            ) from exc


perplexity_service = PerplexityService
