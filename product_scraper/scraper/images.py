"""Optional product image downloader."""

from __future__ import annotations

import logging
import re
import zipfile
from pathlib import Path
from urllib.parse import urlparse

import requests

from product_scraper.compliance.robots import USER_AGENT
from product_scraper.models import ProductRecord

logger = logging.getLogger("product_scraper")


def _safe_name(text: str, fallback: str = "item") -> str:
    text = re.sub(r"[^\w.\-]+", "_", (text or fallback).strip())[:80]
    return text or fallback


def download_images(
    records: list[ProductRecord],
    output_dir: str | Path,
    *,
    max_per_sku: int = 3,
    timeout: float = 20.0,
) -> Path:
    """
    Download variant images into output_dir/<sku>/ and return a zip path.
    """
    output_dir = Path(output_dir)
    img_root = output_dir / "images"
    img_root.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    saved = 0
    for rec in records:
        sku_dir = img_root / _safe_name(rec.sku or "unknown")
        sku_dir.mkdir(parents=True, exist_ok=True)
        urls = [u.strip() for u in (rec.image_urls or "").split("|") if u.strip()]
        for idx, url in enumerate(urls[:max_per_sku]):
            try:
                resp = session.get(url, timeout=timeout)
                if resp.status_code >= 400:
                    continue
                ext = Path(urlparse(url).path).suffix.lower() or ".jpg"
                if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
                    ext = ".jpg"
                dest = sku_dir / f"{idx + 1}{ext}"
                dest.write_bytes(resp.content)
                saved += 1
            except Exception as exc:  # noqa: BLE001
                logger.debug("Image download failed %s: %s", url, exc)

    zip_path = output_dir / "product_images.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in img_root.rglob("*"):
            if path.is_file():
                zf.write(path, arcname=str(path.relative_to(img_root)))
    logger.info("Downloaded %d image(s) → %s", saved, zip_path)
    return zip_path
