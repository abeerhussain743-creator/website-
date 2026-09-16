"""JSON-LD / structured data extraction (preferred path)."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from bs4 import BeautifulSoup

from product_scraper.models import ProductRecord
from product_scraper.scraper.normalize import (
    clean_text,
    normalize_image_urls,
    normalize_price,
    raw_specs_json,
    specs_to_string,
)

logger = logging.getLogger("product_scraper")


def _parse_json_safe(text: str) -> Any | None:
    text = text.strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Some sites emit trailing commas or // comments
        cleaned = re.sub(r",\s*([}\]])", r"\1", text)
        cleaned = re.sub(r"^\s*//.*?$", "", cleaned, flags=re.M)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.debug("Failed to parse JSON-LD block")
            return None


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _types(node: dict[str, Any]) -> set[str]:
    raw = node.get("@type") or node.get("type") or ""
    if isinstance(raw, list):
        return {str(t).lower() for t in raw}
    return {str(raw).lower()} if raw else set()


def _walk_nodes(data: Any) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    if isinstance(data, dict):
        if "@graph" in data:
            for item in _as_list(data["@graph"]):
                nodes.extend(_walk_nodes(item))
        else:
            nodes.append(data)
            for key in ("mainEntity", "item", "product"):
                if key in data:
                    nodes.extend(_walk_nodes(data[key]))
    elif isinstance(data, list):
        for item in data:
            nodes.extend(_walk_nodes(item))
    return nodes


def extract_jsonld_blocks(html: str) -> list[Any]:
    soup = BeautifulSoup(html, "lxml")
    blocks: list[Any] = []
    for tag in soup.find_all("script", attrs={"type": re.compile(r"ld\+json", re.I)}):
        parsed = _parse_json_safe(tag.string or tag.get_text() or "")
        if parsed is not None:
            blocks.append(parsed)
    return blocks


def _brand_name(brand: Any) -> str:
    if isinstance(brand, dict):
        return clean_text(brand.get("name") or brand.get("@id") or "")
    return clean_text(brand)


def _availability(offers: dict[str, Any] | None) -> str:
    if not offers:
        return ""
    avail = offers.get("availability") or offers.get("itemAvailability") or ""
    text = clean_text(avail)
    if "/" in text:
        text = text.rsplit("/", 1)[-1]
    return text


def _offer_fields(node: dict[str, Any]) -> tuple[str, str, str]:
    offers = node.get("offers")
    if isinstance(offers, list) and offers:
        offers = offers[0]
    if not isinstance(offers, dict):
        price, currency = normalize_price(node.get("price"))
        return price, currency or clean_text(node.get("priceCurrency")), ""
    price, currency = normalize_price(offers.get("price") or offers.get("lowPrice"))
    currency = currency or clean_text(offers.get("priceCurrency"))
    return price, currency, _availability(offers)


def _sku_from_node(node: dict[str, Any]) -> str:
    for key in ("sku", "mpn", "productID", "gtin", "gtin13", "gtin14", "gtin12", "gtin8"):
        val = clean_text(node.get(key))
        if val:
            return val
    return ""


def _color_size(node: dict[str, Any]) -> tuple[str, str]:
    color = clean_text(node.get("color") or node.get("colour"))
    size = clean_text(node.get("size"))
    additional = node.get("additionalProperty") or node.get("additionalProperties") or []
    for prop in _as_list(additional):
        if not isinstance(prop, dict):
            continue
        name = clean_text(prop.get("name") or prop.get("propertyID") or "").lower()
        value = clean_text(prop.get("value"))
        if not value:
            continue
        if "color" in name or "colour" in name:
            color = color or value
        elif "size" in name or "dimension" in name:
            size = size or value
    return color, size


def product_nodes_from_jsonld(html: str) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    for block in extract_jsonld_blocks(html):
        for node in _walk_nodes(block):
            if not isinstance(node, dict):
                continue
            types = _types(node)
            if "product" in types or "productgroup" in types:
                products.append(node)
            elif "offer" in types and node.get("itemOffered"):
                offered = node["itemOffered"]
                if isinstance(offered, dict) and "product" in _types(offered):
                    products.append(offered)
    return products


def records_from_product_node(
    node: dict[str, Any],
    source_url: str,
    parent_id: str = "",
    inherited: dict[str, Any] | None = None,
) -> list[ProductRecord]:
    """Expand a Product / ProductGroup node into one record per variant/SKU."""
    inherited = dict(inherited or {})
    records: list[ProductRecord] = []
    types = _types(node)
    brand = _brand_name(node.get("brand")) or inherited.get("brand", "")
    title = clean_text(node.get("name") or node.get("title")) or inherited.get("title", "")
    description = clean_text(node.get("description")) or inherited.get("description", "")
    specs = {}
    for key in ("additionalProperty", "additionalProperties"):
        if node.get(key):
            specs = raw_specs_json(node[key])
            break
    if not specs and inherited.get("_specs"):
        specs = inherited["_specs"]  # type: ignore[assignment]

    # ProductGroup with hasVariant / variesBy
    variants = []
    for key in ("hasVariant", "model"):
        variants.extend([v for v in _as_list(node.get(key)) if isinstance(v, dict)])

    group_id = clean_text(node.get("productGroupID") or node.get("@id") or parent_id or title)

    if ("productgroup" in types or variants) and variants:
        child_inherited: dict[str, Any] = {
            "brand": brand,
            "title": title,
            "description": description,
            "_specs": specs,
        }
        for variant in variants:
            records.extend(
                records_from_product_node(
                    variant,
                    source_url,
                    parent_id=group_id,
                    inherited=child_inherited,
                )
            )
        if records:
            return records

    # Nested offers that look like variants
    offers = node.get("offers")
    offer_list = _as_list(offers) if isinstance(offers, list) else []
    variant_like_offers = [
        o
        for o in offer_list
        if isinstance(o, dict) and (o.get("sku") or o.get("name") or o.get("color") or o.get("size"))
    ]
    if len(variant_like_offers) > 1:
        for offer in variant_like_offers:
            price, currency = normalize_price(offer.get("price"))
            currency = currency or clean_text(offer.get("priceCurrency"))
            color, size = _color_size(offer)
            sku = _sku_from_node(offer) or _sku_from_node(node)
            images = normalize_image_urls(
                offer.get("image") or node.get("image"),
                source_url,
            )
            records.append(
                ProductRecord(
                    brand=brand,
                    product_title=clean_text(offer.get("name")) or title,
                    sku=sku,
                    color=color,
                    size=size,
                    description=description,
                    specifications=specs_to_string(specs),
                    availability=_availability(offer),
                    price=price,
                    currency=currency,
                    image_urls=images,
                    source_url=source_url,
                    parent_product_id=group_id,
                    raw_specs=specs,
                )
            )
        return records

    price, currency, availability = _offer_fields(node)
    color, size = _color_size(node)
    sku = _sku_from_node(node)
    images = normalize_image_urls(node.get("image") or node.get("images"), source_url)

    records.append(
        ProductRecord(
            brand=brand,
            product_title=title,
            sku=sku,
            color=color,
            size=size,
            description=description,
            specifications=specs_to_string(specs),
            availability=availability,
            price=price,
            currency=currency,
            image_urls=images,
            source_url=source_url,
            parent_product_id=parent_id or group_id,
            raw_specs=specs,
        )
    )
    return records


def extract_from_jsonld(html: str, source_url: str) -> list[ProductRecord]:
    products = product_nodes_from_jsonld(html)
    if not products:
        return []
    records: list[ProductRecord] = []
    for node in products:
        records.extend(records_from_product_node(node, source_url))
    logger.info("JSON-LD extracted %d product node(s) → %d record(s)", len(products), len(records))
    return records
