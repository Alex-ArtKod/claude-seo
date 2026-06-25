#!/usr/bin/env python3
"""
Fetch Google SERP data via the xmlriver.com API and return normalized JSON.

xmlriver returns Yandex-style XML. This script queries it, parses the result
defensively (tag names only, nesting-agnostic), strips highlight markup, and
prints a clean JSON object the seo-tz-generator pipeline can feed into the
strategist prompt.

Credentials (in priority order):
    1. Environment: XMLRIVER_USER, XMLRIVER_KEY
    2. Config file:  ~/.config/claude-seo/xmlriver.json  -> {"user": "...", "key": "..."}

Usage:
    python xmlriver_serp.py "имплантация зубов под ключ" --region "Ростов-на-Дону" --num 10
    python xmlriver_serp.py "протезирование зубов" --loc 1011969 --num 20
    python xmlriver_serp.py "..." --dump raw.xml          # also save raw XML for debugging

Output (stdout): JSON
    {
      "query": "...", "region": "...", "loc": null, "engine": "google",
      "found": "1234", "results_count": 10,
      "results": [{"position":1,"url":"...","domain":"...","title":"...","snippet":"..."}, ...],
      "error": null
    }
Exit codes: 0 ok, 2 auth/config error, 3 API/network error, 4 no results.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

try:
    import requests
except ImportError:
    print(json.dumps({"error": "requests library required: pip install requests"}, ensure_ascii=False))
    sys.exit(3)

GOOGLE_ENDPOINT = "https://xmlriver.com/search/xml"
YANDEX_ENDPOINT = "https://xmlriver.com/search_yandex/xml"
CONFIG_PATH = Path.home() / ".config" / "claude-seo" / "xmlriver.json"
TAG_RE = re.compile(r"<[^>]+>")


def load_credentials() -> tuple[str, str]:
    """Return (user, key) from env first, then the config file."""
    user = os.environ.get("XMLRIVER_USER")
    key = os.environ.get("XMLRIVER_KEY")
    if user and key:
        return user, key
    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            user = user or str(data.get("user", "")).strip()
            key = key or str(data.get("key", "")).strip()
        except (ValueError, OSError) as exc:
            raise SystemExit(_err(f"cannot read {CONFIG_PATH}: {exc}", 2))
    if not user or not key:
        raise SystemExit(_err(
            "xmlriver credentials missing. Set XMLRIVER_USER + XMLRIVER_KEY, or create "
            f"{CONFIG_PATH} with {{\"user\": \"...\", \"key\": \"...\"}}", 2))
    return user, key


def _err(message: str, code: int) -> str:
    """Print a JSON error to stdout and signal the exit code via SystemExit."""
    print(json.dumps({"error": message}, ensure_ascii=False))
    return code  # used as SystemExit value


def clean(text: str | None) -> str:
    """Strip xmlriver highlight tags and collapse whitespace."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", TAG_RE.sub("", text)).strip()


def find_text(node: ET.Element, *tags: str) -> str:
    """Return cleaned text of the first descendant matching any of tags."""
    for tag in tags:
        found = node.find(f".//{tag}")
        if found is not None and (found.text or len(found)):
            # join nested passage text if the element has children
            raw = "".join(found.itertext()) if len(found) else (found.text or "")
            cleaned = clean(raw)
            if cleaned:
                return cleaned
    return ""


def query_serp(query: str, user: str, key: str, num: int, loc: str | None,
               engine: str, timeout: int, dump: str | None) -> dict:
    endpoint = YANDEX_ENDPOINT if engine == "yandex" else GOOGLE_ENDPOINT
    params = {"user": user, "key": key, "query": query, "groupby": str(max(1, min(num, 100)))}
    if loc:
        params["loc"] = loc
    try:
        resp = requests.get(endpoint, params=params, timeout=timeout)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise SystemExit(_err(f"xmlriver request failed: {exc}", 3))

    if dump:
        try:
            Path(dump).write_text(resp.text, encoding="utf-8")
        except OSError:
            pass

    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError as exc:
        raise SystemExit(_err(f"xmlriver returned non-XML or malformed XML: {exc}", 3))

    # API-level error element (e.g. bad key, no balance)
    err = root.find(".//error")
    if err is not None:
        raise SystemExit(_err(f"xmlriver API error: {clean(err.text) or err.get('code', 'unknown')}", 3))

    found = find_text(root, "found") or ""
    results = []
    for i, doc in enumerate(root.iter("doc"), start=1):
        url = find_text(doc, "url")
        if not url:
            continue
        results.append({
            "position": len(results) + 1,
            "url": url,
            "domain": urlparse(url).netloc,
            "title": find_text(doc, "title"),
            "snippet": find_text(doc, "passages", "headline", "snippet"),
        })
        if len(results) >= num:
            break

    return {"found": found, "results": results}


def main() -> int:
    ap = argparse.ArgumentParser(description="Fetch Google/Yandex SERP via xmlriver.")
    ap.add_argument("query", help="Search query")
    ap.add_argument("--region", default="", help="Region name; appended to the query when --loc is not given")
    ap.add_argument("--loc", default=None, help="Precise Google geotarget id (e.g. Moscow=1011969). Overrides --country and disables region-append.")
    ap.add_argument("--country", default="2643", help="Country geotarget id used when --loc is absent (default 2643 = Russia). loc is mandatory for xmlriver Google.")
    ap.add_argument("--num", type=int, default=10, help="Number of results (1-100, default 10)")
    ap.add_argument("--engine", choices=["google", "yandex"], default="google")
    ap.add_argument("--timeout", type=int, default=30)
    ap.add_argument("--dump", default=None, help="Save raw XML response to this path")
    args = ap.parse_args()

    # Force UTF-8 stdout so piped/captured output is not mangled by the Windows
    # locale code page (cp1251), which would corrupt Cyrillic for the caller.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    user, key = load_credentials()

    # xmlriver requires a valid `loc` (Google geotarget id) for Google search.
    # If the caller gave a precise city loc, use it as-is. Otherwise fall back to
    # the country-level default (Russia = 2643) and fold the region into the query
    # text so results are still localized (e.g. "имплантация зубов Ростов-на-Дону").
    effective_query = args.query
    effective_loc = args.loc
    if not effective_loc:
        if args.engine == "yandex":
            # Yandex on xmlriver uses different geo codes than Google's geotarget
            # ids, so the Google country default must NOT be sent. Localize via the
            # region folded into the query text instead.
            if args.region:
                effective_query = f"{args.query} {args.region}".strip()
        else:
            effective_loc = args.country
            if args.region:
                effective_query = f"{args.query} {args.region}".strip()

    data = query_serp(effective_query, user, key, args.num, effective_loc,
                       args.engine, args.timeout, args.dump)

    out = {
        "query": effective_query,
        "region": args.region or None,
        "loc": effective_loc,
        "engine": args.engine,
        "found": data["found"],
        "results_count": len(data["results"]),
        "results": data["results"],
        "error": None,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if data["results"] else 4


if __name__ == "__main__":
    sys.exit(main())
