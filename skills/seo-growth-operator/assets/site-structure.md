# Site structure — {{PROJECT_NAME}}

Status: draft  
Prepared: {{CREATED_DATE}}

## Architecture principles

- One primary URL owns one intent cluster.
- Every indexable page has a distinct job, useful evidence, and a crawlable internal path.
- Commercial pages connect to cases and supporting expertise.
- URL removals, merges, and redirects require an approved mapping and release QA.

## Current structure

Document observed hierarchy, page types, orphan candidates, duplication, and measurement limitations.

## Proposed structure

```text
Home
├── Priority offer hub
│   ├── Service/product page
│   ├── Relevant case
│   └── Supporting guide
└── Proof and company information
```

Replace the example with the evidence-backed structure. Do not create location or filter pages without distinct demand and value.

## Page-type contracts

| Page type | Page job | Required proof | Primary conversion | Index rule |
|---|---|---|---|---|
| Service/product | Capture qualified commercial intent | Approved offer and outcome evidence | {{PRIMARY_CONVERSION}} | Index when unique and complete |
| Case | Demonstrate comparable experience | Approved client/context, period, metrics | Related service action | Index when factual and useful |
| Guide | Solve a decision/task and support a hub | Original expertise and sources | Relevant next step | Index when distinct and maintained |

## Cluster-to-URL ownership

Maintain the full mapping in `state/keyword-map.csv`. Summarize approved hubs, conflicts, and new page decisions here.

## Internal linking

Define hub-to-spoke, guide-to-service, case-to-service, breadcrumb, related-content, and anchor rules. Include fixes needed after merges or redirects.

## URL actions

| Action | Count | Rationale | Approval/status |
|---|---:|---|---|
| Keep | 0 | Pending inventory | Review required |
| Improve | 0 | Pending mapping | Review required |
| Merge/redirect | 0 | Pending equivalence review | Explicit approval required |
| Create | 0 | Pending demand evidence | Review required |

## Migration and release implications

List redirect-map needs, canonical/sitemap/internal-link changes, staging controls, analytics checks, rollback signals, and post-release monitoring.
