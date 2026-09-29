# PostPilot scraper — competitor research + website ingest
# Demo/fixture mode works without Playwright; live fetch when available.

from __future__ import annotations

import hashlib
import re
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, HttpUrl

app = FastAPI(title="PostPilot Scraper", version="1.0.0")


def _check_key(x_api_key: str | None) -> None:
    import os

    expected = os.getenv("SCRAPER_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
def health():
    return {"status": "ok", "phase": 3, "ready": True, "mode": "fixture+live"}


class WebsiteRequest(BaseModel):
    url: HttpUrl


@app.post("/v1/website")
async def website_ingest(
    body: WebsiteRequest,
    x_api_key: str | None = Header(default=None),
):
    _check_key(x_api_key)
    url = str(body.url)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=12.0) as client:
            res = await client.get(url, headers={"User-Agent": "PostPilotScraper/1.0"})
            res.raise_for_status()
            html = res.text
        title_m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
        desc_m = re.search(
            r'<meta[^>]+(?:name|property)=["\']description["\'][^>]+content=["\']([^"\']+)',
            html,
            re.I,
        )
        headings = [
            re.sub(r"<[^>]+>", "", h).strip()
            for h in re.findall(r"<h[12][^>]*>([\s\S]*?)</h[12]>", html, re.I)
        ][:8]
        text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
        text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        about_idx = text.lower().find("about")
        about = text[about_idx : about_idx + 400] if about_idx >= 0 else text[:400]
        return {
            "url": url,
            "title": title_m.group(1).strip() if title_m else None,
            "description": desc_m.group(1) if desc_m else None,
            "headings": [h for h in headings if h],
            "aboutSnippet": about,
            "keywords": [h.lower()[:40] for h in headings[:5] if h],
            "source": "live",
        }
    except Exception:
        host = urlparse(url).hostname or "brand.example"
        name = host.replace("www.", "").split(".")[0]
        return {
            "url": url,
            "title": f"{name} — craft over noise",
            "description": f"{name} helps customers get clearer results.",
            "headings": [f"Welcome to {name}", "How we work", "Proof"],
            "aboutSnippet": f"{name} emphasizes process, proof, and ritual.",
            "keywords": [name, "quality", "ritual"],
            "source": "demo",
        }


class DiscoverRequest(BaseModel):
    business_name: str
    niche: str | None = None
    industry: str | None = None
    platform: str = "INSTAGRAM"


@app.post("/v1/competitors/discover")
async def discover_competitors(
    body: DiscoverRequest,
    x_api_key: str | None = Header(default=None),
):
    _check_key(x_api_key)
    niche = (body.niche or body.industry or "brand").lower()
    base = re.sub(r"[^a-z0-9]+", "", niche) or "brand"
    seeds = [
        ("lab", "RISING_STAR", 8200, 12.4, 4.8, 86),
        ("journal", "CATEGORY_LEADER", 128000, 1.2, 1.9, 62),
        ("get", "DIRECT_RIVAL", 24500, 5.1, 3.2, 74),
        ("club", "RISING_STAR", 4100, 18.2, 6.1, 91),
        ("daily", "WATCHLIST", 15600, 2.4, 2.2, 55),
    ]
    out = []
    for suffix, tier, followers, growth, er, mom in seeds:
        handle = f"{suffix}{base}" if suffix in ("get", "daily") else f"{base}{suffix}"
        if suffix == "get":
            handle = f"get{base}"
        if suffix == "daily":
            handle = f"daily{base}"
        out.append(
            {
                "handle": handle,
                "platform": body.platform,
                "tier": tier,
                "momentumScore": mom,
                "relevanceScore": 70 + min(20, growth),
                "followers": followers,
                "growth7dPct": growth,
                "engagementRate": er,
                "why": f"Fixture discovery for {body.business_name} in {niche}",
                "profileUrl": f"https://instagram.com/{handle}",
            }
        )
    return {"competitors": out, "source": "fixture"}


class PostsRequest(BaseModel):
    handle: str
    platform: str = "INSTAGRAM"
    limit: int = 5
    niche: str | None = None


@app.post("/v1/competitors/posts")
async def competitor_posts(
    body: PostsRequest,
    x_api_key: str | None = Header(default=None),
):
    _check_key(x_api_key)
    niche = body.niche or "the niche"
    posts: list[dict[str, Any]] = []
    for i in range(max(1, min(body.limit, 10))):
        seed = hashlib.sha256(f"{body.handle}:{i}".encode()).hexdigest()
        likes = 40 + int(seed[:2], 16)
        posts.append(
            {
                "platformPostId": f"{body.handle}_post_{i + 1}",
                "format": ["REEL", "CAROUSEL", "SINGLE_IMAGE"][i % 3],
                "caption": f"Public sample from @{body.handle} on {niche} (#{i + 1})",
                "postedAtOffsetDays": i * 2,
                "likeCount": likes,
                "commentCount": 3 + i,
                "saveCount": 5 + i * 2,
                "engagementTotal": likes + 10 + i * 5,
                "isOutlier": i == 0,
                "outlierReason": (
                    "3× median engagement — strong hook + saveable structure"
                    if i == 0
                    else None
                ),
                "contentPillar": "EDUCATIONAL",
                "hookType": "CONTRARIAN",
                "ctaType": "SAVE",
                "permalink": f"https://instagram.com/p/{seed[:11]}",
            }
        )
    return {"handle": body.handle, "posts": posts, "source": "fixture"}
