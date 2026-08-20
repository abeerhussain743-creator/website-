"""Background scrape job store for the dashboard."""

from __future__ import annotations

import csv
import json
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

from product_scraper.export.excel import export_excel
from product_scraper.models import ProductRecord, ScrapeFailure
from product_scraper.refresh.history import ScrapeHistory
from product_scraper.scraper.catalog import deep_discover
from product_scraper.scraper.engine import ProductScraper, ScraperConfig
from product_scraper.scraper.filters import filter_records, summarize_records
from product_scraper.scraper.images import download_images


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


AVAILABLE_FIELDS = [
    {"id": "brand", "label": "Brand"},
    {"id": "product_title", "label": "Product title"},
    {"id": "sku", "label": "SKU"},
    {"id": "color", "label": "Color"},
    {"id": "size", "label": "Size"},
    {"id": "description", "label": "Description"},
    {"id": "specifications", "label": "Specifications"},
    {"id": "availability", "label": "Availability"},
    {"id": "price", "label": "Price"},
    {"id": "currency", "label": "Currency"},
    {"id": "image_urls", "label": "Image URLs"},
    {"id": "source_url", "label": "Source URL"},
    {"id": "parent_product_id", "label": "Parent product ID"},
    {"id": "scraped_at", "label": "Scraped at"},
]

DEFAULT_FIELDS = [f["id"] for f in AVAILABLE_FIELDS]

FIELD_PRESETS = {
    "core": ["sku", "brand", "product_title", "color", "size", "price", "currency", "availability", "source_url"],
    "commerce": [
        "sku",
        "brand",
        "product_title",
        "color",
        "size",
        "price",
        "currency",
        "availability",
        "specifications",
        "image_urls",
        "source_url",
    ],
    "full": list(DEFAULT_FIELDS),
}


@dataclass
class ScrapeJob:
    id: str
    urls: list[str]
    fields: list[str]
    status: JobStatus = JobStatus.QUEUED
    created_at: str = ""
    started_at: str = ""
    finished_at: str = ""
    message: str = ""
    progress: float = 0.0
    record_count: int = 0
    failure_count: int = 0
    records: list[dict[str, Any]] = field(default_factory=list)
    failures: list[dict[str, str]] = field(default_factory=list)
    excel_path: str = ""
    csv_path: str = ""
    json_path: str = ""
    images_zip: str = ""
    options: dict[str, Any] = field(default_factory=dict)
    logs: list[str] = field(default_factory=list)
    summary: dict[str, Any] = field(default_factory=dict)
    discovered_count: int = 0

    def __post_init__(self) -> None:
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()

    def to_public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "urls": self.urls,
            "fields": self.fields,
            "status": self.status.value,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "message": self.message,
            "progress": self.progress,
            "record_count": self.record_count,
            "failure_count": self.failure_count,
            "failures": self.failures[:50],
            "excel_path": self.excel_path,
            "csv_path": self.csv_path,
            "json_path": self.json_path,
            "images_zip": self.images_zip,
            "options": self.options,
            "logs": self.logs[-60:],
            "preview": self.records[:100],
            "summary": self.summary,
            "discovered_count": self.discovered_count,
        }


class JobManager:
    """In-memory job queue with background worker threads."""

    def __init__(self, output_dir: str | Path = "output/dashboard") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._jobs: dict[str, ScrapeJob] = {}
        self._lock = threading.Lock()
        self.history = ScrapeHistory(self.output_dir / "history.db")

    def list_jobs(self, limit: int = 30) -> list[dict[str, Any]]:
        with self._lock:
            jobs = sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)
            return [j.to_public() for j in jobs[:limit]]

    def get(self, job_id: str) -> ScrapeJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def create_job(
        self,
        urls: list[str],
        fields: list[str] | None = None,
        options: dict[str, Any] | None = None,
    ) -> ScrapeJob:
        cleaned = []
        seen = set()
        for u in urls:
            u = (u or "").strip()
            if not u or u.startswith("#") or u in seen:
                continue
            seen.add(u)
            cleaned.append(u)
        if not cleaned:
            raise ValueError("Provide at least one product URL.")

        selected = fields or list(DEFAULT_FIELDS)
        selected = [f for f in selected if f in DEFAULT_FIELDS]
        if "sku" not in selected:
            selected.insert(0, "sku")

        job = ScrapeJob(
            id=uuid.uuid4().hex[:12],
            urls=cleaned,
            fields=selected,
            options=options or {},
            message="Queued",
        )
        with self._lock:
            self._jobs[job.id] = job

        thread = threading.Thread(target=self._run_job, args=(job.id,), daemon=True)
        thread.start()
        return job

    def _log(self, job: ScrapeJob, message: str) -> None:
        stamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
        job.logs.append(f"{stamp}  {message}")
        job.message = message

    def _run_job(self, job_id: str) -> None:
        job = self.get(job_id)
        if not job:
            return
        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(timezone.utc).isoformat()
        job.progress = 0.02
        opts = job.options

        try:
            urls = list(job.urls)

            # Deep catalog discovery
            if opts.get("deep_crawl") or opts.get("discover_from_homepage"):
                seed = urls[0]
                self._log(job, f"Deep discovering products from {seed}")
                result = deep_discover(
                    seed,
                    max_products=int(opts.get("max_discover", 100)),
                    use_sitemap=bool(opts.get("use_sitemap", True)),
                    use_collections=bool(opts.get("use_collections", True)),
                )
                discovered = result.get("products") or []
                job.discovered_count = len(discovered)
                self._log(
                    job,
                    f"Discovered {len(discovered)} product URL(s) "
                    f"(html={result['sources'].get('html', 0)}, "
                    f"collections={result['sources'].get('collections_json', 0)}, "
                    f"sitemap={result['sources'].get('sitemap', 0)})",
                )
                if discovered:
                    urls = discovered
                    job.urls = urls
                job.progress = 0.08

            workers = max(1, min(8, int(opts.get("workers", 1))))
            self._log(job, f"Starting scrape — {len(urls)} URL(s), {workers} worker(s)")

            config = ScraperConfig(
                timeout=float(opts.get("timeout", 30)),
                rate_limit_delay=float(opts.get("delay", 1.0)),
                respect_robots=bool(opts.get("respect_robots", True)),
                use_playwright=bool(opts.get("use_browser", True)),
                interact_variants=bool(opts.get("interact_variants", True))
                and bool(opts.get("use_browser", True)),
                headless=True,
            )

            all_records: list[ProductRecord] = []
            all_failures: list[ScrapeFailure] = []
            total = max(1, len(urls))
            done = 0
            lock = threading.Lock()

            def scrape_one(url: str) -> tuple[list[ProductRecord], list[ScrapeFailure], str]:
                # Each worker gets its own scraper (Playwright is not thread-safe on one browser)
                with ProductScraper(config) as scraper:
                    try:
                        result = scraper.scrape_url(url)
                        return result.records, result.failures, ""
                    except Exception as exc:  # noqa: BLE001
                        return [], [ScrapeFailure(url=url, reason=str(exc))], str(exc)

            with ThreadPoolExecutor(max_workers=workers) as pool:
                futures = {pool.submit(scrape_one, url): url for url in urls}
                for fut in as_completed(futures):
                    url = futures[fut]
                    records, failures, err = fut.result()
                    with lock:
                        all_records.extend(records)
                        all_failures.extend(failures)
                        done += 1
                        job.progress = 0.08 + (done / total) * 0.75
                        job.record_count = len(all_records)
                        job.failure_count = len(all_failures)
                        if err:
                            self._log(job, f"[{done}/{total}] error {url}: {err}")
                        else:
                            self._log(
                                job,
                                f"[{done}/{total}] {url} → {len(records)} SKU(s), {len(failures)} fail(s)",
                            )

            # Filters
            before = len(all_records)
            all_records = filter_records(
                all_records,
                min_price=_float_or_none(opts.get("min_price")),
                max_price=_float_or_none(opts.get("max_price")),
                in_stock_only=bool(opts.get("in_stock_only", False)),
                brand_contains=str(opts.get("brand_contains") or ""),
                query=str(opts.get("query") or ""),
            )
            if before != len(all_records):
                self._log(job, f"Filters applied: {before} → {len(all_records)} row(s)")

            job.progress = 0.9
            job.summary = summarize_records(all_records)

            job_dir = self.output_dir / job.id
            job_dir.mkdir(parents=True, exist_ok=True)

            excel_path = job_dir / f"scrape_{job.id}.xlsx"
            export_excel(
                all_records,
                excel_path,
                failures=all_failures,
                include_raw_specs="specifications" in job.fields,
                columns=job.fields,
            )

            csv_path = job_dir / f"scrape_{job.id}.csv"
            with csv_path.open("w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=job.fields, extrasaction="ignore")
                writer.writeheader()
                for rec in all_records:
                    writer.writerow({k: getattr(rec, k, "") or "" for k in job.fields})

            json_path = job_dir / f"scrape_{job.id}.json"
            json_path.write_text(
                json.dumps(
                    {
                        "job_id": job.id,
                        "summary": job.summary,
                        "records": [{k: getattr(r, k, "") or "" for k in job.fields} for r in all_records],
                        "failures": [{"url": f.url, "reason": f.reason} for f in all_failures],
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )

            if opts.get("download_images"):
                self._log(job, "Downloading product images…")
                try:
                    zip_path = download_images(all_records, job_dir, max_per_sku=int(opts.get("max_images", 3)))
                    job.images_zip = str(zip_path)
                    self._log(job, f"Images zipped → {zip_path.name}")
                except Exception as exc:  # noqa: BLE001
                    self._log(job, f"Image download skipped: {exc}")

            self.history.save_run(job.id, all_records)

            job.records = [{k: (getattr(r, k, "") or "") for k in job.fields} for r in all_records]
            job.failures = [{"url": f.url, "reason": f.reason} for f in all_failures]
            job.excel_path = str(excel_path)
            job.csv_path = str(csv_path)
            job.json_path = str(json_path)
            job.record_count = len(all_records)
            job.failure_count = len(all_failures)
            job.progress = 1.0
            job.status = JobStatus.COMPLETED
            job.finished_at = datetime.now(timezone.utc).isoformat()
            self._log(job, f"Done — {job.record_count} SKU row(s) exported")
        except Exception as exc:  # noqa: BLE001
            job.status = JobStatus.FAILED
            job.finished_at = datetime.now(timezone.utc).isoformat()
            job.progress = 1.0
            self._log(job, f"Job failed: {exc}")


def _float_or_none(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


job_manager = JobManager()
