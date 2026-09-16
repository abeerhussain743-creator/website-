"""SKU validation and record quality checks."""

from __future__ import annotations

import logging
from collections import Counter

from product_scraper.models import ProductRecord

logger = logging.getLogger("product_scraper")


def validate_records(records: list[ProductRecord]) -> tuple[list[ProductRecord], list[str]]:
    """
    Validate SKU records.

    - Flag missing SKUs (auto-generate a stable fallback when possible)
    - Flag duplicate SKUs
    - Drop completely empty rows
    """
    warnings: list[str] = []
    cleaned: list[ProductRecord] = []

    for idx, rec in enumerate(records):
        if not any([rec.product_title, rec.sku, rec.image_urls, rec.price]):
            warnings.append(f"Dropped empty record at index {idx}")
            continue
        if not rec.sku:
            fallback = _fallback_sku(rec, idx)
            warnings.append(f"Missing SKU for '{rec.product_title}' — assigned fallback '{fallback}'")
            rec.sku = fallback
        cleaned.append(rec)

    sku_counts = Counter(r.sku for r in cleaned)
    duplicates = [sku for sku, count in sku_counts.items() if count > 1]
    if duplicates:
        for sku in duplicates:
            warnings.append(f"Duplicate SKU detected: {sku}")
        # Disambiguate duplicates by appending color/size
        seen: dict[str, int] = {}
        for rec in cleaned:
            if sku_counts[rec.sku] <= 1:
                continue
            seen[rec.sku] = seen.get(rec.sku, 0) + 1
            suffix_parts = [p for p in (rec.color, rec.size) if p]
            if suffix_parts:
                rec.sku = f"{rec.sku}-{'/'.join(suffix_parts)}"
            else:
                rec.sku = f"{rec.sku}-{seen[rec.sku]}"

    return cleaned, warnings


def _fallback_sku(rec: ProductRecord, idx: int) -> str:
    parts = [p for p in (rec.parent_product_id, rec.product_title, rec.color, rec.size) if p]
    base = "-".join(parts) if parts else f"item-{idx + 1}"
    # Compact and filesystem-safe-ish
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in base)
    while "--" in safe:
        safe = safe.replace("--", "-")
    return safe.strip("-")[:80] or f"item-{idx + 1}"
