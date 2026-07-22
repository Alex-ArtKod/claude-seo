#!/usr/bin/env python3
"""Compare two normalized URL inventory snapshots and emit field-level changes."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


DEFAULT_FIELDS = ("status", "indexability", "canonical", "title", "description", "h1", "inlinks", "depth")
OUTPUT_FIELDS = ("url", "change_type", "field", "old_value", "new_value")


def load_inventory(path: Path) -> tuple[dict[str, dict[str, str]], list[str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = list(reader.fieldnames or [])
        if "url" not in headers:
            raise ValueError(f"{path} is missing the url column")
        return {row["url"].strip(): row for row in reader if row.get("url", "").strip()}, headers


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("old", help="Previous normalized URL inventory")
    parser.add_argument("new", help="Current normalized URL inventory")
    parser.add_argument("output", help="Field-level diff CSV")
    parser.add_argument("--field", action="append", dest="fields", help="Field to compare; repeatable")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        old, old_headers = load_inventory(Path(args.old).expanduser().resolve())
        new, new_headers = load_inventory(Path(args.new).expanduser().resolve())
    except ValueError as error:
        print(
            json.dumps(
                {"status": "error", "error": "invalid_inventory", "detail": str(error)},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2
    fields = tuple(args.fields or DEFAULT_FIELDS)
    missing = [field for field in fields if field not in old_headers or field not in new_headers]
    if missing:
        print(
            json.dumps(
                {"status": "error", "error": "missing_comparison_fields", "fields": missing},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    changes: list[dict[str, str]] = []
    for url in sorted(set(old) | set(new)):
        if url not in old:
            changes.append({"url": url, "change_type": "added", "field": "url", "old_value": "", "new_value": url})
            continue
        if url not in new:
            changes.append({"url": url, "change_type": "removed", "field": "url", "old_value": url, "new_value": ""})
            continue
        for field in fields:
            old_value = old[url].get(field, "")
            new_value = new[url].get(field, "")
            if old_value != new_value:
                changes.append(
                    {"url": url, "change_type": "changed", "field": field, "old_value": old_value, "new_value": new_value}
                )

    output_path = Path(args.output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(changes)
    counts = {
        change_type: sum(row["change_type"] == change_type for row in changes)
        for change_type in ("added", "removed", "changed")
    }
    print(
        json.dumps(
            {"status": "ok", "changes": len(changes), "change_types": counts, "output": str(output_path)},
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
