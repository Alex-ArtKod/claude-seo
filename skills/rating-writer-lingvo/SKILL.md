---
name: rating-writer-lingvo
description: >
  A/B variant of rating-writer with a quantitative AI-Detection QA Gate
  (LinguaForensic v3.6) inserted before DOCX export. Runs in a project folder of
  TZ subfolders and writes each one to a publication-ready ranking article
  ("ТОП-N", comparison of companies) + DOCX, fully unattended. The main company
  is always ranked #1, justified through criteria; competitors are ranked
  honestly below. No quotes anywhere except an optional editorial note by the
  rating authors about the rating itself. The editor (not the user) approves the
  plan; the LinguaForensic gate then scores the approved article for
  AI-detectability (% robotness) and triggers a targeted Fluency rewrite if it
  exceeds threshold, without touching rankings, comparison-table data, or
  competitor safety. /rating-writer-lingvo N writes exactly N articles (also max
  parallelism); default N=1. Distilled inputs only (project-context.md +
  rules.md + participants.md + criteria.md + TZ). Use when user says write
  rating with AI-detect gate, напиши рейтинг с проверкой на роботность, or runs
  the pipeline over a project folder as the lingvo side of an A/B test against
  rating-writer.
user-invokable: true
argument-hint: "[N ratings to write, default 1]"
license: MIT
metadata:
  author: AlexNox
  version: "1.0.0-lingvo"
  category: seo
  ab_test_baseline: rating-writer
---

# Rating Writer Lingvo — Autonomous Ranking Pipeline + AI-Detection QA Gate

## What this skill does

Runs in a **project folder** containing many TZ subfolders. For each subfolder it
writes a complete, humanized, fact-checked **rating article** (a ranked list /
comparison of companies in a market), builds the comparison table, ranks the
participants, runs the approved article through a **quantitative AI-Detection QA
Gate** (LinguaForensic v3.6, Mode-1 style — see `references/lingvo-qa-gate.md`),
exports to `.docx`, and archives the folder into `Готовые/`. It runs
**unattended** across sessions, surviving usage limits.

This is the A/B sibling of `rating-writer`: identical pipeline plus one extra
phase between editorial review and DOCX export. `article-editor.md` judges
structure, facts, rankings, and competitor safety; the LinguaForensic gate
judges something orthogonal — **how statistically AI-typical the approved text
still reads**, with special attention to per-place blocks sounding like
copy-pasted grammar templates — and applies a targeted Fluency rewrite
(techniques F1–F7) only where the score demands it, **never** touching places,
comparison-table cells, or competitor-safety wording. Run this variant alongside
`rating-writer` on the same TZs to compare detectability and quality.

It reuses the proven multi-phase pipeline (plan → block writing → assemble →
review → **AI-detect gate** → DOCX) and adds three rating-specific stages:
**ranking construction**, **competitor safety**, and the **AI-detect gate**.

### Two non-negotiable rules of this skill

1. **The main company is always #1.** Its position is fixed in `rules.md`. The
   ranking criteria (`criteria.md`) are chosen so that #1 is *justified by
   verifiable facts*, never by disparaging competitors. Competitors are ranked
   honestly between themselves on the same criteria and placed below.
2. **No quotes anywhere.** No expert quotes, no attributed direct speech, no
   "Имя, должность: «…»". The **only** quote-like element allowed is an optional
   short editorial note by the *rating authors about the rating itself* (its
   methodology) — e.g. «При равном опыте редакция ставила выше компании с
   собственной производственной базой». Never invent people, positions, or speech.

---

## Autonomy contract

- **No confirmations.** All tools and permissions are granted. Never stop to ask.
  Every gate that used to wait for the user now waits for an **editor** verdict:
  `plan-editor.md` in Phase 2, `article-editor.md` in Phase 5.
- **Facts: rules.md first, participants.md for competitors.** `rules.md` is the
  priority source of truth about the main company. `participants.md` is the source
  of truth about competitors. If a fact is there, trust it (no web). If not, the
  fact-checker may use the web per `references/fact-checker.md`, but every web fact
  about a competitor must be tagged `[веб | дата | источник]`. `rules.md` and
  `participants.md` win on conflict.
- **Resumable from disk.** All progress is encoded in the filesystem (State model).
  A killed or rate-limited session resumes by re-scanning the folder.

---

## Project structure

```
{project}/
├── ТЗ-рейтинг-01/
│   ├── project-context.md      (from /seo-context — how to write: market, region, audience)
│   ├── rules.md                (MAIN company: facts + SAFE/NEVER + why it deserves #1)
│   ├── participants.md         (competitors: per company — facts + source + date; the
│   │                            writer may append web facts tagged [веб | дата | источник])
│   ├── criteria.md             (ranking criteria = comparison-table columns + methodology)
│   └── ТЗ*.md                  (the rating spec: topic, format, number of places)
├── ТЗ-рейтинг-02/ ...
├── recom_rules.md              (project-level fact accumulator; created on demand)
└── Готовые/                    (finished folders land here)
```

A folder is **eligible** when it has a TZ `.md`, `project-context.md`, `rules.md`,
`participants.md`, and `criteria.md`, and is not under `Готовые/`.

If `participants.md` or `criteria.md` is missing, the folder is **not eligible**
(see Error handling) — a rating cannot be built without participants and criteria.

---

## State model (how resume works)

| Signal | Meaning |
|--------|---------|
| Folder under `Готовые/` | Done. Skip. |
| `{folder}/.in_progress` marker exists & fresh (<6h) | Claimed. Skip when assigning. |
| `{folder}/ranking-table.md` exists, no `article-final.md` | Crashed mid-writing; resume at Phase 2. |
| `{folder}/article-final.md` exists, no `lingvo-report.md` | Crashed before/during the AI-detect gate; resume at Phase 6. |
| `{folder}/lingvo-report.md` exists, no `.docx` | Crashed after the gate; resume at Phase 7–8. |
| `{folder}/article-final.md` + `.docx`, not archived | Resume at Phase 9. |
| None of the above | Fresh. Start at Phase 0. |

`.in_progress` holds a UTC timestamp; markers older than 6h are stale — reclaim them.

---

## Orchestrator (main skill flow)

`N` = integer argument (default 1) = **total ratings to write in this run**
(also the max parallelism). The orchestrator stops as soon as N ratings have
been completed and archived, even if the queue has more folders.

1. **Scan** the project folder; build the work queue (exclude `Готовые/` and fresh
   `.in_progress`; exclude folders missing `participants.md`/`criteria.md`).
2. Queue empty → print final summary and stop.
3. **Dispatch up to N** writer agents, one per folder, via the Agent tool with
   `run_in_background: true`, `subagent_type: general-purpose`. Before dispatch,
   write `{folder}/.in_progress` with a UTC timestamp. Give each agent: the
   absolute folder path, the absolute paths to this skill's `references/` and
   `scripts/`, and: **"Execute the Per-folder rating pipeline in
   rating-writer-lingvo/SKILL.md for this folder, end to end. Do not ask
   questions."** Track `total_dispatched`; never dispatch more than N folders total.
4. **Keep up to N in flight, but no more than N total.** When a writer finishes
   (its folder is now in `Готовые/`) and `total_dispatched < N`, pull the next
   folder and dispatch a new writer. Once `total_dispatched == N`, wait for all
   in-flight writers to finish, then go to step 6.
5. **On usage limits** → go to Limit handling.
6. N ratings completed → print:
   `✓ Готово: {N} рейтингов в Готовые/. Новые факты — в recom_rules.md.`

For `N = 1`, run the pipeline inline (no subagent) for exactly one folder, then stop.

---

## Per-folder rating pipeline

Each writer (or the inline run) executes these phases for ONE folder. Determine the
entry phase from the State model. **LIVELINESS defaults to 6** unless the TZ says
otherwise.

### Phase 0 — Load
Read `project-context.md`, `rules.md`, `participants.md`, `criteria.md`, the TZ
`.md`, and `редполитика*.md` if present. Load reference prompts once from
`references/`: `copywriter.md`, `humanizer-ru.md`, `fact-checker.md`,
`block-editor.md`, `plan-editor.md`, `article-editor.md`, `ranking-builder.md`,
`competitor-safety.md`, `lingvo-qa-gate.md`. **Do not read heavy research files.**
Create `{folder}/.in_progress` if absent. Determine the AI-detect threshold: read
`ai_detect_threshold` from `project-context.md`/TZ if present, else default to
**40** (% robotness).

### Phase 1 — Build the ranking (criteria → table → places)
This is the backbone of the rating and runs **before** the block plan.

1. Apply `ranking-builder.md` with `criteria.md`, `rules.md`, `participants.md`.
   It produces:
   - the comparison table (rows = companies, columns = criteria from `criteria.md`);
   - the ordered list of places, with the **main company fixed at #1** and a
     fact-based justification for #1 drawn from the criteria;
   - competitors ranked honestly below on the same criteria;
   - per-company short verdict (one factual strength + one neutral limitation,
     limitations only when sourced in `participants.md`/tagged web).
2. Apply `competitor-safety.md` to the table and verdicts. Any `BLOCKED`
   formulation → replace with the safe form it returns. Re-run until clean.
3. Save the result to `{folder}/ranking-table.md`. This table is the single source
   of truth for places and comparison cells in all later phases.

### Phase 2 — Plan, approved by the editor
1. Build a block-by-block plan from the TZ **and** `ranking-table.md`. Typical
   rating structure (adapt to the TZ):
   - intro + short answer (who tops the rating and why, in 2–3 sentences);
   - methodology block (how companies were evaluated — criteria from `criteria.md`);
   - the comparison table block;
   - one block per place (or grouped places), each describing a company by facts.
     **Per-place blocks must be roughly equal in length — the #1 company is never
     described in more detail than the others;**
   - selection-guide block (how the reader should pick for their case);
   - FAQ (only if the TZ has it) — **about the market/region as a whole, not about a
     single company from the list** — + conclusion.
   For every H2 block output:
   ```
   ## [Block N] «{H2 heading from TZ}»
   - Intent layers covered: {from TZ}
   - LSI keywords: {3–7 from TZ vocabulary}
   - Structural elements: {table / numbered list / FAQ / none}
   - Companies covered: {which place(s) from ranking-table.md, or "—"}
   - Transition: {closing hook into next block}
   - Editorial note: {optional methodology note allowed here / none — NEVER a quote}
   - Target length: ~{N} characters (from TZ, or proportional share)
   ```
2. Apply `plan-editor.md`. If `NEEDS_REVISION` → revise and re-review. **Max 3
   cycles**; if still failing, take the best plan and log to `pipeline-log.md`.
3. Save the approved plan to `{folder}/article-plan.md`.

### Phase 3 — Block-by-block writing
Process blocks sequentially. For each, the 5-step pipeline:

1. **Write** — apply `copywriter.md` (and `редполитика*.md` on top if present;
   project policy overrides on conflict). Answer-first; all H3s; LSI naturally;
   structural elements per plan; **no quotes** (optional editorial methodology note
   only); company facts only from `rules.md`/`participants.md`/`ranking-table.md`;
   hit target length. Places and comparison cells must match `ranking-table.md`
   exactly. Keep per-place descriptions roughly equal in length. Present the rating
   as **independent editorial** — never hint it was made by a listed/affiliated
   company. State verified facts directly (no detached «компания заявляет»).
   **If the block is about prices, the fact-check step must run a deep regional
   web research** (region + service + niche from context) before the block passes.
2. **Humanize** — apply `humanizer-ru.md` (both passes inline).
3. **Fact-check** — apply `fact-checker.md` and output its JSON. rules.md /
   participants.md first; web only when a fact is absent and hits a trigger; tag
   every web competitor fact `[веб | дата | источник]`; rules.md/participants.md
   win on conflict. Collect facts worth promoting (for Phase 7).
   - `BLOCKED` → log, replace the unsafe claim with a safe formulation, continue.
   - `NEEDS_REVISION` → apply every `safe_rewrite`, re-run this step.
4. **Competitor safety** — if the block names or compares any competitor, apply
   `competitor-safety.md` and apply every returned safe rewrite before editing.
5. **Block edit** — apply `block-editor.md`, output its JSON. After receiving
   `edited_block_if_score_8_or_more`, scan it for humanizer rules 6 and 15–21 and
   apply targeted inline fixes only.
6. **Score gate:**
   | Score | Action |
   |-------|--------|
   | ≥ 8 PASS | Accept `edited_block_if_score_8_or_more` as final. Next block. |
   | 5–7 | Apply `required_revision_instructions` to existing text. Return to step 2, re-run 2–5. |
   | < 5 FAIL | Log, rewrite from scratch once, re-run. |

   **Max 3 revision cycles per block.** After 3, keep the best version, log, continue.
   Print `✓ Block N «{heading}» — score {X}/10`.

### Phase 4 — Assemble
Combine in TZ order: H1 → intro/short answer → methodology → table → per-place
blocks → selection guide → FAQ (only if in TZ) → conclusion. Verify heading
hierarchy (H1→H2→H3, no skips), that places match `ranking-table.md`, and planned
internal links. Save to `{folder}/article-draft.md`.

### Phase 5 — Final review, approved by the editor
Apply `article-editor.md`, output its JSON. Gate:
| Condition | Action |
|-----------|--------|
| final_score ≥ 8, factual ≥ 8, competitor_safety ≥ 8 | Save `final_article_if_pass` as `{folder}/article-final.md`. |
| Any below threshold | Apply `recommended_final_edits` (re-check humanizer rules 6, 15–21 and competitor safety on rewrites), re-run Phase 5 once. |
| Still failing | Save best version as `article-final.md`, log issues. |

### Phase 6 — AI-Detection QA Gate (LinguaForensic v3.6)
Apply `lingvo-qa-gate.md` to `{folder}/article-final.md`, output its JSON. This
runs **after** editorial approval — it never re-litigates rankings, comparison-
table data, competitor safety, or facts, only AI-detectability of the prose.
Gate:
| Condition | Action |
|-----------|--------|
| `status: PASS` (`robotness_pct <= threshold`) | Keep `article-final.md` as is. |
| `status: NEEDS_REVISION` | Apply `rewrite_instructions` (Fluency techniques F1–F7, targeted only) to `article-final.md`, overwrite it with `article_if_rewritten`, re-run the gate **once**. |
| Still above threshold after 1 rewrite pass | Keep the best (lowest-scoring) version as `article-final.md`, log the residual score to `pipeline-log.md`, continue — **never block the pipeline** on this gate. |

After any rewrite, verify places, comparison-table cells, and per-place length
balance still match `ranking-table.md` — if the rewrite drifted, revert the
drifted sentence and re-apply only the non-drifting fixes. Save the gate's JSON
(initial and, if run, post-rewrite) to `{folder}/lingvo-report.md`: `robotness_pct`
before/after, `domain`, `top_markers`, `per_place_uniformity_risk`,
`fluency_violations` fixed. Print
`✓ Rating gate «{TZ title}» — robotness {before}% → {after}%`.

### Phase 7 — Harvest facts to recom_rules.md
Collect verifiable facts found while writing that are **not** in `rules.md` /
`participants.md`. Append each to `{folder}/recom_rules.md` **and** to
`{project}/recom_rules.md`:
```
[from {folder} | {date}] {fact} — источник: {where} — safe: {formulation}
```
**Never write to `rules.md` or `participants.md`.** The human promotes facts later.

### Phase 8 — DOCX export
1. **Filename** — take the TZ `.md` file's own filename, strip `.md`. Sanitize for
   Windows (strip `/ \ : * ? " < > |`), trim. Final: `{title}.docx`.
2. **Primary — Word COM** via `references/md-to-docx.ps1` (rich formatting:
   bordered tables with header fill, H1/H2/H3 sizes). Run it in a **separate
   agent/session**:
   - Copy `md-to-docx.ps1` to `C:\Temp\md_to_docx_run.ps1`.
   - Re-encode to UTF-8-BOM:
     `powershell -Command "$p='C:\Temp\md_to_docx_run.ps1'; [IO.File]::WriteAllText($p,[IO.File]::ReadAllText($p,[Text.Encoding]::UTF8),[Text.UTF8Encoding]::new($true))"`
   - Run:
     `powershell -ExecutionPolicy Bypass -File "C:\Temp\md_to_docx_run.ps1" -InputFile "{folder}/article-final.md" -OutputFile "{folder}/{title}.docx"`
   - On a file-lock error: `Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force`, then retry once.
3. **Fallback — python-docx** when Word is not installed:
   `python "{skill}/scripts/md2docx.py" "{folder}/article-final.md" "{folder}/{title}.docx"`
   (run `pip install python-docx` first if missing). Note the fallback in
   `pipeline-log.md`.

### Phase 9 — Archive
Move the entire folder into `{project}/Готовые/` (TZ + project-context.md +
rules.md + participants.md + criteria.md + ranking-table.md + article-plan.md +
article-final.md + lingvo-report.md + {title}.docx + recom_rules.md +
pipeline-log.md). Remove `.in_progress`. Print:
`✓ {folder} — рейтинг + docx готовы, перенесено в Готовые/`. Return control to the
orchestrator for the next folder.

---

## Limit handling (autonomous resume)

When a usage limit is hit:
1. Leave the filesystem resumable (keep partial work and `.in_progress` markers).
2. Use the `/schedule` skill to create a cron routine that re-invokes
   `/rating-writer-lingvo {N}` on this project folder **every 2 hours**.
3. On each wake, re-scan the folder. Limits still exhausted → exit quietly. Limits
   back → resume from disk state and continue.
4. When the queue is fully drained and archived, **delete the cron routine**.

Resilience comes from disk state, not memory: every phase writes its artifact.

---

## Ranking integrity & competitor safety (project-driven)

There are **no hardcoded companies** in this skill. The main company, its #1
justification, SAFE/NEVER claims, and all of its facts come from `rules.md`.
Competitor facts come from `participants.md` (plus tagged web). Ranking criteria
come from `criteria.md`. On conflict, `rules.md`/`participants.md` are authoritative.

Hard constraints enforced by `ranking-builder.md` + `competitor-safety.md`:
- Main company is #1, justified by criteria-backed verifiable facts only.
- Competitors are never disparaged; limitations appear only when sourced.
- No comparative claim ("хуже", "дороже") without a sourced number.
- No invented experts, quotes, positions, reviews, or company facts.
- The only quote allowed is an optional editorial note about the methodology.

---

## Output files per folder

| File | Phase | Content |
|------|-------|---------|
| `ranking-table.md` | 1 | Comparison table + ordered places + #1 justification |
| `article-plan.md` | 2 | Editor-approved block plan |
| `article-draft.md` | 4 | Assembled draft |
| `article-final.md` | 5 | Approved final rating (Markdown); may be overwritten by Phase 6 rewrite |
| `lingvo-report.md` | 6 | AI-Detection QA Gate result (robotness before/after, markers, fixes) |
| `{title}.docx` | 8 | Word version — **primary deliverable** |
| `recom_rules.md` | 7 | Fact suggestions (also appended to project root) |
| `pipeline-log.md` | any | Blocked claims, escalations, fallbacks, unresolved issues |

---

## Error handling

| Scenario | Action |
|----------|--------|
| Folder missing project-context.md / rules.md / TZ | Skip folder, log, continue queue |
| Folder missing participants.md or criteria.md | Skip folder, log "рейтинг невозможен без участников/критериев", continue |
| Fact-check BLOCKED | Replace unsafe claim with safe form, log, continue (never stop) |
| Competitor-safety BLOCKED | Replace with neutral sourced form, log, continue |
| Block score < 8 after 3 cycles | Keep best version, log, continue |
| Final review fails after 1 revision | Save best version, log, still export + archive |
| AI-detect gate still above threshold after 1 rewrite | Keep best-scoring version as `article-final.md`, log residual score, continue (never stop) |
| AI-detect rewrite drifted places/table/competitor wording | Revert the drifted sentence, keep only non-drifting fixes, log |
| DOCX (Word) locked | Kill WINWORD, retry once |
| DOCX (Word not installed) | Use python-docx fallback, log |
| DOCX both fail | Archive with `article-final.md` only, log the error |
| Usage limit reached | Pause, schedule 2h cron, resume on wake |
| Stale `.in_progress` (>6h) | Reclaim folder and resume |
