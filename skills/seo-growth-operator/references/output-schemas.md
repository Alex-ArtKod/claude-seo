# Project structure and output schemas

## Contents

1. Directory contract
2. Core state files
3. CSV schemas
4. Deliverable contracts
5. Definition of done

## Directory contract

```text
project-root/
  project.yaml
  inputs/
    input-register.csv
    business/
    analytics/
    crawl/
    research/
  state/
    project-state.json
    baseline.json
    decisions.md
    experiments.csv
    url-inventory.csv
    search-normalized.csv
    keyword-map.csv
  deliverables/
    seo-strategy.md
    site-structure.md
    technical-backlog.csv
    content-calendar.md
    sprint-plan.md
    monthly-report.md
```

Use UTF-8. Use comma-separated CSV with a header row. Store dates as `YYYY-MM-DD` and datetimes as ISO 8601 with timezone when needed. Preserve raw exports in `inputs`; write normalized/derived data to `state`.

## project.yaml

Required keys:

- `project.name`
- `project.mode`: `existing`, `new`, or `migration`
- `site.primary_url`
- `market.countries`
- `market.languages`
- `business.type`
- `measurement.primary_conversion`
- `governance.live_changes_authorized`: default `false`

Keep unknown values empty or explicitly marked `unknown`; do not invent them. Add project-specific keys without deleting the core contract.

## project-state.json

Required keys:

- `schema_version`
- `current_state`
- `created_at`
- `updated_at`
- `last_validated_at`
- `latest_reporting_period`
- `open_blockers`
- `next_review_date`

Allowed state values: `baseline`, `strategy`, `pilot`, `sprints`, `measurement`, `optimization`, `scale`.

## baseline.json

Store metric name, value, unit, period, segment, source, extraction date, definition, and limitation. Use `null`, not zero, for unavailable values.

## input-register.csv

Columns:

`input_id,file_or_system,input_type,period,source_owner,received_at,status,notes`

Statuses: `available`, `missing`, `stale`, `blocked`, `not_applicable`.

## url-inventory.csv

Columns:

`url,status,indexability,canonical,title,description,h1,word_count,inlinks,depth,host,path,query,source`

One row per normalized URL. Keep empty values empty; never replace an unknown status with 200.

## search-normalized.csv

Columns:

`query,page,date,country,device,clicks,impressions,ctr,position,brand_segment,source`

`ctr` is a decimal from 0 to 1. `brand_segment` is `brand`, `nonbrand`, or `unknown`.

## keyword-map.csv

Columns:

`cluster_id,cluster_name,primary_query,secondary_queries,intent,page_type,primary_url,current_url,action,parent_hub,business_fit,demand,attainability,proof,conversion_fit,effort,opportunity_score,evidence,review_status`

Use semicolons inside a field containing a list. `review_status` is `draft`, `review_required`, `approved`, or `rejected`.

## technical-backlog.csv

Columns:

`task_id,category,issue,evidence,example_urls,affected_count,severity,blocker,impact,reach,confidence,effort,priority_score,priority,owner_role,dependency,acceptance_criteria,validation_method,rollback_note,status,target_sprint`

Scores are integers 1–5. `blocker` is boolean. Status values: `proposed`, `approved`, `in_progress`, `blocked`, `done`, `rejected`.

## experiments.csv

Columns:

`experiment_id,cohort_id,hypothesis,urls,release_date,baseline_period,comparison_period,primary_metric,guardrail_metric,result,decision,next_review_date,confounders`

## seo-strategy.md

Required sections:

1. Executive decision summary
2. Business context and constraints
3. Evidence base and limitations
4. Baseline and KPI tree
5. Target audiences, offers, and demand
6. Current-state diagnosis
7. Strategic choices and exclusions
8. Architecture and content system
9. Technical and measurement foundations
10. Proof, authority, and distribution
11. 90-day roadmap and resources
12. Risks, approvals, and decision cadence

## site-structure.md

Include principles, current/proposed hierarchy, page-type definitions, cluster-to-URL map reference, internal-link rules, URL action summary, and migration/redirect implications. A diagram alone is not sufficient.

## content-calendar.md

For each item include: ID, cluster, page type, working title, target URL, page job, business priority, proof/source needs, owner role, status, dependency, target sprint, and measurement plan. Do not add dates the user has not approved; use sprint windows when calendar dates are unknown.

## sprint-plan.md

Required sections: sprint goal, capacity assumptions, committed tasks, acceptance tests, owners, dependencies, release/QA plan, expected signals, risks, decisions required, and out-of-scope backlog.

## monthly-report.md

Required sections:

1. Period, comparison, and data continuity
2. Executive outcome summary
3. KPI tree and segment results
4. Released cohort performance
5. Technical/indexing changes
6. Content and conversion findings
7. Wins, losses, and inconclusive tests
8. Decisions and next sprint
9. Data limitations and approvals required

## Definition of done

Before delivery:

- required files and headers exist;
- placeholders and unresolved `TODO`/`TBD` markers are removed or converted into explicit assumptions/blockers;
- no primary cluster is owned by multiple URLs without a documented review flag;
- recommendations cite their evidence or are labelled inferred;
- P0/P1 items include acceptance criteria and validation methods;
- forecast assumptions and ranges are visible;
- live changes and destructive URL decisions are clearly marked for approval;
- prohibited tactics from `risk-policy.md` are absent;
- `validate_project.py` returns no errors;
- the handoff states what was and was not executed.
