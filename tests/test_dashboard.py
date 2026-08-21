"""Dashboard API smoke tests."""

from __future__ import annotations

import time
from pathlib import Path

from fastapi.testclient import TestClient

from product_scraper.models import ScrapeResult
from product_scraper.scraper import engine as engine_mod
from product_scraper.scraper.jsonld import extract_from_jsonld
from product_scraper.web.app import app
from product_scraper.web import jobs as jobs_mod
from product_scraper.web.jobs import JobManager


def test_index_renders():
    client = TestClient(app)
    res = client.get("/")
    assert res.status_code == 200
    assert "VariantXL" in res.text
    assert "Fields to keep" in res.text


def test_fields_endpoint():
    client = TestClient(app)
    res = client.get("/api/fields")
    assert res.status_code == 200
    data = res.json()
    assert "sku" in data["defaults"]
    assert any(f["id"] == "specifications" for f in data["fields"])


def test_scrape_job_with_fixture(tmp_path, monkeypatch):
    html = (Path(__file__).parent / "fixtures" / "sample_product.html").read_text(encoding="utf-8")

    def fake_scrape_url(self, url: str):
        records = extract_from_jsonld(html, url)
        return ScrapeResult(records=records, source_url=url)

    monkeypatch.setattr(engine_mod.ProductScraper, "scrape_url", fake_scrape_url)
    monkeypatch.setattr(engine_mod.ProductScraper, "_fetch_shopify_product_js", lambda self, url: None)

    mgr = JobManager(output_dir=tmp_path)
    monkeypatch.setattr(jobs_mod, "job_manager", mgr)
    # Routes import job_manager from jobs module at call time via app.py reference
    import product_scraper.web.app as app_module

    monkeypatch.setattr(app_module, "job_manager", mgr)

    client = TestClient(app)
    res = client.post(
        "/api/scrape",
        json={
            "urls": ["https://shop.example.com/products/oak"],
            "fields": ["sku", "product_title", "color", "price", "specifications"],
            "use_browser": False,
            "interact_variants": False,
        },
    )
    assert res.status_code == 200
    job_id = res.json()["id"]

    job = None
    for _ in range(50):
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] in ("completed", "failed"):
            break
        time.sleep(0.1)

    assert job is not None
    assert job["status"] == "completed", job
    assert job["record_count"] >= 2
    xlsx = client.get(f"/api/jobs/{job_id}/download.xlsx")
    assert xlsx.status_code == 200
