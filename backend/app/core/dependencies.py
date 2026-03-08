from fastapi import Depends

from app.agents.anthropic_chat_agent import AnthropicChatAgent
from app.domain.interfaces import ChatAgentProtocol
from app.services.chat_service import ChatService


def get_chat_agent() -> ChatAgentProtocol:
    """Provide the concrete LLM chat agent (injectable for testing)."""
    return AnthropicChatAgent()


def get_chat_service(agent: ChatAgentProtocol = Depends(get_chat_agent)) -> ChatService:
    """Provide ChatService with injected agent."""
    return ChatService(agent=agent)
