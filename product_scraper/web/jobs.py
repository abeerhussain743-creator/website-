"""Background scrape job store for the dashboard."""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

from product_scraper.export.excel import export_excel
from product_scraper.models import ProductRecord, ScrapeFailure
from product_scraper.refresh.history import ScrapeHistory
from product_scraper.scraper.engine import ProductScraper, ScraperConfig


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
    options: dict[str, Any] = field(default_factory=dict)
    logs: list[str] = field(default_factory=list)

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
            "failures": self.failures,
            "excel_path": self.excel_path,
            "csv_path": self.csv_path,
            "options": self.options,
            "logs": self.logs[-40:],
            "preview": self.records[:50],
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
        job.progress = 0.05
        self._log(job, f"Starting scrape for {len(job.urls)} URL(s)")

        opts = job.options
        config = ScraperConfig(
            timeout=float(opts.get("timeout", 30)),
            rate_limit_delay=float(opts.get("delay", 1.0)),
            respect_robots=bool(opts.get("respect_robots", True)),
            use_playwright=bool(opts.get("use_browser", True)),
            interact_variants=bool(opts.get("interact_variants", True)) and bool(opts.get("use_browser", True)),
            headless=True,
        )

        all_records: list[ProductRecord] = []
        all_failures: list[ScrapeFailure] = []

        try:
            with ProductScraper(config) as scraper:
                total = len(job.urls)
                for idx, url in enumerate(job.urls):
                    self._log(job, f"Scraping ({idx + 1}/{total}): {url}")
                    try:
                        result = scraper.scrape_url(url)
                        all_records.extend(result.records)
                        all_failures.extend(result.failures)
                        self._log(
                            job,
                            f"→ {len(result.records)} SKU row(s), {len(result.failures)} failure(s)",
                        )
                    except Exception as exc:  # noqa: BLE001
                        all_failures.append(ScrapeFailure(url=url, reason=str(exc)))
                        self._log(job, f"→ error: {exc}")
                    job.progress = min(0.9, (idx + 1) / total * 0.9)
                    job.record_count = len(all_records)
                    job.failure_count = len(all_failures)

            # Filter columns for preview / export payload
            filtered_rows = []
            for rec in all_records:
                row = rec.to_dict()
                filtered = {k: row.get(k, "") for k in job.fields}
                # Always keep raw_specs for Raw Specs sheet if specifications requested
                if "specifications" in job.fields:
                    filtered["raw_specs"] = row.get("raw_specs") or {}
                filtered_rows.append(filtered)

            excel_name = f"scrape_{job.id}.xlsx"
            excel_path = self.output_dir / excel_name
            # Export full records but only selected columns in Products sheet via filter
            export_records = all_records
            export_excel(
                export_records,
                excel_path,
                failures=all_failures,
                include_raw_specs="specifications" in job.fields,
                columns=job.fields,
            )
            # Also write a fields-filtered CSV for quick download
            import csv

            csv_path = self.output_dir / f"scrape_{job.id}.csv"
            with csv_path.open("w", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=job.fields, extrasaction="ignore")
                writer.writeheader()
                for rec in all_records:
                    writer.writerow({k: getattr(rec, k, "") or "" for k in job.fields})

            self.history.save_run(job.id, all_records)

            job.records = [
                {k: (getattr(r, k, "") or "") for k in job.fields}
                for r in all_records
            ]
            job.failures = [{"url": f.url, "reason": f.reason} for f in all_failures]
            job.excel_path = str(excel_path)
            job.csv_path = str(csv_path)
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


# Singleton used by the web app
job_manager = JobManager()
