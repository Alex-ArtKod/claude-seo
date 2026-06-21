---
name: seo-context
description: "Analyzes heavy research files once per project and distills them into project-context.md (a reusable knowledge base for writing: company, products, competitors, market, region) plus exact-fact recommendations for rules.md. Run once at project setup and again when source research changes. Use when user says analyze project, build context, обнови контекст, проанализируй исследования, project-context."
user-invokable: true
argument-hint: "[project-folder]"
license: MIT
metadata:
  author: AlexNox
  version: "1.0.0"
  category: seo
---

# SEO Context Analyzer

## Purpose

Heavy research files (company research, regional/niche research) are expensive to
re-read for every article. This skill reads them **once** and pulls out **everything
useful for writing articles**, so the source files never have to be opened again. The
companion skill `/seo-writer` then writes articles from the distilled files only —
never the heavy sources.

The extracted knowledge is split across two outputs:

1. **`project-context.md`** — the **reusable knowledge base** for writing. Holds all
   the descriptive, useful information from the research: what the company does, its
   products/services and advantages, competitors, market and niche situation, region,
   audience and target action, recurring themes and customer questions. This is the
   bulk of the value — write down anything a writer would otherwise have to dig out of
   the source files. The only thing it does **not** contain is the exact, checkable
   facts — those are extracted to `rules.md` so there is a single source of truth for
   fact-checking.
2. **Recommendations for `rules.md`** — the exact verifiable facts found in the
   research (numbers, prices, guarantees, ratings, certifications, expert names+roles)
   that are not yet in `rules.md`. Shown to the user, who approves what to add.

Together the two files let `/seo-writer` work fully from distilled inputs:
`project-context.md` for background and context, `rules.md` for exact facts.

`rules.md` is the human-verified source of truth for the fact-checker. This skill
never silently rewrites it — it only appends facts the user approves.

---

## Input Files

Locate in the project folder (ask for the path if not given).

| Role | Filename pattern | Required |
|------|-----------------|----------|
| Company research | `Исследование компании*.md` / `company*.md` | yes |
| Regional/niche research | `*регион*.md` / `*ниш*.md` / `regional*.md` | yes |
| Existing rules | `rules.md` / `правила*.md` | created if absent |
| Editorial policy | `редполитика*.md` / `editorial*.md` | optional |

If a required research file is missing, name it and stop. If an editorial policy
file exists, note it — `/seo-writer` applies it on top of `copywriter.md`; this
skill folds its *style* guidance into the "Тон и стиль" section of
`project-context.md` (its exact facts, if any, go to `rules.md`).

---

## Procedure

### Step 1 — Scan & validate

Read the research files and `rules.md` (if present). Print a prestart report:

```
📋 Файлы: исследование {✓/✗}, регион/ниша {✓/✗}, rules.md {✓/✗/создам}, редполитика {✓/—}
В исследованиях: команда — {N} имён, кейсов с числами — {N}, цен — {N}
В rules.md сейчас: SAFE — {N}, NEVER — {N}, фактов — {N}, эксперты — {N}
⚠️ {пропущенные обязательные разделы, если есть}
Запустить анализ? (да / нет)
```

Wait for confirmation. (This skill is interactive — it runs at setup, unlike the
autonomous `/seo-writer`.)

### Step 2 — Extract, normalize & deduplicate facts

Build a candidate list before recommending anything. The same fact often appears in
several wordings — **one fact = one candidate**, never one per phrasing.

1. **Extract** every verifiable claim (numbers, prices, guarantees, ratings,
   certifications, expert names+roles, deadlines, geographic claims) with its exact
   source quote.
2. **Normalize** to a canonical form so variants collapse:
   - lowercase the comparison key, strip filler ("предоставляем", "срок —", "до");
   - spell out / digitize numerals consistently ("пять" = "5");
   - map synonyms ("гарантия" = "срок гарантии").
   These three are one candidate:
   *«гарантия до 5 лет» · «предоставляем гарантию 5 лет» · «срок гарантии — до пяти лет»*
3. **Deduplicate**: merge variants into a single candidate. Keep the clearest
   wording as canonical; keep **all** distinct source quotes as evidence. If merged
   quotes disagree on a value, do **not** merge them into one fact — send them to
   Step 3 as a conflict.
4. **Skip** anything already in `rules.md` (compare on the normalized key, not the
   raw string, so a re-worded existing fact is not re-proposed).

### Step 3 — Detect conflicts & doubtful facts

Before generating recommendations, compare candidates against each other and against
`rules.md`. Flag a conflict when two sources give different values for the same fact
(guarantee 3 vs 5 years; price from 50 000 vs 70 000; an expert listed as
"руководитель" in one place and "консультант" in another; an older study vs a newer
one). Present them and **stop short of writing them to `rules.md`**:

```
## Конфликты и сомнительные факты
[C1] Гарантия: 3 года (Исследование §Гарантии) ↔ 5 лет (лендинг §Услуги)
     решение: не вносить в rules.md до подтверждения
[C2] {Имя}: «руководитель» (§Команда) ↔ «консультант» (§Отзывы)
     решение: уточнить роль до внесения в Эксперты
```

Conflicting facts are **never** auto-added. The user resolves each one (picks a
value, or marks it unresolved). Only a resolved value enters Step 4 as a normal
candidate. Prefer the **newer** source when dates are known, but still ask.

### Step 4 — Fact recommendations for `rules.md`

For each **non-conflicting** candidate from Step 2, present a recommendation with
source, exact quote, and a confidence rating:

```
[R1] Гарантия — до 5 лет (по сертификату)
     источник: Исследование компании §Гарантии
     цитата: "предоставляем гарантию 5 лет на все работы по договору"
     уверенность: высокая
     внести в rules.md → Проверенные факты? (да / нет)
[R2] Эксперт: {Имя} ({роль}) — для темы {дизайн/ремонт/...}
     источник: Исследование §Команда
     цитата: "{Имя} — {роль}, отвечает за ..."
     уверенность: средняя
     внести в rules.md → Эксперты? (да / нет)
...
```

**Confidence rating** (`высокая` / `средняя` / `низкая`):
- **высокая** — explicit, unambiguous, single consistent source (certificate, price list).
- **средняя** — stated once, slightly indirect wording, or paraphrased in the source.
- **низкая** — implied, marketing phrasing, or no exact quote available. Default
  низкая to "нет" unless the user explicitly approves.

For each approved item, **append it to the correct section of `rules.md`**
(Проверенные факты / SAFE / NEVER / Эксперты). Never add an unapproved fact, a
conflicting fact, or modify facts already present.

If `rules.md` did not exist, create it from this skeleton first:

```markdown
# Правила проекта: {название компании}

## Проверенные факты
(точные формулировки, которые можно использовать дословно)

## SAFE — можно утверждать

## NEVER — нельзя утверждать

## Эксперты — кто о чём говорит
(Имя — роль — разрешённые темы)
```

### Step 5 — Generate `project-context.md` (with overwrite protection)

`project-context.md` may have been edited by hand since the last run. **Never blindly
overwrite it.** If the file exists:

1. **Back up** the current file to `project-context.bak.md` (overwrite previous .bak).
2. **Diff** old vs newly generated content and show the user a summary:
   ```
   project-context.md уже существует — показываю изменения:
   + {добавляемые строки/разделы}
   - {удаляемые строки/разделы}
   ⚠ {N} строк выглядят как ручные правки (нет в исследованиях) — сохранить?
   Применить? (применить / сохранить ручные правки / отмена)
   ```
3. **Preserve manual edits**: any line/section present in the old file but absent from
   the research is treated as a hand-written addition — carry it over by default; only
   drop it if the user says so. Never discard hand-written content silently.

Then write the file. This is the **knowledge base** for writing — capture everything
useful from the research so the source files never need re-reading. The **only**
content that does not go here is exact verifiable facts (precise numbers, prices,
guarantees, ratings, certifications, expert names+roles) — those are extracted to
`rules.md`. Where context needs to mention such a fact, describe it qualitatively
("многолетняя гарантия", "цены ниже среднерыночных") and leave the exact value to
`rules.md`. Be generous with everything else: the writer reads both files.

```markdown
<!-- seo-context | sources: {company_file}, {regional_file} | updated: {YYYY-MM-DD} -->

## Компания
{что делает и чего не делает, как себя подаёт, домен и название, УТП, подход,
ключевые преимущества — описательно, без точных цифр}

## Продукты и услуги
{направления, что входит в каждое, особенности, для каких задач — без точных цен}

## Конкуренты
{кто основные конкуренты, как компания отличается, на чём строит позиционирование}

## Рынок и ниша
{состояние рынка, спрос, тенденции, типичные боли и возражения клиентов}

## Регион
{специфика регионального рынка, районы и ориентиры, локальные особенности и сигналы}

## Аудитория и целевое действие
{кто читатель, сегменты, к какому действию ведём — заявка/консультация/проект}

## Темы и акценты для статей
{приоритетные темы и интенты, частые вопросы, на чём делать упор для этого клиента}

## Тон и стиль
{голос бренда сверх copywriter.md; если есть редполитика — её стилевые установки}
```

### Step 6 — Quality check (compare before / after)

After generating, compare the new outputs against the pre-run state (the `.bak` and
the old `rules.md`) and report a pass/fail on each guardrail:

```
## Quality check
1. Удалён ли важный контент из старого project-context.md?      {нет ✓ / да ⚠ — что}
2. Стало ли меньше фактов в rules.md, чем было?                 {нет ✓ / да ⚠}
3. Точные факты ушли в rules.md, а не в project-context.md?     {да ✓ / нет ⚠ — какие}
4. project-context.md заметно компактнее тяжёлых исследований?  {да ✓ / нет ⚠}
5. Сможет ли /seo-writer писать без тяжёлых исследований?       {да ✓ / нет — чего не хватает}
```

Item 5 is the decisive one: project-context.md + rules.md must together cover what a
writer needs, so the heavy sources are never opened. If anything useful is missing,
add it to project-context.md (or recommend it for rules.md) before finishing.

Any ⚠ must be surfaced to the user before declaring success. A shrinking `rules.md`
fact count or an exact fact that leaked into `project-context.md` instead of `rules.md`
is a failure — fix before finishing.

### Step 7 — Report

```
✓ project-context.md обновлён (sources: {files}; бэкап: project-context.bak.md)
✓ rules.md: добавлено {N} фактов, отклонено {M}, конфликтов {C}, всего фактов {T}
✓ Quality check: {5/5 пройдено / список ⚠}
Готово. Можно запускать /seo-writer.
```

---

## When to re-run

Re-run when company or regional research changes. Backs up and diffs
`project-context.md` before overwriting (Step 5), and offers new fact
recommendations. Already-approved `rules.md` content and hand-written context edits
are kept.

---

## Output Files

| File | Content |
|------|---------|
| `project-context.md` | Distilled knowledge base for writing (company, products, competitors, market, region, audience, themes); no exact facts |
| `project-context.bak.md` | Backup of the previous context (written before overwrite) |
| `rules.md` | Human-verified facts + SAFE/NEVER/Эксперты (only approved additions) |

---

## Error Handling

| Scenario | Action |
|----------|--------|
| Company/regional research missing | Name missing file, stop |
| `rules.md` missing | Create skeleton, then append approved facts |
| Conflicting facts found | List in Step 3, never auto-add, user resolves |
| Duplicate phrasings of one fact | Merge to one candidate, keep all quotes |
| `project-context.md` has manual edits | Back up, diff, preserve edits by default (Step 5) |
| User declines a recommendation | Skip it |
| Quality check fails (⚠) | Surface to user, fix before declaring done |
| Research unchanged since last run | Note context is current, offer to re-run anyway |
