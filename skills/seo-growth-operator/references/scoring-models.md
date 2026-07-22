# Scoring and measurement models

## Contents

1. KPI tree
2. Backlog scoring
3. Content opportunity scoring
4. Technical severity
5. Confidence
6. Cohorts and experiments
7. Forecast ranges

## KPI tree

Use the deepest trustworthy business outcome as the primary KPI:

1. Revenue or gross profit from qualified organic demand.
2. Won opportunities or sales-qualified organic leads.
3. Qualified leads, booked calls, trials, or transactions.
4. Meaningful conversions by organic landing page.
5. Nonbrand clicks and impressions for target clusters.
6. Indexing, crawl, visibility, and page-quality leading signals.

Do not replace a missing business KPI with an implied claim. Report the available leading signal and name the missing linkage.

Recommended reporting cuts:

- brand versus nonbrand;
- new versus returning;
- landing-page group and demand cluster;
- offer, region, language, device, and funnel stage;
- released cohort and release date;
- qualified versus unqualified conversion where CRM data permits.

## Backlog scoring

Score eligible tasks from 1 to 5:

- `impact`: expected effect on qualified demand or a critical prerequisite.
- `reach`: proportion of target URLs, demand, or users affected.
- `confidence`: strength of evidence that the task will create the effect.
- `effort`: total delivery and QA effort; higher means harder.

Formula:

`priority_score = impact × reach × confidence ÷ effort`

Default bands:

- `P0`: verified critical blocker, active severe regression, security/indexing incident, or launch stopper; score does not override this gate.
- `P1`: score 40 or higher, or a high-severity dependency needed this cycle.
- `P2`: score from 20 up to 40.
- `P3`: score below 20, speculative work, or low-reach improvement.

Apply judgment after scoring. A high score cannot bypass missing approval, legal risk, platform dependency, or production capacity.

## Content opportunity scoring

Use 1–5 inputs:

- `business_fit`: margin, strategic priority, sales capacity, and offer readiness.
- `demand`: verified first-party demand or credible market demand.
- `attainability`: realistic ability to meet intent and compete.
- `proof`: strength of cases, expertise, product evidence, and differentiated insight.
- `conversion_fit`: clarity and usefulness of the next action.
- `effort`: research, writing, design, approval, and engineering effort.

Formula:

`opportunity_score = (business_fit × 0.30 + demand × 0.20 + attainability × 0.15 + proof × 0.15 + conversion_fit × 0.20) ÷ effort`

Use this for relative ordering, not forecasted revenue. A page with weak proof should not be scaled merely because estimated volume is high.

## Striking-distance rules

Create a candidate when comparable search data shows:

- a target query/page pair with meaningful impressions;
- average position commonly between 4 and 20;
- intent aligned with the landing page;
- no obvious tracking, seasonality, or brand-campaign distortion;
- a specific improvement hypothesis.

Rank candidates by qualified demand potential, business fit, page-level CTR gap, and the effort to close an observable content/experience gap. Do not optimize to average position alone.

## Cannibalization rules

Flag a cluster when two or more indexable URLs repeatedly receive impressions for the same intent and none is clearly serving a distinct page job. Verify with current SERPs and page content before recommending a merge. Similar query strings alone are not sufficient.

Classify the resolution:

- clarify distinct intent and internal anchors;
- consolidate content into one primary owner;
- redirect an obsolete duplicate;
- canonicalize only when the pages are genuinely duplicate or near-duplicate;
- noindex only when the page should remain accessible but not searchable.

## Technical severity

- `critical`: broad loss of discovery, rendering, indexability, security, measurement, or migration integrity; active incident.
- `high`: material template or high-value URL group is impaired; no safe workaround.
- `medium`: limited group or indirect loss; should enter a planned sprint.
- `low`: hygiene, isolated inconsistency, or improvement with weak evidence of impact.

For each issue record: evidence, examples, affected count, mechanism, business effect, dependency, owner role, effort, acceptance criteria, validation method, and rollback consideration.

## Confidence scale

- `5`: direct first-party evidence plus repeatable validation.
- `4`: strong direct evidence with a small unresolved variable.
- `3`: consistent crawl/SERP/third-party evidence but no direct outcome proof.
- `2`: plausible heuristic or limited sample.
- `1`: hypothesis with little supporting evidence.

Do not use confidence to hide missing facts. State what evidence would raise it.

## Cohorts and experiments

Track each release cohort with:

- cohort ID and included URLs;
- release date and change type;
- primary hypothesis;
- leading and business metrics;
- baseline window and comparison window;
- confounders and concurrent releases;
- result: win, loss, neutral, inconclusive;
- decision and next review date.

Prefer phased releases where risk is meaningful. A simple before/after change is not proof of causality; use comparison groups or repeated evidence where feasible.

## Forecast ranges

Create low, base, and high cases. Preserve each assumption:

`qualified_outcome = addressable_impressions × CTR × conversion_rate × qualification_rate`

Where revenue is available:

`expected_value = qualified_outcome × close_rate × average_value`

Use ranges for each uncertain factor. Cap the model by operational sales/delivery capacity. State whether volume is monthly, annual, seasonal, or tool-estimated. Refresh the model when real cohorts provide better rates.
