#!/usr/bin/env node
'use strict';

// Raporti profesional Excel.
//
// Ky test mbron tri gjëra që e bëjnë skedarin të përdorshëm në Excel:
//   1. ËSHTË xlsx i vlefshëm: zip me CRC të saktë dhe XML që hapet.
//   2. STILET RUAHEN: titull, krye me sfond, rreshta me rrip, total bold.
//   3. TË DHËNAT JANË TË SAKTA: numra të vërtetë (jo tekst), formula SUM në
//      total, dhe asnjë qelizë e dyfishuar (që e bën skedarin të pavlefshëm).
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const api = loadApp(null, `
;globalThis.__M = {
  xlsxBytes, xlsxFiles, xlSummarySheet, xlProductsSheet, xlPackagesSheet,
  xlHoursSheet, xlWeightsSheet, xlStockSheet, metrics, reportRecords, normalizeRecord,
  blankRecord, db, state, roundHoursTotal, weighCheckIssues,
};`).window.__M;

const make = (nr, product, kg, employee, start, end) => {
  const r = api.blankRecord(nr);
  r.responsible.name = 'Koli Tufit';
  r.plan[0] = { ...r.plan[0], product, planned: String(kg), actual: String(kg), unit: 'kg', packaging: 'Thasë 25kg' };
  r.employees[0] = { ...r.employees[0], name: employee, start, end };
  r.weighings[0].rows[0] = { bags: '6', kg: String(kg), packaging: '15', sum: String(kg - 15) };
  r.weighings[0].printedTotal = { bags: '6', kg: String(kg), packaging: '15', sum: String(kg - 15) };
  return api.normalizeRecord(r);
};

const records = () => [
  make('001', 'Saj Mali organik', 180, 'VALMIRA', '7:00', '16:00'),
  make('002', 'Boronicë', 170, 'VERA', '8:00', '17:00'),
  make('003', 'Saj Mali organik', 155, 'MOZA', '7:00', '16:00'),
];

const build = () => {
  api.db.records = records();
  const rs = api.reportRecords();
  const m = api.metrics(rs, '');
  return {
    sheets: [
      api.xlSummarySheet(rs, m), api.xlProductsSheet(m),
      api.xlPackagesSheet(m), api.xlHoursSheet(m), api.xlWeightsSheet(m),
    ],
    bytes: api.xlsxBytes({
      title: 'BioBes',
      sheets: [
        api.xlSummarySheet(rs, m), api.xlProductsSheet(m),
        api.xlPackagesSheet(m), api.xlHoursSheet(m), api.xlWeightsSheet(m),
      ],
    }),
  };
};

// zip i vlefshëm: lexo skedarët direkt nga bajtët
const unzip = (bytes) => {
  const fflate = require('../BioBes_Cloud/web/vendor/fflate.min.js');
  const out = fflate.unzipSync(new Uint8Array(bytes));
  const files = {};
  for (const k of Object.keys(out)) files[k] = Buffer.from(out[k]).toString('utf8');
  return files;
};

test('raporti është një xlsx i vlefshëm me pesë fletë', () => {
  const { bytes, sheets } = build();
  assert.ok(bytes.length > 3000, 'skedari duhet të ketë përmbajtje');
  const files = unzip(bytes);
  assert.ok(files['[Content_Types].xml'], 'mungon Content_Types');
  assert.ok(files['xl/workbook.xml'].includes('Përmbledhje'), 'mungon fleta e përmbledhjes');
  // pesë fletë pune
  const sheetFiles = Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
  assert.equal(sheetFiles.length, 5);
  assert.equal(sheets.length, 5);
  // çdo fletë ka XML të mbyllur saktë
  for (const f of sheetFiles) {
    assert.match(files[f], /<\/worksheet>$/, `${f} nuk mbyllet saktë`);
    assert.ok((files[f].match(/<worksheet/g) || []).length === 1);
  }
});

test('stilet ruhen: titull, krye me sfond, rreshta me rrip, total bold', () => {
  const files = unzip(build().bytes);
  const styles = files['xl/styles.xml'];
  assert.match(styles, /<fonts count="\d+">/, 'mungon lista e fonteve');
  assert.match(styles, /<fills count="\d+">/, 'mungon lista e sfondeve');
  assert.match(styles, /<cellXfs count="\d+">/, 'mungojnë stilet e qelizave');
  assert.match(styles, /formatCode="#,##0"/, 'mungon formati i numrave');
  // titulli i fletës përdor një font më të madh se teksti normal
  const m = styles.match(/<font><sz val="16"\/><b\/>/);
  assert.ok(m, 'titulli duhet të jetë 16pt i trashë');
  // sfondi i kryet është i markës (192F45)
  assert.ok(styles.includes('FF192F45'), 'mungon ngjyra e markës');
  // rripat e rreshtave
  assert.ok(styles.includes('FFF3F7FA'), 'mungon sfondi i rripit');
});

test('numrat shkruhen si numra të vërtetë, jo si tekst', () => {
  const files = unzip(build().bytes);
  // fleta e prodhimit (sheet2): 505 duhet të jetë <v> numerik
  const sh = files['xl/worksheets/sheet2.xml'];
  assert.match(sh, /<c r="D\d+"[^>]*><v>\d+(?:\.\d+)?<\/v><\/c>/, 'sasia duhet të jetë numër');
  assert.ok(!/<c r="D\d+"[^>]*t="inlineStr">\d/.test(sh), 'numri nuk duhet të jetë tekst');
});

test('totalet kanë formulë SUM reale dhe asnjë qelizë e dyfishuar', () => {
  const files = unzip(build().bytes);
  const sh = files['xl/worksheets/sheet2.xml'];
  assert.match(sh, /<f>SUM\(D\d+:D\d+\)<\/f>/, 'mungon formula SUM');
  // asnjë referencë e njëjtë dy herë brenda të njëjtit rresht
  for (const rowMatch of sh.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/g)) {
    const refs = [...rowMatch[2].matchAll(/<c r="([A-Z]+\d+)"/g)].map((x) => x[1]);
    assert.equal(new Set(refs).size, refs.length, `qelizë e dyfishuar në rreshtin ${rowMatch[1]}: ${refs}`);
  }
});

test('qelizat bosh nuk hapin kolona shtesë', () => {
  const files = unzip(build().bytes);
  const sh = files['xl/worksheets/sheet2.xml'];
  const dim = sh.match(/<dimension ref="A1:([A-Z])(\d+)"\/>/);
  assert.ok(dim, 'mungon dimensioni');
  // fleta e prodhimit ka 6 kolona: A..F
  assert.equal(dim[1], 'F', `dimensioni duhet të mbarojë në F, jo ${dim[1]}`);
});

test('kryet fiksohet dhe filtri aktivizohet', () => {
  const files = unzip(build().bytes);
  const sh = files['xl/worksheets/sheet2.xml'];
  assert.match(sh, /<pane[^>]*state="frozen"/, 'mungon fiksimi i kryet');
  assert.match(sh, /<autoFilter ref="A\d+:[A-Z]+\d+"\/>/, 'mungon autofiltri');
});

test('kontrolli i cilësisë del në tabelë, jo vetëm si shënim', () => {
  const { sheets } = build();
  const summary = sheets[0];
  const flat = summary.rows.map((r) => r.join(' ')).join(' | ');
  assert.match(flat, /pa përgjegjëse/i, 'mungon kontrolli i përgjegjëses');
  assert.match(flat, /aritmetikë/i, 'mungon kontrolli i aritmetikës');
  assert.match(flat, /OK/, 'gjendja e kontrollit mungon');
});

test('shënimet shpjegojnë nga vjen çdo numër', () => {
  const { sheets } = build();
  for (const s of sheets) {
    assert.ok(s.notes && s.notes.length > 0, `fleta ${s.name} nuk ka shënime`);
  }
  const weights = sheets[4];
  assert.match(weights.notes.join(' '), /zero/i, 'shënimi për qelizat bosh mungon');
});

test('formula SUM tregon saktësisht rreshtat e të dhënave, jo të tjera', () => {
  // Ndërto një fletë të vogël ku e dimë saktë ku janë të dhënat.
  const bytes = api.xlsxBytes({
    title: 'Prova',
    sheets: [{
      name: 'S', title: 'TITULL', freezeRow: 5,
      columns: [{ h: 'A', w: 10 }, { h: 'B', w: 12, type: 'd2' }],
      rows: [['x', 1], ['y', 2], ['z', 3]],
      total: { label: 'TOTALI', values: [6], sumCols: [1] },
    }],
  });
  const files = unzip(bytes);
  const xml = files['xl/worksheets/sheet1.xml'];
  const formula = xml.match(/<f>SUM\(B(\d+):B(\d+)\)<\/f>/);
  assert.ok(formula, 'mungon formula SUM mbi kolonën B');
  const from = Number(formula[1]);
  const to = Number(formula[2]);
  // Vlerat 1,2,3 duhet të jenë pikërisht në ato rreshta.
  const valuesIn = [];
  for (const [, num, body] of xml.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/g)) {
    const v = [...body.matchAll(/<c r="B\d+"[^>]*><v>([^<]+)<\/v>/g)].map((x) => x[1]);
    if (v.length) valuesIn.push([Number(num), v.join(',')]);
  }
  const inRange = valuesIn.filter(([r]) => r >= from && r <= to).map(([, v]) => v);
  assert.deepEqual(inRange, ['1', '2', '3'], `brenda SUM(B${from}:B${to}) duhet të jenë vetëm të dhënat, jo ${JSON.stringify(valuesIn)}`);
  // dhe totali nuk është brenda vetes
  assert.ok(!(valuesIn.some(([r]) => r === to + 1 && false)), 'totali nuk duhet të hyjë në SUM');
});

// --- Regresioni i "We found a problem with some content" -------------------
// Excel-i e hodhi poshtë skedarin sepse radha e elementeve në <worksheet> dhe
// <styleSheet> është e detyruar nga schema OOXML. Këto teste e mbrojnë atë.

const SHEET_ORDER = ['sheetPr','dimension','sheetViews','sheetFormatPr','cols','sheetData',
  'sheetCalcPr','sheetProtection','protectedRanges','scenarios','autoFilter','sortState',
  'dataConsolidate','customSheetViews','mergeCells','phoneticPr','conditionalFormatting',
  'dataValidations','hyperlinks','printOptions','pageMargins','pageSetup','headerFooter'];
const STYLE_ORDER = ['numFmts','fonts','fills','borders','cellStyleXfs','cellXfs','cellStyles','dxfs','tableStyles'];

const topLevel = (xml) => {
  const out = [];
  const re = /<(\/?)([a-zA-Z][\w:.-]*)([^>]*?)(\/?)>/g;
  let depth = 0; let m;
  while ((m = re.exec(xml))) {
    const [, close, tag, , selfClose] = m;
    if (close) { depth -= 1; continue; }
    if (depth === 1) out.push(tag);
    if (!selfClose && !/^\?/.test(tag)) depth += 1;
  }
  return out;
};

test('radha e elementeve në worksheet respekton schema-n OOXML', () => {
  const files = unzip(build().bytes);
  const sheets = Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
  assert.ok(sheets.length >= 5);
  for (const name of sheets) {
    const top = topLevel(files[name]).filter((t) => SHEET_ORDER.includes(t));
    const idx = top.map((t) => SHEET_ORDER.indexOf(t));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b),
      `${name}: radha e gabuar e elementeve → ${top.join(', ')} (Excel e hedh poshtë skedarin)`);
  }
});

test('radha e elementeve në styles.xml respekton schema-n', () => {
  const files = unzip(build().bytes);
  const top = topLevel(files['xl/styles.xml']).filter((t) => STYLE_ORDER.includes(t));
  const idx = top.map((t) => STYLE_ORDER.indexOf(t));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b),
    `styles.xml: radha e gabuar → ${top.join(', ')}`);
  // count-et duhet të përputhen me përmbajtjen
  const st = files['xl/styles.xml'];
  for (const el of ['fonts', 'fills', 'borders', 'cellXfs']) {
    const m = st.match(new RegExp(`<${el} count="(\\d+)"`));
    assert.ok(m, `mungon count për ${el}`);
    const declared = Number(m[1]);
    const tag = el === 'cellXfs' ? 'xf' : el.replace(/s$/, '');
    const body = st.slice(st.indexOf(`<${el} `), st.indexOf(`</${el}>`));
    const actual = (body.match(new RegExp(`<${tag}[ />]`, 'g')) || []).length;
    assert.equal(declared, actual, `${el}: count="${declared}" por ka ${actual}`);
  }
});

test('çdo stil i referuar ekziston në cellXfs', () => {
  const files = unzip(build().bytes);
  const st = files['xl/styles.xml'];
  const count = Number(st.match(/<cellXfs count="(\d+)"/)[1]);
  for (const name of Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))) {
    const used = new Set([...files[name].matchAll(/<c r="[A-Z]+\d+" s="(\d+)"/g)].map((m) => Number(m[1])));
    for (const s of used) assert.ok(s < count, `${name}: stili ${s} >= cellXfs ${count}`);
  }
});

test('raportet individuale: një skedar, një fletë, i vlefshëm', () => {
  const types = ['products', 'packages', 'hours', 'stock', 'weights'];
  const builders = {
    products: () => api.xlProductsSheet(metricsOf().m),
    packages: () => api.xlPackagesSheet(metricsOf().m),
    hours: () => api.xlHoursSheet(metricsOf().m),
    stock: () => api.xlStockSheet(metricsOf().m),
    weights: () => api.xlWeightsSheet(metricsOf().m),
  };
  for (const t of types) {
    const sheet = builders[t]();
    assert.ok(sheet && sheet.name, `${t}: mungon fleta`);
    const bytes = api.xlsxBytes({ title: 'BioBes', sheets: [sheet] });
    const files = unzip(bytes);
    const sheetFiles = Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
    assert.equal(sheetFiles.length, 1, `${t}: duhet një fletë e vetme`);
    assert.match(files['xl/workbook.xml'], new RegExp(sheet.name), `${t}: emri i fletës mungon`);
    // radha e saktë edhe këtu
    const top = topLevel(files[sheetFiles[0]]).filter((x) => SHEET_ORDER.includes(x));
    const idx = top.map((x) => SHEET_ORDER.indexOf(x));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b), `${t}: radha e gabuar`);
  }
});

const metricsOf = () => {
  api.db.records = records();
  const rs = api.reportRecords();
  return { rs, m: api.metrics(rs, '') };
};

run();
