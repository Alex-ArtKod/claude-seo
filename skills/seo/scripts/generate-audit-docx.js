/**
 * Генератор DOCX-отчёта для /seo audit в фирменном стиле Artkod.
 *
 * Визуальный стиль снят с реального клиентского отчёта студии (Google Docs,
 * экспортирован и разобран 2026-07-19): шрифт Proxima Nova, тёмный акцент
 * #353744 для заголовков, серый #666666 для второстепенного текста,
 * стандартная Google-ссылочная синь #1155CC. Цвета критичности находок
 * (Critical/High/Medium/Low) — отдельная палитра поверх этого, т.к. в
 * образце такого отчёта (тип "проделанные работы") не было.
 *
 * Использование как модуля:
 *   const { generateAuditDocx } = require('./generate-audit-docx.js');
 *   await generateAuditDocx(data, 'path/to/output.docx');
 *
 * Использование из командной строки:
 *   node generate-audit-docx.js data.json output.docx
 *
 * Схема data — см. README-комментарий в конце файла (buildExampleData).
 * Первый запуск в новом окружении: npm install (в этой же папке) — нужен
 * пакет docx.
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, VerticalAlign
} = require('docx');
const fs = require('fs');
const path = require('path');

const FONT = 'Proxima Nova';

const COLOR_HEADING = '353744'; // тёмный акцент из фирменного шаблона
const COLOR_LINK = '1155CC';    // стандартная ссылочная синь из шаблона
const COLOR_GRAY = '666666';    // второстепенный текст из шаблона
const COLOR_ACCENT = '1F4E79';  // навигационный синий для таблиц/H2 (устоявшийся в других отчётах Artkod)
const COLOR_TABLE_HEAD = '2E75B6';

const SEVERITY = {
  critical: { label: 'Critical', ru: '🔴 Critical', color: 'C0392B' },
  high: { label: 'High', ru: '🟠 High', color: 'E67E22' },
  medium: { label: 'Medium', ru: '🟡 Medium', color: 'B7950B' },
  low: { label: 'Low', ru: '🟢 Low', color: '5D8C6B' },
  positive: { label: 'Позитив', ru: 'Позитив', color: '1E8449' }
};

function scoreColor(score) {
  if (score >= 70) return '1E8449';
  if (score >= 50) return 'B7950B';
  return 'C0392B';
}

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: COLOR_TABLE_HEAD };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, ...opts });
}
function p(text, opts = {}) {
  return new Paragraph({ children: [run(text, opts.run)], ...opts.paragraph });
}
function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
}
function h3(text, color) {
  return new Paragraph({
    children: [run(text, { bold: true, size: 22, color: color || COLOR_HEADING })],
    spacing: { before: 200, after: 100 }
  });
}
function bulletList(items, opts = {}) {
  if (!items || !items.length) return [];
  return items.map(text => new Paragraph({
    children: [run(text, { size: 21, ...opts.run })],
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80 }
  }));
}
function numberList(items, opts = {}) {
  if (!items || !items.length) return [];
  return items.map(text => new Paragraph({
    children: [run(text, { size: 21, ...opts.run })],
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 80 }
  }));
}

function cellText(text, opts = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [run(String(text), { size: 20, ...opts.run })],
      spacing: { before: 40, after: 40 },
      alignment: opts.align
    })],
    borders,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined
  });
}
function headerCell(text, width) {
  return new TableCell({
    children: [new Paragraph({ children: [run(text, { bold: true, color: 'FFFFFF', size: 20 })] })],
    shading: { type: ShadingType.CLEAR, fill: COLOR_TABLE_HEAD },
    borders: headerBorders,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    width: width ? { size: width, type: WidthType.DXA } : undefined
  });
}

// ---------- Блок: таблица SEO Health Score ----------
function healthScoreTable(categories) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell('Категория', 3200),
          headerCell('Вес', 1200),
          headerCell('Балл', 1200),
          headerCell('Вклад', 1200)
        ],
        tableHeader: true
      }),
      ...categories.map(c => new TableRow({
        children: [
          cellText(c.name),
          cellText(c.weight, { align: AlignmentType.CENTER }),
          cellText(`${c.score}/100`, { align: AlignmentType.CENTER, run: { bold: true, color: scoreColor(c.score) } }),
          cellText(c.contribution, { align: AlignmentType.CENTER })
        ]
      }))
    ]
  });
}

// ---------- Блок: находки по одной категории (Critical/High/Medium/Low/Позитив) ----------
function findingsBlock(section) {
  const out = [];
  out.push(h2(section.title));
  if (section.intro) out.push(p(section.intro, { paragraph: { spacing: { after: 160 } } }));

  for (const key of ['critical', 'high', 'medium', 'low']) {
    const items = section[key];
    if (items && items.length) {
      out.push(h3(SEVERITY[key].ru, SEVERITY[key].color));
      out.push(...bulletList(items));
    }
  }
  if (section.positive) {
    out.push(new Paragraph({
      children: [run('Позитив: ', { bold: true, color: SEVERITY.positive.color, size: 21 }), run(section.positive, { italics: true, size: 21 })],
      spacing: { before: 160, after: 200 }
    }));
  } else {
    out.push(new Paragraph({ spacing: { after: 200 } }));
  }
  return out;
}

// ---------- Блок: сводный план действий по приоритетам ----------
function actionPlanBlock(actionPlan) {
  const out = [h1('Сводный приоритизированный план действий')];
  const order = [
    ['critical', '🔴 Critical (исправить немедленно)'],
    ['high', '🟠 High'],
    ['medium', '🟡 Medium'],
    ['low', '🟢 Low']
  ];
  for (const [key, label] of order) {
    const items = actionPlan[key];
    if (items && items.length) {
      out.push(h3(label, SEVERITY[key].color));
      out.push(...numberList(items));
    }
  }
  return out;
}

function buildDocument(data) {
  const scoreCol = scoreColor(data.healthScore);
  const children = [];

  // Обложка
  children.push(new Paragraph({ spacing: { before: 400 } }));
  children.push(new Paragraph({
    children: [run(data.reportTitle || 'SEO-АУДИТ', { bold: true, size: 44, color: COLOR_HEADING })],
    alignment: AlignmentType.CENTER
  }));
  children.push(new Paragraph({
    children: [run(`${data.client}${data.domain ? ' — ' + data.domain : ''}`, { bold: true, size: 28, color: COLOR_ACCENT })],
    alignment: AlignmentType.CENTER, spacing: { before: 160 }
  }));
  children.push(new Paragraph({
    children: [run(data.date || '', { size: 22, color: COLOR_GRAY })],
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 360 }
  }));

  // SEO Health Score
  children.push(new Paragraph({
    children: [run('SEO Health Score: ', { size: 26, color: COLOR_HEADING }), run(`${data.healthScore} / 100`, { bold: true, size: 34, color: scoreCol }), run(data.healthScoreLabel ? `  (${data.healthScoreLabel})` : '', { size: 22, color: COLOR_GRAY, italics: true })],
    spacing: { after: 220 }
  }));
  if (data.categories && data.categories.length) {
    children.push(healthScoreTable(data.categories));
    children.push(new Paragraph({ spacing: { after: 240 } }));
  }
  if (data.summaryStrengths) {
    children.push(p(data.summaryStrengths, { paragraph: { spacing: { after: 160 } } }));
  }
  if (data.summaryWeaknesses) {
    children.push(p(data.summaryWeaknesses, { paragraph: { spacing: { after: 280 } } }));
  }

  // Разделы по категориям
  for (const section of data.sections || []) {
    children.push(...findingsBlock(section));
  }

  // Сводный план действий
  if (data.actionPlan) {
    children.push(...actionPlanBlock(data.actionPlan));
  }

  // Открытые вопросы
  if (data.openQuestions && data.openQuestions.length) {
    children.push(h1('Открытые вопросы к команде/клиенту'));
    children.push(...bulletList(data.openQuestions));
  }

  // Заключительная заметка (напр. ограничения окружения/методологии)
  if (data.footerNote) {
    children.push(new Paragraph({ spacing: { before: 200 } }));
    children.push(p(data.footerNote, { paragraph: { spacing: { after: 160 } }, run: { italics: true, size: 19, color: COLOR_GRAY } }));
  }

  return new Document({
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 32, bold: true, font: FONT, color: COLOR_HEADING },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 26, bold: true, font: FONT, color: COLOR_ACCENT },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 }
        }
      ]
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [run(`${data.client}${data.domain ? ' | ' + data.domain : ''} — SEO-аудит`, { italics: true, size: 18, color: COLOR_GRAY })],
            alignment: AlignmentType.RIGHT
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              run(`${data.client} — SEO-аудит${data.date ? ' • ' + data.date : ''}`, { size: 18, color: COLOR_GRAY }),
              run('  |  Страница ', { size: 18, color: COLOR_GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLOR_GRAY, font: FONT })
            ],
            alignment: AlignmentType.CENTER
          })]
        })
      },
      children
    }]
  });
}

/**
 * Сгенерировать DOCX-отчёт и сохранить его на диск.
 * @param {object} data — см. схему в комментарии buildExampleData ниже.
 * @param {string} outputPath — путь к .docx файлу (папки будут созданы при необходимости).
 * @returns {Promise<string>} — абсолютный путь к сохранённому файлу.
 */
async function generateAuditDocx(data, outputPath) {
  const doc = buildDocument(data);
  const buffer = await Packer.toBuffer(doc);
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, buffer);
  return resolved;
}

module.exports = { generateAuditDocx };

// ---------- CLI ----------
if (require.main === module) {
  const [, , dataPath, outPath] = process.argv;
  if (!dataPath || !outPath) {
    console.error('Использование: node generate-audit-docx.js <data.json> <output.docx>');
    console.error('Схема data.json — см. комментарий buildExampleData() в этом файле.');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  generateAuditDocx(data, outPath).then(resolved => {
    console.log('Готово:', resolved);
  }).catch(err => {
    console.error('Ошибка генерации DOCX:', err);
    process.exit(1);
  });
}

/*
 * Схема data (JSON или JS-объект):
 * {
 *   "client": "Ла Вояж",
 *   "domain": "lavoyage.ru",
 *   "date": "18.07.2026",
 *   "reportTitle": "ПОЛНЫЙ SEO-АУДИТ",
 *   "healthScore": 46,
 *   "healthScoreLabel": "Needs Improvement",
 *   "categories": [
 *     { "name": "Технический SEO", "weight": "22%", "score": 62, "contribution": "13.64" }
 *   ],
 *   "summaryStrengths": "текст сильных сторон...",
 *   "summaryWeaknesses": "текст главных проблем...",
 *   "sections": [
 *     {
 *       "title": "1. Технический SEO — 62/100",
 *       "intro": "необязательный вводный текст",
 *       "critical": ["находка 1", "находка 2"],
 *       "high": ["..."],
 *       "medium": ["..."],
 *       "low": ["..."],
 *       "positive": "необязательный текст про сильные стороны раздела"
 *     }
 *   ],
 *   "actionPlan": {
 *     "critical": ["пункт 1", "пункт 2"],
 *     "high": ["..."],
 *     "medium": ["..."],
 *     "low": ["..."]
 *   },
 *   "openQuestions": ["вопрос 1", "вопрос 2"],
 *   "footerNote": "например, оговорка про ограничения окружения/методологии"
 * }
 */
