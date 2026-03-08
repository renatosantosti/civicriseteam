from abc import ABC, abstractmethod
from typing import AsyncIterator

from app.domain.entities import Message, SystemPrompt


class ChatAgentProtocol(ABC):
    """Protocol for LLM chat agents (Open/Closed, Liskov)."""

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        system_prompt: str,
    ) -> AsyncIterator[str]:
        """Stream NDJSON chunks. Yields lines in frontend format (content_block_delta)."""
        ...
