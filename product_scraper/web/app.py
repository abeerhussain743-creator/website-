"""FastAPI dashboard for VariantXL product scraping."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from product_scraper.competitors.watcher import competitor_store, competitor_watcher
from product_scraper.scraper.catalog import deep_discover
from product_scraper.web.jobs import (
    AVAILABLE_FIELDS,
    DEFAULT_FIELDS,
    FIELD_PRESETS,
    job_manager,
)

WEB_DIR = Path(__file__).resolve().parent
TEMPLATES = Jinja2Templates(directory=str(WEB_DIR / "templates"))

app = FastAPI(title="VariantXL", description="Product data scraping dashboard")
app.mount("/static", StaticFiles(directory=str(WEB_DIR / "static")), name="static")


class ScrapeRequest(BaseModel):
    urls: list[str] = Field(default_factory=list)
    fields: list[str] = Field(default_factory=list)
    use_browser: bool = True
    interact_variants: bool = True
    respect_robots: bool = True
    delay: float = 1.0
    timeout: float = 30.0
    discover_from_homepage: bool = False
    deep_crawl: bool = False
    max_discover: int = Field(default=500, ge=1, le=500)
    use_sitemap: bool = True
    use_collections: bool = True
    workers: int = 2
    min_price: float | None = None
    max_price: float | None = None
    in_stock_only: bool = False
    brand_contains: str = ""
    query: str = ""
    download_images: bool = False
    max_images: int = 3


class DiscoverRequest(BaseModel):
    url: str
    max_products: int = Field(default=500, ge=1, le=500)
    deep: bool = True
    use_sitemap: bool = True
    use_collections: bool = True


class CompetitorCreate(BaseModel):
    name: str = ""
    seed_url: str
    max_discover: int = Field(default=200, ge=1, le=500)
    notes: str = ""


class ApproveAlertsRequest(BaseModel):
    alert_ids: list[str] = Field(default_factory=list)
    fields: list[str] = Field(default_factory=list)
    workers: int = 3
    use_browser: bool = True
    interact_variants: bool = False
    respect_robots: bool = True
    delay: float = 0.8


class AlertIdsRequest(BaseModel):
    alert_ids: list[str] = Field(default_factory=list)


def create_app() -> FastAPI:
    return app


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return TEMPLATES.TemplateResponse(
        request,
        "index.html",
        {
            "fields": AVAILABLE_FIELDS,
            "default_fields": DEFAULT_FIELDS,
            "presets": FIELD_PRESETS,
        },
    )


@app.get("/api/fields")
async def api_fields() -> dict[str, Any]:
    return {"fields": AVAILABLE_FIELDS, "defaults": DEFAULT_FIELDS, "presets": FIELD_PRESETS}


@app.get("/api/jobs")
async def api_jobs() -> dict[str, Any]:
    return {"jobs": job_manager.list_jobs()}


@app.get("/api/jobs/{job_id}")
async def api_job(job_id: str) -> dict[str, Any]:
    job = job_manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_public()


@app.post("/api/scrape")
async def api_scrape(body: ScrapeRequest) -> dict[str, Any]:
    urls = list(body.urls)
    try:
        job = job_manager.create_job(
            urls=urls,
            fields=body.fields or DEFAULT_FIELDS,
            options={
                "use_browser": body.use_browser,
                "interact_variants": body.interact_variants,
                "respect_robots": body.respect_robots,
                "delay": body.delay,
                "timeout": body.timeout,
                "discover_from_homepage": body.discover_from_homepage,
                "deep_crawl": body.deep_crawl or body.discover_from_homepage,
                "max_discover": body.max_discover,
                "use_sitemap": body.use_sitemap,
                "use_collections": body.use_collections,
                "workers": body.workers,
                "min_price": body.min_price,
                "max_price": body.max_price,
                "in_stock_only": body.in_stock_only,
                "brand_contains": body.brand_contains,
                "query": body.query,
                "download_images": body.download_images,
                "max_images": body.max_images,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return job.to_public()


@app.post("/api/discover")
async def api_discover(body: DiscoverRequest) -> dict[str, Any]:
    try:
        if body.deep:
            result = deep_discover(
                body.url,
                max_products=body.max_products,
                use_sitemap=body.use_sitemap,
                use_collections=body.use_collections,
            )
            return {
                "url": body.url,
                "count": result["count"],
                "products": result["products"],
                "collections": result.get("collections") or [],
                "sources": result.get("sources") or {},
                "deep": True,
            }
        # Shallow fallback
        result = deep_discover(
            body.url,
            max_products=body.max_products,
            use_sitemap=False,
            use_collections=False,
        )
        return {
            "url": body.url,
            "count": result["count"],
            "products": result["products"],
            "collections": [],
            "sources": result.get("sources") or {},
            "deep": False,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _file_response(job_id: str, attr: str, media: str, filename: str) -> FileResponse:
    job = job_manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    path_str = getattr(job, attr, "") or ""
    path = Path(path_str)
    if not path_str or not path.exists():
        raise HTTPException(status_code=404, detail="File not ready")
    return FileResponse(path, media_type=media, filename=filename)


@app.get("/api/jobs/{job_id}/download.xlsx")
async def download_xlsx(job_id: str) -> FileResponse:
    return _file_response(
        job_id,
        "excel_path",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        f"variantxl_{job_id}.xlsx",
    )


@app.get("/api/jobs/{job_id}/download.csv")
async def download_csv(job_id: str) -> FileResponse:
    return _file_response(job_id, "csv_path", "text/csv", f"variantxl_{job_id}.csv")


@app.get("/api/jobs/{job_id}/download.json")
async def download_json(job_id: str) -> FileResponse:
    return _file_response(job_id, "json_path", "application/json", f"variantxl_{job_id}.json")


@app.get("/api/jobs/{job_id}/download.images.zip")
async def download_images_zip(job_id: str) -> FileResponse:
    return _file_response(job_id, "images_zip", "application/zip", f"variantxl_{job_id}_images.zip")


# --- Competitor watch ---


@app.get("/api/competitors")
async def api_list_competitors() -> dict[str, Any]:
    return {
        "competitors": competitor_store.list_competitors(),
        "pending_alerts": competitor_store.count_pending(),
    }


@app.post("/api/competitors")
async def api_add_competitor(body: CompetitorCreate) -> dict[str, Any]:
    try:
        return competitor_store.add_competitor(
            name=body.name,
            seed_url=body.seed_url,
            max_discover=body.max_discover,
            notes=body.notes,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/api/competitors/{competitor_id}")
async def api_delete_competitor(competitor_id: str) -> dict[str, Any]:
    ok = competitor_store.delete_competitor(competitor_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Competitor not found")
    return {"deleted": True, "id": competitor_id}


@app.post("/api/competitors/{competitor_id}/check")
async def api_check_competitor(competitor_id: str) -> dict[str, Any]:
    try:
        return competitor_watcher.check_competitor(competitor_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/competitors/check-all")
async def api_check_all_competitors() -> dict[str, Any]:
    token = competitor_watcher.check_all_async()
    return {"token": token, "status": "running", "message": "Checking all competitors…"}


@app.get("/api/competitors/check-status/{token}")
async def api_check_status(token: str) -> dict[str, Any]:
    state = competitor_watcher.get_async_status(token)
    if not state:
        raise HTTPException(status_code=404, detail="Watch run not found")
    return state


@app.get("/api/alerts")
async def api_alerts(status: str = "pending") -> dict[str, Any]:
    alerts = competitor_store.list_alerts(status=status if status != "all" else None)
    return {
        "alerts": alerts,
        "pending_count": competitor_store.count_pending(),
    }


@app.post("/api/alerts/dismiss")
async def api_dismiss_alerts(body: AlertIdsRequest) -> dict[str, Any]:
    n = competitor_store.set_alert_status(body.alert_ids, "dismissed")
    return {"dismissed": n, "pending_count": competitor_store.count_pending()}


@app.post("/api/alerts/approve")
async def api_approve_alerts(body: ApproveAlertsRequest) -> dict[str, Any]:
    """User permission gate: only scrape after explicit approve."""
    if not body.alert_ids:
        raise HTTPException(status_code=400, detail="Select at least one alert to approve")

    urls: list[str] = []
    competitor_ids: set[str] = set()
    for aid in body.alert_ids:
        alert = competitor_store.get_alert(aid)
        if not alert or alert.get("status") != "pending":
            continue
        urls.append(alert["product_url"])
        competitor_ids.add(alert["competitor_id"])

    # de-dupe
    seen = set()
    clean = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            clean.append(u)
    if not clean:
        raise HTTPException(status_code=400, detail="No pending alerts to approve")

    competitor_store.set_alert_status(body.alert_ids, "approved")
    for cid in competitor_ids:
        competitor_store.mark_scraped(cid, clean)

    try:
        job = job_manager.create_job(
            urls=clean,
            fields=body.fields or DEFAULT_FIELDS,
            options={
                "use_browser": body.use_browser,
                "interact_variants": body.interact_variants,
                "respect_robots": body.respect_robots,
                "delay": body.delay,
                "workers": body.workers,
                "deep_crawl": False,
                "discover_from_homepage": False,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "approved": len(body.alert_ids),
        "urls": clean,
        "job": job.to_public(),
        "pending_count": competitor_store.count_pending(),
        "message": f"Approved {len(clean)} product(s) — scrape started (job {job.id})",
    }