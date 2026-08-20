"""Deep product URL discovery: pages, collections, Shopify JSON, sitemaps."""

from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

from product_scraper.compliance.robots import USER_AGENT

logger = logging.getLogger("product_scraper")

_PRODUCT_PATH_RE = re.compile(r"/(?:products?|p)/([^/?#]+)", re.I)
_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def normalize_product_url(url: str, base_host: str | None = None) -> str | None:
    parsed = urlparse(url.strip())
    if not parsed.scheme:
        return None
    path = parsed.path or ""
    m = _PRODUCT_PATH_RE.search(path)
    if not m:
        return None
    handle = m.group(1).strip("/")
    if not handle:
        return None
    host = parsed.netloc
    if base_host and host and host != base_host:
        return None
    # Canonical Shopify-style product URL
    if "/products/" in path.lower() or path.lower().startswith("/product/"):
        prefix = "/products" if "/products/" in path.lower() or "products" in path.lower().split("/") else "/product"
        # Prefer /products/
        canon_path = f"/products/{handle}"
    else:
        canon_path = f"/products/{handle}"
    return urlunparse((parsed.scheme, parsed.netloc, canon_path, "", "", ""))


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
    )
    return s


def discover_from_html(html: str, page_url: str, max_products: int = 200) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    host = urlparse(page_url).netloc
    found: list[str] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(page_url, a["href"]).split("?")[0].split("#")[0]
        canon = normalize_product_url(href, base_host=host)
        if not canon or canon in seen:
            continue
        seen.add(canon)
        found.append(canon)
        if len(found) >= max_products:
            break
    return found


def discover_collection_links(html: str, page_url: str, max_collections: int = 30) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    host = urlparse(page_url).netloc
    out: list[str] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(page_url, a["href"]).split("?")[0].split("#")[0]
        parsed = urlparse(href)
        if parsed.netloc != host:
            continue
        path = parsed.path.rstrip("/")
        if "/collections/" in path and "/products/" not in path:
            if path.count("/") >= 2 and path not in seen:
                seen.add(path)
                out.append(f"{parsed.scheme}://{parsed.netloc}{path}")
                if len(out) >= max_collections:
                    break
    return out


def discover_shopify_collection_json(
    collection_url: str,
    session: requests.Session | None = None,
    max_products: int = 250,
) -> list[str]:
    """Paginate Shopify /collections/handle/products.json."""
    session = session or _session()
    parsed = urlparse(collection_url)
    # collection_url like https://host/collections/handle
    path = parsed.path.rstrip("/")
    if "/collections/" not in path:
        return []
    handle = path.split("/collections/")[-1].split("/")[0]
    base = f"{parsed.scheme}://{parsed.netloc}"
    products: list[str] = []
    seen: set[str] = set()
    page = 1
    while len(products) < max_products:
        api = f"{base}/collections/{handle}/products.json?limit=50&page={page}"
        try:
            resp = session.get(api, timeout=25)
            if resp.status_code != 200:
                break
            data = resp.json()
            batch = data.get("products") or []
            if not batch:
                break
            for p in batch:
                handle_p = p.get("handle")
                if not handle_p:
                    continue
                url = f"{base}/products/{handle_p}"
                if url not in seen:
                    seen.add(url)
                    products.append(url)
                    if len(products) >= max_products:
                        break
            if len(batch) < 50:
                break
            page += 1
            if page > 40:
                break
        except Exception as exc:  # noqa: BLE001
            logger.debug("Shopify collection JSON failed: %s", exc)
            break
    return products


def discover_from_sitemap(
    site_url: str,
    session: requests.Session | None = None,
    max_products: int = 500,
) -> list[str]:
    session = session or _session()
    parsed = urlparse(site_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    candidates = [
        f"{origin}/sitemap.xml",
        f"{origin}/sitemap_products_1.xml",
        f"{origin}/sitemap_products_1.xml.gz",
        f"{origin}/product-sitemap.xml",
    ]
    # Also probe index for product sitemap links
    found: list[str] = []
    seen: set[str] = set()

    def ingest_xml(text: str) -> list[str]:
        urls: list[str] = []
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            return urls
        # urlset
        for loc in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
            if loc.text:
                urls.append(loc.text.strip())
        for loc in root.findall(".//loc"):
            if loc.text:
                urls.append(loc.text.strip())
        return urls

    queue = list(candidates)
    visited_maps: set[str] = set()
    while queue and len(found) < max_products:
        sm_url = queue.pop(0)
        if sm_url in visited_maps:
            continue
        visited_maps.add(sm_url)
        try:
            resp = session.get(sm_url, timeout=25)
            if resp.status_code != 200:
                continue
            ctype = (resp.headers.get("content-type") or "").lower()
            text = resp.text
            locs = ingest_xml(text)
            for loc in locs:
                if loc.endswith(".xml") or "sitemap" in loc.lower():
                    if loc not in visited_maps and len(visited_maps) < 25:
                        queue.append(loc)
                    continue
                canon = normalize_product_url(loc, base_host=parsed.netloc)
                if canon and canon not in seen:
                    seen.add(canon)
                    found.append(canon)
                    if len(found) >= max_products:
                        break
        except Exception as exc:  # noqa: BLE001
            logger.debug("Sitemap fetch failed %s: %s", sm_url, exc)
    return found


def deep_discover(
    seed_url: str,
    *,
    max_products: int = 100,
    use_sitemap: bool = True,
    use_collections: bool = True,
    max_collections: int = 15,
) -> dict:
    """
    Powerful discovery from a store homepage / collection URL.

    Returns {products: [...], collections: [...], sources: {...}}
    """
    seed_url = seed_url.strip()
    if not seed_url.startswith(("http://", "https://")):
        seed_url = "https://" + seed_url

    session = _session()
    products: list[str] = []
    seen: set[str] = set()
    sources = {"html": 0, "collections_json": 0, "sitemap": 0}
    collections: list[str] = []

    def add_many(urls: list[str], source: str) -> None:
        nonlocal products
        for u in urls:
            if u not in seen:
                seen.add(u)
                products.append(u)
                sources[source] = sources.get(source, 0) + 1
                if len(products) >= max_products:
                    return

    # 1) Seed page HTML
    try:
        resp = session.get(seed_url, timeout=30)
        resp.raise_for_status()
        html = resp.text
        add_many(discover_from_html(html, seed_url, max_products=max_products), "html")
        if use_collections:
            collections = discover_collection_links(html, seed_url, max_collections=max_collections)
            # If seed itself is a collection, include it
            if "/collections/" in urlparse(seed_url).path and seed_url.rstrip("/") not in collections:
                collections.insert(0, seed_url.rstrip("/"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Seed page fetch failed: %s", exc)
        html = ""

    # 2) Shopify collection JSON pagination
    if use_collections and collections and len(products) < max_products:
        remaining = max_products - len(products)
        per = max(10, remaining // max(1, len(collections[:max_collections])))
        with ThreadPoolExecutor(max_workers=min(6, len(collections))) as pool:
            futs = {
                pool.submit(
                    discover_shopify_collection_json,
                    col,
                    session,
                    per,
                ): col
                for col in collections[:max_collections]
            }
            for fut in as_completed(futs):
                try:
                    add_many(fut.result(), "collections_json")
                except Exception:  # noqa: BLE001
                    pass
                if len(products) >= max_products:
                    break

    # 3) Sitemap
    if use_sitemap and len(products) < max_products:
        add_many(
            discover_from_sitemap(seed_url, session=session, max_products=max_products - len(products)),
            "sitemap",
        )

    return {
        "seed": seed_url,
        "products": products[:max_products],
        "collections": collections,
        "count": len(products[:max_products]),
        "sources": sources,
    }
