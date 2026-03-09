from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import jwt

from app.agents.anthropic_chat_agent import AnthropicChatAgent
from app.agents.openai_chat_agent import OpenAIChatAgent
from app.core.config import settings
from app.domain.entities import CurrentUser
from app.domain.interfaces import ChatAgentProtocol
from app.services.chat_service import ChatService

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> CurrentUser:
    """Validate JWT from Authorization: Bearer <token> and return current user."""
    if not settings.jwt_secret or not settings.jwt_secret.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT_SECRET is not configured. Set it to match the Convex deployment.",
        )
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header (expected Bearer token)",
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        ) from None
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from None
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return CurrentUser(
        user_id=str(sub),
        email=payload.get("email"),
    )


def get_chat_agent() -> ChatAgentProtocol:
    """Provide the LLM chat agent for the configured provider."""
    provider = (settings.llm_provider or "anthropic").strip().lower()
    if provider == "openai":
        return OpenAIChatAgent()
    return AnthropicChatAgent()


def get_chat_service(agent: ChatAgentProtocol = Depends(get_chat_agent)) -> ChatService:
    """Provide ChatService with injected agent."""
    return ChatService(agent=agent)
