from typing import AsyncIterator

from app.domain.entities import Message, SystemPrompt
from app.domain.interfaces import ChatAgentProtocol


class ChatService:
    """Orchestrates chat flow: validates input, builds prompt, delegates to agent."""

    def __init__(self, agent: ChatAgentProtocol):
        self._agent = agent

    async def stream_response(
        self,
        messages: list[Message],
        system_prompt: SystemPrompt | None = None,
    ) -> AsyncIterator[str]:
        """Stream NDJSON chunks in the format expected by the frontend."""
        formatted = [
            m.content.strip()
            for m in messages
            if m.content.strip()
            and not m.content.strip().startswith("Sorry, I encountered an error")
        ]
        if not formatted:
            return

        from app.agents.anthropic_chat_agent import DEFAULT_SYSTEM_PROMPT

        full_system = DEFAULT_SYSTEM_PROMPT
        if system_prompt and system_prompt.enabled and system_prompt.value:
            full_system = f"{DEFAULT_SYSTEM_PROMPT}\n\n{system_prompt.value}"

        async for chunk in self._agent.stream(messages, full_system):
            yield chunk
