// Детерминированная агрегация ТОПа: превращает массив структур parseHtmlPage
// в карту рынка (top-map.json). Никакой модели — только статистика.

const RU_STOPWORDS = new Set([
  'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то',
  'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за',
  'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет',
  'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если',
  'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж',
  'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'может', 'они', 'тут',
  'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам',
  'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет', 'ж',
  'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь',
  'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'были', 'куда', 'зачем',
  'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой', 'хоть',
  'после', 'над', 'больше', 'тот', 'через', 'эти', 'нас', 'про', 'всего', 'них',
  'какая', 'много', 'разве', 'эту', 'эта', 'это', 'свой', 'свои', 'своих',
  'который', 'которые', 'которых', 'между', 'вашего', 'нашего', 'всё',
  // обобщённые «вопросные»/служебные, бесполезные как LSI
  'какие', 'каких', 'каком', 'каков', 'нужно', 'нужен', 'нужна', 'надо',
]);

const EN_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is',
  'are', 'how', 'what', 'why', 'when', 'where', 'your', 'you', 'we', 'our',
]);

function isStopword(token) {
  return RU_STOPWORDS.has(token) || EN_STOPWORDS.has(token) || token.length < 3;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-я0-9\s-]/gi, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// Грубый русский стемминг: отрезаем частые окончания, чтобы «стоимость/стоимости»
// схлопывались в один токен. Не лингвистически точно, но устойчиво и достаточно.
function stem(token) {
  if (token.length <= 4) return token;
  return token.replace(
    /(иями|ями|ами|ование|ируется|ость|ества|еских|ческий|ского|ными|ный|ная|ное|ные|ных|ным|ами|ого|ему|ому|ыми|ией|иям|иях|ах|ях|ов|ев|ие|ье|ьё|ою|ей|ия|ию|ью|ам|ом|ах|их|ых|ую|юю|ая|яя|ее|ой|ий|ый|ые|ого|ам|ах|а|я|и|ы|е|у|ю|о|ь|й)$/u,
    ''
  );
}

function median(values) {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percentile(values, p) {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function weightLabel(share) {
  if (share >= 0.7) return 'Mandatory';
  if (share >= 0.4) return 'Recommended';
  return 'Optional';
}

function normalizeHeading(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

// Кластеризуем заголовки H2/H3 по «якорному» токену.
// Якорь = самый редкий по документам значимый токен в заголовке
// (df — в скольких конкурентах он встречается среди всех заголовков).
// Это группирует «Стоимость ремонта» и «Цена за м2» хуже, но «Стоимость …»
// между собой — хорошо, оставаясь детерминированным и объяснимым.
function buildHeadingMap(competitors) {
  const total = competitors.length || 1;

  // df стеммированных токенов по документам
  const tokenDocFreq = new Map();
  const perDocHeadings = competitors.map((c) => {
    const set = new Set(
      [...(c.headings?.h2 || []), ...(c.headings?.h3 || [])]
        .map(normalizeHeading)
        .filter(Boolean)
    );
    const docTokens = new Set();
    for (const h of set) {
      for (const tok of tokenize(h).map(stem).filter((t) => t && !isStopword(t))) {
        docTokens.add(tok);
      }
    }
    for (const tok of docTokens) {
      tokenDocFreq.set(tok, (tokenDocFreq.get(tok) || 0) + 1);
    }
    return [...set];
  });

  // Якорный токен заголовка = токен с максимальным df (самый «темообразующий»)
  function anchorOf(heading) {
    const toks = tokenize(heading).map(stem).filter((t) => t && !isStopword(t));
    if (!toks.length) return null;
    let best = toks[0];
    let bestDf = tokenDocFreq.get(best) || 0;
    for (const t of toks) {
      const df = tokenDocFreq.get(t) || 0;
      if (df > bestDf) {
        best = t;
        bestDf = df;
      }
    }
    return best;
  }

  // anchor -> { docsWithIt:Set(docIndex), samples:Set(heading) }
  const clusters = new Map();
  perDocHeadings.forEach((headings, docIndex) => {
    const seenAnchorsInDoc = new Set();
    for (const h of headings) {
      const anchor = anchorOf(h);
      if (!anchor) continue;
      if (!clusters.has(anchor)) clusters.set(anchor, { docs: new Set(), samples: new Set() });
      const cluster = clusters.get(anchor);
      cluster.samples.add(h);
      if (!seenAnchorsInDoc.has(anchor)) {
        cluster.docs.add(docIndex);
        seenAnchorsInDoc.add(anchor);
      }
    }
  });

  return [...clusters.entries()]
    .map(([anchor, { docs, samples }]) => {
      const count = docs.size;
      const share = Number((count / total).toFixed(2));
      return {
        theme: anchor,
        count,
        share,
        weight: weightLabel(share),
        sampleHeadings: [...samples].slice(0, 5),
      };
    })
    .filter((c) => c.count >= 1)
    .sort((a, b) => b.count - a.count || b.sampleHeadings.length - a.sampleHeadings.length);
}

// Частотный лексикон: униграммы + биграммы по заголовкам и первым абзацам.
function buildLexicon(competitors, limit = 40) {
  const uni = new Map();
  const bi = new Map();
  for (const c of competitors) {
    const sources = [
      ...(c.headings?.h1 || []),
      ...(c.headings?.h2 || []),
      ...(c.headings?.h3 || []),
      c.firstParagraph || '',
    ];
    for (const src of sources) {
      const toks = tokenize(src).filter((t) => !isStopword(t));
      const stemmed = toks.map(stem);
      for (const t of stemmed) uni.set(t, (uni.get(t) || 0) + 1);
      for (let i = 0; i < toks.length - 1; i += 1) {
        if (isStopword(toks[i]) || isStopword(toks[i + 1])) continue;
        const phrase = `${toks[i]} ${toks[i + 1]}`;
        bi.set(phrase, (bi.get(phrase) || 0) + 1);
      }
    }
  }
  const top = (map, n) =>
    [...map.entries()]
      .filter(([, freq]) => freq >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([term, freq]) => ({ term, freq }));
  return { unigrams: top(uni, limit), bigrams: top(bi, Math.round(limit / 2)) };
}

export function aggregateTop({ query, engine, region, competitors }) {
  const ok = competitors.filter((c) => c && c.ok !== false && Number.isFinite(c.mainWordCount));
  const total = ok.length;

  const mainWords = ok.map((c) => c.mainWordCount);
  const medianMain = median(mainWords);
  const p25 = percentile(mainWords, 25);
  const p75 = percentile(mainWords, 75);

  const lists = ok.map((c) => c.listBlockCount || 0);
  const tables = ok.map((c) => c.tableCount || 0);
  const faqShare = total ? Number((ok.filter((c) => (c.faqSchemaCount || 0) > 0).length / total).toFixed(2)) : 0;
  const defIntroShare = total ? Number((ok.filter((c) => c.definitionLikeIntro).length / total).toFixed(2)) : 0;

  const schemaUnion = [...new Set(ok.flatMap((c) => c.schemaTypes || []))].sort();

  return {
    query,
    engine,
    region: region || null,
    fetchedAt: new Date().toISOString(),
    competitorCount: total,
    skippedCount: competitors.length - total,
    volume: {
      medianMainWords: medianMain,
      p25,
      p75,
      // Цель = медиана + ~10% (превзойти середину ТОПа, не раздувая)
      recommendedMinWords: Math.round(medianMain * 1.0),
      recommendedMaxWords: Math.round(medianMain * 1.15),
      // символы без пробелов ≈ слова * 6.5 для русского
      recommendedMinChars: Math.round(medianMain * 1.0 * 6.5),
      recommendedMaxChars: Math.round(medianMain * 1.15 * 6.5),
    },
    tech: {
      listMedian: median(lists),
      tableMedian: median(tables),
      faqShare,
      definitionIntroShare: defIntroShare,
      schemaTypesUnion: schemaUnion,
    },
    headingMap: buildHeadingMap(ok),
    lexicon: buildLexicon(ok),
    competitors: ok.map((c) => ({
      url: c.url,
      title: c.title,
      description: c.description,
      h1: (c.headings?.h1 || [])[0] || '',
      mainWordCount: c.mainWordCount,
      listBlockCount: c.listBlockCount || 0,
      tableCount: c.tableCount || 0,
      faqSchemaCount: c.faqSchemaCount || 0,
      schemaTypes: c.schemaTypes || [],
      definitionLikeIntro: Boolean(c.definitionLikeIntro),
      h2: c.headings?.h2 || [],
      h3: c.headings?.h3 || [],
    })),
  };
}
