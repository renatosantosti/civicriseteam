# Civic Copilot Backend

FastAPI backend with SOLID structure and LLM agent services.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: `GET http://localhost:8000/health`
- Chat stream: `POST http://localhost:8000/api/chat/stream` with JSON body `{ "messages": [...], "systemPrompt": { "value": "...", "enabled": true } }`
