"""Data models for scraped product records."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


EXCEL_COLUMNS = [
    "brand",
    "product_title",
    "sku",
    "color",
    "size",
    "description",
    "specifications",
    "availability",
    "price",
    "currency",
    "image_urls",
    "source_url",
    "parent_product_id",
    "scraped_at",
]


@dataclass
class ProductRecord:
    """One row per SKU / variant."""

    brand: str = ""
    product_title: str = ""
    sku: str = ""
    color: str = ""
    size: str = ""
    description: str = ""
    specifications: str = ""
    availability: str = ""
    price: str = ""
    currency: str = ""
    image_urls: str = ""
    source_url: str = ""
    parent_product_id: str = ""
    scraped_at: str = ""
    raw_specs: dict[str, Any] = field(default_factory=dict, repr=False)

    def ensure_timestamp(self) -> None:
        if not self.scraped_at:
            self.scraped_at = datetime.now(timezone.utc).isoformat()

    def to_row(self) -> dict[str, str]:
        self.ensure_timestamp()
        return {col: getattr(self, col, "") or "" for col in EXCEL_COLUMNS}

    def to_dict(self) -> dict[str, Any]:
        self.ensure_timestamp()
        data = asdict(self)
        return data


@dataclass
class ScrapeFailure:
    url: str
    reason: str
    scraped_at: str = ""

    def __post_init__(self) -> None:
        if not self.scraped_at:
            self.scraped_at = datetime.now(timezone.utc).isoformat()


@dataclass
class ScrapeResult:
    records: list[ProductRecord] = field(default_factory=list)
    failures: list[ScrapeFailure] = field(default_factory=list)
    source_url: str = ""
    scraped_at: str = ""

    def __post_init__(self) -> None:
        if not self.scraped_at:
            self.scraped_at = datetime.now(timezone.utc).isoformat()
