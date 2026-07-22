#!/usr/bin/env node
// Фаза 2 — Aggregate. Скачивает страницы конкурентов, разбирает их
// переиспользуемым parseHtmlPage из google-yandex-seo-skills и строит top-map.json.
//
// Запуск:
//   node scripts/analyze-top.js --in ./out/serp.json --out ./out/top-map.json
//   node scripts/analyze-top.js --urls "https://a.ru,https://b.ru" --out ./out/top-map.json
//
// Парсер и фетчер берём из соседнего скила (не дублируем код). Если он отсутствует
// или там не установлен cheerio — скрипт явно об этом сообщит.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregateTop } from './lib/aggregate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, '..');
const SIBLING = path.resolve(SKILL_DIR, '..', 'google-yandex-seo-skills', 'scripts', 'lib');

const CONCURRENCY = 4;

// Браузерный фетч с cookie jar: конкурентные страницы РФ часто защищены
// cookie-redirect петлёй (302 + Set-Cookie), которую общий фетчер аудит-скила
// не проходит. Здесь храним cookies между редиректами — это решает 9/10 случаев.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const BASE_HEADERS = {
  'user-agent': BROWSER_UA,
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8',
};

function parseSetCookie(headers) {
  const out = {};
  const arr = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  for (const c of arr) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return out;
}

async function fetchCookieJar(inputUrl, maxRedirects = 10) {
  const jar = {};
  let current = inputUrl;
  for (let i = 0; i <= maxRedirects; i += 1) {
    const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    const headers = { ...BASE_HEADERS };
    if (cookie) headers.cookie = cookie;
    const res = await fetch(current, { headers, redirect: 'manual' });
    Object.assign(jar, parseSetCookie(res.headers));
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).href;
      continue;
    }
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      body,
      finalUrl: current,
      headers: Object.fromEntries(res.headers.entries()),
    };
  }
  throw new Error(`Too many redirects while fetching ${inputUrl}`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function loadSibling() {
  try {
    const { parseHtmlPage } = await import(
      pathToFileUrl(path.join(SIBLING, 'parsers', 'html-parser.js'))
    );
    return { parseHtmlPage };
  } catch (error) {
    console.error(
      'Не удалось подключить парсер из google-yandex-seo-skills.\n' +
        `Ожидался путь: ${SIBLING}\n` +
        `Причина: ${error.message}\n` +
        'Проверьте, что соседний скил на месте и в нём выполнен `npm install` (нужен cheerio).'
    );
    process.exit(1);
  }
}

function pathToFileUrl(p) {
  return new URL(`file://${p.replace(/\\/g, '/').replace(/^([a-zA-Z]):/, '/$1:')}`).href;
}

async function runPool(items, worker, size) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    const index = cursor;
    cursor += 1;
    if (index >= items.length) return;
    results[index] = await worker(items[index], index);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, next));
  return results;
}

// Запасной счётчик слов: парсер аудит-скила ищет контент только в
// main/article/[role=main]/#allrecords/.t-records. Многие коммерческие страницы
// РФ верстают без этих контейнеров — тогда mainWordCount=0. Здесь грубо чистим
// HTML (убираем шум: скрипты, стили, навигацию) и считаем слова по тексту body.
function fallbackWordCount(html) {
  if (!html) return 0;
  const cleaned = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
  return cleaned.split(/\s+/).filter(Boolean).length;
}

function toCompetitorRecord(parsed, url, ok, html) {
  const parsedMain = parsed.contentSignals?.mainWordCount ?? parsed.wordCount ?? 0;
  const mainWordCount = parsedMain > 0 ? parsedMain : fallbackWordCount(html);
  return {
    url,
    ok,
    title: parsed.title || '',
    description: parsed.description || '',
    headings: parsed.headings || {},
    firstParagraph: parsed.firstParagraph || '',
    mainWordCount,
    listBlockCount: parsed.geoSignals?.listBlockCount ?? 0,
    tableCount: parsed.geoSignals?.tableCount ?? 0,
    faqSchemaCount: parsed.geoSignals?.faqSchemaCount ?? 0,
    schemaTypes: parsed.structuredData?.schemaTypes ?? [],
    definitionLikeIntro: parsed.geoSignals?.definitionLikeIntro ?? false,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { parseHtmlPage } = await loadSibling();

  let query = args.query || '';
  let engine = args.engine || '';
  let region = args.region || '';
  let urls = [];

  if (args.in) {
    const serp = JSON.parse(await readFile(args.in, 'utf8'));
    query = query || serp.query || '';
    engine = engine || serp.engine || '';
    region = region || serp.region || '';
    urls = (serp.competitors || []).map((c) => c.url);
  } else if (args.urls) {
    urls = String(args.urls).split(',').map((u) => u.trim()).filter(Boolean);
  }

  if (!urls.length) {
    console.error('Ошибка: не заданы URL. Используйте --in serp.json или --urls "a,b,c".');
    process.exit(1);
  }

  console.error(`[analyze] страниц к разбору: ${urls.length}`);

  const competitors = await runPool(
    urls,
    async (url) => {
      try {
        const res = await fetchCookieJar(url);
        if (!res.ok || !res.body) {
          console.error(`  ✗ ${url} (HTTP ${res.status})`);
          return { url, ok: false, mainWordCount: NaN };
        }
        const parsed = parseHtmlPage(res.body, res.finalUrl || url, res.headers || {});
        const record = toCompetitorRecord(parsed, res.finalUrl || url, true, res.body);
        console.error(`  ✓ ${url} (${record.mainWordCount} слов, H2:${record.headings.h2?.length || 0})`);
        return record;
      } catch (error) {
        console.error(`  ✗ ${url} (${error.message})`);
        return { url, ok: false, mainWordCount: NaN };
      }
    },
    CONCURRENCY
  );

  const topMap = aggregateTop({ query, engine, region, competitors });

  const outPath = args.out || path.join(SKILL_DIR, 'out', 'top-map.json');
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(topMap, null, 2), 'utf8');

  console.error(
    `[analyze] готово: ${topMap.competitorCount} валидных, медиана ${topMap.volume.medianMainWords} слов, ` +
      `${topMap.headingMap.length} тематических блоков. → ${outPath}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
