from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.dependencies import get_chat_service, get_current_user
from app.domain.entities import ChatRequest, CurrentUser, SystemPrompt
from app.services.chat_service import ChatService

router = APIRouter()


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    current_user: CurrentUser = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """Stream chat response as NDJSON (content_block_delta lines). Requires auth (Bearer JWT from Convex)."""
    _ = current_user  # available for logging or future per-user behavior
    if not settings.llm_api_key:
        raise HTTPException(
            status_code=503,
            detail="Missing API key: set LLM_API_KEY in the backend environment for the selected provider.",
        )
    if not body.messages:
        raise HTTPException(status_code=400, detail="No valid messages to send")

    system_prompt: SystemPrompt | None = None
    if body.system_prompt and body.system_prompt.enabled:
        system_prompt = body.system_prompt

    async def ndjson_stream():
        async for chunk in chat_service.stream_response(body.messages, system_prompt):
            yield chunk

    return StreamingResponse(
        ndjson_stream(),
        media_type="application/x-ndjson",
    )
