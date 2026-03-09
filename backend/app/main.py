from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

_default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
_extra = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
cors_origins = _default_origins + _extra

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}
