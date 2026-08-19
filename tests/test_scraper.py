"""Tests for JSON-LD extraction, validation, Excel export, and refresh compare."""

from __future__ import annotations

from pathlib import Path

import pytest

from product_scraper.export.excel import export_excel, records_to_dataframe
from product_scraper.models import ProductRecord
from product_scraper.refresh.history import ScrapeHistory
from product_scraper.scraper.dom import extract_from_dom
from product_scraper.scraper.jsonld import extract_from_jsonld
from product_scraper.scraper.normalize import normalize_price, specs_to_string
from product_scraper.scraper.validators import validate_records

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_html() -> str:
    return (FIXTURES / "sample_product.html").read_text(encoding="utf-8")


def test_jsonld_extracts_variants(sample_html: str) -> None:
    records = extract_from_jsonld(sample_html, "https://shop.example.com/products/oak-timber-plank")
    assert len(records) == 2
    skus = {r.sku for r in records}
    assert skus == {"OTP-BLK-120", "OTP-GRY-120"}
    black = next(r for r in records if r.sku == "OTP-BLK-120")
    assert black.color == "Black"
    assert black.size == "120x20cm"
    assert black.brand == "Nordic Floors"
    assert black.price == "89.00"
    assert black.currency == "USD"
    assert "oak-black-1.jpg" in black.image_urls
    assert black.parent_product_id == "OTP-PARENT"


def test_dom_fallback_extracts_base_fields(sample_html: str) -> None:
    records = extract_from_dom(sample_html, "https://shop.example.com/products/oak")
    assert len(records) >= 1
    rec = records[0]
    assert "Oak Timber Plank" in rec.product_title
    assert rec.brand == "Nordic Floors"


def test_validate_assigns_fallback_sku() -> None:
    records = [
        ProductRecord(product_title="Widget", color="Red", size="M"),
        ProductRecord(product_title="Widget", sku="W-1", color="Blue"),
    ]
    cleaned, warnings = validate_records(records)
    assert len(cleaned) == 2
    assert cleaned[0].sku
    assert any("Missing SKU" in w for w in warnings)


def test_validate_disambiguates_duplicate_skus() -> None:
    records = [
        ProductRecord(sku="X1", product_title="A", color="Black"),
        ProductRecord(sku="X1", product_title="A", color="Gray"),
    ]
    cleaned, warnings = validate_records(records)
    assert cleaned[0].sku != cleaned[1].sku
    assert any("Duplicate SKU" in w for w in warnings)


def test_normalize_price() -> None:
    assert normalize_price("$89.00") == ("89.00", "USD")
    assert normalize_price({"price": "10", "priceCurrency": "EUR"}) == ("10", "EUR")


def test_specs_to_string() -> None:
    assert "Material: Oak" in specs_to_string({"Material": "Oak", "Finish": "Matte"})


def test_excel_export(tmp_path: Path, sample_html: str) -> None:
    records = extract_from_jsonld(sample_html, "https://shop.example.com/p/oak")
    out = export_excel(records, tmp_path / "products.xlsx")
    assert out.exists()
    df = records_to_dataframe(records)
    assert list(df["sku"]) == ["OTP-BLK-120", "OTP-GRY-120"]
    assert "image_1" in df.columns


def test_history_compare(tmp_path: Path) -> None:
    db = tmp_path / "history.db"
    history = ScrapeHistory(db)
    first = [
        ProductRecord(sku="A1", product_title="Item", price="10", currency="USD", color="Black"),
    ]
    history.save_run("run1", first)

    second = [
        ProductRecord(sku="A1", product_title="Item", price="12", currency="USD", color="Black"),
        ProductRecord(sku="B2", product_title="New", price="5", currency="USD"),
    ]
    changed = history.compare(second)
    assert "price" in changed["A1"]
    assert changed["B2"] == {"(new)"}


def test_never_merge_different_skus(sample_html: str) -> None:
    records = extract_from_jsonld(sample_html, "https://shop.example.com/p/oak")
    assert len(records) == 2
    assert records[0].sku != records[1].sku
