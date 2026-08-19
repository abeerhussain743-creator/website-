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


def _extract_specs(soup: BeautifulSoup) -> dict[str, Any]:
    specs: dict[str, Any] = {}
    # Definition lists
    for dl in soup.select(".product-specs, .specifications, #specifications, .product-attributes"):
        for row in dl.select("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                specs[clean_text(cells[0].get_text())] = clean_text(cells[1].get_text())
        for dt in dl.select("dt"):
            dd = dt.find_next_sibling("dd")
            if dd:
                specs[clean_text(dt.get_text())] = clean_text(dd.get_text())
    # Generic tables near "spec"
    for table in soup.select("table"):
        caption = clean_text(table.get("class") or "") + clean_text(table.find("caption").get_text() if table.find("caption") else "")
        if "spec" in caption.lower() or "attribute" in caption.lower() or "detail" in caption.lower():
            for row in table.select("tr"):
                cells = row.find_all(["th", "td"])
                if len(cells) >= 2:
                    specs[clean_text(cells[0].get_text())] = clean_text(cells[1].get_text())
    return {k: v for k, v in specs.items() if k and v}


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
    description = clean_text(data.get("description") or "")
    parent_id = clean_text(str(data.get("id") or data.get("handle") or title))
    images = []
    for img in data.get("images") or []:
        if isinstance(img, str):
            images.append(img if img.startswith("http") else f"https:{img}" if img.startswith("//") else urljoin(source_url, img))
        elif isinstance(img, dict) and img.get("src"):
            src = img["src"]
            images.append(src if src.startswith("http") else f"https:{src}" if src.startswith("//") else urljoin(source_url, src))

    records: list[ProductRecord] = []
    for variant in data.get("variants") or []:
        if not isinstance(variant, dict):
            continue
        option_values = [
            clean_text(variant.get(f"option{i}"))
            for i in range(1, 4)
            if clean_text(variant.get(f"option{i}"))
        ]
        color = ""
        size = ""
        options = data.get("options") or []
        for idx, opt_name in enumerate(options):
            name = clean_text(opt_name).lower() if isinstance(opt_name, str) else clean_text(
                opt_name.get("name") if isinstance(opt_name, dict) else ""
            ).lower()
            val = option_values[idx] if idx < len(option_values) else ""
            if "color" in name or "colour" in name:
                color = val
            elif "size" in name or "dimension" in name:
                size = val
            elif not color and idx == 0:
                color = val
            elif not size and idx == 1:
                size = val
        if not color and not size and option_values:
            color = option_values[0]
            size = option_values[1] if len(option_values) > 1 else ""

        price_raw = variant.get("price")
        if isinstance(price_raw, (int, float)) and price_raw > 1000:
            # Shopify sometimes stores cents
            price = f"{price_raw / 100:.2f}"
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

        records.append(
            ProductRecord(
                brand=brand,
                product_title=clean_text(variant.get("name")) or title,
                sku=clean_text(variant.get("sku") or variant.get("barcode") or str(variant.get("id") or "")),
                color=color,
                size=size,
                description=description,
                specifications="",
                availability=availability,
                price=price,
                currency="",
                image_urls=" | ".join(v_urls),
                source_url=source_url,
                parent_product_id=parent_id,
                raw_specs={"variant_id": variant.get("id"), "options": option_values},
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
