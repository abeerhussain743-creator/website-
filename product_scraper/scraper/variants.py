"""Interactive variant discovery via Playwright."""

from __future__ import annotations

import logging
import re
from typing import Any

from product_scraper.models import ProductRecord
from product_scraper.scraper.normalize import clean_text

logger = logging.getLogger("product_scraper")

# Selectors commonly used for color/size option controls
OPTION_GROUP_SELECTORS = [
    "[data-option-name]",
    ".product-form__input",
    ".variant-input-wrap",
    ".swatch-attribute",
    ".product-options",
    "fieldset[name*='option' i]",
    ".single-option-selector",
]

OPTION_CONTROL_SELECTORS = [
    "button[data-value]",
    "input[type='radio']",
    "label[data-value]",
    "[role='radio']",
    "[role='option']",
    "select option",
    ".swatch-element",
    ".variant__button-label",
]


async def discover_and_scrape_variants(page: Any, source_url: str, extract_fn) -> list[ProductRecord]:
    """
    Attempt to click through visible color/size options and scrape each state.

    extract_fn(html, url) -> list[ProductRecord]
    """
    records: list[ProductRecord] = []
    seen_skus: set[str] = set()

    async def capture(label: str = "") -> None:
        html = await page.content()
        batch = extract_fn(html, source_url)
        for rec in batch:
            key = rec.sku or f"{rec.product_title}|{rec.color}|{rec.size}|{rec.price}"
            if key in seen_skus:
                continue
            seen_skus.add(key)
            if label and not rec.color and not rec.size:
                # Heuristic: label may be "Color: Black" or just "Black"
                if ":" in label:
                    name, val = label.split(":", 1)
                    name_l = name.strip().lower()
                    val = val.strip()
                    if "color" in name_l or "colour" in name_l:
                        rec.color = val
                    elif "size" in name_l:
                        rec.size = val
                    else:
                        rec.color = rec.color or val
                else:
                    rec.color = rec.color or label
            records.append(rec)

    # Baseline capture
    await capture("baseline")

    # Collect clickable option controls (limit to avoid combinatorial explosion)
    controls = await page.query_selector_all(
        "button[data-value], label[for*='option'], "
        ".swatch:not(.disabled), [data-option-value], "
        ".product-form__input input[type='radio'] + label, "
        "[role='radio']:not([aria-disabled='true'])"
    )

    # Cap interactions for reliability
    max_clicks = 40
    clicked = 0
    for control in controls:
        if clicked >= max_clicks:
            break
        try:
            disabled = await control.get_attribute("disabled")
            aria_disabled = await control.get_attribute("aria-disabled")
            classes = (await control.get_attribute("class")) or ""
            if disabled is not None or aria_disabled == "true" or "disabled" in classes.lower():
                continue
            label = (
                clean_text(await control.get_attribute("data-value"))
                or clean_text(await control.get_attribute("aria-label"))
                or clean_text(await control.get_attribute("title"))
                or clean_text(await control.inner_text())
            )
            if not label or len(label) > 80:
                continue
            await control.click(timeout=3000)
            clicked += 1
            await page.wait_for_timeout(400)
            await capture(label)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Variant click skipped: %s", exc)
            continue

    # Also try <select> option loops
    selects = await page.query_selector_all(
        "select[name*='option' i], select[id*='option' i], select.single-option-selector, "
        "select[name*='Size' i], select[name*='Color' i]"
    )
    for select in selects:
        try:
            options = await select.query_selector_all("option")
            for opt in options[:15]:
                value = await opt.get_attribute("value")
                if value is None or value == "":
                    continue
                text = clean_text(await opt.inner_text())
                await select.select_option(value=value)
                await page.wait_for_timeout(400)
                await capture(text)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Select variant skipped: %s", exc)

    logger.info("Variant interaction captured %d unique record(s) from %d clicks", len(records), clicked)
    return records


def merge_variant_records(primary: list[ProductRecord], secondary: list[ProductRecord]) -> list[ProductRecord]:
    """Prefer primary list; append secondary SKUs not already present.

    When primary already has concrete SKUs, skip secondary rows that have no SKU
    (typical DOM base-product duplicate of a JSON-LD ProductGroup).
    """
    primary_has_skus = any(r.sku for r in primary)
    seen: set[str] = set()
    out: list[ProductRecord] = []

    for rec in primary:
        key = rec.sku or f"{rec.product_title}|{rec.color}|{rec.size}|{rec.image_urls}"
        if key in seen:
            continue
        seen.add(key)
        out.append(rec)

    for rec in secondary:
        if primary_has_skus and not rec.sku:
            continue
        key = rec.sku or f"{rec.product_title}|{rec.color}|{rec.size}|{rec.image_urls}"
        if key in seen:
            continue
        seen.add(key)
        out.append(rec)
    return out
