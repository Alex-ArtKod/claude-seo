# Distilled review style guide (depersonalized)

This is the one-time distillation of **252 human-written reviews** about a Russian
legal-services company. The names, the company and the niche have been **removed** —
only the *form* is kept, because the form transfers to any project. Use this every
run instead of re-reading raw corpora. The per-run company facts, allowed persons
and niche come from the **project folder** (company profile + `rules.md`) and from
the per-run reference scrape (Step 1).

The single most important finding: **the 252 reviews are NOT written in one voice.**
They range from blunt one-liners with a typo to 200-word personal stories. A batch
that reads like one author wrote it is a failure. Diversity is the product.

---

## 1. Length distribution (sample for each batch from this)

Measured on the corpus (words per review): min 10, median 42, mean 54, max 197.
Characters: median ~280, max ~1290. Target mix per generated batch:

| Bucket | Words | Sentences | Share of batch |
|--------|-------|-----------|----------------|
| Very short | 10–25 | 1–2 | ~15% |
| Short | 25–45 | 2–4 | ~35% |
| Medium | 45–75 | 3–6 | ~30% |
| Long | 75–130 | 6–10 | ~15% |
| Story | 130–200 | 10–18 | ~5% |

Draw a length **per review** (don't make them all average). For each review pick the
bucket first, then write to it. Never let two consecutive reviews land in the same
bucket with the same opener.

> Note on duplicates: in the raw corpus ~32% of reviews were exact copies (the same
> text re-posted to several platforms). **Do not reproduce duplicates** — every
> generated review must be unique. The duplication only tells us real review text
> gets reused verbatim across sites; it is not a style to imitate.

---

## 2. Style archetypes (rotate across the batch)

Assign each review a random archetype. Aim for a spread; no archetype should exceed
~25% of a batch.

1. **Blunt recommendation** (very short). One verdict + "рекомендую". Often a typo.
   - *Skeleton:* «Хорош{ий/ее} {специалист/бюро} с {адекватным ценником / богатой практикой}. Мой вопрос решили быстро и чётко. Рекомендую всем!»
2. **Grateful / warm** (short–medium). Thanks a named person, emotional, exclamation.
   - *Skeleton:* «Хочу поблагодарить {Имя} за {оперативную помощь}. {Без него/неё} я бы не справил{ся/ась}. Спасибо!»
3. **Skeptic turned believer** (medium). "Сначала сомневался… в итоге всё вышло."
   - *Skeleton:* «Первое впечатление было, что {…}. Но оказалось обманчиво. {Имя} {…} и добил{ся/ась} результата.»
4. **Storyteller** (long–story). A real-life situation with stakes, digressions,
   sums and dates, then resolution. Casual asides («Забегая вперёд…», «Кстати…»).
5. **Repeat client** (short–medium). "Обращаюсь не первый раз", "уже третий раз".
   - Often ends with a trailing emoticon `)`.
6. **Businesslike / dry** (short). No emotion, states facts: предмет, срок, итог.
   - *Skeleton:* «Заключил договор на {услуга}. Всё прошло нормально. Отношение и качество устроило. Рекомендую.»
7. **Process-focused** (medium). Praises being kept in the loop, отвечал в вотсапе,
   расписал по шагам, был на связи.
8. **Comparison / chooser** (medium). "Обошёл несколько контор", "выбирал по
   отзывам в интернете", "оказалось не зря".
9. **Result-with-numbers** (medium). Centres a concrete outcome: взыскали N рублей,
   списали N долга, дело решили за N месяцев/недель.
10. **Referral** (short). "Посоветовали коллеги / по рекомендации друга", теперь сам
    советует.

Mix tone too: ~35% of reviews carry an exclamation mark; ~16% end a clause with a
warm trailing `)` or `))` or `;)` (Russian-review habit — a closing paren with no
opening one). The rest are flat.

---

## 3. Openers — keep them varied

In the corpus no opener dominated (the top opener appeared 3 times out of 172
unique). Rotate among: a verdict («Хороший юрист…»), a situation («Задержали
квартиру…», «Купил…», «Мой папа…»), an intention («Хочу поблагодарить…», «Тоже
оставлю отзыв…», «Решил написать…»), a value statement («У юристов этого бюро…»),
a greeting («Добрый вечер!»), or straight into the story. **Never** start two
reviews in a batch with the same word.

---

## 4. Authenticity rules — keep the roughness

Real reviews are not clean copy. Preserve, and deliberately seed, natural imperfection:

- **Typos and misspellings** (sparingly, ~1 in 4 reviews): «хорошое» вместо
  «хорошее», «продожают», пропущенная буква, лишний пробел между словами.
- **Comma splices & run-ons**: «Видно, что юрист знает о чём говорит и что делает.»
  Long sentences strung with «и … и …» are fine here (the opposite of article rules).
- **Colloquialisms & fillers**: «всё-таки», «короче», «ребята реально стараются»,
  «по итогу», «вообще», «как-то очень легко».
- **Грамматические шероховатости** of a native (not a foreigner): «со нашим делам»,
  «деньги мне выплатили, но…». Keep ones a Russian speaker would actually produce.
- **Digressions** in long reviews: «Забегая вперёд…», «Кстати, отзыв я решил
  написать ещё тогда…», «P.s. …».
- **Concrete but vague numbers**: «480 т. р.», «две трети от суммы», «больше
  полугода», «за 2,5 недели», «376 тысяч рублей», «списали 900к». Round, casual.
- **Sign-offs vary**: «Рекомендую.», «Спасибо за внимание!», «Очень благодарна.»,
  «Всем советую.», a trailing `)`, or nothing.

What this is NOT: it is **not** an excuse to write like a translation engine. The
text must read like a real Russian person typed it fast on a phone — rough but
**native**. See `review-editor.md` for the line between native-rough (keep) and
non-native/AI (fix).

---

## 5. Hard constraints (every review)

- **One reviewer, one gender, consistent.** Pick a gender per review; every verb,
  participle and adjective in the first person must agree («я обратилась … была
  довольна» OR «я обратился … был доволен»). If a reviewer name is used, it must
  match the gender. Mix male/female across the batch (~50/50).
- **Only allowed entities.** Company name, persons (advocate/lawyer names, roles),
  services, region, guarantees — strictly from the project's company profile and
  `rules.md`. **Never invent** a lawyer, a partner, a competitor firm, a court, a
  platform, or a third-party brand that isn't in those sources.
- **No other companies / experts.** If `rules.md` lists allowed names, only those
  appear. No real competitor firms, no made-up colleagues.
- **No AI tells.** No «не просто X, а Y», no «важно отметить / стоит подчеркнуть»,
  no forced triads, no em-dash drama, no «в современном мире». Reviews are emotional
  and concrete, never essay-like.
- **Plausible, safe specifics.** Vary sums, dates, timeframes and situations so the
  batch isn't repetitive, but keep them realistic for the niche and never contradict
  `rules.md` (e.g. don't promise a guarantee the company doesn't give).

---

## 6. Niche vocabulary (replace per project)

The corpus niche was legal services. For the current project, build the vocabulary
from the Step 1 scrape and the company profile. Keep the *register* (everyday client
language, not legalese): people describe their problem in plain words, name the
service casually, and judge by result, speed, attitude and price.
