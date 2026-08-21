"""CLI for the Product Data Scraping Tool."""

from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from product_scraper import __version__
from product_scraper.export.excel import export_excel
from product_scraper.refresh.history import ScrapeHistory
from product_scraper.scraper.engine import ProductScraper, ScraperConfig
from product_scraper.utils.logging import setup_logging

console = Console(stderr=True)


def _read_urls(url: tuple[str, ...], url_file: str | None) -> list[str]:
    urls = list(url)
    if url_file:
        path = Path(url_file)
        lines = path.read_text(encoding="utf-8").splitlines()
        urls.extend(line.strip() for line in lines if line.strip() and not line.strip().startswith("#"))
    # de-dupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.version_option(__version__, prog_name="product-scraper")
def main() -> None:
    """Product Data Scraping Tool — extract variant-level product data to Excel."""


@main.command("scrape")
@click.option("--url", "-u", multiple=True, help="Product page URL (repeatable).")
@click.option("--url-file", "-f", type=click.Path(exists=True), help="Text file with one URL per line.")
@click.option("--html-file", type=click.Path(exists=True), help="Parse a saved HTML file (offline / demo).")
@click.option("--source-url", default="https://example.com/product", show_default=True, help="Source URL label when using --html-file.")
@click.option("--output", "-o", default="output/products.xlsx", show_default=True, help="Output .xlsx path.")
@click.option("--no-browser", is_flag=True, help="Disable Playwright; use HTTP requests only.")
@click.option("--no-variants", is_flag=True, help="Skip interactive variant clicking.")
@click.option("--no-robots", is_flag=True, help="Ignore robots.txt (not recommended).")
@click.option("--delay", default=1.0, show_default=True, help="Rate-limit delay between hosts (seconds).")
@click.option("--timeout", default=30.0, show_default=True, help="Page load timeout (seconds).")
@click.option("--history-db", default="data/scrape_history.db", show_default=True)
@click.option("--save-history/--no-save-history", default=True, show_default=True)
@click.option("--verbose", "-v", is_flag=True)
@click.option("--log-file", default=None, help="Optional log file path.")
def scrape_cmd(
    url: tuple[str, ...],
    url_file: str | None,
    html_file: str | None,
    source_url: str,
    output: str,
    no_browser: bool,
    no_variants: bool,
    no_robots: bool,
    delay: float,
    timeout: float,
    history_db: str,
    save_history: bool,
    verbose: bool,
    log_file: str | None,
) -> None:
    """Scrape one or more product URLs and export to Excel."""
    from product_scraper.models import ScrapeResult
    from product_scraper.scraper.dom import extract_from_dom
    from product_scraper.scraper.jsonld import extract_from_jsonld
    from product_scraper.scraper.validators import validate_records
    from product_scraper.scraper.variants import merge_variant_records

    setup_logging(verbose=verbose, log_file=log_file)

    if html_file:
        html = Path(html_file).read_text(encoding="utf-8")
        records = merge_variant_records(
            extract_from_jsonld(html, source_url),
            extract_from_dom(html, source_url),
        )
        records, warnings = validate_records(records)
        for warning in warnings:
            console.print(f"[yellow]{warning}[/yellow]")
        result = ScrapeResult(records=records, source_url=source_url)
        console.print(f"[bold]Parsed offline HTML → {len(records)} record(s)[/bold]")
    else:
        urls = _read_urls(url, url_file)
        if not urls:
            console.print("[red]Provide at least one --url, --url-file, or --html-file.[/red]")
            sys.exit(2)

        config = ScraperConfig(
            timeout=timeout,
            rate_limit_delay=delay,
            respect_robots=not no_robots,
            use_playwright=not no_browser,
            interact_variants=not no_variants and not no_browser,
        )

        console.print(f"[bold]Scraping {len(urls)} URL(s)…[/bold]")
        with ProductScraper(config) as scraper:
            result = scraper.scrape_urls(urls)

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    history = ScrapeHistory(history_db)
    changed_map = None
    if save_history:
        previous = history.latest_by_sku()
        if previous:
            changed_map = history.compare(result.records, previous)
        history.save_run(run_id, result.records)

    out = export_excel(
        result.records,
        output,
        failures=result.failures,
        changed_map=changed_map,
    )

    _print_summary(result.records, result.failures, out, changed_map)
    if result.failures and not result.records:
        sys.exit(1)


@main.command("refresh")
@click.option("--url", "-u", multiple=True, help="URL(s) to re-scrape. Defaults to previously seen source URLs.")
@click.option("--url-file", "-f", type=click.Path(exists=True))
@click.option("--output", "-o", default="output/products_refresh.xlsx", show_default=True)
@click.option("--history-db", default="data/scrape_history.db", show_default=True)
@click.option("--no-browser", is_flag=True)
@click.option("--no-robots", is_flag=True)
@click.option("--delay", default=1.0, show_default=True)
@click.option("--verbose", "-v", is_flag=True)
def refresh_cmd(
    url: tuple[str, ...],
    url_file: str | None,
    output: str,
    history_db: str,
    no_browser: bool,
    no_robots: bool,
    delay: float,
    verbose: bool,
) -> None:
    """Re-scrape live pages, timestamp the run, and highlight field changes."""
    setup_logging(verbose=verbose)
    history = ScrapeHistory(history_db)
    urls = _read_urls(url, url_file)

    if not urls:
        # Fall back to unique source URLs from latest snapshots
        previous = history.latest_by_sku()
        urls = sorted({r.source_url for r in previous.values() if r.source_url})

    if not urls:
        console.print("[red]No URLs to refresh. Pass --url or scrape first.[/red]")
        sys.exit(2)

    previous = history.latest_by_sku()
    config = ScraperConfig(
        rate_limit_delay=delay,
        respect_robots=not no_robots,
        use_playwright=not no_browser,
    )
    console.print(f"[bold]Refreshing {len(urls)} URL(s)…[/bold]")
    with ProductScraper(config) as scraper:
        result = scraper.scrape_urls(urls)

    changed_map = history.compare(result.records, previous)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-refresh"
    history.save_run(run_id, result.records)

    out = export_excel(
        result.records,
        output,
        failures=result.failures,
        changed_map=changed_map,
    )
    _print_summary(result.records, result.failures, out, changed_map)


@main.command("schedule")
@click.option("--url", "-u", required=True, help="Product URL to schedule.")
@click.option("--interval", default=1440, show_default=True, help="Interval in minutes.")
@click.option("--history-db", default="data/scrape_history.db", show_default=True)
def schedule_cmd(url: str, interval: int, history_db: str) -> None:
    """Add a URL to the refresh schedule queue."""
    history = ScrapeHistory(history_db)
    history.schedule_url(url, interval_minutes=interval)
    console.print(f"Scheduled [cyan]{url}[/cyan] every [green]{interval}[/green] minute(s).")


@main.command("run-due")
@click.option("--output", "-o", default="output/products_scheduled.xlsx", show_default=True)
@click.option("--history-db", default="data/scrape_history.db", show_default=True)
@click.option("--no-browser", is_flag=True)
@click.option("--verbose", "-v", is_flag=True)
def run_due_cmd(output: str, history_db: str, no_browser: bool, verbose: bool) -> None:
    """Run all due scheduled refreshes once (for cron / task runners)."""
    setup_logging(verbose=verbose)
    history = ScrapeHistory(history_db)
    urls = history.due_urls()
    if not urls:
        console.print("No scheduled URLs are due.")
        return

    previous = history.latest_by_sku()
    config = ScraperConfig(use_playwright=not no_browser)
    with ProductScraper(config) as scraper:
        result = scraper.scrape_urls(urls)

    for u in urls:
        history.mark_ran(u)

    changed_map = history.compare(result.records, previous)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-scheduled"
    history.save_run(run_id, result.records)
    out = export_excel(result.records, output, failures=result.failures, changed_map=changed_map)
    _print_summary(result.records, result.failures, out, changed_map)


@main.command("dashboard")
@click.option("--host", default="127.0.0.1", show_default=True)
@click.option("--port", default=8000, show_default=True, type=int)
@click.option("--reload", is_flag=True, help="Auto-reload on code changes (dev).")
def dashboard_cmd(host: str, port: int, reload: bool) -> None:
    """Launch the VariantXL web dashboard."""
    try:
        import uvicorn
    except ImportError as exc:  # pragma: no cover
        console.print("[red]Install dashboard deps: pip install fastapi uvicorn jinja2 python-multipart[/red]")
        raise SystemExit(1) from exc

    console.print(f"[bold]VariantXL dashboard[/bold] → http://{host}:{port}/")
    uvicorn.run(
        "product_scraper.web.app:app",
        host=host,
        port=port,
        reload=reload,
    )


def _print_summary(records, failures, output_path, changed_map=None) -> None:
    table = Table(title="Scrape Summary")
    table.add_column("Metric")
    table.add_column("Value", justify="right")
    table.add_row("Records (SKU rows)", str(len(records)))
    table.add_row("Failures", str(len(failures or [])))
    if changed_map is not None:
        changed_count = sum(1 for fields in changed_map.values() if fields and fields != {"(new)"})
        new_count = sum(1 for fields in changed_map.values() if fields == {"(new)"})
        table.add_row("Changed SKUs", str(changed_count))
        table.add_row("New SKUs", str(new_count))
    table.add_row("Excel", str(output_path))
    console.print(table)

    if records:
        preview = Table(title="Preview (first 5)")
        for col in ("sku", "product_title", "color", "size", "price"):
            preview.add_column(col)
        for rec in records[:5]:
            preview.add_row(rec.sku, rec.product_title[:40], rec.color, rec.size, f"{rec.currency} {rec.price}".strip())
        console.print(preview)

    if failures:
        console.print("[yellow]Failures:[/yellow]")
        for fail in failures:
            console.print(f"  • {fail.url}: {fail.reason}")


if __name__ == "__main__":
    main()
