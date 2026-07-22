#!/usr/bin/env python3
"""Create a non-destructive SEO Growth Operator project skeleton."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
from datetime import date, datetime, timezone
from pathlib import Path


ASSET_FILES = (
    "seo-strategy.md",
    "site-structure.md",
    "technical-backlog.csv",
    "content-calendar.md",
    "sprint-plan.md",
    "monthly-report.md",
)


def split_values(raw: str) -> list[str]:
    values = [value.strip() for value in raw.split(",") if value.strip()]
    return values or ["unknown"]


def yaml_list_fragment(raw: str) -> str:
    values = [value.replace('"', '\\"') for value in split_values(raw)]
    return '"\n    - "'.join(values)


def render_template(source: Path, destination: Path, replacements: dict[str, str]) -> None:
    text = source.read_text(encoding="utf-8")
    for key, value in replacements.items():
        text = text.replace("{{" + key + "}}", value)
    destination.write_text(text, encoding="utf-8", newline="\n")


def write_csv(path: Path, headers: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        csv.writer(handle).writerow(headers)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", help="Project directory to create or initialize")
    parser.add_argument("--name", required=True, help="Project name")
    parser.add_argument("--mode", choices=("existing", "new", "migration"), default="existing")
    parser.add_argument("--url", default="unknown", help="Primary site URL")
    parser.add_argument("--markets", default="RU", help="Comma-separated country or market codes")
    parser.add_argument("--languages", default="ru", help="Comma-separated language codes")
    parser.add_argument("--business-type", default="b2b-services")
    parser.add_argument("--primary-conversion", default="qualified_lead")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).expanduser().resolve()
    assets = Path(__file__).resolve().parent.parent / "assets"

    targets = [root / "project.yaml"]
    targets.extend(root / "deliverables" / name for name in ASSET_FILES)
    targets.extend(
        (
            root / "inputs" / "input-register.csv",
            root / "state" / "project-state.json",
            root / "state" / "baseline.json",
            root / "state" / "decisions.md",
            root / "state" / "experiments.csv",
            root / "state" / "url-inventory.csv",
            root / "state" / "search-normalized.csv",
            root / "state" / "keyword-map.csv",
        )
    )
    collisions = [str(path) for path in targets if path.exists()]
    if collisions:
        print(
            json.dumps(
                {
                    "status": "error",
                    "error": "refusing_to_overwrite",
                    "collisions": collisions,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2

    for directory in (
        root,
        root / "inputs" / "business",
        root / "inputs" / "analytics",
        root / "inputs" / "crawl",
        root / "inputs" / "research",
        root / "state",
        root / "deliverables",
    ):
        directory.mkdir(parents=True, exist_ok=True)

    today = date.today().isoformat()
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    replacements = {
        "PROJECT_NAME": args.name,
        "PROJECT_MODE": args.mode,
        "PRIMARY_URL": args.url,
        "MARKETS": yaml_list_fragment(args.markets),
        "LANGUAGES": yaml_list_fragment(args.languages),
        "BUSINESS_TYPE": args.business_type,
        "PRIMARY_CONVERSION": args.primary_conversion,
        "CREATED_DATE": today,
    }

    render_template(assets / "project.yaml", root / "project.yaml", replacements)
    for name in ASSET_FILES:
        destination = root / "deliverables" / name
        if name.endswith(".csv"):
            shutil.copyfile(assets / name, destination)
        else:
            render_template(assets / name, destination, replacements)

    write_csv(
        root / "inputs" / "input-register.csv",
        ["input_id", "file_or_system", "input_type", "period", "source_owner", "received_at", "status", "notes"],
    )
    write_csv(
        root / "state" / "experiments.csv",
        [
            "experiment_id", "cohort_id", "hypothesis", "urls", "release_date", "baseline_period",
            "comparison_period", "primary_metric", "guardrail_metric", "result", "decision",
            "next_review_date", "confounders",
        ],
    )
    write_csv(
        root / "state" / "url-inventory.csv",
        [
            "url", "status", "indexability", "canonical", "title", "description", "h1",
            "word_count", "inlinks", "depth", "host", "path", "query", "source",
        ],
    )
    write_csv(
        root / "state" / "search-normalized.csv",
        [
            "query", "page", "date", "country", "device", "clicks", "impressions", "ctr",
            "position", "brand_segment", "source",
        ],
    )
    write_csv(
        root / "state" / "keyword-map.csv",
        [
            "cluster_id", "cluster_name", "primary_query", "secondary_queries", "intent", "page_type",
            "primary_url", "current_url", "action", "parent_hub", "business_fit", "demand",
            "attainability", "proof", "conversion_fit", "effort", "opportunity_score", "evidence",
            "review_status",
        ],
    )

    state = {
        "schema_version": "1.0",
        "current_state": "baseline",
        "created_at": now,
        "updated_at": now,
        "last_validated_at": None,
        "latest_reporting_period": None,
        "open_blockers": ["Complete the input register and approve business facts."],
        "next_review_date": None,
    }
    (root / "state" / "project-state.json").write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (root / "state" / "baseline.json").write_text("[]\n", encoding="utf-8")
    (root / "state" / "decisions.md").write_text(
        f"# Decisions — {args.name}\n\nNo decisions recorded yet.\n", encoding="utf-8"
    )

    print(
        json.dumps(
            {
                "status": "ok",
                "project_root": str(root),
                "created_files": len(targets),
                "live_changes_authorized": False,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
