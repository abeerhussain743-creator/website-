"""robots.txt compliance checks."""

from __future__ import annotations

import logging
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

logger = logging.getLogger("product_scraper")

USER_AGENT = "ProductDataScraper/1.0 (+https://github.com/product-data-scraper; respectful-bot)"


class RobotsChecker:
    """Cache and evaluate robots.txt for product URLs."""

    def __init__(self, user_agent: str = USER_AGENT, respect: bool = True) -> None:
        self.user_agent = user_agent
        self.respect = respect
        self._parsers: dict[str, RobotFileParser | None] = {}

    def _robots_url(self, url: str) -> str:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}/robots.txt"

    def _get_parser(self, url: str) -> RobotFileParser | None:
        parsed = urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin in self._parsers:
            return self._parsers[origin]

        robots_url = self._robots_url(url)
        parser = RobotFileParser()
        parser.set_url(robots_url)
        try:
            parser.read()
            self._parsers[origin] = parser
            logger.debug("Loaded robots.txt from %s", robots_url)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Could not read robots.txt at %s: %s — allowing by default",
                robots_url,
                exc,
            )
            self._parsers[origin] = None
            return None
        return parser

    def can_fetch(self, url: str) -> bool:
        if not self.respect:
            return True
        parser = self._get_parser(url)
        if parser is None:
            return True
        allowed = parser.can_fetch(self.user_agent, url)
        if not allowed:
            logger.warning("robots.txt disallows fetching %s", url)
        return allowed

    def crawl_delay(self, url: str) -> float | None:
        parser = self._get_parser(url)
        if parser is None:
            return None
        try:
            delay = parser.crawl_delay(self.user_agent)
            return float(delay) if delay is not None else None
        except Exception:  # noqa: BLE001
            return None
