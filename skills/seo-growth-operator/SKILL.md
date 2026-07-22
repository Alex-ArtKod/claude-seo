---
name: seo-growth-operator
description: Build and operate an end-to-end SEO growth system for new, existing, or migrating websites. Ingest business context, site crawls, search analytics, CRM exports, keyword sets, and competitor evidence; create a baseline, keyword-to-URL map, information architecture, technical backlog, content roadmap, page briefs, sprint plans, and recurring performance reports. Use when the user asks to launch, automate, update, or run a comprehensive SEO strategy, 90-day SEO plan, SEO operating process, monthly SEO sprint/report, site migration SEO plan, or continuous SEO growth system. Do not use for a single-page audit or one isolated SEO question.
---

# SEO Growth Operator

Run SEO as a measurable operating system rather than a one-time advice document. Preserve project state between runs, separate evidence from hypotheses, and connect search work to qualified demand and business outcomes.

## Select the mode

Infer one mode from the request:

- `setup`: initialize a new SEO project, baseline, strategy, and 90-day backlog.
- `audit`: diagnose technical, content, commercial, and measurement issues.
- `architecture`: build demand clusters, map one primary URL per intent, and design internal linking.
- `brief`: create an implementation-ready brief for a page, case study, article, or technical change.
- `sprint`: prioritize the next 2–4 weeks from current state and capacity.
- `monthly`: compare fresh data with the baseline/previous period and create the next sprint.
- `migration`: map old/new URLs, redirects, launch QA, rollback signals, and post-launch monitoring.

If the mode is unclear, choose the narrowest mode that completes the request. Do not expand a requested audit into publication or live-site changes.

## Load only the required references

Read each selected reference completely before acting:

- For every mode, read [workflow.md](references/workflow.md) and [risk-policy.md](references/risk-policy.md).
- For prioritization, KPI design, or sprint planning, read [scoring-models.md](references/scoring-models.md).
- For audit, migration, technical backlog, or release QA, read [technical-rules.md](references/technical-rules.md).
- For architecture, content planning, briefs, cases, or page improvement, read [content-rules.md](references/content-rules.md).
- Before creating deliverables or validating a project, read [output-schemas.md](references/output-schemas.md).

Use current official search-engine documentation for unstable rules. Browse when the request depends on current requirements, algorithms, supported markup, platform behavior, or regulations. Prefer Google Search Central, Yandex Webmaster, Schema.org, and first-party analytics documentation.

## Establish the project

1. Find `project.yaml` in the user-provided project directory or current workspace.
2. If it is absent in `setup` mode, run `scripts/bootstrap_project.py` with the project name, mode, site URL, markets, and languages.
3. Never overwrite an existing project unless the user explicitly requests replacement. Extend or update it instead.
4. Read `project.yaml`, `state/last-run.json`, `state/decision-log.md`, and available inputs.
5. Validate input quality before drawing conclusions.

Required minimum:

- site URL or `new_site` mode;
- market and language;
- products/services;
- primary conversion;
- business type.

If data is incomplete, continue with explicit assumptions when safe. Mark unavailable baselines as unavailable; never invent traffic, conversion, revenue, rankings, competitors, or case-study evidence.

## Collect and normalize evidence

Prefer read-only collection. Use available first-party sources before third-party estimates:

1. Search Console and Yandex Webmaster.
2. Analytics and CRM exports.
3. Site crawl, server responses, Sitemap, robots, and rendered HTML.
4. Paid-search terms, site search, call notes, briefs, and sales objections.
5. Live SERPs and competitor pages.
6. Third-party keyword/link estimates.

Use scripts for deterministic transformations:

- `scripts/build_url_inventory.py`: normalize a crawl CSV into the project URL inventory.
- `scripts/normalize_search_data.py`: normalize GSC/Yandex-style search exports and label brand/non-brand.
- `scripts/prioritize_backlog.py`: calculate transparent task priority scores.
- `scripts/diff_baseline.py`: compare normalized URL inventories.
- `scripts/validate_project.py`: validate project structure, outputs, guardrails, and mapping conflicts.

Do not hide source limitations. Add `source`, `period`, `market`, and `confidence` to conclusions when relevant.

## Run the core workflow

### 1. Define business outcomes

Capture gross margin, acceptable CAC, sales conversion, sales cycle, ICP, priority services, capacity, and seasonality when available. Use qualified leads, pipeline, revenue, or gross profit as the primary outcome. Treat traffic and positions as leading indicators.

Separate:

- brand vs non-brand;
- commercial vs informational;
- landing-page type;
- search engine, region, and device;
- lead vs qualified lead;
- first touch vs last meaningful touch;
- 30/90/180/365-day cohorts for long B2B cycles.

### 2. Build the baseline

Create or update:

- `state/url-inventory.csv`;
- `state/keyword-map.csv`;
- `state/issue-register.csv`;
- `state/change-log.csv`;
- `state/baseline.json`;
- `state/last-run.json`.

Use `keep / improve / merge / redirect / noindex / delete / create` for URL actions. Treat delete and redirect as proposals unless explicitly authorized.

### 3. Diagnose

Check crawlability, indexability, canonicalization, redirects, status codes, rendering, internal links, mobile experience, Core Web Vitals, structured data, metadata, content value, proof, conversion paths, attribution, and external entity consistency.

Prioritize blockers before expansion:

- `P0`: blocks crawling, indexing, measurement, forms, or critical user paths.
- `P1`: affects priority templates, revenue pages, or the next 90 days.
- `P2`: scaling and material improvements.
- `P3`: low-impact polish or weakly supported experiments.

### 4. Map demand to pages

Build a product matrix across service, audience/site type, industry, problem/outcome, technology, geography, buying stage, and delivery format.

Assign one primary canonical URL to each stable intent. Split only when SERPs, user task, offer, proof, or conversion path materially differ. Merge keyword variants that expect the same page. Flag combinatorial page plans and doorway risk.

### 5. Design the solution

Produce the smallest architecture that covers validated demand. Ensure important commercial pages are reachable through navigation/hubs and contextual links. Do not create pages discoverable only through Sitemap.

Create a pilot before scale:

- 3–5 priority landing pages;
- 2–3 evidence-rich case studies;
- 4 evergreen resources across buying stages;
- one relevant video when the SERP supports it;
- complete internal linking and event tracking.

### 6. Prioritize and plan

Score opportunities transparently. Show component scores and assumptions, not only a final number. Respect monthly SEO, development, design, content, and expert capacity.

Create implementation-ready tasks with:

- affected URL/template;
- evidence and reason;
- expected outcome;
- owner;
- dependencies;
- effort;
- acceptance criteria;
- validation method;
- rollback condition when applicable.

### 7. Validate before handoff

Run `scripts/validate_project.py`. Resolve errors. Explain warnings that remain. Update project state only after the deliverables reflect the final decisions.

## Mode-specific outputs

### setup

Create:

- `deliverables/SEO-STRATEGY.md`;
- `deliverables/SITE-STRUCTURE.md`;
- `deliverables/TECHNICAL-BACKLOG.csv`;
- `deliverables/CONTENT-CALENDAR.md`;
- `deliverables/SPRINT-PLAN.md`.

### audit

Create/update the URL inventory, issue register, technical backlog, and an evidence-backed audit summary. Do not promise implementation.

### architecture

Create/update the keyword map, site structure, redirect/merge proposals, and internal-link matrix.

### brief

Create a self-contained brief with intent, audience, unique value, evidence, structure, internal links, CTA, analytics, technical requirements, fact-check owner, and review date.

### sprint

Create `deliverables/SPRINT-PLAN.md` using current backlog, capacity, dependencies, and unresolved risks. Keep only work that can realistically finish in the sprint.

### monthly

Create `deliverables/MONTHLY-REPORT.md`, update the change log and state, explain deviations, identify pages with actionable evidence, and create the next sprint.

### migration

Create redirect mapping, pre-launch checks, launch-day checks, and 24-hour/3-day/7-day/14-day/30-day monitoring. Never execute destructive URL changes without explicit authorization.

## Quality gates

Do not scale a template until:

- pages are crawlable and indexable as intended;
- no material cannibalization is detected;
- impressions or other meaningful leading signals exist;
- page value and evidence are genuinely distinct;
- analytics and CTA work;
- production cost fits capacity;
- technical and editorial QA pass.

Do not treat word count, third-party uniqueness percentage, domain age, or raw backlink count as success metrics.

## Handoff

Lead with the business outcome and highest-priority blockers. Link to all created files. State:

- what is known;
- what is inferred;
- what is unavailable;
- what requires human approval;
- what should happen in the next sprint.

Keep the final response concise; detailed reasoning belongs in project artifacts.
