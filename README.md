# Product Data Scraping Tool

Input a product-page URL and extract complete, variant-level product data into Excel, with optional real-time refresh.

## Features

- Accept one or more product-page URLs
- Prefer **JSON-LD / structured data**, then DOM parsing, then network JSON
- Detect color/size variants (including Playwright interaction)
- **One Excel row per SKU** — never merge different SKUs
- Fields: brand, title, SKU, color, size, description, specs, images, availability, price, source URL
- Export `.xlsx` with Products, Raw Specs, Failures, and Changes sheets
- Refresh / re-scrape with timestamps and changed-field highlighting
- Respects `robots.txt`, rate limits, retries, and failure logging

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
playwright install chromium
```

## Usage

### Scrape product URLs

```bash
product-scraper scrape \
  -u "https://example.com/products/oak-timber-plank" \
  -o output/products.xlsx
```

Multiple URLs or a file:

```bash
product-scraper scrape -u URL1 -u URL2 -o output/products.xlsx
product-scraper scrape -f urls.txt -o output/products.xlsx
```

### Refresh (re-scrape + highlight changes)

```bash
product-scraper refresh -u "https://example.com/products/oak-timber-plank" \
  -o output/products_refresh.xlsx
```

### Schedule recurring refreshes

```bash
product-scraper schedule -u "https://example.com/products/oak-timber-plank" --interval 1440
product-scraper run-due -o output/products_scheduled.xlsx
```

Wire `run-due` into cron or any task runner for scheduled refreshes.

### Useful flags

| Flag | Meaning |
|------|---------|
| `--no-browser` | HTTP-only (no Playwright) |
| `--no-variants` | Skip interactive variant clicking |
| `--no-robots` | Ignore robots.txt (not recommended) |
| `--delay 1.5` | Per-host rate-limit delay (seconds) |
| `-v` | Verbose logging |

## Output format

| Column | Description |
|--------|-------------|
| `brand` | Brand name |
| `product_title` | Product / variant title |
| `sku` | Primary identity (required; fallback generated if missing) |
| `color` / `size` | Variant attributes |
| `description` | Product description |
| `specifications` | Normalized specs string |
| `availability` / `price` / `currency` | Offer data |
| `image_urls`, `image_1`…`image_5` | Gallery URLs |
| `source_url` | Page scraped |
| `parent_product_id` | Parent / group id |
| `scraped_at` | UTC ISO timestamp |

## Project layout

```
product_scraper/
  cli.py                 # CLI entrypoint
  models.py              # ProductRecord / ScrapeResult
  scraper/
    engine.py            # Workflow orchestration
    jsonld.py            # Structured data extraction
    dom.py               # HTML / Shopify fallback
    variants.py          # Interactive variant loop
    normalize.py         # Field cleaning
    validators.py        # SKU validation
  export/excel.py        # .xlsx writer
  refresh/history.py     # SQLite history + change detect
  compliance/            # robots.txt + rate limiting
tests/
```

## Workflow

1. Input URL  
2. Load page (Playwright or requests)  
3. Identify JSON-LD / selectors / API JSON  
4. Extract base product info  
5. Loop through variants  
6. Collect images + specs  
7. Normalize fields  
8. Validate SKU records  
9. Export Excel  

## Compliance

This tool is intended for lawful use against sites you are allowed to scrape. It checks `robots.txt`, applies rate limits, and logs failures. Always follow site terms of service and applicable law.

## Offline / fixture demo

```bash
product-scraper scrape \
  --html-file tests/fixtures/sample_product.html \
  --source-url "https://shop.example.com/products/oak-timber-plank" \
  -o output/sample_oak_timber_plank.xlsx \
  --no-save-history
```

## Tests

```bash
pytest -q
```
