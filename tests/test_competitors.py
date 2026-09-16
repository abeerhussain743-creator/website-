"""Competitor watch store tests."""

from __future__ import annotations

from product_scraper.competitors.store import CompetitorStore


def test_competitor_new_product_alerts(tmp_path):
    store = CompetitorStore(tmp_path / "comp.db")
    comp = store.add_competitor("Demo Store", "https://demo.example.com/", max_discover=50)
    cid = comp["id"]

    first = store.upsert_seen_products(
        cid,
        [
            "https://demo.example.com/products/a",
            "https://demo.example.com/products/b",
        ],
    )
    assert set(first) == {
        "https://demo.example.com/products/a",
        "https://demo.example.com/products/b",
    }
    for url in first:
        store.create_alert(cid, url, f"New product {url}")

    assert store.count_pending(cid) == 2

    second = store.upsert_seen_products(
        cid,
        [
            "https://demo.example.com/products/a",
            "https://demo.example.com/products/b",
            "https://demo.example.com/products/c",
        ],
    )
    assert second == ["https://demo.example.com/products/c"]
    store.create_alert(cid, second[0], "New product c")
    assert store.count_pending(cid) == 3

    alerts = store.list_alerts(status="pending")
    ids = [a["id"] for a in alerts]
    store.set_alert_status(ids[:2], "approved")
    assert store.count_pending(cid) == 1


def test_duplicate_pending_alert_not_recreated(tmp_path):
    store = CompetitorStore(tmp_path / "comp2.db")
    comp = store.add_competitor("X", "https://x.example.com/")
    a1 = store.create_alert(comp["id"], "https://x.example.com/products/1", "new")
    a2 = store.create_alert(comp["id"], "https://x.example.com/products/1", "new again")
    assert a1["id"] == a2["id"]
    assert store.count_pending() == 1
