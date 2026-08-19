"""Simple per-host rate limiter."""

from __future__ import annotations

import time
from collections import defaultdict
from urllib.parse import urlparse


class RateLimiter:
    """Enforce a minimum delay between requests to the same host."""

    def __init__(self, default_delay: float = 1.0) -> None:
        self.default_delay = max(0.0, default_delay)
        self._last_request: dict[str, float] = defaultdict(float)
        self._host_delays: dict[str, float] = {}

    def set_host_delay(self, url: str, delay: float) -> None:
        host = urlparse(url).netloc
        self._host_delays[host] = max(0.0, delay)

    def wait(self, url: str) -> None:
        host = urlparse(url).netloc
        delay = self._host_delays.get(host, self.default_delay)
        elapsed = time.monotonic() - self._last_request[host]
        remaining = delay - elapsed
        if remaining > 0:
            time.sleep(remaining)
        self._last_request[host] = time.monotonic()
