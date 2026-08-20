"""Excel export (.xlsx) — one row per SKU/variant."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.utils.dataframe import dataframe_to_rows

from product_scraper.models import EXCEL_COLUMNS, ProductRecord, ScrapeFailure

logger = logging.getLogger("product_scraper")

HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(color="FFFFFF", bold=True)
CHANGED_FILL = PatternFill("solid", fgColor="FFF2CC")
FAIL_FILL = PatternFill("solid", fgColor="FCE4EC")


def records_to_dataframe(
    records: list[ProductRecord],
    changed_map: dict[str, set[str]] | None = None,
    split_images: bool = True,
    columns: list[str] | None = None,
) -> pd.DataFrame:
    rows = []
    for rec in records:
        row = rec.to_row()
        if split_images:
            urls = [u.strip() for u in (rec.image_urls or "").split("|") if u.strip()]
            for i in range(5):
                row[f"image_{i + 1}"] = urls[i] if i < len(urls) else ""
        if changed_map is not None:
            changed_fields = changed_map.get(rec.sku, set())
            row["changed_fields"] = ", ".join(sorted(changed_fields)) if changed_fields else ""
        rows.append(row)

    if columns:
        # Preserve requested order; keep sku first if present
        cols = [c for c in columns if c]
        if split_images and "image_urls" in cols:
            idx = cols.index("image_urls") + 1
            img_cols = [f"image_{i}" for i in range(1, 6)]
            cols = cols[:idx] + img_cols + cols[idx:]
        if changed_map is not None:
            cols = cols + ["changed_fields"]
    else:
        base_cols = list(EXCEL_COLUMNS)
        if split_images:
            img_cols = [f"image_{i}" for i in range(1, 6)]
            idx = base_cols.index("image_urls") + 1
            cols = base_cols[:idx] + img_cols + base_cols[idx:]
        else:
            cols = base_cols
        if changed_map is not None:
            cols = cols + ["changed_fields"]

    df = pd.DataFrame(rows)
    for col in cols:
        if col not in df.columns:
            df[col] = ""
    return df[cols]


def export_excel(
    records: list[ProductRecord],
    output_path: str | Path,
    failures: list[ScrapeFailure] | None = None,
    changed_map: dict[str, set[str]] | None = None,
    include_raw_specs: bool = True,
    columns: list[str] | None = None,
) -> Path:
    """
    Write a downloadable .xlsx with:
      - Products sheet (one row per SKU)
      - Raw Specs sheet (optional)
      - Failures sheet (if any)
      - Changes sheet (if refresh comparison provided)
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    df = records_to_dataframe(records, changed_map=changed_map, columns=columns)
    wb = Workbook()

    ws = wb.active
    ws.title = "Products"
    for r_idx, row in enumerate(dataframe_to_rows(df, index=False, header=True), start=1):
        for c_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=value)
            if r_idx == 1:
                cell.fill = HEADER_FILL
                cell.font = HEADER_FONT
            cell.alignment = Alignment(vertical="top", wrap_text=True)

    if changed_map:
        headers = {cell.value: cell.column for cell in ws[1]}
        for r_idx, rec in enumerate(records, start=2):
            fields = changed_map.get(rec.sku, set())
            for field_name in fields:
                col = headers.get(field_name)
                if col:
                    ws.cell(row=r_idx, column=col).fill = CHANGED_FILL

    _autosize(ws)

    if include_raw_specs:
        ws_specs = wb.create_sheet("Raw Specs")
        spec_headers = ["sku", "product_title", "spec_key", "spec_value"]
        for c_idx, h in enumerate(spec_headers, start=1):
            cell = ws_specs.cell(row=1, column=c_idx, value=h)
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
        r = 2
        for rec in records:
            if not rec.raw_specs:
                continue
            for key, value in rec.raw_specs.items():
                ws_specs.cell(row=r, column=1, value=rec.sku)
                ws_specs.cell(row=r, column=2, value=rec.product_title)
                ws_specs.cell(row=r, column=3, value=str(key))
                ws_specs.cell(row=r, column=4, value=str(value))
                r += 1
        _autosize(ws_specs)

    if failures:
        ws_fail = wb.create_sheet("Failures")
        for c_idx, h in enumerate(["url", "reason", "scraped_at"], start=1):
            cell = ws_fail.cell(row=1, column=c_idx, value=h)
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
        for r_idx, fail in enumerate(failures, start=2):
            ws_fail.cell(row=r_idx, column=1, value=fail.url).fill = FAIL_FILL
            ws_fail.cell(row=r_idx, column=2, value=fail.reason)
            ws_fail.cell(row=r_idx, column=3, value=fail.scraped_at)
        _autosize(ws_fail)

    if changed_map:
        ws_chg = wb.create_sheet("Changes")
        for c_idx, h in enumerate(["sku", "changed_fields"], start=1):
            cell = ws_chg.cell(row=1, column=c_idx, value=h)
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
        r = 2
        for sku, fields in sorted(changed_map.items()):
            if not fields:
                continue
            ws_chg.cell(row=r, column=1, value=sku)
            ws_chg.cell(row=r, column=2, value=", ".join(sorted(fields))).fill = CHANGED_FILL
            r += 1
        _autosize(ws_chg)

    wb.save(output_path)
    logger.info("Exported %d record(s) → %s", len(records), output_path)
    return output_path


def _autosize(ws, max_width: int = 48) -> None:
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        length = 0
        for cell in col[:50]:
            length = max(length, len(str(cell.value or "")))
        ws.column_dimensions[letter].width = min(max(length + 2, 10), max_width)
