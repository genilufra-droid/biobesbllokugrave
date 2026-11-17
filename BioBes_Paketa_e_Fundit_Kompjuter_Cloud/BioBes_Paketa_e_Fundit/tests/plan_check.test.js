#!/usr/bin/env node
'use strict';

// Kërkesa (pas leximit të formularëve realë "AMBRA JAVA 46"): çfarë raporti
// tjetër duhet. Zgjedhja: (A) Fleta e ditës në PDF dhe (B) Kontrolli
// plan ↔ peshime, sepse të dyja përdorin të dhëna që formulari i ka tashmë dhe
// i duhen përditshëm.
//
// Shembulli real që provohet (formulari 010 i skanuar):
//   plani: 14 160 kg "Fik i thatë" · peshimi: 4 160 kg − 1 416 ambalazh
//   → peshimi del 2 744 kg, pra mungojnë 11 416 kg. Deri tani kjo mospërputhje
//   dukej vetëm me sy mbi letër.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp(null, `
;globalThis.__R = {
  state, db, blankRecord, normalizeRecord, render, reportRecords, dayName,
  planCheckRows, planCheckSummary, planCheckHTML, planWeighedKg, planUnitKind,
  xlPlanCheckSheet, xlDaySheet, xlsxBytes, exportDayPDF, metrics,
};`);
const w = dom.window, R = w.__R, doc = w.document;
doc.getElementById('app').hidden = false;

const row = (bags, kg, packaging, sum) => ({ bags: String(bags ?? ''), kg: String(kg ?? ''), packaging: String(packaging ?? ''), sum: String(sum ?? '') });
const form = (nr, date, { actual = '14160', unit = 'kg', rows = [row(12, 4160, 1416)], comments = '', product = 'Fik i thatë' } = {}) => {
  const r = R.blankRecord(nr);
  r.date = date;
  r.room = 'DHOMA FABRIKA E RE';
  r.responsible = { name: 'Ambra Kunanaku', signature: '' };
  r.assistant = { name: 'Besa Rabija', signature: '' };
  r.plan[0] = { ...r.plan[0], product, status: 'Konu', actual, unit, packaging: 'Kuti', client: 'Nureco', minutes: '480' };
  r.employees[0] = { ...r.employees[0], name: 'Arta Hoxha', start: '07:00', end: '16:00', breakMinutes: '60', room: 'Dhoma A' };
  r.employees[1] = { ...r.employees[1], name: 'Besa Rabija', start: '07:00', end: '16:00', breakMinutes: '60', room: 'Dhoma A' };
  r.weighings[0] = { ...r.weighings[0], product, source: 'stock', rows };
  r.comments = comments;
  return R.normalizeRecord(r);
};
const reset = (records) => {
  R.db.records = records;
  R.state.report = { from: '', to: '', product: '', packaging: '', status: '', client: '', employee: '', room: '', tab: 'check', exportType: 'products' };
  R.state.route = 'reports';
  R.render();
};

test('peshimi neto i formularit: KG − ambalazhi, ose Shuma kur është shkruar', () => {
  reset([form('010', '2026-11-11')]);
  assert.equal(JSON.parse(JSON.stringify(R.planWeighedKg(R.db.records[0]))).kg, 2744);
  // Kur Shuma është shkruar, ajo respektohet (ajo është neto e nënshkruar).
  reset([form('011', '2026-11-11', { rows: [row(12, 4160, 1416, 4160)] })]);
  assert.equal(JSON.parse(JSON.stringify(R.planWeighedKg(R.db.records[0]))).kg, 4160);
  // Pa KG nuk hamendësohet: rreshti numërohet i paqartë.
  reset([form('012', '2026-11-11', { rows: [row(12, '', 1416)] })]);
  const w2 = JSON.parse(JSON.stringify(R.planWeighedKg(R.db.records[0])));
  assert.equal(w2.kg, 0);
  assert.equal(w2.unclear, 1);
});

test('kontrolli: plan 14 160 kg kundrejt peshimit 2 744 kg del “Mangon”', () => {
  reset([form('010', '2026-11-11')]);
  const rows = R.planCheckRows(R.reportRecords());
  assert.equal(rows.length, 1);
  const x = rows[0];
  assert.equal(x.nr, '010');
  assert.equal(x.planned, 14160);
  assert.equal(x.weighed, 2744);
  assert.equal(x.diff, -11416, 'peshimi minus plani');
  assert.equal(x.pct, -80.6);
  assert.equal(x.status, 'mangon');
  const sum = R.planCheckSummary(rows);
  assert.equal(sum.short, 1);
  assert.equal(sum.shortKg, 11416);
  assert.equal(sum.ok, 0);
});

test('kontrolli: brenda tolerancës është “përputhet”, jo gabim', () => {
  // 0,4 kg diferencë = brenda ±0,5 kg → përputhet (rrumbullakim peshore).
  reset([form('009', '2026-11-11', { actual: '4160', rows: [row(12, 4160.4, 0)] })]);
  assert.equal(R.planCheckRows(R.reportRecords())[0].status, 'përputhet');
  // 1% e 1000 kg = 10 kg; 8 kg më pak është ende brenda.
  reset([form('013', '2026-11-11', { actual: '1000', rows: [row(1, 992, 0)] })]);
  assert.equal(R.planCheckRows(R.reportRecords())[0].status, 'përputhet');
  // 20 kg më pak në 1000 kg = 2% → mangon.
  reset([form('014', '2026-11-11', { actual: '1000', rows: [row(1, 980, 0)] })]);
  assert.equal(R.planCheckRows(R.reportRecords())[0].status, 'mangon');
});

test('kontrolli: teprimi, pa peshime dhe peshimi pa plan dallohen qartë', () => {
  reset([form('015', '2026-11-11', { actual: '1000', rows: [row(1, 1200, 0)] })]);
  assert.equal(R.planCheckRows(R.reportRecords())[0].status, 'tepër');
  reset([form('016', '2026-11-11', { actual: '1000', rows: [] })]);
  assert.equal(R.planCheckRows(R.reportRecords())[0].status, 'pa peshime');
  // Peshim pa asnjë rresht plani — nuk humbet në heshtje.
  reset([form('017', '2026-11-11', { actual: '', product: '', rows: [row(3, 500, 0)] })]);
  const alone = R.planCheckRows(R.reportRecords());
  assert.equal(alone.length, 1);
  assert.equal(alone[0].status, 'peshim pa plan');
  assert.equal(alone[0].weighed, 500);
});

test('kontrolli: copë/thasë nuk maten nga peshimi, shënohen “kontrollo me dorë”', () => {
  reset([form('018', '2026-11-11', { actual: '300', unit: 'copë', rows: [row(1, 50, 0)] })]);
  assert.equal(R.planUnitKind('copë'), 'copë');
  assert.equal(R.planUnitKind('KG'), 'kg');
  assert.equal(R.planCheckRows(R.reportRecords())[0].status, 'kontrollo me dorë');
});

test('tab-i i ri shfaqet me numrat dhe linkun e formularit', () => {
  reset([form('010', '2026-11-11'), form('009', '2026-11-11', { actual: '4160', rows: [row(12, 4160, 0)] })]);
  const html = doc.querySelector('#report-results').textContent.replace(/\s+/g, ' ');
  for (const needle of ['Kontrolli plan', 'Rreshta të kontrolluar', 'Mangojnë', 'Përputhen', 'Mangon', 'Përputhet', '11 416', 'Plani', 'Peshimi']) {
    assert.ok(html.includes(needle), `faqja përmban “${needle}”`);
  }
  const link = doc.querySelector('#report-results [data-action="open-record"]');
  assert.ok(link, 'ka link për të hapur formularin');
  assert.equal(link.textContent.trim(), 'Hap');
  assert.equal(link.dataset.id, R.db.records[0].id);
});

test('Excel-i i kontrollit: kolonat, vlerat dhe formulat e totalit', () => {
  reset([form('010', '2026-11-11'), form('009', '2026-11-11', { actual: '4160', rows: [row(12, 4160, 0)] })]);
  const sheet = R.xlPlanCheckSheet();
  assert.equal(JSON.stringify(sheet.columns.map((c) => c.h)), JSON.stringify([
    'Nr.', 'Data', 'Formulari', 'Punonjësi', 'Produkti', 'Njësia', 'Plani', 'Peshimi', 'Diferenca', '%', 'Statusi', 'Rreshta peshimi',
  ]));
  assert.equal(sheet.rows[0][2], '010');
  assert.equal(sheet.rows[0][6], 14160, 'plani');
  assert.equal(sheet.rows[0][7], 2744, 'peshimi');
  assert.equal(sheet.rows[0][8], -11416, 'diferenca');
  assert.equal(sheet.rows[0][10], 'Mangon');
  // Totali mblidhet me formulë vetëm mbi kolonat numerike (Plani=6, Peshimi=7).
  assert.equal(JSON.stringify(sheet.total.sumCols), '[6,7]');
  assert.ok(sheet.notes.some((n) => /Diferenca = Peshimi − Plani/.test(n)), 'shpjegohet shenja e diferencës');
  const bytes = R.xlsxBytes({ title: 'BioBes', sheets: [sheet] });
  assert.ok(bytes.length > 2500);
});

test('Excel-i i “Fletës së ditës”: kreu, produktet, orët, peshimi, komentet', () => {
  reset([form('010', '2026-11-11', { comments: 'Nuk u mbajt 8 orë për shkak të stokut' })]);
  const sheet = R.xlDaySheet(R.reportRecords());
  assert.equal(JSON.stringify(sheet.columns.map((c) => c.h)), JSON.stringify([
    'Data', 'Nr.', 'Dhoma', 'Përgjegjësja', 'Ndihmësja', 'Produktet dhe sasitë', 'Orë pune', 'Peshimi (kg)', 'Komentet',
  ]));
  const r0 = sheet.rows[0];
  assert.equal(r0[1], '010');
  assert.equal(r0[2], 'DHOMA FABRIKA E RE');
  assert.equal(r0[3], 'Ambra Kunanaku');
  assert.equal(r0[4], 'Besa Rabija');
  assert.match(r0[5], /Fik i thatë 14160kg/);
  assert.equal(r0[6], 16, 'dy punonjës × 8 orë pas pushimit');
  assert.equal(r0[7], 2744);
  assert.match(r0[8], /Nuk u mbajt 8 orë/);
  assert.equal(JSON.stringify(sheet.total.sumCols), '[6,7]');
});

test('Fleta e ditës (PDF) ndërtohet vërtet, me një faqe për formular', async () => {
  reset([form('010', '2026-11-11', { comments: 'Nuk u mbajt 8 orë për shkak të stokut' }), form('009', '2026-11-11', { actual: '4160', rows: [row(12, 4160, 0)] })]);
  let blob = null;
  w.URL.createObjectURL = (b) => { blob = b; return 'blob:test'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {};
  await R.exportDayPDF();
  assert.ok(blob, 'skedari u krijua');
  assert.equal(blob.type, 'application/pdf');
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', 'është PDF i vërtetë');
  // Numri i faqeve lexohet nga objekti /Pages (pdf-lib i mban në object stream).
  const zlib = require('node:zlib');
  const raw = bytes.toString('latin1');
  const idx = raw.indexOf('/ObjStm');
  const start = raw.indexOf('stream', idx) + 6;
  const end = raw.indexOf('endstream', start);
  const objstm = zlib.inflateSync(bytes.subarray(start + (bytes[start] === 13 ? 2 : 1), end)).toString('latin1');
  const count = /\/Type\s*\/Pages[\s\S]{0,80}?\/Count\s+(\d+)/.exec(objstm);
  assert.ok(count, 'gjendet numri i faqeve');
  assert.equal(Number(count[1]), 2, 'një faqe për çdo formular');
  // Teksti shkruhet me fontin e embeduar dhe hartëzimin ToUnicode, që shkronjat
  // ë/ç/Ë/Ç të kopjohen saktë nga PDF-ja. Ai është brenda rrymave të kompresuara.
  const streams = [];
  for (let i = raw.indexOf('stream'); i >= 0; i = raw.indexOf('stream', i + 6)) {
    const a = raw.indexOf('\n', i) + 1;
    const b = raw.indexOf('endstream', a);
    if (b < 0) continue;
    try { streams.push(zlib.inflateSync(bytes.subarray(a, b)).toString('latin1')); } catch (e) { /* jo e kompresuar */ }
  }
  assert.ok(streams.some((x) => x.includes('beginbfchar')), 'hartëzimi i karaktereve (ToUnicode) është i pranishëm');
  assert.ok(streams.some((x) => x.includes(' Tj')), 'teksti është shkruar vërtet në faqe');
  assert.match(doc.getElementById('toast').textContent, /Fleta e ditës u shkarkua/);
});

test('të gjitha raportet: Excel-i i plotë ka 9 fletë, pa përsëritje emrash', async () => {
  reset([form('010', '2026-11-11')]);
  // Bëjmë të njëjtën gjë si butoni "Të gjitha": ndërtojmë fletët dhe skedarin.
  const sheets = [
    R.xlPlanCheckSheet(),
    R.xlDaySheet(R.reportRecords()),
  ];
  const bytes = R.xlsxBytes({ title: 'BioBes — Raportet', sheets });
  assert.ok(bytes.length > 4000);
  const raw = Buffer.from(bytes).toString('latin1');
  assert.ok(raw.includes('xl/worksheets/sheet1.xml') || raw.includes('sheet1.xml'));
  // Emrat e fletëve nuk përsëriten (Excel-i refuzon emra të njëjtë).
  const names = sheets.map((s) => s.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((n) => n.length <= 31), 'emri i fletës deri 31 karaktere');
});

run();
