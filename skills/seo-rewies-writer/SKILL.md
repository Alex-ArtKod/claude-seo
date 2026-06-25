---
name: seo-rewies-writer
description: >
  Generates batches of realistic, human-sounding Russian customer reviews for a
  company. Reads the project folder for company info (mandatory) and optional
  rules.md + reference reviews. Without -i it scrapes 50–60 real reviews about the
  company from Yandex to ground tone and facts; with -i it uses only references
  already in the folder. Each review is written in a randomized style and length
  (so the batch never reads like one author), then passes a light humanizer,
  fact/safety check, and a review editor that preserves illiteracy and varied
  styles but enforces native phrasing, gender agreement, and no forbidden
  companies/experts. Use when the user says "напиши отзывы", "сгенерируй отзывы",
  "reviews", or runs /seo-rewies-writer.
user-invokable: true
argument-hint: "N [-i] {folder URL}  — e.g. 100 D:/proj  or  10 -i D:/proj"
license: MIT
metadata:
  author: AlexNox
  version: "1.0.0"
  category: seo
---

# SEO Reviews Writer

Writes **N realistic customer reviews** for one company into the project folder.
The whole point is variety: real review pages are a chorus of different voices,
lengths and moods — short blunt ones with a typo next to 200-word stories. A batch
that reads like one author wrote it is a failure.

The form rules are distilled once in `references/review-style-guide.md` (from 252
real reviews, depersonalized) and reused every run. The **facts** (company, allowed
people, services, region, guarantees) come per-run from the project folder and the
Step-1 scrape — never hardcoded.

---

## Invocation & arguments

```
/seo-rewies-writer N [-i] {folder}
```

- `N` — integer, how many reviews to write (required).
- `-i` — *internal references* mode. Do **not** scrape the internet for reference
  reviews; use the reference files already in `{folder}`. (Company info may still be
  fetched from the web if it is missing — see Step 0.)
- `{folder}` — absolute path/URL of the project folder.

Examples:
- `/seo-rewies-writer 100 D:/projects/acme` → 100 reviews, references scraped from Yandex.
- `/seo-rewies-writer 10 -i D:/projects/acme` → 10 reviews from references already in the folder.

If `{folder}` is missing → ask for it (one line) and stop. If `N` is missing →
default to 10 and say so.

---

## Required & optional inputs in `{folder}`

| Input | Required? | Used for |
|-------|-----------|----------|
| Company info (any file: brief, profile, site export, .md/.txt/.docx) | **Yes** | Name, services, key persons, region, positioning |
| `rules.md` | Optional | Allowed names/roles, facts, guarantees, SAFE/NEVER, what must NOT appear |
| Reference reviews (folder/files) | Optional (required in `-i` mode) | Real tone, vocabulary, real sums/s:terms to imitate |

**Company info is mandatory.** If the folder has no company information, gather it
from the web in Step 0 (it is not optional to skip — a review with no company facts
cannot be written safely).

---

## Pipeline

### Step 0 — Load & resolve company facts
1. Parse `N`, `-i`, `{folder}`.
2. Load this skill's references once: `review-style-guide.md`, `review-humanizer.md`,
   `review-fact-checker.md`, `review-editor.md`.
3. Read everything in `{folder}`: company info, `rules.md` (if present), reference
   reviews (if present).
4. **Build the company profile** — name, services, key persons (name → role; only
   these may be named), region, positioning, guarantees, and an explicit
   **forbidden list** (any competitor/brand/expert that must never appear — from
   `rules.md`). If `rules.md` lists allowed names, treat that as the closed set.
5. **If company info is absent in the folder:** use `WebSearch`/`WebFetch` to gather
   it (official site, Yandex Maps / 2GIS card, about pages) and assemble the profile.
   Save it to `{folder}/company-profile.md` so the run is reproducible. This step is
   **not** skipped by `-i` — `-i` only governs *reference reviews*, not company facts.

### Step 1 — Reference reviews
- **Default (no `-i`):** scrape **50–60 real reviews** about the company. Prefer
  `WebSearch` for "{company} отзывы" then `WebFetch` Yandex (Яндекс.Карты / Яндекс
  Бизнес), and other aggregators (Otzovik, Yell, 2GIS, profi, отраслевые). Extract:
  recurring **topics** (what problems clients bring), **vocabulary/register**, real
  **sums/timeframes**, **named persons actually praised** (cross-check against the
  allowed set — never adopt a name the scrape shows but `rules.md` forbids), and the
  **tone spread**. Save a short digest to `{folder}/reference-digest.md`.
  - If scraping yields too little (<15 usable reviews), note it and lean more on the
    style guide + company profile; do not invent a competitor's reviews.
- **`-i` mode:** read the reference reviews already in `{folder}` instead of the web.
  Build the same digest from them. No internet reference scraping.

### Step 2 — Plan the batch (diversity first)
Before writing, build a **batch plan** of N rows so the output is varied by design:
1. Assign each review a **length bucket** sampled from the distribution in
   `review-style-guide.md` (~15% very-short, ~35% short, ~30% medium, ~15% long,
   ~5% story).
2. Assign each a **style archetype** (10 archetypes in the guide); no archetype
   > ~25% of the batch.
3. Assign each a **gender** (~50/50) and, optionally, a reviewer first name
   consistent with that gender.
4. Assign tone flags: ~35% get an exclamation, ~16% a trailing `)` emoticon, the
   rest flat.
5. Spread **topics** across the batch from the reference digest (don't repeat the
   same scenario back-to-back). Vary sums/dates/timeframes within plausible ranges.
6. Constraint: no two consecutive reviews share an opener word, bucket, or archetype.

Save the plan to `{folder}/batch-plan.md`.

### Step 3 — Write each review
For each planned row, write the review to its bucket/archetype/gender, using **only**
facts from the company profile + `rules.md` + reference digest. Apply the authenticity
rules from `review-style-guide.md` (rough, native, varied; seed occasional typos and
comma-splices; vary openers and sign-offs). Keep allowed persons in their real roles.

### Step 4 — QA each review (humanize → fact-check → edit)
Run each review through three passes; loop max twice per review:
1. **Humanize** — apply `review-humanizer.md` (light: strip AI tells, add roughness).
   Do **not** polish.
2. **Fact / safety check** — apply `review-fact-checker.md`, output its JSON.
   - `BLOCKED` → regenerate that review with a corrected scenario (drop the forbidden
     entity / unsafe claim), re-run QA.
   - `NEEDS_REVISION` → take `corrected_review`, continue.
3. **Edit** — apply `review-editor.md`, output its JSON.
   - `PASS` → accept `edited_review`.
   - `NEEDS_REVISION` → accept `edited_review` (it already contains the fixes).
   - `FAIL` (gender mismatch, forbidden entity, advert/AI tone, or indistinguishable
     from neighbours) → regenerate the review once with a different style/gender, re-QA.

The editor **must not** remove typos, colloquialisms or clumsy-but-native phrasing —
it only fixes gender agreement, forbidden entities, non-native/AI constructions, and
advert tone. (See `review-editor.md`.)

### Step 5 — Batch-level diversity gate
After all N pass QA, check the whole batch:
- Length distribution roughly matches the target mix.
- No opener word repeats more than ~twice; no near-duplicate reviews; no archetype
  over ~25%.
- Gender ~50/50; emoticon ~1 in 6; exclamation ~1 in 3.
- Every named person is in the allowed set; zero forbidden entities anywhere.
If a check fails, regenerate the offending reviews (not the whole batch) and re-gate.

### Step 6 — Output
Write all reviews to `{folder}/reviews-output.md`, numbered, plain text, one per
`## Отзыв N` block (each review's own line(s), nothing else — ready to copy). Also
write `{folder}/reviews-report.md` with: counts by bucket/archetype/gender, the
topics used, any reviews regenerated and why, and any company facts fetched in Step 0.
Print a one-line summary:
`✓ Готово: {N} отзывов в reviews-output.md (компания: {name}, режим: {scrape|-i}).`

---

## Hard rules (every run)

- **Company info is mandatory** — fetch it in Step 0 if absent; never write reviews
  with no grounding.
- **`rules.md` is the source of truth** for who/what may be named. On any conflict,
  `rules.md` wins. Never invent lawyers, partners, competitors, courts, platforms,
  brands or experts not in the profile / `rules.md`.
- **Gender agreement** is non-negotiable: one gender per review, consistent across
  every verb/participle/adjective and with the reviewer's name if used.
- **Diversity is the deliverable**: vary length, style, opener, tone and gender so the
  batch never reads like one author. Reuse of the heavy article humanizer is
  forbidden — use `review-humanizer.md` (light), which keeps roughness.
- **No contact info / PII**, no SEO keyword stuffing, no links, no calls to action.
- **`-i` governs reference reviews only** — company facts may still be fetched if missing.

---

## Output files

| File | Step | Content |
|------|------|---------|
| `company-profile.md` | 0 | Assembled company facts (only if fetched from web) |
| `reference-digest.md` | 1 | Digest of scraped / supplied reference reviews |
| `batch-plan.md` | 2 | Per-review bucket / archetype / gender / topic plan |
| `reviews-output.md` | 6 | **Primary deliverable** — the N reviews |
| `reviews-report.md` | 6 | Batch composition, regenerations, fetched facts |

## Error handling

| Scenario | Action |
|----------|--------|
| `{folder}` missing | Ask for it once, stop |
| Company info absent | Fetch from web (Step 0); if web fails too, ask user for company info, stop |
| `-i` but no reference files in folder | Warn, fall back to style guide + company profile (no web), note in report |
| Scrape returns too few reviews | Lean on style guide + profile, note in report; never borrow a competitor's reviews |
| Fact-check BLOCKED | Regenerate that review without the unsafe entity/claim |
| Editor FAIL after 1 regen | Replace with a fresh review of a different archetype/gender |
| Batch diversity gate fails | Regenerate only the offending reviews, re-gate |
