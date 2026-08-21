"""DOM / HTML fallback extraction."""

from __future__ import annotations

import json
import logging
import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from product_scraper.models import ProductRecord
from product_scraper.scraper.normalize import (
    clean_text,
    normalize_image_urls,
    normalize_price,
    raw_specs_json,
    specs_to_string,
)

logger = logging.getLogger("product_scraper")

META_SELECTORS = {
    "title": [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        "h1.product-title",
        "h1.product__title",
        "h1[itemprop='name']",
        "h1",
    ],
    "description": [
        'meta[property="og:description"]',
        'meta[name="description"]',
        "[itemprop='description']",
        ".product-description",
        ".product__description",
        "#product-description",
    ],
    "image": [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        "[itemprop='image']",
    ],
    "brand": [
        'meta[property="product:brand"]',
        "[itemprop='brand']",
        ".product-brand",
        ".brand",
    ],
    "price": [
        'meta[property="product:price:amount"]',
        "[itemprop='price']",
        ".price",
        ".product-price",
        ".price__current",
        "[data-product-price]",
    ],
    "currency": [
        'meta[property="product:price:currency"]',
        "[itemprop='priceCurrency']",
    ],
    "availability": [
        'meta[property="product:availability"]',
        "[itemprop='availability']",
        ".availability",
        ".stock",
        ".product-availability",
    ],
    "sku": [
        "[itemprop='sku']",
        "[data-product-sku]",
        "[data-sku]",
        ".sku",
        ".product-sku",
        "#sku",
    ],
}


def _attr_or_text(el: Tag | None) -> str:
    if el is None:
        return ""
    for attr in ("content", "value", "data-price", "data-product-price", "data-sku"):
        if el.has_attr(attr) and el.get(attr):
            return clean_text(el.get(attr))
    return clean_text(el.get_text(" ", strip=True))


def _first_match(soup: BeautifulSoup, selectors: list[str]) -> str:
    for sel in selectors:
        el = soup.select_one(sel)
        val = _attr_or_text(el)
        if val:
            return val
    return ""


def _all_images(soup: BeautifulSoup, base_url: str) -> list[str]:
    urls: list[str] = []
    candidates = soup.select(
        ".product-gallery img, .product__media img, .product-images img, "
        "[data-product-image], .woocommerce-product-gallery img, "
        "img[itemprop='image'], .gallery img"
    )
    for img in candidates:
        src = (
            img.get("data-src")
            or img.get("data-zoom-image")
            or img.get("data-large_image")
            or img.get("src")
            or ""
        )
        if not src or src.startswith("data:"):
            continue
        abs_url = urljoin(base_url, src)
        if abs_url not in urls:
            urls.append(abs_url)
    og = soup.select_one('meta[property="og:image"]')
    if og and og.get("content"):
        abs_url = urljoin(base_url, og["content"])
        if abs_url not in urls:
            urls.insert(0, abs_url)
    return urls


def _normalize_spec_key(key: str) -> str:
    key = clean_text(key).rstrip(":").strip()
    return key


def _extract_variant_spec_tables(soup: BeautifulSoup) -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    """
    Parse FloorsCenter-style / Shopify theme spec tables.

    Rows look like:
      <tr class="table-row-spec" data-id="{variant_id}">
        <th class="spec-titles">Thickness:</th>
        <td class="spec-values">5.0 mm</td>
      </tr>

    Returns:
      (by_variant_id, shared_specs)
    """
    by_variant: dict[str, dict[str, str]] = {}
    shared: dict[str, str] = {}

    rows = soup.select("tr.table-row-spec, tr[data-id].table-row-spec, .product-specs tr, .specifications tr")
    if not rows:
        # Any table that uses spec-titles / spec-values
        rows = [
            tr
            for tr in soup.select("tr")
            if tr.select_one(".spec-titles") or tr.select_one("th.spec-titles")
        ]

    for tr in rows:
        title_el = tr.select_one(".spec-titles, th")
        value_el = tr.select_one(".spec-values, td")
        if not title_el or not value_el:
            cells = tr.find_all(["th", "td"])
            if len(cells) < 2:
                continue
            title_el, value_el = cells[0], cells[1]
        key = _normalize_spec_key(title_el.get_text(" ", strip=True))
        val = clean_text(value_el.get_text(" ", strip=True))
        if not key or not val:
            continue
        vid = clean_text(tr.get("data-id") or "")
        if vid:
            by_variant.setdefault(vid, {})[key] = val
        else:
            shared[key] = val

    # Also barcode-container rows may encode SKU in data-value
    for tr in soup.select("tr.barcode-container[data-id]"):
        vid = clean_text(tr.get("data-id") or "")
        barcode = clean_text(tr.get("data-value") or "")
        if vid and barcode:
            by_variant.setdefault(vid, {}).setdefault("Barcode", barcode)

    return by_variant, shared


def _extract_specs(soup: BeautifulSoup) -> dict[str, Any]:
    """Collect shared / visible product specifications from the page."""
    specs: dict[str, Any] = {}
    by_variant, shared = _extract_variant_spec_tables(soup)
    specs.update(shared)

    # Prefer the first visible variant's specs as a product-level fallback
    for tr in soup.select("tr.table-row-spec"):
        classes = " ".join(tr.get("class") or [])
        if "d-none" in classes or "hidden" in classes:
            continue
        vid = clean_text(tr.get("data-id") or "")
        if vid and vid in by_variant:
            for k, v in by_variant[vid].items():
                specs.setdefault(k, v)
            break

    # Definition lists / attribute blocks
    for dl in soup.select(
        ".product-specs, .specifications, #specifications, .product-attributes, "
        ".product-single__specs, .product__specs, .specs-table"
    ):
        for row in dl.select("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                key = _normalize_spec_key(cells[0].get_text())
                val = clean_text(cells[1].get_text())
                if key and val:
                    specs.setdefault(key, val)
        for dt in dl.select("dt"):
            dd = dt.find_next_sibling("dd")
            if dd:
                key = _normalize_spec_key(dt.get_text())
                val = clean_text(dd.get_text())
                if key and val:
                    specs.setdefault(key, val)

    # Generic tables that look like specs
    for table in soup.select("table"):
        class_text = " ".join(table.get("class") or []).lower()
        caption_el = table.find("caption")
        caption = clean_text(caption_el.get_text() if caption_el else "").lower()
        has_spec_cells = bool(table.select(".spec-titles, .spec-values, .table-row-spec"))
        if has_spec_cells or "spec" in class_text or "attribute" in class_text or "detail" in caption or "spec" in caption:
            for row in table.select("tr"):
                cells = row.find_all(["th", "td"])
                if len(cells) >= 2:
                    key = _normalize_spec_key(cells[0].get_text())
                    val = clean_text(cells[1].get_text())
                    if key and val and key.lower() not in {k.lower() for k in specs}:
                        # Skip variant-hidden duplicates without data-id already handled
                        if row.get("data-id") and "d-none" in " ".join(row.get("class") or []):
                            continue
                        if not row.get("data-id"):
                            specs[key] = val

    return {k: v for k, v in specs.items() if k and v}


def attach_specs_to_records(records: list[ProductRecord], html: str) -> list[ProductRecord]:
    """Merge per-variant and shared HTML specs onto scraped records."""
    if not records or not html:
        return records
    soup = BeautifulSoup(html, "lxml")
    by_variant, shared = _extract_variant_spec_tables(soup)
    fallback = _extract_specs(soup)

    # Index variant specs by barcode/SKU too
    by_sku: dict[str, dict[str, str]] = {}
    for vid, specs in by_variant.items():
        barcode = clean_text(specs.get("Barcode") or "")
        if barcode:
            by_sku[barcode] = specs

    for rec in records:
        matched: dict[str, str] = {}
        vid = clean_text(str((rec.raw_specs or {}).get("variant_id") or ""))
        if vid and vid in by_variant:
            matched = dict(by_variant[vid])
        elif rec.sku and rec.sku in by_sku:
            matched = dict(by_sku[rec.sku])
        else:
            matched = dict(fallback)

        # Layer shared keys underneath
        merged = {**shared, **matched}
        if not merged and fallback:
            merged = dict(fallback)

        if merged:
            # Keep existing raw_specs keys (variant_id/options) and add specs
            raw = dict(rec.raw_specs or {})
            for k, v in merged.items():
                raw[k] = v
            rec.raw_specs = raw
            rec.specifications = specs_to_string(merged)

            # Fill color/size from specs when missing
            if not rec.color:
                for key in ("Color Shade", "Color", "Colour", "Shade"):
                    if merged.get(key):
                        rec.color = clean_text(merged[key])
                        break
            if not rec.size:
                width = merged.get("Width") or ""
                length = merged.get("Length") or ""
                if width and length:
                    rec.size = f"{width} x {length}"
                else:
                    for key in ("Size", "Dimensions", "Coverage Area"):
                        if merged.get(key) and key != "Coverage Area":
                            rec.size = clean_text(merged[key])
                            break
    return records


def _shopify_variants(soup: BeautifulSoup, source_url: str) -> list[ProductRecord] | None:
    """Parse Shopify product JSON embedded in the page."""
    patterns = [
        re.compile(r"var\s+meta\s*=\s*(\{.*?\});\s*", re.S),
        re.compile(r"Shopify\.analytics\.meta\s*=\s*(\{.*?\});\s*", re.S),
    ]
    text = str(soup)
    # Prefer application/json product scripts / product JSON
    for script in soup.find_all("script"):
        stype = (script.get("type") or "").lower()
        content = script.string or script.get_text() or ""
        if not content:
            continue
        if "ProductJson" in (script.get("id") or "") or stype == "application/json" and "variants" in content:
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                continue
            if isinstance(data, dict) and "variants" in data:
                return _records_from_shopify_product(data, source_url)

    # window.ShopifyAnalytics or product: { ... }
    m = re.search(r'(?:"?product"?\s*:\s*)(\{.*?"variants"\s*:\s*\[.*?\].*?\})', text, re.S)
    if m:
        try:
            data = json.loads(m.group(1))
            if isinstance(data, dict) and data.get("variants"):
                return _records_from_shopify_product(data, source_url)
        except json.JSONDecodeError:
            pass
    return None


def _records_from_shopify_product(data: dict[str, Any], source_url: str) -> list[ProductRecord]:
    brand = clean_text(data.get("vendor") or "")
    title = clean_text(data.get("title") or data.get("name") or "")
    description = clean_text(BeautifulSoup(data.get("description") or "", "lxml").get_text(" ", strip=True))
    parent_id = clean_text(str(data.get("handle") or data.get("id") or title))
    product_type = clean_text(data.get("type") or "")
    images = []
    for img in data.get("images") or []:
        if isinstance(img, str):
            images.append(img if img.startswith("http") else f"https:{img}" if img.startswith("//") else urljoin(source_url, img))
        elif isinstance(img, dict) and img.get("src"):
            src = img["src"]
            images.append(src if src.startswith("http") else f"https:{src}" if src.startswith("//") else urljoin(source_url, src))

    # Normalize option names list
    option_names: list[str] = []
    for opt in data.get("options") or []:
        if isinstance(opt, str):
            option_names.append(opt)
        elif isinstance(opt, dict):
            option_names.append(clean_text(opt.get("name") or opt.get("title") or ""))

    records: list[ProductRecord] = []
    for variant in data.get("variants") or []:
        if not isinstance(variant, dict):
            continue
        option_values = [
            clean_text(variant.get(f"option{i}"))
            for i in range(1, 4)
            if clean_text(variant.get(f"option{i}"))
        ]
        # Also accept options array on the variant
        if not option_values and isinstance(variant.get("options"), list):
            option_values = [clean_text(v) for v in variant["options"] if clean_text(v)]

        color = ""
        size = ""
        for idx, val in enumerate(option_values):
            name = option_names[idx].lower() if idx < len(option_names) else ""
            if any(k in name for k in ("color", "colour", "shade", "finish", "tone")):
                color = val
            elif any(k in name for k in ("size", "dimension", "width", "length", "format")):
                size = val
            elif not color and idx == 0:
                color = val
            elif not size and idx == 1:
                size = val
        if not color and not size and option_values:
            color = option_values[0]
            size = option_values[1] if len(option_values) > 1 else ""

        price_raw = variant.get("price")
        if isinstance(price_raw, (int, float)) and float(price_raw) >= 100 and float(price_raw) == int(price_raw):
            # Shopify product.js stores cents as integers
            price = f"{float(price_raw) / 100:.2f}"
        else:
            price, _ = normalize_price(price_raw)

        vimg = variant.get("featured_image") or {}
        v_urls = []
        if isinstance(vimg, dict) and vimg.get("src"):
            src = vimg["src"]
            v_urls.append(src if src.startswith("http") else f"https:{src}" if src.startswith("//") else urljoin(source_url, src))
        elif images:
            v_urls = list(images)

        available = variant.get("available")
        availability = "InStock" if available else ("OutOfStock" if available is False else clean_text(variant.get("availability")))

        sku = clean_text(variant.get("sku") or variant.get("barcode") or "")
        variant_id = variant.get("id")
        # Prefer real SKU; keep variant id only as fallback when no SKU
        if not sku and variant_id is not None:
            sku = str(variant_id)

        raw = {
            "variant_id": variant_id,
            "options": option_values,
        }
        if product_type:
            raw["Product Type"] = product_type

        records.append(
            ProductRecord(
                brand=brand,
                product_title=clean_text(variant.get("name")) or title,
                sku=sku,
                color=color,
                size=size,
                description=description,
                specifications=specs_to_string({"Product Type": product_type} if product_type else {}),
                availability=availability,
                price=price,
                currency="USD",
                image_urls=" | ".join(v_urls),
                source_url=source_url,
                parent_product_id=parent_id,
                raw_specs=raw,
            )
        )
    return records


def _guess_color_size(soup: BeautifulSoup) -> tuple[str, str]:
    color = ""
    size = ""
    for sel in [
        "[data-option-name*='olor' i]",
        ".swatch-selected",
        ".selected-color",
        "[aria-label*='Color' i].selected",
    ]:
        el = soup.select_one(sel)
        if el:
            color = _attr_or_text(el) or clean_text(el.get("data-value") or el.get("title"))
            if color:
                break
    for sel in [
        "[data-option-name*='ize' i]",
        ".selected-size",
        "select[name*='ize' i] option[selected]",
    ]:
        el = soup.select_one(sel)
        if el:
            size = _attr_or_text(el) or clean_text(el.get("data-value") or el.get("title"))
            if size:
                break
    selected = soup.select(".variant-option.selected, .product-form__input .selected, [aria-checked='true']")
    for el in selected:
        label = clean_text(el.get("data-option") or el.get("name") or "").lower()
        val = _attr_or_text(el) or clean_text(el.get("data-value") or el.get("title") or el.get("aria-label"))
        if "color" in label or "colour" in label:
            color = color or val
        elif "size" in label:
            size = size or val
    return color, size


def extract_from_dom(html: str, source_url: str) -> list[ProductRecord]:
    soup = BeautifulSoup(html, "lxml")

    shopify = _shopify_variants(soup, source_url)
    if shopify:
        shopify = attach_specs_to_records(shopify, html)
        logger.info("DOM/Shopify extracted %d variant record(s)", len(shopify))
        return shopify

    title = _first_match(soup, META_SELECTORS["title"])
    description = _first_match(soup, META_SELECTORS["description"])
    brand = _first_match(soup, META_SELECTORS["brand"])
    sku = _first_match(soup, META_SELECTORS["sku"])
    price_raw = _first_match(soup, META_SELECTORS["price"])
    currency_meta = _first_match(soup, META_SELECTORS["currency"])
    availability = _first_match(soup, META_SELECTORS["availability"])
    price, currency = normalize_price(price_raw)
    currency = currency or currency_meta
    color, size = _guess_color_size(soup)
    specs = _extract_specs(soup)
    images = _all_images(soup, source_url)

    if not title and not sku:
        logger.info("DOM extraction found no product title/SKU")
        return []

    record = ProductRecord(
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
        image_urls=normalize_image_urls(images, source_url),
        source_url=source_url,
        parent_product_id=sku or title,
        raw_specs=raw_specs_json(specs),
    )
    logger.info("DOM extracted 1 product record")
    return [record]
