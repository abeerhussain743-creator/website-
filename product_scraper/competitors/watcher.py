"""Competitor watch / check-for-updates logic."""

from __future__ import annotations

import logging
import threading
from typing import Any, Callable

from product_scraper.competitors.store import CompetitorStore
from product_scraper.scraper.catalog import deep_discover

logger = logging.getLogger("product_scraper")


class CompetitorWatcher:
    def __init__(self, store: CompetitorStore | None = None) -> None:
        self.store = store or CompetitorStore()
        self._lock = threading.Lock()
        self._running: dict[str, dict[str, Any]] = {}

    def check_competitor(self, competitor_id: str) -> dict[str, Any]:
        comp = self.store.get_competitor(competitor_id)
        if not comp:
            raise ValueError("Competitor not found")
        if not comp.get("enabled"):
            raise ValueError("Competitor is disabled")

        run_id = self.store.start_run(competitor_id)
        self._running[competitor_id] = {"run_id": run_id, "status": "running", "message": "Discovering…"}

        try:
            result = deep_discover(
                comp["seed_url"],
                max_products=int(comp.get("max_discover") or 200),
                use_sitemap=True,
                use_collections=True,
            )
            products = result.get("products") or []
            new_urls = self.store.upsert_seen_products(competitor_id, products)

            alerts = []
            for url in new_urls:
                alert = self.store.create_alert(
                    competitor_id,
                    url,
                    message=f"New product found on {comp['name']}",
                    kind="new_product",
                    meta={"sources": result.get("sources") or {}},
                )
                alerts.append(alert)

            self.store.touch_checked(competitor_id)
            msg = f"Found {len(products)} products, {len(new_urls)} new — awaiting your scrape approval"
            self.store.finish_run(
                run_id,
                discovered=len(products),
                new_count=len(new_urls),
                status="completed",
                message=msg,
            )
            out = {
                "competitor_id": competitor_id,
                "competitor_name": comp["name"],
                "run_id": run_id,
                "discovered": len(products),
                "new_count": len(new_urls),
                "new_urls": new_urls,
                "alerts": alerts,
                "message": msg,
                "status": "completed",
            }
            self._running[competitor_id] = out
            return out
        except Exception as exc:  # noqa: BLE001
            logger.exception("Watch check failed for %s", competitor_id)
            self.store.finish_run(
                run_id,
                discovered=0,
                new_count=0,
                status="failed",
                message=str(exc),
            )
            self._running[competitor_id] = {
                "competitor_id": competitor_id,
                "status": "failed",
                "message": str(exc),
            }
            raise

    def check_all(self, on_progress: Callable[[dict], None] | None = None) -> dict[str, Any]:
        comps = [c for c in self.store.list_competitors() if c.get("enabled")]
        results = []
        total_new = 0
        for comp in comps:
            try:
                res = self.check_competitor(comp["id"])
                results.append(res)
                total_new += int(res.get("new_count") or 0)
                if on_progress:
                    on_progress(res)
            except Exception as exc:  # noqa: BLE001
                results.append(
                    {
                        "competitor_id": comp["id"],
                        "competitor_name": comp["name"],
                        "status": "failed",
                        "message": str(exc),
                        "new_count": 0,
                    }
                )
        return {
            "checked": len(comps),
            "total_new": total_new,
            "results": results,
            "pending_alerts": self.store.count_pending(),
        }

    def check_all_async(self) -> str:
        """Start background check-all; returns a simple run token."""
        token = f"watch-{id(self)}"
        state = {"status": "running", "message": "Checking competitors…", "result": None}
        self._running[token] = state

        def worker() -> None:
            try:
                result = self.check_all()
                state["status"] = "completed"
                state["message"] = (
                    f"Checked {result['checked']} competitor(s) — "
                    f"{result['total_new']} new product(s) need approval"
                )
                state["result"] = result
            except Exception as exc:  # noqa: BLE001
                state["status"] = "failed"
                state["message"] = str(exc)

        threading.Thread(target=worker, daemon=True).start()
        return token

    def get_async_status(self, token: str) -> dict[str, Any] | None:
        return self._running.get(token)


# Shared singleton for the web app
competitor_store = CompetitorStore()
competitor_watcher = CompetitorWatcher(competitor_store)
