from pydantic import BaseModel, Field


class CurrentUser(BaseModel):
    """Authenticated user from JWT (Convex auth)."""

    user_id: str
    email: str | None = None


class Message(BaseModel):
    id: str = ""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class SystemPrompt(BaseModel):
    value: str
    enabled: bool = True


class ChatRequest(BaseModel):
    messages: list[Message]
    system_prompt: SystemPrompt | None = Field(None, alias="systemPrompt")

    model_config = {"populate_by_name": True}
