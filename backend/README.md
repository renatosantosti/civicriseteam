# Civic Copilot Backend

FastAPI backend with SOLID structure and provider-agnostic LLM agent services.

## Auth (JWT)

The chat endpoint requires a valid JWT issued by the frontend’s Convex auth (sign-in). Set in `.env`:

- **JWT_SECRET** – Must match the `JWT_SECRET` environment variable in your Convex deployment. The frontend sends `Authorization: Bearer <token>`; the backend verifies the token and uses the `sub` claim as the current user id.

If `JWT_SECRET` is missing or wrong, `POST /api/chat/stream` will return 401 or 503.

## LLM provider

The backend supports multiple LLM providers. Set in `.env`:

- **LLM_PROVIDER** – `anthropic` or `openai` (default: `anthropic`)
- **LLM_API_KEY** – API key for the selected provider
- **LLM_MODEL** – Model name (e.g. `gpt-4o-mini`, `claude-sonnet-4-5-20250929`). Omit to use the provider default.
- **LLM_TEMPERATURE** – Sampling temperature (default: `0.7`). Higher = more random; lower = more deterministic.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set LLM_PROVIDER and LLM_API_KEY
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: `GET http://localhost:8000/health`
- Chat stream: `POST http://localhost:8000/api/chat/stream` with header `Authorization: Bearer <jwt>` and JSON body `{ "messages": [...], "systemPrompt": { "value": "...", "enabled": true } }`
