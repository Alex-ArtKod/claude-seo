# Architecture and content rules

## Contents

1. Product and audience model
2. Demand clustering
3. Keyword-to-URL mapping
4. Page standards
5. Proof and trust
6. Internal linking
7. Content lifecycle
8. AI-search readiness

## Product and audience model

Before planning pages, capture:

- offer and deliverable;
- target buyer and decision participants;
- problem, trigger, desired outcome, and objections;
- industry, geography, language, and constraints;
- commercial priority, margin/capacity, sales cycle, and primary conversion;
- differentiators and approved proof;
- unsuitable demand and qualification criteria.

If the business model is unclear, create a provisional product matrix and mark it for approval. Do not infer unsupported capabilities from keywords.

## Demand clustering

Build the demand set from sales language, first-party queries, site search, current pages, competitor coverage, SERPs, and keyword tools. Keep source and collection date.

Cluster by:

- dominant user job and expected outcome;
- result-page overlap and recurring page type;
- buyer/funnel stage;
- service/product specificity;
- geography and language where results genuinely differ.

Split a cluster when users need a materially different offer, proof, page type, or next action. Merge terms when the same page can completely serve the intent. Do not create one page per wording variation.

## Keyword-to-URL mapping

Required fields are defined in `output-schemas.md`. Apply these rules:

- exactly one `primary_url` per cluster;
- a URL may own multiple closely aligned secondary queries;
- each indexable URL must have a distinct page job;
- mark current URLs as `keep`, `improve`, `merge`, `redirect`, `noindex`, `delete`, or `create`;
- record the target page type and parent hub;
- identify cannibalization candidates for manual SERP/content verification;
- preserve redirect destinations before removing or merging content.

Prioritize commercial and proof pages before scaling broad informational coverage when the site lacks a conversion path.

## Page standards

### Service or product page

Include the information a qualified buyer needs:

- clear offer, audience, outcome, and scope;
- situations and problems served;
- deliverables/process without empty methodology language;
- proof, examples, constraints, and who is involved;
- differentiators tied to evidence;
- pricing model or buying expectations where approved;
- objections and decision criteria;
- clear next step and qualification path;
- links to cases, supporting expertise, and related offers.

### Case study

Include only approved facts:

- client/context or an explicitly anonymized description;
- starting condition and measurement period;
- goal and constraints;
- diagnosis and chosen actions;
- implementation sequence;
- comparable outcomes with metric definitions;
- what likely drove the result and what remains uncertain;
- relevant service and next action.

Avoid a result headline with no baseline, dates, attribution, or evidence.

### Evergreen guide or article

- answer a real task for the target audience;
- lead with the decision or useful answer;
- provide original examples, process knowledge, data, or expert judgment;
- distinguish facts from opinion and cite current primary sources where required;
- connect naturally to the relevant commercial page;
- avoid padding, generic introductions, and keyword repetition;
- include an update owner or review date for unstable subjects.

### Comparison or alternative page

- define transparent comparison criteria;
- represent competitors accurately with current evidence;
- disclose limitations and best-fit scenarios;
- avoid fake neutrality, fabricated pricing, and unsupported superiority claims;
- help the user make a decision even when the primary company is not the best fit.

### Location page

- require truthful service availability and distinct local usefulness;
- include logistics, service conditions, approved local proof, and conversion details;
- avoid near-identical doorway pages and invented offices.

## Brief requirements

Each brief must contain:

- page job, audience, funnel stage, primary cluster, secondary questions;
- target URL, page type, parent hub, and internal-link requirements;
- SERP evidence date and observed intent patterns;
- offer, proof, claims requiring approval, and missing inputs;
- section-by-section purpose and evidence needs;
- title/H1 direction, media, structured-data candidates, and CTA;
- fact-check list and acceptance criteria;
- consolidation/redirect notes if an existing URL is affected.

Do not provide a word count as the primary success criterion. Use content completeness and decision usefulness.

## Proof and trust

Prefer first-party evidence:

- approved case results and artifacts;
- named experts and verifiable experience;
- product demonstrations, screenshots, methods, and samples;
- policies, terms, contacts, authorship, and update dates;
- clear boundaries, risks, and unsuitable scenarios.

Do not manufacture E-E-A-T signals. Trust comes from truthful evidence and transparent ownership, not decorative badges or schema alone.

## Internal linking

- Link from high-level hubs to owned clusters and back to the hub where useful.
- Connect informational pages to the most relevant service or product action.
- Link cases to the exact services and problems demonstrated.
- Use descriptive, varied anchors that match destination context.
- Keep critical destinations reachable through crawlable HTML links.
- Update internal links when consolidating or redirecting URLs.
- Avoid sitewide exact-match anchor stuffing and unrelated “SEO links.”

## Content lifecycle

Assign each asset an owner and status:

- proposed;
- briefed;
- in production;
- review required;
- approved;
- published;
- measuring;
- improve;
- consolidate;
- retire.

Review performance by cohort. Improve or consolidate weak assets before adding more inventory. Preserve useful historical URLs when they retain demand or backlinks; choose a deliberate redirect/noindex/retire action.

## AI-search readiness

Optimize for people first while making useful passages easy to understand and cite:

- answer specific questions directly;
- use clear entities, definitions, steps, tables, and evidence where appropriate;
- keep claims attributable and current;
- expose important facts in accessible page content;
- maintain consistent company/entity information;
- provide original experience rather than summaries of summaries;
- allow relevant crawlers only when it matches the business’s policy and current official guidance.

Do not create content solely to manipulate AI citations, claim guaranteed inclusion, or publish unsupported “consensus” statements.
