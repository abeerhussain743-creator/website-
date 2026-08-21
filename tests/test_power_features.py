"""Tests for catalog discovery and filters."""

from __future__ import annotations

from product_scraper.models import ProductRecord
from product_scraper.scraper.catalog import normalize_product_url
from product_scraper.scraper.filters import filter_records, summarize_records


def test_normalize_product_url():
    assert (
        normalize_product_url("https://shop.example.com/collections/all/products/oak-plank?variant=1")
        == "https://shop.example.com/products/oak-plank"
    )
    assert normalize_product_url("https://shop.example.com/collections/tile") is None


def test_filter_records_price_and_brand():
    records = [
        ProductRecord(sku="A", brand="Daltile", price="10", availability="InStock"),
        ProductRecord(sku="B", brand="Emser", price="50", availability="OutOfStock"),
        ProductRecord(sku="C", brand="Daltile", price="30", availability="InStock"),
    ]
    out = filter_records(records, min_price=15, max_price=40, brand_contains="dalt", in_stock_only=True)
    assert [r.sku for r in out] == ["C"]


def test_summarize_records():
    records = [
        ProductRecord(sku="A", brand="X", price="10", specifications="a", image_urls="http://i"),
        ProductRecord(sku="B", brand="Y", price="20"),
    ]
    s = summarize_records(records)
    assert s["record_count"] == 2
    assert s["brand_count"] == 2
    assert s["price_min"] == 10
    assert s["with_specs"] == 1
