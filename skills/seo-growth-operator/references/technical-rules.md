# Technical SEO rules

## Contents

1. Evidence standard
2. Discovery and crawl
3. Indexability and duplication
4. Rendering and experience
5. Structured data
6. International and local variants
7. Migration and release QA
8. Acceptance criteria

## Evidence standard

Use current official search-engine documentation when a recommendation depends on supported behavior. Crawl evidence shows what the crawler found, not necessarily what the search engine indexed or users experienced. Reconcile crawl, rendered HTML, sitemaps, search-platform data, analytics, and logs where available.

Record a representative URL, affected template/group, affected count, detection method, and verification date for every material issue.

## Discovery and crawl

Check:

- robots.txt syntax, host coverage, sitemap references, and unintended environment rules;
- XML sitemap status, canonical/indexable-only inclusion, freshness, and partitioning;
- internal path from a crawlable hub to every intended indexable URL;
- orphan candidates across sitemap, analytics, search data, backlinks, and CMS exports;
- status codes, redirect chains/loops, soft errors, and broken internal links;
- parameter, filter, search, calendar, session, and faceted crawl spaces;
- pagination discovery and links without assuming a universal canonical pattern;
- JavaScript-dependent navigation and links in rendered output;
- server stability, rate limiting, and log evidence when supplied.

Do not recommend crawl-budget work merely because a site is large; identify a real discovery, recrawl, server, or index-quality problem.

## Indexability and duplication

For each URL group, reconcile:

- HTTP status;
- robots accessibility;
- meta/X-Robots directives;
- canonical declaration and canonical target status;
- sitemap membership;
- hreflang consistency where relevant;
- internal-link signals;
- rendered content uniqueness and search intent;
- search-platform inspection/indexing evidence.

Rules:

- Self-canonical is appropriate for a preferred unique URL, but canonical is a hint, not a permission to ignore conflicting signals.
- Canonical targets should be crawlable, indexable, stable, and equivalent.
- Use redirects for moved or retired URLs when a relevant successor exists.
- Preserve a real not-found/gone response when no relevant replacement exists.
- Use noindex for accessible pages that should not appear in search; ensure crawlers can see the directive.
- Keep sitemaps limited to preferred canonical URLs intended for indexing.
- Resolve protocol, hostname, casing, slash, and tracking duplicates consistently.
- Do not create indexable combinations of filters or locations without distinct demand and useful content.

## Metadata and content signals

Check unique page purpose before treating text length as a defect. Evaluate:

- descriptive titles and one clear primary heading;
- meta descriptions as useful result snippets, not a ranking guarantee;
- template duplication and boilerplate dominance;
- empty, thin, outdated, conflicting, or inaccessible main content;
- image alternatives and media context;
- visible authorship, company, policy, contact, and proof information where useful;
- language declaration and readable mobile presentation.

Do not prioritize meta keywords. Do not create formulaic titles/descriptions at scale without uniqueness and QA.

## Rendering and experience

Verify the critical content and links in rendered HTML. Test representative templates, not only the homepage.

Review:

- mobile viewport, responsive layout, tap targets, overlays, and navigation;
- server/client rendering and hydration failures;
- JavaScript errors that suppress content, links, metadata, or tracking;
- status and content parity between user and crawler views;
- Core Web Vitals using field data when available, lab evidence for diagnosis;
- LCP resource discovery and priority, INP interaction work, CLS dimensions/reservations;
- image sizing, modern formats, responsive sources, and below-fold lazy loading;
- font loading, caching, compression, third-party scripts, and main-thread work;
- consent behavior and measurement continuity.

Do not promise rankings from a performance score. Connect changes to measured field experience and conversion where possible.

## Structured data

- Describe visible, truthful page content with the most specific relevant type.
- Prefer JSON-LD when it fits the platform and current search-engine guidance.
- Use stable entity identifiers and consistent organization/person references.
- Validate syntax and required/recommended properties for the intended feature.
- Do not mark up hidden, fabricated, misleading, or third-party content as first-party evidence.
- Do not assume valid markup guarantees a rich result.
- Recheck supported feature documentation because eligibility changes over time.

## International and local variants

For international sites:

- use valid language/region codes and reciprocal hreflang sets;
- include a self-reference and optional x-default where it matches navigation behavior;
- keep canonical and hreflang signals compatible;
- avoid automatic geo/language redirects that block access;
- localize content and conversion paths, not only interface labels.

For local/service-area pages:

- publish only locations the business can truthfully serve and support;
- include distinct local evidence, logistics, contacts, proof, and useful content;
- keep business name, address, phone, hours, and entity facts consistent where applicable;
- do not invent offices or create doorway city pages.

## Migration and release QA

Before launch:

- freeze old URL inventory and priority metrics;
- create one-to-one relevant redirect mappings;
- test representative redirects, canonicals, robots, sitemaps, hreflang, schema, analytics, and navigation;
- ensure production does not inherit staging noindex/disallow rules;
- define launch owner, monitoring cadence, rollback threshold, and decision path.

After launch:

- crawl old and new inventories;
- verify high-value pages manually and in search-platform tools;
- detect chains, loops, 4xx/5xx, canonical conflicts, orphaning, and sitemap errors;
- compare organic landings, nonbrand visibility, conversions, and server errors against the frozen baseline;
- keep the redirect map stable and record later corrections.

## Acceptance criteria patterns

Write testable criteria, for example:

- “All URLs in the affected canonical group return 200, are internally linked, declare the approved canonical, and only approved canonical URLs appear in the sitemap.”
- “Every old URL in the migration map returns one redirect hop to its approved equivalent; exceptions are documented.”
- “Representative mobile templates render primary content, navigation links, title, canonical, and analytics without blocking errors.”
- “No production URL carries staging hostname references or unintended noindex/disallow directives.”

Pair each acceptance criterion with a validation method, sample size or full inventory, owner role, and rollback note.
