---
name: seo-writer
description: >
  Autonomous SEO article writer. Runs in a project folder of TZ subfolders and
  writes each one to a publication-ready article + DOCX, fully unattended. The
  editor (not the user) approves the plan. /seo-writer N writes exactly N
  articles (also the max parallelism); default N=1 writes one article and stops.
  Distilled inputs only (project-context.md + rules.md + TZ) — heavy research
  is never re-read. Use when user says write articles, напиши статьи, seo text,
  or runs the pipeline over a project folder.
user-invokable: true
argument-hint: "[N articles to write, default 1]"
license: MIT
metadata:
  author: AlexNox
  version: "2.0.0"
  category: seo
---

# SEO Writer — Autonomous Pipeline

## What this skill does

Runs in a **project folder** containing many TZ subfolders. For each subfolder it
writes a complete, humanized, fact-checked SEO article, exports it to `.docx`, and
archives the folder into `Готовые/`. It runs **unattended** across sessions,
surviving usage limits.

The internal writing pipeline is the proven 5-phase process (plan → block writing →
assemble → review → DOCX). What changed: the **editor** approves the plan (not the
user), there are **no human confirmations**, work runs in **parallel**, inputs are
**distilled** (no heavy research re-read), and finished work is **archived**.

---

## Autonomy contract

- **No confirmations.** All tools and permissions are granted. Never stop to ask.
  Every gate that used to wait for the user now waits for an **editor** verdict:
  `plan-editor.md` in Phase 1, `article-editor.md` in Phase 4.
- **Facts: rules.md first.** `rules.md` is the priority source of truth. If a fact
  is there, trust it (no web). If not, the fact-checker may use the web (incl. for
  company facts) per `references/fact-checker.md`, but `rules.md` wins on conflict.
- **Resumable from disk.** All progress is encoded in the filesystem (State model).
  A killed or rate-limited session resumes by re-scanning the folder.

---

## Project structure

```
{project}/
├── ТЗ-01/
│   ├── project-context.md      (from /seo-context — how to write)
│   ├── rules.md                (per-folder copy; read-only source of truth)
│   ├── редполитика*.md         (optional; overrides copywriter on conflict)
│   └── ТЗ*.md                  (the article spec)
├── ТЗ-02/ ...
├── recom_rules.md              (project-level fact accumulator; created on demand)
└── Готовые/                    (finished folders land here)
```

A folder is **eligible** when it has a TZ `.md`, `project-context.md`, and
`rules.md`, and is not under `Готовые/`.

---

## State model (how resume works)

| Signal | Meaning |
|--------|---------|
| Folder under `Готовые/` | Done. Skip. |
| `{folder}/.in_progress` marker exists & fresh (<6h) | Claimed. Skip when assigning. |
| `{folder}/article-final.md` exists, no `.docx` | Crashed after review; resume at Phase 5–6. |
| `{folder}/article-final.md` + `.docx`, not archived | Resume at Phase 7. |
| None of the above | Fresh. Start at Phase 0. |

`.in_progress` holds a UTC timestamp; markers older than 6h are stale — reclaim them.

---

## Orchestrator (main skill flow)

`N` = integer argument (default 1) = **total articles to write in this run**
(also the max parallelism). The orchestrator stops as soon as N articles have
been completed and archived, even if the queue has more folders.

1. **Scan** the project folder; build the work queue (exclude `Готовые/` and fresh
   `.in_progress`).
2. Queue empty → print final summary and stop.
3. **Dispatch up to N** writer agents, one per folder, via the Agent tool with
   `run_in_background: true`, `subagent_type: general-purpose`. Before dispatch,
   write `{folder}/.in_progress` with a UTC timestamp. Give each agent: the
   absolute folder path, the absolute paths to this skill's `references/` and
   `scripts/`, and: **"Execute the Per-folder writer pipeline in
   seo-writer/SKILL.md for this folder, end to end. Do not ask questions."**
   Track `total_dispatched`; never dispatch more than N folders total.
4. **Keep up to N in flight, but no more than N total.** When a writer finishes
   (its folder is now in `Готовые/`) and `total_dispatched < N`, pull the next
   folder and dispatch a new writer. Once `total_dispatched == N`, wait for all
   in-flight writers to finish, then go to step 6.
5. **On usage limits** → go to Limit handling.
6. N articles completed → print:
   `✓ Готово: {N} статей в Готовые/. Новые факты — в recom_rules.md.`

For `N = 1`, run the pipeline inline (no subagent) for exactly one folder, then stop.

---

## Per-folder writer pipeline

Each writer (or the inline run) executes these phases for ONE folder. Determine the
entry phase from the State model. **LIVELINESS defaults to 6** unless the TZ says
otherwise.

### Phase 0 — Load
Read `project-context.md`, `rules.md`, the TZ `.md`, and `редполитика*.md` if
present. Load reference prompts once from `references/`: `copywriter.md`,
`humanizer-ru.md`, `fact-checker.md`, `block-editor.md`, `plan-editor.md`,
`article-editor.md`. **Do not read heavy research files** — they were distilled by
`/seo-context`. Create `{folder}/.in_progress` if absent.

### Phase 1 — Plan, approved by the editor
1. Build a block-by-block plan from the TZ. For every H2 block output:
   ```
   ## [Block N] «{H2 heading from TZ}»
   - Intent layers covered: {from TZ}
   - LSI keywords: {3–7 from TZ vocabulary}
   - Structural elements: {table / numbered list / FAQ / none}
   - Transition: {closing hook into next block, or hook from previous it resolves}
   - Expert attribution: {required / none — exact name from rules.md attribution map}
   - Target length: ~{N} characters (from TZ, or proportional share weighted by depth)
   ```
   Also plan the intro, FAQ (only if the TZ has it), and conclusion.
2. Apply `plan-editor.md`. If `NEEDS_REVISION` → revise and re-review. **Max 3
   cycles**; if still failing, take the best plan and log unresolved issues to
   `{folder}/pipeline-log.md`.
3. Save the approved plan to `{folder}/article-plan.md`.

### Phase 2 — Block-by-block writing
Process blocks sequentially. For each, the 5-step pipeline:

1. **Write** — apply `copywriter.md` (and `редполитика*.md` on top if present;
   project policy overrides on conflict). Answer-first; all H3s; LSI naturally;
   structural elements per plan; expert quotes per `rules.md`; only facts from
   `rules.md`; hit target length.
2. **Humanize** — apply `humanizer-ru.md` (both passes inline). Use the result
   downstream.
3. **Fact-check** — apply `fact-checker.md` and output its JSON. rules.md first;
   web only when a fact is absent from rules.md and hits a trigger; rules.md wins
   on conflict. Collect facts worth promoting (for Phase 5).
   - `BLOCKED` → log to `pipeline-log.md`, replace the unsafe claim with a safe
     formulation, continue (never stop for the user).
   - `NEEDS_REVISION` → apply every `safe_rewrite`, re-run this step.
4. **Block edit** — apply `block-editor.md`, output its JSON. After receiving
   `edited_block_if_score_8_or_more`, scan it for humanizer rules 6 and 15–21
   (negation parallels, ladder style, symmetry, fragments, artificial connectors,
   abstract conclusions, vague adjectives); apply targeted inline fixes only.
5. **Score gate:**
   | Score | Action |
   |-------|--------|
   | ≥ 8 PASS | Accept `edited_block_if_score_8_or_more` as final. Next block. |
   | 5–7 | Apply `required_revision_instructions` to existing text (no full rewrite). Return to step 2, re-run 2–4. |
   | < 5 FAIL | Log, rewrite from scratch once, re-run. |

   **Max 3 revision cycles per block.** After 3, keep the best version, log
   remaining issues, continue. Print `✓ Block N «{heading}» — score {X}/10`.

### Phase 3 — Assemble
Combine in TZ order: H1 → intro → H2 blocks → FAQ (only if in TZ) → conclusion.
Verify heading hierarchy (H1→H2→H3, no skips) and planned internal links. Save to
`{folder}/article-draft.md`.

### Phase 4 — Final review, approved by the editor
Apply `article-editor.md`, output its JSON. Gate:
| Condition | Action |
|-----------|--------|
| final_score ≥ 8, factual ≥ 8, safety ≥ 8 | Save `final_article_if_pass` as `{folder}/article-final.md`. |
| Any below threshold | Apply `recommended_final_edits` (for rewritten sections, re-check humanizer rules 6, 15–21), re-run Phase 4 once. |
| Still failing | Save best version as `article-final.md`, log issues. |

### Phase 5 — Harvest facts to recom_rules.md
Collect verifiable facts found in the TZ/writing that are **not** in `rules.md`.
Append each to `{folder}/recom_rules.md` **and** to `{project}/recom_rules.md`
(create if absent):
```
[from {folder} | {date}] {fact} — источник: {where} — safe: {formulation}
```
**Never write to `rules.md`.** The human promotes approved facts later.

### Phase 6 — DOCX export
1. **Filename** — take the TZ `.md` file's own filename, strip the `.md` extension.
   Sanitize for Windows (strip `/ \ : * ? " < > |`), trim. Final: `{title}.docx`.
   Example: `Что лучше имплант или протез.md` → `Что лучше имплант или протез.docx`.
2. **Primary — Word COM** via `references/md-to-docx.ps1` (rich formatting: styled
   expert quotes, bordered tables with header fill, H1/H2/H3 sizes). Run it in a
   **separate agent/session** so it does not consume the writer's context:
   - Copy `md-to-docx.ps1` to `C:\Temp\md_to_docx_run.ps1`.
   - Re-encode to UTF-8-BOM:
     `powershell -Command "$p='C:\Temp\md_to_docx_run.ps1'; [IO.File]::WriteAllText($p,[IO.File]::ReadAllText($p,[Text.Encoding]::UTF8),[Text.UTF8Encoding]::new($true))"`
   - Run:
     `powershell -ExecutionPolicy Bypass -File "C:\Temp\md_to_docx_run.ps1" -InputFile "{folder}/article-final.md" -OutputFile "{folder}/{title}.docx"`
   - On a file-lock error: `Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force`, then retry once.
3. **Fallback — python-docx** when Word is not installed (no WINWORD / COM error):
   `python "{skill}/scripts/md2docx.py" "{folder}/article-final.md" "{folder}/{title}.docx"`
   (run `pip install python-docx` first if missing). Simpler formatting, no Word
   required. Note the fallback in `pipeline-log.md`.

### Phase 7 — Archive
Move the entire folder into `{project}/Готовые/` (TZ + project-context.md + rules.md
+ article-plan.md + article-final.md + {title}.docx + recom_rules.md +
pipeline-log.md). Remove `.in_progress`. Print:
`✓ {folder} — статья + docx готовы, перенесено в Готовые/`. Return control to the
orchestrator for the next folder.

---

## Limit handling (autonomous resume)

When a usage limit is hit:
1. Leave the filesystem resumable (keep partial work and `.in_progress` markers).
2. Use the `/schedule` skill to create a cron routine that re-invokes
   `/seo-writer {N}` on this project folder **every 2 hours**.
3. On each wake, re-scan the folder. Limits still exhausted → exit quietly, wait
   for the next tick. Limits back → resume from disk state and continue.
4. When the queue is fully drained and archived, **delete the cron routine** via
   `/schedule` so it stops waking up.

Resilience comes from disk state, not memory: every phase writes its artifact, so a
wake re-enters each folder at the correct phase per the State model.

---

## Company safety & experts (project-driven)

There are **no hardcoded company rules** in this skill. SAFE/NEVER claims, expert
attribution (name → role → allowed topics), pricing, guarantees and all facts come
from each folder's `rules.md`. On any conflict, `rules.md` is authoritative. Verify
every person's name against `rules.md` before use; never invent experts, quotes,
positions, or credentials.

---

## Output files per folder

| File | Phase | Content |
|------|-------|---------|
| `article-plan.md` | 1 | Editor-approved block plan |
| `article-draft.md` | 3 | Assembled draft |
| `article-final.md` | 4 | Approved final article (Markdown) |
| `{title}.docx` | 6 | Word version — **primary deliverable** |
| `recom_rules.md` | 5 | Fact suggestions (also appended to project root) |
| `pipeline-log.md` | any | Blocked claims, escalations, fallbacks, unresolved issues |

---

## Error handling

| Scenario | Action |
|----------|--------|
| Folder missing project-context.md / rules.md / TZ | Skip folder, log, continue queue |
| Fact-check BLOCKED | Replace unsafe claim with safe form, log, continue (never stop) |
| Block score < 8 after 3 cycles | Keep best version, log, continue |
| Final review fails after 1 revision | Save best version, log, still export + archive |
| DOCX (Word) locked | Kill WINWORD, retry once |
| DOCX (Word not installed) | Use python-docx fallback, log |
| DOCX both fail | Archive with `article-final.md` only, log the error |
| Usage limit reached | Pause, schedule 2h cron, resume on wake |
| Stale `.in_progress` (>6h) | Reclaim folder and resume |
