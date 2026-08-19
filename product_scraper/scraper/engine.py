"""Core scraping engine: load page → JSON-LD → DOM → variants → normalize → validate."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from product_scraper.compliance.rate_limit import RateLimiter
from product_scraper.compliance.robots import USER_AGENT, RobotsChecker
from product_scraper.models import ProductRecord, ScrapeFailure, ScrapeResult
from product_scraper.scraper.dom import attach_specs_to_records, extract_from_dom
from product_scraper.scraper.jsonld import extract_from_jsonld
from product_scraper.scraper.normalize import clean_text, specs_to_string
from product_scraper.scraper.validators import validate_records
from product_scraper.scraper.variants import discover_and_scrape_variants, merge_variant_records

logger = logging.getLogger("product_scraper")


@dataclass
class ScraperConfig:
    timeout: float = 30.0
    max_retries: int = 3
    rate_limit_delay: float = 1.0
    respect_robots: bool = True
    use_playwright: bool = True
    headless: bool = True
    interact_variants: bool = True
    user_agent: str = USER_AGENT
    wait_until: str = "domcontentloaded"
    extra_wait_ms: int = 800


class ProductScraper:
    """Orchestrates the product scraping workflow for one or more URLs."""

    def __init__(self, config: ScraperConfig | None = None) -> None:
        self.config = config or ScraperConfig()
        self.robots = RobotsChecker(
            user_agent=self.config.user_agent,
            respect=self.config.respect_robots,
        )
        self.rate_limiter = RateLimiter(default_delay=self.config.rate_limit_delay)
        self.session = self._build_session()
        self._playwright = None
        self._browser = None

    def _build_session(self) -> requests.Session:
        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": self.config.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        retry = Retry(
            total=self.config.max_retries,
            backoff_factor=0.8,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset(["GET", "HEAD"]),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        return session

    def _apply_crawl_delay(self, url: str) -> None:
        delay = self.robots.crawl_delay(url)
        if delay is not None:
            self.rate_limiter.set_host_delay(url, max(delay, self.config.rate_limit_delay))

    def scrape_urls(self, urls: list[str]) -> ScrapeResult:
        all_records: list[ProductRecord] = []
        failures: list[ScrapeFailure] = []
        scraped_at = datetime.now(timezone.utc).isoformat()

        try:
            for url in urls:
                url = url.strip()
                if not url:
                    continue
                try:
                    result = self.scrape_url(url)
                    all_records.extend(result.records)
                    failures.extend(result.failures)
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Unhandled error scraping %s", url)
                    failures.append(ScrapeFailure(url=url, reason=str(exc), scraped_at=scraped_at))
        finally:
            self.close()

        validated, warnings = validate_records(all_records)
        for warning in warnings:
            logger.warning(warning)

        for rec in validated:
            rec.scraped_at = scraped_at

        return ScrapeResult(
            records=validated,
            failures=failures,
            scraped_at=scraped_at,
        )

    def scrape_url(self, url: str) -> ScrapeResult:
        scraped_at = datetime.now(timezone.utc).isoformat()
        if not self.robots.can_fetch(url):
            reason = "Blocked by robots.txt"
            logger.error("%s — %s", url, reason)
            return ScrapeResult(
                failures=[ScrapeFailure(url=url, reason=reason, scraped_at=scraped_at)],
                source_url=url,
                scraped_at=scraped_at,
            )

        self._apply_crawl_delay(url)
        self.rate_limiter.wait(url)

        html = ""
        network_payloads: list[dict] = []
        used_browser = False

        if self.config.use_playwright:
            try:
                html, network_payloads = self._fetch_with_playwright(url)
                used_browser = True
            except Exception as exc:  # noqa: BLE001
                logger.warning("Playwright fetch failed for %s: %s — falling back to requests", url, exc)

        if not html:
            html = self._fetch_with_requests(url)

        if not html:
            return ScrapeResult(
                failures=[ScrapeFailure(url=url, reason="Empty response / failed to load page", scraped_at=scraped_at)],
                source_url=url,
                scraped_at=scraped_at,
            )

        records = self._extract_pipeline(html, url, network_payloads)

        # Shopify product.js often has cleaner variant/option data
        shopify_js = self._fetch_shopify_product_js(url)
        if shopify_js:
            from product_scraper.scraper.dom import _records_from_shopify_product

            js_records = _records_from_shopify_product(shopify_js, url)
            js_records = attach_specs_to_records(js_records, html)
            if js_records:
                # Prefer Shopify.js rows when they carry real SKUs / options
                records = self._prefer_richer_records(js_records, records)

        # Always attach HTML spec tables (FloorsCenter-style) onto final rows
        records = attach_specs_to_records(records, html)

        # Interactive variant loop when Playwright is available
        if used_browser and self.config.interact_variants and self._browser is not None:
            try:
                interactive = self._interactive_variants(url)
                interactive = attach_specs_to_records(interactive, html)
                records = merge_variant_records(records, interactive)
                records = attach_specs_to_records(records, html)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Interactive variant scrape failed for %s: %s", url, exc)

        # Drop numeric-only Shopify internal IDs when a real SKU sibling exists
        records = self._drop_internal_id_duplicates(records)

        if not records:
            return ScrapeResult(
                failures=[ScrapeFailure(url=url, reason="No product data found", scraped_at=scraped_at)],
                source_url=url,
                scraped_at=scraped_at,
            )

        for rec in records:
            rec.source_url = rec.source_url or url
            rec.scraped_at = scraped_at
            if not rec.parent_product_id:
                rec.parent_product_id = clean_text(rec.product_title) or url

        validated, warnings = validate_records(records)
        for warning in warnings:
            logger.warning("%s: %s", url, warning)

        return ScrapeResult(records=validated, source_url=url, scraped_at=scraped_at)

    def _fetch_shopify_product_js(self, url: str) -> dict | None:
        """Fetch /products/handle.js when the URL looks like a Shopify product page."""
        from urllib.parse import urlparse

        parsed = urlparse(url)
        path = parsed.path.rstrip("/")
        if "/products/" not in path:
            return None
        handle = path.split("/products/")[-1]
        if not handle or "/" in handle:
            # keep only the handle segment
            handle = handle.split("/")[0]
        js_url = f"{parsed.scheme}://{parsed.netloc}/products/{handle}.js"
        try:
            self.rate_limiter.wait(js_url)
            resp = self.session.get(js_url, timeout=self.config.timeout)
            if resp.status_code != 200:
                return None
            data = resp.json()
            if isinstance(data, dict) and data.get("variants"):
                logger.info("Loaded Shopify product.js (%d variants)", len(data["variants"]))
                return data
        except Exception as exc:  # noqa: BLE001
            logger.debug("Shopify product.js fetch failed: %s", exc)
        return None

    @staticmethod
    def _prefer_richer_records(
        primary: list[ProductRecord],
        secondary: list[ProductRecord],
    ) -> list[ProductRecord]:
        """Keep primary when it has specs/options; otherwise merge both."""
        primary_with_specs = sum(1 for r in primary if r.specifications or (r.raw_specs and len(r.raw_specs) > 2))
        if primary and (primary_with_specs or any(r.color or r.size for r in primary)):
            # Merge missing fields from secondary by SKU
            by_sku = {r.sku: r for r in secondary if r.sku}
            for rec in primary:
                other = by_sku.get(rec.sku)
                if not other:
                    continue
                for name in (
                    "brand",
                    "description",
                    "availability",
                    "image_urls",
                    "currency",
                    "product_title",
                ):
                    if not getattr(rec, name) and getattr(other, name):
                        setattr(rec, name, getattr(other, name))
            return primary
        return merge_variant_records(primary, secondary)

    @staticmethod
    def _drop_internal_id_duplicates(records: list[ProductRecord]) -> list[ProductRecord]:
        """Remove rows whose SKU is only a numeric Shopify id when real SKUs exist for same parent."""
        real_skus = [r for r in records if r.sku and not r.sku.isdigit()]
        if not real_skus:
            return records
        parents_with_real = {r.parent_product_id for r in real_skus}
        cleaned = []
        for r in records:
            if r.sku and r.sku.isdigit() and r.parent_product_id in parents_with_real:
                continue
            cleaned.append(r)
        return cleaned

    def _extract_pipeline(
        self,
        html: str,
        url: str,
        network_payloads: list[dict] | None = None,
    ) -> list[ProductRecord]:
        # 1) Prefer JSON-LD / structured data
        records = extract_from_jsonld(html, url)

        # 2) Fall back / enrich with DOM parsing
        dom_records = extract_from_dom(html, url)
        if not records:
            records = dom_records
        elif dom_records:
            records = self._enrich_records(records, dom_records)

        # 3) Network / embedded API payloads (e.g. captured JSON)
        if network_payloads:
            from product_scraper.scraper.jsonld import records_from_product_node

            for payload in network_payloads:
                if not isinstance(payload, dict):
                    continue
                types = payload.get("@type") or ""
                type_str = " ".join(types) if isinstance(types, list) else str(types)
                if "product" in type_str.lower() or payload.get("variants") or payload.get("sku"):
                    try:
                        if payload.get("variants"):
                            from product_scraper.scraper.dom import _records_from_shopify_product

                            shopify_recs = attach_specs_to_records(
                                _records_from_shopify_product(payload, url),
                                html,
                            )
                            records = self._prefer_richer_records(shopify_recs, records)
                        else:
                            records = merge_variant_records(
                                records,
                                records_from_product_node(payload, url),
                            )
                    except Exception as exc:  # noqa: BLE001
                        logger.debug("Network payload parse skipped: %s", exc)

        records = attach_specs_to_records(records, html)
        return records

    def _enrich_records(
        self,
        primary: list[ProductRecord],
        secondary: list[ProductRecord],
    ) -> list[ProductRecord]:
        """Fill blank fields on primary records from secondary DOM data (match by SKU)."""
        if not secondary:
            return primary

        # If secondary has richer variant coverage (Shopify), prefer it
        sec_specs = sum(1 for r in secondary if r.specifications)
        pri_specs = sum(1 for r in primary if r.specifications)
        if len(secondary) >= len(primary) and (sec_specs > pri_specs or any(r.color or r.size for r in secondary)):
            return self._prefer_richer_records(secondary, primary)

        by_sku = {r.sku: r for r in secondary if r.sku}
        donor = secondary[0]
        fields = (
            "brand",
            "product_title",
            "description",
            "specifications",
            "availability",
            "price",
            "currency",
            "image_urls",
            "color",
            "size",
            "sku",
        )
        for rec in primary:
            other = by_sku.get(rec.sku, donor)
            for name in fields:
                if not getattr(rec, name) and getattr(other, name):
                    setattr(rec, name, getattr(other, name))
            if other.raw_specs:
                merged = dict(rec.raw_specs or {})
                merged.update({k: v for k, v in other.raw_specs.items() if v})
                rec.raw_specs = merged
                if not rec.specifications and merged:
                    # exclude internal keys from string
                    public = {k: v for k, v in merged.items() if k not in ("variant_id", "options")}
                    rec.specifications = specs_to_string(public)
        return primary

    def _fetch_with_requests(self, url: str) -> str:
        logger.info("Loading page via requests: %s", url)
        response = self.session.get(url, timeout=self.config.timeout)
        if response.status_code >= 400:
            logger.error("HTTP %s for %s", response.status_code, url)
            response.raise_for_status()
        response.encoding = response.apparent_encoding or response.encoding
        return response.text

    def _ensure_browser(self):
        if self._browser is not None:
            return
        from playwright.sync_api import sync_playwright

        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=self.config.headless)

    def _fetch_with_playwright(self, url: str) -> tuple[str, list[dict]]:
        self._ensure_browser()
        assert self._browser is not None
        logger.info("Loading page via Playwright: %s", url)
        network_payloads: list[dict] = []

        context = self._browser.new_context(user_agent=self.config.user_agent)
        page = context.new_page()

        def on_response(response) -> None:
            try:
                ctype = (response.headers.get("content-type") or "").lower()
                if "application/json" not in ctype:
                    return
                req_url = response.url.lower()
                if not any(k in req_url for k in ("product", "variant", "catalog", "api")):
                    return
                data = response.json()
                if isinstance(data, dict):
                    network_payloads.append(data)
                elif isinstance(data, list):
                    network_payloads.extend(d for d in data if isinstance(d, dict))
            except Exception:  # noqa: BLE001
                return

        page.on("response", on_response)
        page.goto(url, wait_until=self.config.wait_until, timeout=int(self.config.timeout * 1000))
        page.wait_for_timeout(self.config.extra_wait_ms)
        # Nudge lazy-loaded content
        page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
        page.wait_for_timeout(300)
        html = page.content()
        # Keep context open only briefly; interactive pass opens a fresh page
        context.close()
        return html, network_payloads

    def _interactive_variants(self, url: str) -> list[ProductRecord]:
        """Open page again and click through variant options."""
        self._ensure_browser()
        assert self._browser is not None

        # Use sync Playwright page with async-style helper adapted to sync
        context = self._browser.new_context(user_agent=self.config.user_agent)
        page = context.new_page()
        page.goto(url, wait_until=self.config.wait_until, timeout=int(self.config.timeout * 1000))
        page.wait_for_timeout(self.config.extra_wait_ms)

        records = _sync_discover_variants(page, url, self._extract_pipeline)
        context.close()
        return records

    def close(self) -> None:
        if self._browser is not None:
            try:
                self._browser.close()
            except Exception:  # noqa: BLE001
                pass
            self._browser = None
        if self._playwright is not None:
            try:
                self._playwright.stop()
            except Exception:  # noqa: BLE001
                pass
            self._playwright = None
        self.session.close()

    def __enter__(self) -> "ProductScraper":
        return self

    def __exit__(self, *args) -> None:
        self.close()


def _sync_discover_variants(page, source_url: str, extract_fn: Callable) -> list[ProductRecord]:
    """Sync Playwright port of interactive variant discovery."""
    records: list[ProductRecord] = []
    seen: set[str] = set()

    def capture(label: str = "") -> None:
        html = page.content()
        batch = extract_fn(html, source_url)
        for rec in batch:
            key = rec.sku or f"{rec.product_title}|{rec.color}|{rec.size}|{rec.price}"
            if key in seen:
                continue
            seen.add(key)
            if label and label != "baseline":
                if ":" in label:
                    name, val = label.split(":", 1)
                    name_l = name.strip().lower()
                    val = val.strip()
                    if ("color" in name_l or "colour" in name_l) and not rec.color:
                        rec.color = val
                    elif "size" in name_l and not rec.size:
                        rec.size = val
                elif not rec.color:
                    rec.color = label
            records.append(rec)

    capture("baseline")

    controls = page.query_selector_all(
        "button[data-value], label[for*='option'], "
        ".swatch:not(.disabled), [data-option-value], "
        ".product-form__input input[type='radio'] + label, "
        "[role='radio']:not([aria-disabled='true'])"
    )
    clicked = 0
    for control in controls[:40]:
        try:
            disabled = control.get_attribute("disabled")
            aria_disabled = control.get_attribute("aria-disabled")
            classes = control.get_attribute("class") or ""
            if disabled is not None or aria_disabled == "true" or "disabled" in classes.lower():
                continue
            label = (
                clean_text(control.get_attribute("data-value"))
                or clean_text(control.get_attribute("aria-label"))
                or clean_text(control.get_attribute("title"))
                or clean_text(control.inner_text())
            )
            if not label or len(label) > 80:
                continue
            control.click(timeout=3000)
            clicked += 1
            page.wait_for_timeout(400)
            capture(label)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Variant click skipped: %s", exc)

    selects = page.query_selector_all(
        "select[name*='option' i], select[id*='option' i], select.single-option-selector, "
        "select[name*='Size' i], select[name*='Color' i]"
    )
    for select in selects:
        try:
            options = select.query_selector_all("option")
            for opt in options[:15]:
                value = opt.get_attribute("value")
                if value is None or value == "":
                    continue
                text = clean_text(opt.inner_text())
                select.select_option(value=value)
                page.wait_for_timeout(400)
                capture(text)
        except Exception as exc:  # noqa: BLE001
            logger.debug("Select variant skipped: %s", exc)

    logger.info("Interactive variants: %d record(s) from %d clicks", len(records), clicked)
    return records
