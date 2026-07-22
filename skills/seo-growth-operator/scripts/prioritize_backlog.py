#!/usr/bin/env python3
"""Score and sort an SEO technical backlog using impact/reach/confidence/effort."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


SCORE_FIELDS = ("impact", "reach", "confidence", "effort")


def as_score(row: dict[str, str], field: str, line_number: int) -> int:
    try:
        score = int(row.get(field, ""))
    except ValueError as error:
        raise ValueError(f"row {line_number}: {field} must be an integer from 1 to 5") from error
    if not 1 <= score <= 5:
        raise ValueError(f"row {line_number}: {field} must be from 1 to 5")
    return score


def is_true(raw: str) -> bool:
    return raw.strip().casefold() in {"1", "true", "yes", "y", "да"}


def priority_for(row: dict[str, str], score: float) -> str:
    severity = row.get("severity", "").strip().casefold()
    if is_true(row.get("blocker", "")) or severity in {"critical", "критический", "критичная"}:
        return "P0"
    if score >= 40:
        return "P1"
    if score >= 20:
        return "P2"
    return "P3"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="Backlog CSV")
    parser.add_argument("output", help="Scored output CSV")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    with input_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = list(reader.fieldnames or [])
        missing = [field for field in SCORE_FIELDS if field not in headers]
        if missing:
            print(
                json.dumps(
                    {"status": "error", "error": "missing_scoring_columns", "columns": missing},
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 2
        rows = list(reader)

    scored: list[dict[str, str]] = []
    try:
        for index, row in enumerate(rows, start=2):
            impact, reach, confidence, effort = (as_score(row, field, index) for field in SCORE_FIELDS)
            score = impact * reach * confidence / effort
            row["priority_score"] = f"{score:.2f}".rstrip("0").rstrip(".")
            row["priority"] = priority_for(row, score)
            scored.append(row)
    except ValueError as error:
        print(
            json.dumps(
                {"status": "error", "error": "invalid_score", "detail": str(error)},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    scored.sort(key=lambda row: (order[row["priority"]], -float(row["priority_score"]), row.get("task_id", "")))
    output_headers = headers[:]
    for field in ("priority_score", "priority"):
        if field not in output_headers:
            output_headers.append(field)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=output_headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(scored)
    counts = {priority: sum(row["priority"] == priority for row in scored) for priority in ("P0", "P1", "P2", "P3")}
    print(
        json.dumps(
            {"status": "ok", "rows": len(scored), "priorities": counts, "output": str(output_path)},
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
