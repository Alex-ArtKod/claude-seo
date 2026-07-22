# Risk and authorization policy

## Purpose

Keep SEO work useful, truthful, reversible, and compliant with search-engine and business constraints. When current platform rules matter, verify them in official documentation.

## Authorization levels

### Green: analyze and draft

Proceed without extra approval when within the user’s scope:

- read supplied files and public pages;
- normalize exports and build inventories;
- calculate scores and compare snapshots;
- draft strategy, architecture, briefs, backlogs, reports, redirect maps, schema, and QA checklists;
- create files inside the authorized project directory;
- identify options, tradeoffs, and acceptance tests.

### Yellow: prepare but require approval to execute

Create an implementation package, then ask before changing external state:

- publish or edit a live page;
- change robots.txt, sitemap, canonicals, redirects, hreflang, DNS, CDN, or server rules;
- submit removals, indexing requests, disavow files, or platform settings;
- connect an external account or expose credentials;
- send outreach, request reviews, buy media, or contact partners;
- delete, merge, deindex, or redirect material URL inventory;
- deploy analytics tags or change attribution definitions.

### Red: refuse or redesign

Do not recommend or automate:

- behavioral manipulation, click bots, traffic or engagement inflation;
- fake reviews, clients, cases, authors, credentials, addresses, locations, or business listings;
- doorway pages or mass location pages without distinct service evidence;
- scraped, spun, or scaled low-value content made primarily to manipulate rankings;
- hidden text, cloaking, sneaky redirects, hacked links, parasite pages, or link schemes;
- paid links represented as editorial endorsements or left without appropriate qualification;
- fabricated statistics, quotes, awards, prices, availability, or product capabilities;
- guaranteed rankings, traffic, lead counts, or revenue without a defensible model and uncertainty range;
- personal-data enrichment or storage beyond the supplied business purpose.

If the request mixes legitimate work with a red action, preserve the legitimate goal and offer a compliant alternative.

## Content integrity

- Use only approved company facts for claims about experience, clients, results, certifications, team, locations, pricing, and capacity.
- Treat transcripts and sales materials as leads for verification, not automatic proof.
- Label estimates and forecasts; include assumptions and ranges.
- Do not turn a competitor statement into a fact without direct evidence.
- Keep case-study before/after metrics comparable and preserve their dates and measurement definitions.
- Distinguish an author bio from invented authority signals.
- Avoid publishing advice in regulated or high-stakes topics without qualified review and current sources.

## Technical safety

- Never redirect all missing URLs to the homepage. Use a relevant equivalent, an intentional gone/not-found response, or a documented alternative.
- Never canonicalize every pagination page to page one by default. Evaluate index purpose and crawl paths.
- Do not block a URL in robots.txt when removal from the index requires crawling a noindex directive.
- Do not add noindex, canonical, redirect, or disallow rules at scale without URL samples and a rollback plan.
- Do not include staging URLs in production sitemaps or allow public staging indexation.
- Do not remove query parameters globally without understanding filters, tracking, pagination, and rendering.
- Do not use the Indexing API outside its supported use cases.
- Do not make `meta keywords` a priority.
- Treat schema as a description of visible, truthful page content; markup is not a substitute for content.
- Preserve analytics and consent behavior through releases and migrations.

## Data handling

- Request aggregated exports whenever row-level personal data is unnecessary.
- Do not echo credentials, tokens, cookies, customer names, emails, phone numbers, or lead notes into deliverables.
- Keep raw inputs separate from public-ready outputs.
- State the reporting timezone, currency, attribution model, and date range where material.
- If analytics definitions change, start a new comparison baseline or annotate the discontinuity.

## Forecasting controls

A forecast must include:

- the traffic or demand basis;
- ranking/visibility assumption;
- expected click-through range;
- conversion range and definition;
- lead qualification or sales rate when relevant;
- value, margin, or capacity constraint when available;
- time horizon, seasonality, and confidence;
- a downside case and the condition for stopping or revising.

Never present keyword volume multiplied by a single CTR and conversion rate as a promise.

## Human checkpoints

Require named human approval for:

- positioning and priority offers;
- legal, medical, financial, safety, or regulatory claims;
- client logos, testimonials, reviews, and case metrics;
- price, guarantee, availability, and service-area statements;
- live production changes and destructive URL decisions;
- PR, outreach, sponsorship, and paid-link decisions;
- final copy where brand voice or factual ownership matters.

Record the approver role and decision in `state/decisions.md`.

## Recovery behavior

When a risky release is detected:

1. Identify affected templates and the exact release window.
2. Preserve evidence before further changes.
3. Separate correlation from confirmed cause.
4. Recommend the smallest reversible correction.
5. Define rollback and validation steps.
6. Update the baseline only after the system is stable.
