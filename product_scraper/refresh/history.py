"""Scrape history storage and change detection for refresh / re-scrape."""

from __future__ import annotations

import json
import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from product_scraper.models import EXCEL_COLUMNS, ProductRecord

logger = logging.getLogger("product_scraper")

COMPARE_FIELDS = [
    "brand",
    "product_title",
    "color",
    "size",
    "description",
    "specifications",
    "availability",
    "price",
    "currency",
    "image_urls",
]


class ScrapeHistory:
    """SQLite-backed history for on-demand refresh and scheduled re-scrapes."""

    def __init__(self, db_path: str | Path = "data/scrape_history.db") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    scraped_at TEXT NOT NULL,
                    source_url TEXT,
                    sku TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_snapshots_sku
                ON snapshots(sku, scraped_at DESC)
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS schedule_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL UNIQUE,
                    interval_minutes INTEGER NOT NULL DEFAULT 1440,
                    last_run_at TEXT,
                    next_run_at TEXT,
                    enabled INTEGER NOT NULL DEFAULT 1
                )
                """
            )

    def save_run(self, run_id: str, records: list[ProductRecord]) -> None:
        scraped_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            for rec in records:
                rec.ensure_timestamp()
                conn.execute(
                    """
                    INSERT INTO snapshots (run_id, scraped_at, source_url, sku, payload)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        run_id,
                        rec.scraped_at or scraped_at,
                        rec.source_url,
                        rec.sku,
                        json.dumps(rec.to_dict(), default=str),
                    ),
                )
        logger.info("Saved %d record(s) to history run %s", len(records), run_id)

    def latest_by_sku(self) -> dict[str, ProductRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT s.*
                FROM snapshots s
                INNER JOIN (
                    SELECT sku, MAX(id) AS max_id
                    FROM snapshots
                    GROUP BY sku
                ) latest ON s.id = latest.max_id
                """
            ).fetchall()
        result: dict[str, ProductRecord] = {}
        for row in rows:
            data = json.loads(row["payload"])
            result[row["sku"]] = ProductRecord(
                **{k: data.get(k, "") for k in EXCEL_COLUMNS},
                raw_specs=data.get("raw_specs") or {},
            )
        return result

    def compare(
        self,
        new_records: list[ProductRecord],
        previous: dict[str, ProductRecord] | None = None,
    ) -> dict[str, set[str]]:
        """Return map of sku → set of changed field names."""
        previous = previous if previous is not None else self.latest_by_sku()
        changed: dict[str, set[str]] = {}
        for rec in new_records:
            old = previous.get(rec.sku)
            if old is None:
                changed[rec.sku] = {"(new)"}
                continue
            fields: set[str] = set()
            for name in COMPARE_FIELDS:
                if (getattr(old, name) or "") != (getattr(rec, name) or ""):
                    fields.add(name)
            if fields:
                changed[rec.sku] = fields
        return changed

    def schedule_url(self, url: str, interval_minutes: int = 1440) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO schedule_queue (url, interval_minutes, next_run_at, enabled)
                VALUES (?, ?, ?, 1)
                ON CONFLICT(url) DO UPDATE SET
                    interval_minutes=excluded.interval_minutes,
                    next_run_at=excluded.next_run_at,
                    enabled=1
                """,
                (url, interval_minutes, now),
            )
        logger.info("Scheduled %s every %d minute(s)", url, interval_minutes)

    def due_urls(self) -> list[str]:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT url FROM schedule_queue
                WHERE enabled = 1 AND (next_run_at IS NULL OR next_run_at <= ?)
                """,
                (now,),
            ).fetchall()
        return [r["url"] for r in rows]

    def mark_ran(self, url: str) -> None:
        now = datetime.now(timezone.utc)
        with self._connect() as conn:
            row = conn.execute(
                "SELECT interval_minutes FROM schedule_queue WHERE url = ?",
                (url,),
            ).fetchone()
            if not row:
                return
            next_run = (now + timedelta(minutes=int(row["interval_minutes"]))).isoformat()
            conn.execute(
                """
                UPDATE schedule_queue
                SET last_run_at = ?, next_run_at = ?
                WHERE url = ?
                """,
                (now.isoformat(), next_run, url),
            )
