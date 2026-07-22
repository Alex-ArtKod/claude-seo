#!/usr/bin/env python3
"""Normalize common crawler CSV exports into the project URL inventory schema."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from urllib.parse import urlsplit


OUTPUT_FIELDS = [
    "url", "status", "indexability", "canonical", "title", "description", "h1",
    "word_count", "inlinks", "depth", "host", "path", "query", "source",
]

ALIASES = {
    "url": ("url", "address", "адрес", "страница"),
    "status": ("status", "status code", "http status", "код ответа", "статус"),
    "indexability": ("indexability", "indexability status", "индексируемость"),
    "canonical": ("canonical", "canonical link element 1", "канонический url"),
    "title": ("title", "title 1", "заголовок страницы"),
    "description": ("description", "meta description", "meta description 1", "описание"),
    "h1": ("h1", "h1-1", "h1 1"),
    "word_count": ("word count", "words", "количество слов"),
    "inlinks": ("inlinks", "unique inlinks", "входящие ссылки"),
    "depth": ("crawl depth", "depth", "глубина"),
}


def clean_header(value: str) -> str:
    return " ".join(value.replace("\ufeff", "").strip().lower().split())


def read_rows(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    text = path.read_text(encoding="utf-8-sig")
    try:
        dialect = csv.Sniffer().sniff(text[:8192], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(text.splitlines(), dialect=dialect)
    rows = [{clean_header(k or ""): (v or "").strip() for k, v in row.items()} for row in reader]
    headers = [clean_header(field) for field in (reader.fieldnames or [])]
    return rows, headers


def value(row: dict[str, str], field: str) -> str:
    for alias in ALIASES[field]:
        candidate = row.get(alias, "")
        if candidate:
            return candidate
    return ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Crawler CSV/TSV export")
    parser.add_argument("output", help="Normalized output CSV")
    parser.add_argument("--source", default="crawl-export", help="Source label stored in each row")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    rows, headers = read_rows(input_path)
    if not any(alias in headers for alias in ALIASES["url"]):
        print(
            json.dumps(
                {"status": "error", "error": "missing_url_column", "recognized_aliases": ALIASES["url"]},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    normalized: dict[str, dict[str, str]] = {}
    for row in rows:
        url = value(row, "url").strip()
        if not url:
            continue
        parsed = urlsplit(url)
        normalized[url] = {
            "url": url,
            "status": value(row, "status"),
            "indexability": value(row, "indexability"),
            "canonical": value(row, "canonical"),
            "title": value(row, "title"),
            "description": value(row, "description"),
            "h1": value(row, "h1"),
            "word_count": value(row, "word_count"),
            "inlinks": value(row, "inlinks"),
            "depth": value(row, "depth"),
            "host": parsed.netloc.lower(),
            "path": parsed.path or "/",
            "query": parsed.query,
            "source": args.source,
        }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(normalized[url] for url in sorted(normalized))
    print(
        json.dumps(
            {"status": "ok", "rows": len(normalized), "output": str(output_path)},
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
