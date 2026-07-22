#!/usr/bin/env python3
"""Validate an SEO Growth Operator project structure and critical data contracts."""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path


REQUIRED_FILES = (
    "project.yaml",
    "inputs/input-register.csv",
    "state/project-state.json",
    "state/baseline.json",
    "state/decisions.md",
    "state/experiments.csv",
    "state/url-inventory.csv",
    "state/search-normalized.csv",
    "state/keyword-map.csv",
    "deliverables/seo-strategy.md",
    "deliverables/site-structure.md",
    "deliverables/technical-backlog.csv",
    "deliverables/content-calendar.md",
    "deliverables/sprint-plan.md",
    "deliverables/monthly-report.md",
)

CSV_SCHEMAS = {
    "inputs/input-register.csv": [
        "input_id", "file_or_system", "input_type", "period", "source_owner", "received_at", "status", "notes",
    ],
    "state/experiments.csv": [
        "experiment_id", "cohort_id", "hypothesis", "urls", "release_date", "baseline_period",
        "comparison_period", "primary_metric", "guardrail_metric", "result", "decision", "next_review_date",
        "confounders",
    ],
    "state/url-inventory.csv": [
        "url", "status", "indexability", "canonical", "title", "description", "h1", "word_count",
        "inlinks", "depth", "host", "path", "query", "source",
    ],
    "state/search-normalized.csv": [
        "query", "page", "date", "country", "device", "clicks", "impressions", "ctr", "position",
        "brand_segment", "source",
    ],
    "state/keyword-map.csv": [
        "cluster_id", "cluster_name", "primary_query", "secondary_queries", "intent", "page_type",
        "primary_url", "current_url", "action", "parent_hub", "business_fit", "demand", "attainability",
        "proof", "conversion_fit", "effort", "opportunity_score", "evidence", "review_status",
    ],
    "deliverables/technical-backlog.csv": [
        "task_id", "category", "issue", "evidence", "example_urls", "affected_count", "severity", "blocker",
        "impact", "reach", "confidence", "effort", "priority_score", "priority", "owner_role", "dependency",
        "acceptance_criteria", "validation_method", "rollback_note", "status", "target_sprint",
    ],
}

ALLOWED_STATES = {"baseline", "strategy", "pilot", "sprints", "measurement", "optimization", "scale"}
PLACEHOLDER = re.compile(r"\{\{[^{}]+\}\}|\b(?:TODO|TBD|FIXME)\b", re.IGNORECASE)


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", help="SEO project root")
    parser.add_argument("--update-state", action="store_true", help="Write last_validated_at when there are no errors")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []

    for relative in REQUIRED_FILES:
        if not (root / relative).is_file():
            errors.append(f"missing required file: {relative}")

    for relative, expected in CSV_SCHEMAS.items():
        path = root / relative
        if not path.is_file():
            continue
        try:
            headers, _ = read_csv(path)
        except (OSError, csv.Error, UnicodeError) as error:
            errors.append(f"cannot read {relative}: {error}")
            continue
        missing = [field for field in expected if field not in headers]
        if missing:
            errors.append(f"{relative} missing columns: {', '.join(missing)}")

    state_path = root / "state" / "project-state.json"
    state: dict[str, object] | None = None
    if state_path.is_file():
        try:
            state = json.loads(state_path.read_text(encoding="utf-8"))
            required_state = {
                "schema_version", "current_state", "created_at", "updated_at", "last_validated_at",
                "latest_reporting_period", "open_blockers", "next_review_date",
            }
            missing = sorted(required_state - set(state))
            if missing:
                errors.append(f"state/project-state.json missing keys: {', '.join(missing)}")
            if state.get("current_state") not in ALLOWED_STATES:
                errors.append(f"invalid current_state: {state.get('current_state')!r}")
        except (OSError, UnicodeError, json.JSONDecodeError) as error:
            errors.append(f"cannot read state/project-state.json: {error}")

    url_path = root / "state" / "url-inventory.csv"
    if url_path.is_file():
        _, rows = read_csv(url_path)
        seen: set[str] = set()
        duplicates: set[str] = set()
        for row in rows:
            url = row.get("url", "").strip()
            if url and url in seen:
                duplicates.add(url)
            seen.add(url)
        if duplicates:
            errors.append(f"state/url-inventory.csv has {len(duplicates)} duplicate URLs")

    map_path = root / "state" / "keyword-map.csv"
    if map_path.is_file():
        _, rows = read_csv(map_path)
        owners: dict[str, set[str]] = {}
        for row in rows:
            cluster = row.get("cluster_id", "").strip()
            url = row.get("primary_url", "").strip()
            if cluster and url:
                owners.setdefault(cluster, set()).add(url)
        conflicts = {cluster: urls for cluster, urls in owners.items() if len(urls) > 1}
        if conflicts:
            errors.append(f"state/keyword-map.csv has {len(conflicts)} clusters with multiple primary URLs")

    for relative in REQUIRED_FILES:
        path = root / relative
        if path.suffix.lower() not in {".md", ".yaml", ".yml"} or not path.is_file():
            continue
        try:
            matches = PLACEHOLDER.findall(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError) as error:
            errors.append(f"cannot read {relative}: {error}")
            continue
        if matches:
            errors.append(f"{relative} contains unresolved placeholders: {', '.join(sorted(set(matches)))}")

    project_yaml = root / "project.yaml"
    if project_yaml.is_file():
        text = project_yaml.read_text(encoding="utf-8")
        if "live_changes_authorized: true" in text.casefold():
            warnings.append("project.yaml authorizes live changes; verify named approval and current scope")
        for key in ("name:", "mode:", "primary_url:", "countries:", "languages:", "type:", "primary_conversion:"):
            if key not in text:
                errors.append(f"project.yaml missing required key marker: {key}")

    if not errors and args.update_state and state is not None:
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        state["last_validated_at"] = now
        state["updated_at"] = now
        state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    result = {"root": str(root), "errors": errors, "warnings": warnings, "valid": not errors}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
