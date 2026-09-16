"""Competitor watch storage (SQLite)."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CompetitorStore:
    def __init__(self, db_path: str | Path = "data/competitors.db") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS competitors (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    seed_url TEXT NOT NULL UNIQUE,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    max_discover INTEGER NOT NULL DEFAULT 200,
                    created_at TEXT NOT NULL,
                    last_checked_at TEXT,
                    notes TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS known_products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    competitor_id TEXT NOT NULL,
                    product_url TEXT NOT NULL,
                    first_seen_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    last_scraped_at TEXT,
                    title_hint TEXT DEFAULT '',
                    UNIQUE(competitor_id, product_url),
                    FOREIGN KEY(competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    competitor_id TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    product_url TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'pending',
                    meta TEXT DEFAULT '{}',
                    FOREIGN KEY(competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS watch_runs (
                    id TEXT PRIMARY KEY,
                    competitor_id TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    discovered INTEGER NOT NULL DEFAULT 0,
                    new_count INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'running',
                    message TEXT DEFAULT '',
                    FOREIGN KEY(competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_known_comp ON known_products(competitor_id);
                """
            )

    # --- competitors ---
    def add_competitor(
        self,
        name: str,
        seed_url: str,
        max_discover: int = 200,
        notes: str = "",
    ) -> dict[str, Any]:
        seed_url = seed_url.strip()
        if not seed_url.startswith(("http://", "https://")):
            seed_url = "https://" + seed_url
        cid = uuid.uuid4().hex[:10]
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO competitors (id, name, seed_url, enabled, max_discover, created_at, notes)
                VALUES (?, ?, ?, 1, ?, ?, ?)
                """,
                (cid, name.strip() or seed_url, seed_url, max_discover, _now(), notes),
            )
        return self.get_competitor(cid)  # type: ignore[return-value]

    def list_competitors(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM competitors ORDER BY created_at DESC"
            ).fetchall()
        out = []
        for row in rows:
            item = dict(row)
            item["pending_alerts"] = self.count_pending(item["id"])
            item["known_products"] = self.count_known(item["id"])
            out.append(item)
        return out

    def get_competitor(self, competitor_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM competitors WHERE id = ?", (competitor_id,)
            ).fetchone()
        if not row:
            return None
        item = dict(row)
        item["pending_alerts"] = self.count_pending(competitor_id)
        item["known_products"] = self.count_known(competitor_id)
        return item

    def delete_competitor(self, competitor_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM competitors WHERE id = ?", (competitor_id,))
            conn.execute("DELETE FROM known_products WHERE competitor_id = ?", (competitor_id,))
            conn.execute("DELETE FROM alerts WHERE competitor_id = ?", (competitor_id,))
            conn.execute("DELETE FROM watch_runs WHERE competitor_id = ?", (competitor_id,))
            return cur.rowcount > 0

    def set_enabled(self, competitor_id: str, enabled: bool) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE competitors SET enabled = ? WHERE id = ?",
                (1 if enabled else 0, competitor_id),
            )

    def touch_checked(self, competitor_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE competitors SET last_checked_at = ? WHERE id = ?",
                (_now(), competitor_id),
            )

    def count_known(self, competitor_id: str) -> int:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS c FROM known_products WHERE competitor_id = ?",
                (competitor_id,),
            ).fetchone()
        return int(row["c"] if row else 0)

    def count_pending(self, competitor_id: str | None = None) -> int:
        with self._connect() as conn:
            if competitor_id:
                row = conn.execute(
                    "SELECT COUNT(*) AS c FROM alerts WHERE competitor_id = ? AND status = 'pending'",
                    (competitor_id,),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT COUNT(*) AS c FROM alerts WHERE status = 'pending'"
                ).fetchone()
        return int(row["c"] if row else 0)

    def known_urls(self, competitor_id: str) -> set[str]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT product_url FROM known_products WHERE competitor_id = ?",
                (competitor_id,),
            ).fetchall()
        return {r["product_url"] for r in rows}

    def upsert_seen_products(self, competitor_id: str, urls: list[str]) -> list[str]:
        """Mark URLs as seen; return list of newly discovered URLs."""
        known = self.known_urls(competitor_id)
        new_urls = [u for u in urls if u not in known]
        now = _now()
        with self._connect() as conn:
            for url in urls:
                if url in known:
                    conn.execute(
                        """
                        UPDATE known_products
                        SET last_seen_at = ?
                        WHERE competitor_id = ? AND product_url = ?
                        """,
                        (now, competitor_id, url),
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO known_products
                        (competitor_id, product_url, first_seen_at, last_seen_at)
                        VALUES (?, ?, ?, ?)
                        """,
                        (competitor_id, url, now, now),
                    )
        return new_urls

    def mark_scraped(self, competitor_id: str, urls: list[str]) -> None:
        now = _now()
        with self._connect() as conn:
            for url in urls:
                conn.execute(
                    """
                    UPDATE known_products
                    SET last_scraped_at = ?
                    WHERE competitor_id = ? AND product_url = ?
                    """,
                    (now, competitor_id, url),
                )

    # --- alerts ---
    def create_alert(
        self,
        competitor_id: str,
        product_url: str,
        message: str,
        kind: str = "new_product",
        meta: dict | None = None,
    ) -> dict[str, Any]:
        aid = uuid.uuid4().hex[:12]
        with self._connect() as conn:
            # avoid duplicate pending for same URL
            existing = conn.execute(
                """
                SELECT id FROM alerts
                WHERE competitor_id = ? AND product_url = ? AND status = 'pending'
                """,
                (competitor_id, product_url),
            ).fetchone()
            if existing:
                return dict(
                    conn.execute("SELECT * FROM alerts WHERE id = ?", (existing["id"],)).fetchone()
                )
            conn.execute(
                """
                INSERT INTO alerts
                (id, competitor_id, kind, product_url, message, created_at, is_read, status, meta)
                VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?)
                """,
                (aid, competitor_id, kind, product_url, message, _now(), json.dumps(meta or {})),
            )
        return self.get_alert(aid)  # type: ignore[return-value]

    def get_alert(self, alert_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        return dict(row) if row else None

    def list_alerts(self, status: str | None = "pending", limit: int = 200) -> list[dict[str, Any]]:
        with self._connect() as conn:
            if status:
                rows = conn.execute(
                    """
                    SELECT a.*, c.name AS competitor_name, c.seed_url AS competitor_seed
                    FROM alerts a
                    JOIN competitors c ON c.id = a.competitor_id
                    WHERE a.status = ?
                    ORDER BY a.created_at DESC
                    LIMIT ?
                    """,
                    (status, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT a.*, c.name AS competitor_name, c.seed_url AS competitor_seed
                    FROM alerts a
                    JOIN competitors c ON c.id = a.competitor_id
                    ORDER BY a.created_at DESC
                    LIMIT ?
                    """,
                    (limit,),
                ).fetchall()
        return [dict(r) for r in rows]

    def set_alert_status(self, alert_ids: list[str], status: str) -> int:
        if not alert_ids:
            return 0
        with self._connect() as conn:
            q = ",".join("?" for _ in alert_ids)
            cur = conn.execute(
                f"UPDATE alerts SET status = ?, is_read = 1 WHERE id IN ({q})",
                [status, *alert_ids],
            )
            return cur.rowcount

    def mark_alerts_read(self, alert_ids: list[str] | None = None) -> None:
        with self._connect() as conn:
            if alert_ids:
                q = ",".join("?" for _ in alert_ids)
                conn.execute(f"UPDATE alerts SET is_read = 1 WHERE id IN ({q})", alert_ids)
            else:
                conn.execute("UPDATE alerts SET is_read = 1 WHERE status = 'pending'")

    # --- watch runs ---
    def start_run(self, competitor_id: str) -> str:
        rid = uuid.uuid4().hex[:12]
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO watch_runs (id, competitor_id, started_at, status, message)
                VALUES (?, ?, ?, 'running', 'Checking…')
                """,
                (rid, competitor_id, _now()),
            )
        return rid

    def finish_run(
        self,
        run_id: str,
        *,
        discovered: int,
        new_count: int,
        status: str = "completed",
        message: str = "",
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE watch_runs
                SET finished_at = ?, discovered = ?, new_count = ?, status = ?, message = ?
                WHERE id = ?
                """,
                (_now(), discovered, new_count, status, message, run_id),
            )
