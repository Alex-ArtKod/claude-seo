#!/usr/bin/env python3
"""Normalize Search Console, Yandex Webmaster, or generic query CSV exports."""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


OUTPUT_FIELDS = [
    "query", "page", "date", "country", "device", "clicks", "impressions", "ctr",
    "position", "brand_segment", "source",
]

ALIASES = {
    "query": ("query", "top queries", "search query", "запрос", "поисковый запрос"),
    "page": ("page", "landing page", "url", "страница", "адрес"),
    "date": ("date", "дата"),
    "country": ("country", "страна"),
    "device": ("device", "устройство"),
    "clicks": ("clicks", "клики", "click"),
    "impressions": ("impressions", "показы", "shows"),
    "ctr": ("ctr", "click through rate"),
    "position": ("position", "average position", "средняя позиция", "позиция"),
}


def clean_header(value: str) -> str:
    return " ".join(value.replace("\ufeff", "").strip().lower().split())


def get_value(row: dict[str, str], field: str) -> str:
    for alias in ALIASES[field]:
        candidate = row.get(alias, "")
        if candidate:
            return candidate.strip()
    return ""


def parse_number(raw: str, percent: bool = False) -> str:
    value = raw.strip().replace("\u00a0", "").replace(" ", "")
    if not value:
        return ""
    is_percent = value.endswith("%")
    value = value.rstrip("%").replace(",", ".")
    try:
        number = float(value)
    except ValueError:
        return ""
    if percent and is_percent:
        number /= 100
    if percent and not 0 <= number <= 1:
        return ""
    return f"{number:.6f}".rstrip("0").rstrip(".")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Search analytics CSV/TSV export")
    parser.add_argument("output", help="Normalized output CSV")
    parser.add_argument("--source", choices=("gsc", "yandex", "generic"), default="generic")
    parser.add_argument("--brand-pattern", action="append", default=[], help="Case-insensitive regex; repeatable")
    parser.add_argument("--default-page", default="", help="Landing page when export is query-only")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    patterns: list[re.Pattern[str]] = []
    try:
        patterns = [re.compile(pattern, re.IGNORECASE) for pattern in args.brand_pattern]
    except re.error as error:
        print(
            json.dumps(
                {"status": "error", "error": "invalid_brand_regex", "detail": str(error)},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    text = input_path.read_text(encoding="utf-8-sig")
    try:
        dialect = csv.Sniffer().sniff(text[:8192], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(text.splitlines(), dialect=dialect)
    headers = [clean_header(field) for field in (reader.fieldnames or [])]
    if not any(alias in headers for alias in ALIASES["query"]):
        print(
            json.dumps(
                {"status": "error", "error": "missing_query_column", "recognized_aliases": ALIASES["query"]},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2


    output_rows: list[dict[str, str]] = []
    for raw_row in reader:
        row = {clean_header(k or ""): (v or "").strip() for k, v in raw_row.items()}
        query = get_value(row, "query")
        if not query:
            continue
        if patterns:
            brand_segment = "brand" if any(pattern.search(query) for pattern in patterns) else "nonbrand"
        else:
            brand_segment = "unknown"
        output_rows.append(
            {
                "query": query,
                "page": get_value(row, "page") or args.default_page,
                "date": get_value(row, "date"),
                "country": get_value(row, "country"),
                "device": get_value(row, "device"),
                "clicks": parse_number(get_value(row, "clicks")),
                "impressions": parse_number(get_value(row, "impressions")),
                "ctr": parse_number(get_value(row, "ctr"), percent=True),
                "position": parse_number(get_value(row, "position")),
                "brand_segment": brand_segment,
                "source": args.source,
            }
        )

    output_rows.sort(key=lambda row: (row["query"].casefold(), row["page"], row["date"]))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(output_rows)
    print(
        json.dumps(
            {"status": "ok", "rows": len(output_rows), "output": str(output_path), "source": args.source},
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
