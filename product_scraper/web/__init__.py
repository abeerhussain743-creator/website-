"""Web dashboard package."""

from product_scraper.web.app import create_app

# Lazily expose app for uvicorn: product_scraper.web.app:app
# Keep package __init__ free of the FastAPI instance name collision.

__all__ = ["create_app"]
