# Operating workflow

## Contents

1. Operating principles
2. State machine
3. Evidence and uncertainty
4. Mode playbooks
5. Recurring operating cycle
6. Handoff standard

## Operating principles

- Start from business outcomes, not a keyword list.
- Keep a reusable baseline and update it instead of rebuilding analysis from scratch.
- Separate collected facts, calculations, inferences, and recommendations.
- Assign one primary URL to one search-intent cluster. Allow secondary queries, not competing primary owners.
- Prefer the smallest pilot that can prove demand, conversion quality, and production feasibility.
- Treat rankings as an intermediate signal. Report qualified organic demand and economics where data exists.
- Never invent traffic, conversion, revenue, client, case, location, review, or competitor facts.
- Make no live-site changes unless the user explicitly authorizes implementation.

## State machine

Move the project through these states:

1. `baseline`: inputs inventoried, gaps logged, measurement checked, current site snapshot stored.
2. `strategy`: target segments, demand model, information architecture, KPI tree, and priorities approved.
3. `pilot`: a bounded group of commercial pages, cases, and supporting content is released or ready for release.
4. `sprints`: technical, content, authority, and conversion work is executed in capacity-aware cycles.
5. `measurement`: fresh search, crawl, analytics, and CRM evidence is compared with the baseline.
6. `optimization`: winners are expanded, weak assets are improved/merged, and blockers are removed.
7. `scale`: proven templates and workflows are extended without producing low-value page inventory.

Store the current state in `state/project-state.json`. A deliverable may advance the state only when its exit criteria are met. If execution is outside scope, record the recommended next state rather than claiming it was reached.

## Evidence and uncertainty

Use evidence in this order:

1. Business facts approved by the user: services, markets, capacity, margins, cases, restrictions.
2. First-party systems: CRM, analytics, call tracking, Search Console, Yandex Webmaster, CMS, server logs.
3. Direct crawl and rendered-page evidence.
4. Current search results and competitor pages.
5. Keyword tools and third-party estimates.
6. Heuristics and professional judgment.

For every material claim, use one of these labels internally and surface it when useful:

- `known`: directly supported by a supplied source.
- `calculated`: derived from supplied data; preserve formula and period.
- `inferred`: reasoned from evidence; state the basis.
- `unknown`: required evidence is unavailable.
- `assumption`: temporary input needed to continue; list it explicitly.

Do not turn third-party volume estimates into forecasts without a range and conversion assumptions. Do not compare periods with different attribution, tracking, filters, or seasonality without a caveat.

## Setup playbook

1. Read `project.yaml` or create the project with `bootstrap_project.py`.
2. Inventory all supplied files and integrations in `inputs/input-register.csv`.
3. Confirm business model, target buyers, priority offers, geography, language, sales cycle, capacity, and primary conversion.
4. Check measurement: organic source definitions, goals, CRM linkage, call tracking, brand/nonbrand split, bots, and internal traffic.
5. Normalize crawl and search exports with the bundled scripts.
6. Capture baseline metrics and data limitations in `state/baseline.json`.
7. Produce the strategy, site structure, technical backlog, content calendar, and 90-day sprint plan.
8. Validate the project. Keep any blocking unknowns visible in the handoff.

## Audit playbook

1. Define the audit boundary: domains, subdomains, languages, environments, page limit, and reporting period.
2. Snapshot robots, sitemaps, representative templates, redirects, canonicals, status codes, metadata, headings, internal links, schema, mobile rendering, and performance evidence.
3. Reconcile crawl URLs with sitemap, search analytics, indexed pages, and server logs when available.
4. Classify issues by effect: discovery, crawl, render, index, relevance, conversion, measurement, or migration risk.
5. Consolidate repeated template issues into one backlog item with affected URL count and examples.
6. Assign P0–P3 and a scored priority using `scoring-models.md`.
7. Distinguish verified defects from items requiring a developer or platform check.
8. Deliver a backlog with acceptance criteria, owner role, dependencies, validation method, and rollback note where relevant.

## Architecture playbook

1. Build a product matrix: offer, buyer, problem, outcome, proof, geography, margin/capacity, and conversion.
2. Assemble demand from first-party queries, sales language, SERPs, competitors, and keyword tools.
3. Cluster by shared search intent and SERP overlap, not lexical similarity alone.
4. Choose the page type rewarded by the current results: service, category, product, case, guide, comparison, location, or tool.
5. Map exactly one primary URL per cluster. Mark existing URLs as keep, improve, merge, redirect, noindex, delete, or create.
6. Design hubs, supporting pages, breadcrumbs, related links, and contextual anchors.
7. Check that every indexable page has distinct demand, useful content, proof, and an internal path.
8. Release architecture changes through a redirect/canonical/internal-link plan rather than only changing a diagram.

## Brief playbook

1. Identify page job, intent, audience, funnel stage, primary cluster, secondary questions, and target URL.
2. Capture current-result evidence and required page type.
3. Specify offer, differentiators, proof, constraints, conversion action, and claims that require approval.
4. Create a section outline with purpose and evidence needs; do not prescribe empty keyword repetition.
5. Define title/H1 direction, internal links, media, schema candidates, and acceptance criteria.
6. Add source notes and a fact-check list.
7. Mark unsupported facts as gaps, never as suggested copy.

## Sprint playbook

1. Load unfinished backlog and the latest evidence.
2. Apply hard gates first: P0 blockers, legal/brand constraints, measurement gaps, and dependencies.
3. Score eligible work, then apply business capacity and sequencing judgment.
4. Balance the sprint across foundations, demand capture, proof, and measurement; do not fill capacity with content alone.
5. Limit work in progress. Assign owner role, effort, due window, acceptance criteria, and validation date.
6. Define the expected leading signal and the decision to make when it arrives.
7. Reserve capacity for QA and regression repair.

## Monthly playbook

1. Freeze comparable periods and note seasonality, tracking, release, and brand-campaign changes.
2. Normalize new search data and compare crawl snapshots with `diff_baseline.py`.
3. Report results by landing-page group, cluster, brand/nonbrand, device, market, and conversion quality where possible.
4. Detect regressions, cannibalization, striking-distance opportunities, new demand, decay, and index bloat.
5. Compare released cohorts with unreleased or pre-release baselines; avoid claiming causality from simple correlation.
6. Record decisions: continue, improve, consolidate, stop, investigate, or scale.
7. Produce the next sprint and update `state/project-state.json`, `state/decisions.md`, and `state/experiments.csv`.

## Migration playbook

1. Inventory every known old URL from crawls, sitemaps, analytics, links, logs, and CMS exports.
2. Map each old URL to the closest equivalent new URL; do not redirect unrelated URLs to the homepage.
3. Define redirects, canonicals, robots, sitemaps, hreflang, analytics, schema, internal links, and staging controls.
4. Capture launch acceptance checks and a rollback threshold.
5. Validate on staging without making it publicly indexable.
6. Re-crawl immediately after launch and monitor priority URLs, errors, indexing, traffic, and conversions on a fixed cadence.
7. Preserve redirect mappings and monitor them long enough to catch late crawlers and backlinks.

## Recurring operating cycle

Use a two- to four-week sprint and a monthly evidence review:

- Weekly: delivery status, release QA, P0/P1 alerts, blocked decisions.
- Per release: affected-template crawl, index directive check, analytics verification, and rollback readiness.
- Monthly: search/crawl/analytics/CRM comparison, experiment decisions, next backlog.
- Quarterly: offer priorities, architecture, competitor/market change, content consolidation, authority plan, and forecasting assumptions.

## Handoff standard

End every run with:

- what was inspected and which period applies;
- deliverables created or updated;
- known findings and calculated results;
- assumptions and unavailable inputs;
- actions that require human approval or external access;
- risks and rollback considerations;
- the next recommended sprint or decision;
- validation status and any remaining errors or warnings.
