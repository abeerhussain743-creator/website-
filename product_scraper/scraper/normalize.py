"""Field normalization and cleaning."""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urljoin, urlparse


_WS_RE = re.compile(r"\s+")
_PRICE_RE = re.compile(r"([€$£¥]|USD|EUR|GBP|CAD|AUD)?\s*([\d,.]+)\s*([€$£¥]|USD|EUR|GBP|CAD|AUD)?", re.I)


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        parts = [clean_text(v) for v in value if v]
        return " | ".join(p for p in parts if p)
    text = str(value).strip()
    text = _WS_RE.sub(" ", text)
    return text


def absolute_url(base: str, maybe_relative: str | None) -> str:
    if not maybe_relative:
        return ""
    maybe_relative = maybe_relative.strip()
    if not maybe_relative:
        return ""
    if maybe_relative.startswith("//"):
        scheme = urlparse(base).scheme or "https"
        return f"{scheme}:{maybe_relative}"
    return urljoin(base, maybe_relative)


def normalize_image_urls(images: Any, base_url: str = "") -> str:
    urls: list[str] = []
    if images is None:
        return ""
    if isinstance(images, str):
        images = [images]
    if isinstance(images, dict):
        images = [images.get("url") or images.get("contentUrl") or ""]
    for item in images:
        if isinstance(item, dict):
            raw = item.get("url") or item.get("contentUrl") or ""
        else:
            raw = item
        url = absolute_url(base_url, clean_text(raw))
        if url and url not in urls:
            urls.append(url)
    return " | ".join(urls)


def normalize_price(value: Any) -> tuple[str, str]:
    """Return (price, currency)."""
    if value is None:
        return "", ""
    if isinstance(value, (int, float)):
        return str(value), ""
    if isinstance(value, dict):
        amount = value.get("value") or value.get("price") or value.get("amount") or ""
        currency = value.get("currency") or value.get("priceCurrency") or ""
        return clean_text(amount), clean_text(currency)

    text = clean_text(value)
    match = _PRICE_RE.search(text)
    if not match:
        return text, ""
    currency = match.group(1) or match.group(3) or ""
    amount = match.group(2).replace(",", "") if match.group(2) else ""
    symbol_map = {"€": "EUR", "$": "USD", "£": "GBP", "¥": "JPY"}
    currency = symbol_map.get(currency, currency)
    return amount, currency.upper() if currency else ""


def specs_to_string(specs: Any) -> str:
    if not specs:
        return ""
    if isinstance(specs, str):
        return clean_text(specs)
    if isinstance(specs, dict):
        parts = [f"{clean_text(k)}: {clean_text(v)}" for k, v in specs.items() if clean_text(v)]
        return "; ".join(parts)
    if isinstance(specs, list):
        parts = []
        for item in specs:
            if isinstance(item, dict):
                name = clean_text(item.get("name") or item.get("key") or "")
                val = clean_text(item.get("value") or item.get("text") or "")
                if name and val:
                    parts.append(f"{name}: {val}")
                elif val:
                    parts.append(val)
            else:
                parts.append(clean_text(item))
        return "; ".join(p for p in parts if p)
    return clean_text(specs)


def raw_specs_json(specs: Any) -> dict[str, Any]:
    if isinstance(specs, dict):
        return {str(k): v for k, v in specs.items()}
    if isinstance(specs, list):
        out: dict[str, Any] = {}
        for idx, item in enumerate(specs):
            if isinstance(item, dict):
                name = item.get("name") or item.get("key") or f"spec_{idx}"
                out[str(name)] = item.get("value") or item.get("text") or item
            else:
                out[f"spec_{idx}"] = item
        return out
    if specs:
        return {"raw": specs}
    return {}


def join_images_for_excel(urls: list[str], max_cols: int = 5) -> dict[str, str]:
    """Split image URLs into image_1..image_N plus a joined image_urls field."""
    result = {"image_urls": " | ".join(urls)}
    for i in range(max_cols):
        result[f"image_{i + 1}"] = urls[i] if i < len(urls) else ""
    return result


CURRENCY_SYMBOLS = {"EUR": "€", "USD": "$", "GBP": "£", "JPY": "¥"}
