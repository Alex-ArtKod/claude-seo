#!/usr/bin/env node
// Фаза 1 — Harvest. Получает ТОП выдачи через XMLRiver и фильтрует агрегаторы.
//
// Запуск:
//   node scripts/harvest.js --query "ремонт квартир под ключ" --engine yandex \
//        --region 213 --top 10 --out ./out/serp.json [--config ./config.json]
//
// XMLRiver:
//   Google: http://xmlriver.com/search/xml?user=&key=&query=&loc=&groupby=
//   Yandex: http://xmlriver.com/search_yandex/xml?user=&key=&query=&lr=&groupby=
// Регион: Google -> loc (id геолокации), Yandex -> lr (код региона, Москва=213).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, '..');

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

async function loadConfig(explicitPath) {
  const candidates = [
    explicitPath,
    path.join(SKILL_DIR, 'config.json'),
    path.join(SKILL_DIR, 'config.example.json'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, 'utf8');
      return { config: JSON.parse(raw), path: candidate };
    } catch {
      /* try next */
    }
  }
  return { config: {}, path: null };
}

async function loadAggregators() {
  try {
    const raw = await readFile(path.join(SKILL_DIR, 'references', 'aggregators.txt'), 'utf8');
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

async function loadRegions() {
  try {
    const raw = await readFile(path.join(SKILL_DIR, 'references', 'regions.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Превращает регион из ввода (число ИЛИ название города) в код XMLRiver.
// Яндекс: код lr (город). Google: XMLRiver работает по стране/языку, города нет —
// честно деградируем до общероссийской выдачи.
// Возвращает { code, label, warning }.
function resolveRegion(rawRegion, engine, regionsMap) {
  const fallbackYandex = 213; // Москва по умолчанию
  const value = String(rawRegion || '').trim();

  if (engine === 'google') {
    if (/^\d+$/.test(value)) return { code: value, label: `loc=${value}`, warning: null };
    return {
      code: '',
      label: 'Россия (по стране)',
      warning: value
        ? `Google в XMLRiver не поддерживает город "${value}" — выдача собрана по России. Городская локализация доступна только для Яндекса.`
        : null,
    };
  }

  // Яндекс
  if (!value) return { code: String(fallbackYandex), label: 'Москва (по умолчанию, lr=213)', warning: null };
  if (/^\d+$/.test(value)) return { code: value, label: `lr=${value}`, warning: null };

  const key = value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const hit = regionsMap[key];
  if (hit && Number.isFinite(hit.lr)) {
    return { code: String(hit.lr), label: `${value} (lr=${hit.lr})`, warning: null };
  }

  const suggestions = Object.keys(regionsMap)
    .filter((k) => !k.startsWith('_'))
    .slice(0, 8)
    .join(', ');
  return {
    code: null,
    label: value,
    warning:
      `Регион "${value}" не найден в references/regions.json.\n` +
      `Укажите числовой код lr напрямую или одно из названий: ${suggestions}…\n` +
      `Полный список: https://xmlriver.com/blog/spisok-kodov-regionov-yandex-poiska-s-ierarhiej.html`,
  };
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

// Парсим организ. результаты из XML без тяжёлой зависимости:
// каждый <doc> ... </doc> содержит <url>...</url> и <title>...</title>.
function parseSerpXml(xml) {
  const docs = [];
  const docRe = /<doc\b[^>]*>([\s\S]*?)<\/doc>/gi;
  let match;
  while ((match = docRe.exec(xml)) !== null) {
    const block = match[1];
    const url = (block.match(/<url>([\s\S]*?)<\/url>/i) || [])[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    if (!url) continue;
    docs.push({
      url: decodeXml(url.trim()),
      title: decodeXml((title || '').trim()),
    });
  }
  return docs;
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function checkServiceError(xml) {
  const err = xml.match(/<error[^>]*>([\s\S]*?)<\/error>/i);
  return err ? decodeXml(err[1]) : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.query) {
    console.error('Ошибка: укажите --query "<поисковый запрос>"');
    process.exit(1);
  }

  const engine = (args.engine || 'yandex').toLowerCase();
  if (!['google', 'yandex'].includes(engine)) {
    console.error('Ошибка: --engine должен быть google или yandex');
    process.exit(1);
  }

  const { config, path: configPath } = await loadConfig(args.config);
  const user = args.user || config.XMLRIVER_USER || process.env.XMLRIVER_USER;
  const key = args.key || config.XMLRIVER_KEY || process.env.XMLRIVER_KEY;

  if (!user || !key) {
    console.error(
      'Ошибка: не найдены XMLRIVER_USER/XMLRIVER_KEY.\n' +
        `Проверён конфиг: ${configPath || '(не найден)'}\n` +
        'Заполните config.json (см. config.example.json) или передайте --user/--key.'
    );
    process.exit(1);
  }

  const topN = Number(args.top || 10);
  const rawRegion = args.region || (engine === 'yandex' ? config.yandexRegion : config.googleLoc) || '';
  const regionsMap = await loadRegions();
  const region = resolveRegion(rawRegion, engine, regionsMap);

  if (region.code === null) {
    console.error(region.warning);
    process.exit(1);
  }
  if (region.warning) console.error(`[harvest] ⚠ ${region.warning}`);

  const base =
    engine === 'yandex' ? 'http://xmlriver.com/search_yandex/xml' : 'http://xmlriver.com/search/xml';
  const params = new URLSearchParams({
    user: String(user),
    key: String(key),
    query: String(args.query),
    groupby: String(args.groupby || 100),
  });
  if (region.code) params.set(engine === 'yandex' ? 'lr' : 'loc', String(region.code));

  const requestUrl = `${base}?${params.toString()}`;
  console.error(`[harvest] ${engine} | "${args.query}" | регион: ${region.label}`);

  let xml;
  try {
    const res = await fetch(requestUrl, { headers: { accept: 'application/xml,text/xml,*/*' } });
    xml = await res.text();
  } catch (error) {
    console.error(`Ошибка сети при запросе к XMLRiver: ${error.message}`);
    process.exit(1);
  }

  const serviceError = checkServiceError(xml);
  if (serviceError) {
    console.error(`XMLRiver вернул ошибку: ${serviceError}`);
    console.error('Частые причины: неверный user/key, нет баланса, неверный регион.');
    process.exit(1);
  }

  const docs = parseSerpXml(xml);
  if (!docs.length) {
    console.error('XMLRiver не вернул органических результатов. Проверьте запрос/регион.');
    process.exit(1);
  }

  const aggregators = await loadAggregators();
  const isAggregator = (url) => {
    const host = hostOf(url);
    return aggregators.some((agg) => host === agg || host.endsWith(`.${agg}`));
  };

  const seenHosts = new Set();
  const filtered = [];
  const skipped = [];
  for (const doc of docs) {
    const host = hostOf(doc.url);
    if (!host) continue;
    if (isAggregator(doc.url)) {
      skipped.push({ ...doc, reason: 'aggregator' });
      continue;
    }
    if (seenHosts.has(host)) {
      skipped.push({ ...doc, reason: 'duplicate-host' });
      continue;
    }
    seenHosts.add(host);
    filtered.push(doc);
    if (filtered.length >= topN) break;
  }

  const output = {
    query: args.query,
    engine,
    region: region.code || null,
    regionLabel: region.label,
    fetchedAt: new Date().toISOString(),
    requested: topN,
    competitors: filtered.map((d, i) => ({ position: i + 1, url: d.url, title: d.title })),
    skipped,
  };

  const outPath = args.out || path.join(SKILL_DIR, 'out', 'serp.json');
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.error(
    `[harvest] отобрано ${filtered.length} конкурентов, отфильтровано ${skipped.length}. → ${outPath}`
  );
  for (const c of output.competitors) console.error(`  ${c.position}. ${c.url}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
