# PostPilot scraper (Phase 3)
# FastAPI + Playwright microservice — scaffold only in Phase 1.

from fastapi import FastAPI

app = FastAPI(title="PostPilot Scraper", version="0.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "phase": 1, "ready": False}
