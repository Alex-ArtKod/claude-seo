---
name: seo-write
description: >
  SEO article writer. Creates full SEO articles from a project folder containing
  a technical specification (TZ), company research, regional research, and company
  rules. Runs a 5-phase pipeline: planning → per-block writing with humanization,
  fact-checking, and editorial scoring → assembly → final article review → DOCX export.
  The primary deliverable is a formatted DOCX file named after the article title from the TZ.
  Use when user says "write article", "написать статью", "seo text", "seo текст",
  or provides a project folder with TZ and research files.
user-invokable: true
argument-hint: "[project-folder]"
license: MIT
metadata:
  author: AlexNox
  version: "1.1.0"
  category: seo
---

# SEO Article Writer

## Overview

5-phase pipeline that turns research files into a publication-ready SEO article in DOCX:

1. **Plan** — parse TZ + research files, produce a block-by-block article plan
2. **Write** — for each H2 block: write → humanize → fact-check → edit → score; iterate until score ≥ 8
3. **Assemble** — merge all approved blocks into one document
4. **Review** — run the full article through the article-level editor
5. **Export** — convert `article-final.md` to a formatted DOCX file

---

## Input Files

Locate the following files in the project folder (or current working directory).
Ask the user for the folder path if not provided.

| Role | Filename pattern | Required |
|------|-----------------|----------|
| Technical specification | `ТЗ*.md` / `TZ*.md` / `tz*.md` | yes |
| Company research | `Исследование компании*.md` / `company*.md` | yes |
| Regional research | `*регион*.md` / `regional*.md` | yes |
| Company rules | `rules.md` / `правила*.md` | yes |
| Editorial policy | `редполитика*.md` / `editorial*.md` / `редакционная*.md` | **optional** |

Read all four required files before starting. If any required file is missing, tell
the user which one is absent and stop.

If an editorial policy file is found in the project folder, read it as well —
it will be applied on top of `references/copywriter.md` in Phase 2 (project file
takes precedence on any conflict).

---

## Phase 1: Article Planning

After reading all input files, produce a **structured article plan**.

### Plan format

For every H2 block output:

```
## [Block N] «{H2 heading from TZ}»
- Intent layers covered: {list from TZ intent hierarchy}
- LSI keywords to use: {3–7 words from TZ vocabulary}
- Structural elements: {table / numbered list / FAQ / none}
- Transition: {one closing sentence that flows into the next block, OR semantic hook from the previous block that this block resolves}
- Expert attribution: {required / none — role per rules.md; verify exact name from source files before use}
- Target length: ~{N} characters — from TZ if stated; otherwise proportional share of TZ total volume, weighted by content depth
```

Present the full plan to the user before starting Phase 2.
**Wait for user confirmation** ("да", "продолжай", "go", or any affirmative) before writing blocks.

---

## Phase 2: Block-by-Block Writing

Process blocks **sequentially** (block 1 → 2 → … → N).

For each block, run the full **5-step pipeline**:

### Step 1 — Write the block

Read `references/copywriter.md` as the base writing prompt.
If the project folder contains an editorial policy file, also read it and apply its
rules — project editorial policy overrides `references/copywriter.md` on any conflict.
Use the LIVELINESS value passed with the task (default = 6 if not specified).

Write the H2 block following the plan:
- Open with a direct answer to the primary intent (answer-first format)
- Include all H3 sub-sections from the TZ
- Use LSI keywords naturally (no stuffing)
- Apply structural elements (table, list, etc.) as planned
- Include expert quotes/attribution per `rules.md`
- Apply tone, style, and formatting: project editorial policy if present, otherwise `references/copywriter.md`
- Use only SAFE company claims
- Target character count from the plan

### Step 2 — Humanize

Read `references/humanizer-ru.md` and apply it as a system prompt to the written block.
Run both passes (удали AI-паттерны → добавь живость) inline without calling an external skill.
Return only the rewritten block text.

Use the humanized version for all subsequent steps.

### Step 3 — Fact-check

Apply the fact-checker evaluation. Read `references/fact-checker.md` for the full
criteria. Self-evaluate the humanized block and output JSON:

```json
{
  "status": "PASS | NEEDS_REVISION | BLOCKED",
  "fact_score": 0-10,
  "summary": "...",
  "checked_claims": [
    {
      "claim": "...",
      "classification": "SUPPORTED | PARTIALLY_SUPPORTED | UNSUPPORTED | CONTRADICTED | STALE_OR_VOLATILE | NOT_CHECKED",
      "source_type": "input_docs | company_site | official_source | aggregator | web_other | none",
      "source": "...",
      "evidence": "...",
      "risk": "low | medium | high",
      "recommended_action": "keep | soften | remove | verify_manually | replace",
      "safe_rewrite": "..."
    }
  ],
  "unsafe_claims": [
    {
      "claim": "...",
      "why_unsafe": "...",
      "safe_rewrite": "..."
    }
  ],
  "manual_verification_needed": [
    {
      "item": "...",
      "why": "..."
    }
  ],
  "block_level_recommendation": "..."
}
```

**If status = BLOCKED**: stop this block, flag to user, do not continue to Step 4.
**If status = NEEDS_REVISION**: apply `safe_rewrite` for every flagged claim, re-run Step 3.

### Step 4 — Block editorial scoring

Apply the block editor evaluation. Read `references/block-editor.md` for full criteria.
Self-evaluate the fact-checked block and output JSON:

```json
{
  "status": "PASS | NEEDS_REVISION | FAIL",
  "score": 0-10,
  "short_diagnosis": "...",
  "what_works": [],
  "critical_issues": [],
  "minor_issues": [],
  "seo_check": {
    "intent_coverage": "...",
    "lsi_usage": "...",
    "structure": "...",
    "internal_linking_opportunities": []
  },
  "company_safety_check": {
    "unsafe_claims": [],
    "safe_replacements": []
  },
  "regional_check": {
    "is_region_used_meaningfully": true,
    "comments": "..."
  },
  "required_revision_instructions": [],
  "edited_block_if_score_8_or_more": "..."
}
```

**After receiving `edited_block_if_score_8_or_more`**: before moving to Step 5, scan the
edited text for violations of humanizer rules (sections 6, 15–21 in
`references/humanizer-ru.md` — negation parallels, ladder style, symmetric
structure, fragments, artificial connectors, abstract conclusions, vague
adjectives). If found, apply targeted inline fixes only; do not re-run the full
humanizer pass.

### Step 5 — Score gate

| Score | Action |
|-------|--------|
| ≥ 8 (PASS) | Accept `edited_block_if_score_8_or_more` as final block text. Move to next block. |
| 5–7 (NEEDS_REVISION) | Apply `required_revision_instructions` to the existing block text (do not rewrite from scratch). Return to Step 2. Re-run steps 2–4. |
| < 5 (FAIL) | Report to user. Ask whether to rewrite from scratch or skip block. |

**Maximum revision cycles per block: 3.** If score < 8 after 3 cycles, pause and
show the user the best scoring version with all remaining issues listed.

### Block completion notice

After each block passes, print a one-line status:
```
✓ Block N «{heading}» — score {X}/10 — approved
```

---

## Phase 3: Article Assembly

After all blocks pass:

1. Combine blocks in TZ order: H1 → intro paragraph → H2 blocks → FAQ (only if present in TZ) → conclusion
2. Check heading hierarchy is intact (H1 → H2 → H3, no skips)
3. Verify internal links are present where planned
4. Output the assembled article as a single Markdown document

Save to `article-draft.md` in the project folder.

---

## Phase 4: Final Article Review

Apply the full article editor evaluation. Read `references/article-editor.md` for criteria.
Self-evaluate the assembled article and output JSON:

```json
{
  "status": "PASS | NEEDS_REVISION | FAIL",
  "final_score": 0-10,
  "scores": {
    "seo_score": 0-10,
    "structure_score": 0-10,
    "factual_consistency_score": 0-10,
    "company_safety_score": 0-10,
    "regional_relevance_score": 0-10,
    "readability_score": 0-10
  },
  "executive_summary": "...",
  "critical_issues": [],
  "logic_and_flow_issues": [],
  "repetition_issues": [],
  "fact_consistency_issues": [],
  "seo_gaps": [],
  "company_positioning_issues": [],
  "regional_relevance_issues": [],
  "recommended_final_edits": [],
  "final_article_if_pass": "..."
}
```

### Final gate

| Condition | Action |
|-----------|--------|
| final_score ≥ 8, factual_consistency_score ≥ 8, company_safety_score ≥ 8 | PASS — save `final_article_if_pass` as `article-final.md` |
| Any of the three scores below threshold | Apply `recommended_final_edits`. For any rewritten section, run a quick humanizer pass-1 check (rules 6, 15–21 of `references/humanizer-ru.md`) before re-running Phase 4. |
| Still failing after one revision | Present best version to user with full issue list |

---

## Company Safety Rules (always apply)

These rules are **non-negotiable** across all phases:

**SAFE to claim:**
- Full-cycle studio (design → engineering → renovation → furnishing → author supervision → custom furniture → smart home)
- Real case data with exact numbers (m², days, cost in rubles)
- Named team members with roles and experience years
- Ratings with exact scores and review counts from named platforms
- Pricing as stated in company research (from X rub/m²)
- Warranty up to 5 years (per certificate)
- Insurance 10 million rub civil liability

**NEVER claim:**
- "30 years of work" (LLC registered 2007, not 1996)
- "Fixed estimate without extra charges" (unless contract sample provided)
- "Exclusive contracts with manufacturers" (no named partners)
- Any superlatives: "best", "leader", "most reliable", "unique" without independent source
- Cosmetic/partial repairs accepted (studio does NOT accept them)

---

## Expert Attribution Rules (from rules.md)

- Design questions → quote **Юлия Семенцова** (Yulia Sementsova), studio head
- Renovation/technical questions → quote **Дмитрий Шпилевой** (Dmitry Shpilevoy), CEO
- Do not attribute renovation advice to Yulia or design advice to Dmitry

## Name Verification Rule

**Every person's name and surname must be verified at least twice against the source files before use.**
- Cross-check all names against `rules.md` and company research files — never rely solely on names that appear in this SKILL.md or any template
- If a name in SKILL.md conflicts with a name in the project's input files, the input files (rules.md, company research) are authoritative
- Flag any name discrepancy to the user immediately

---

## Phase 5: DOCX Export

### 5.1 Determine output filename

Scan the TZ file (the same `ТЗ*.md` / `TZ*.md` used in Phase 1) for the article title:

1. First H1 line (`# heading`) → use as the base filename
2. If no H1 found → first H2 line (`## heading`)
3. Sanitize the title: strip characters invalid in Windows filenames (` / \ : * ? " < > | `), trim whitespace
4. Final filename: `{sanitized-title}.docx`

### 5.2 Run the DOCX converter

Read `references/md-to-docx.ps1` — this is the conversion script. Execute it via Bash:

**Step 1** — copy the converter script to a temp working path:
1. Read `references/md-to-docx.ps1` using the Read tool. Construct the full path
   by using the same base directory as the reference files already read in Phase 1
   (i.e. replace `SKILL.md` with `references/md-to-docx.ps1` in the SKILL.md path).
2. Write its content verbatim to `C:\Temp\md_to_docx_run.ps1` using the Write tool

**Step 2** — convert to UTF-8-BOM (required by Windows PowerShell 5.x to read Russian paths correctly):
```bash
powershell -Command "$p='C:\Temp\md_to_docx_run.ps1'; [IO.File]::WriteAllText($p,[IO.File]::ReadAllText($p,[Text.Encoding]::UTF8),[Text.UTF8Encoding]::new($true))"
```

**Step 3** — run the converter:
```bash
powershell -ExecutionPolicy Bypass -File "C:\Temp\md_to_docx_run.ps1" -InputFile "<article-final.md path>" -OutputFile "<project-folder>/<filename>.docx"
```

**Step 4** — if Step 3 fails with a file-locking error, kill leftover Word processes and retry:
```bash
powershell -Command "Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force"
# then repeat Step 3
```

### 5.3 DOCX formatting rules (non-negotiable)

| Element | Word formatting |
|---|---|
| `# H1` | Heading 1 style, 20 pt, bold |
| `## H2` | Heading 2 style, 15 pt, bold |
| `### H3` | Heading 3 style, 12 pt, bold |
| Tables | Word table with borders on all sides; header row bold + light-blue background |
| `- bullet` lists | "List Bullet" Word style |
| `1. numbered` lists | "List Number" Word style |
| Expert quotes (`Name, role: «…»`) | Indented 1.2 cm, gray background, left border bar; attribution bold, quote text italic |
| `**bold**` inline | Preserved inside paragraphs, lists, and quotes |

### 5.4 Completion notice

After successful export, print:
```
✓ Phase 5 — exported to {filename}.docx
```

---

## Output Files

| File | Content |
|------|---------|
| `article-plan.md` | Phase 1 plan (block descriptions) |
| `article-draft.md` | Phase 3 assembled draft |
| `article-final.md` | Phase 4 approved final article (Markdown) |
| `{article-title}.docx` | Phase 5 formatted DOCX — **primary deliverable** |

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Input file missing | List missing files, stop, ask user to provide |
| Fact check BLOCKED | Stop block, flag unsafe claim to user, skip or replace |
| Block score < 5 after 3 cycles | Show best version + issues to user, ask to proceed |
| Final score < 8 after revision | Deliver best version with full diagnostic |
| Humanizer skill unavailable | Skip humanization step, note in output, continue |
| DOCX export fails (file locked) | Kill WINWORD.EXE processes, retry once; if still failing, deliver `article-final.md` and flag the error |
| DOCX export fails (Word not installed) | Deliver `article-final.md`, explain that DOCX export requires Microsoft Word |
