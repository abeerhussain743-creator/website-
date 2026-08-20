"""FastAPI dashboard for VariantXL product scraping."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from product_scraper.compliance.robots import USER_AGENT
from product_scraper.web.jobs import AVAILABLE_FIELDS, DEFAULT_FIELDS, job_manager

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
    max_discover: int = 25


class DiscoverRequest(BaseModel):
    url: str
    max_products: int = 25


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
        },
    )


@app.get("/api/fields")
async def api_fields() -> dict[str, Any]:
    return {"fields": AVAILABLE_FIELDS, "defaults": DEFAULT_FIELDS}


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
    if body.discover_from_homepage and urls:
        discovered = discover_product_urls(urls[0], max_products=body.max_discover)
        # Keep homepage seed out; use discovered product pages
        urls = discovered or urls

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
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return job.to_public()


@app.post("/api/discover")
async def api_discover(body: DiscoverRequest) -> dict[str, Any]:
    try:
        products = discover_product_urls(body.url, max_products=body.max_products)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"url": body.url, "count": len(products), "products": products}


@app.get("/api/jobs/{job_id}/download.xlsx")
async def download_xlsx(job_id: str) -> FileResponse:
    job = job_manager.get(job_id)
    if not job or not job.excel_path:
        raise HTTPException(status_code=404, detail="Excel not ready")
    path = Path(job.excel_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Excel file missing")
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"variantxl_{job_id}.xlsx",
    )


@app.get("/api/jobs/{job_id}/download.csv")
async def download_csv(job_id: str) -> FileResponse:
    job = job_manager.get(job_id)
    if not job or not job.csv_path:
        raise HTTPException(status_code=404, detail="CSV not ready")
    path = Path(job.csv_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="CSV file missing")
    return FileResponse(path, media_type="text/csv", filename=f"variantxl_{job_id}.csv")


def discover_product_urls(page_url: str, max_products: int = 25) -> list[str]:
    """Find product links on a homepage or collection page."""
    page_url = page_url.strip()
    if not page_url.startswith(("http://", "https://")):
        page_url = "https://" + page_url

    resp = requests.get(
        page_url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
        timeout=30,
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    host = urlparse(page_url).netloc

    found: list[str] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(page_url, a["href"]).split("?")[0].split("#")[0]
        parsed = urlparse(href)
        if parsed.netloc and parsed.netloc != host:
            continue
        path = parsed.path
        if "/products/" not in path and "/product/" not in path:
            continue
        # Normalize Shopify-style collection nested paths → /products/handle
        if "/products/" in path:
            handle = path.split("/products/")[-1].strip("/")
            if not handle or "/" in handle:
                handle = handle.split("/")[0]
            canon = f"{parsed.scheme}://{parsed.netloc}/products/{handle}"
        else:
            canon = f"{parsed.scheme}://{parsed.netloc}{path}".rstrip("/")
        if canon in seen:
            continue
        seen.add(canon)
        found.append(canon)
        if len(found) >= max_products:
            break
    return found
