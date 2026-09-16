"""Post-scrape filters and result helpers."""

from __future__ import annotations

import re
from typing import Iterable

from product_scraper.models import ProductRecord


def _price_num(value: str) -> float | None:
    if value is None or value == "":
        return None
    text = str(value).replace(",", "")
    m = re.search(r"-?\d+(?:\.\d+)?", text)
    if not m:
        return None
    try:
        return float(m.group(0))
    except ValueError:
        return None


def filter_records(
    records: Iterable[ProductRecord],
    *,
    min_price: float | None = None,
    max_price: float | None = None,
    in_stock_only: bool = False,
    brand_contains: str = "",
    query: str = "",
) -> list[ProductRecord]:
    brand_q = brand_contains.strip().lower()
    q = query.strip().lower()
    out: list[ProductRecord] = []
    for rec in records:
        price = _price_num(rec.price)
        if min_price is not None and (price is None or price < min_price):
            continue
        if max_price is not None and (price is None or price > max_price):
            continue
        if in_stock_only:
            avail = (rec.availability or "").lower()
            if avail and ("outofstock" in avail.replace(" ", "") or avail in {"false", "0", "sold out", "unavailable"}):
                continue
            if avail and "instock" not in avail.replace(" ", "") and "in stock" not in avail:
                # If availability is unknown, keep; if explicitly out, drop above
                if any(x in avail for x in ("out", "sold", "unavail")):
                    continue
        if brand_q and brand_q not in (rec.brand or "").lower():
            continue
        if q:
            blob = " ".join(
                [
                    rec.sku or "",
                    rec.product_title or "",
                    rec.brand or "",
                    rec.color or "",
                    rec.specifications or "",
                ]
            ).lower()
            if q not in blob:
                continue
        out.append(rec)
    return out


def summarize_records(records: list[ProductRecord]) -> dict:
    prices = [p for p in (_price_num(r.price) for r in records) if p is not None]
    brands = sorted({(r.brand or "").strip() for r in records if (r.brand or "").strip()})
    return {
        "record_count": len(records),
        "brand_count": len(brands),
        "brands": brands[:40],
        "price_min": min(prices) if prices else None,
        "price_max": max(prices) if prices else None,
        "with_specs": sum(1 for r in records if (r.specifications or "").strip()),
        "with_images": sum(1 for r in records if (r.image_urls or "").strip()),
    }
