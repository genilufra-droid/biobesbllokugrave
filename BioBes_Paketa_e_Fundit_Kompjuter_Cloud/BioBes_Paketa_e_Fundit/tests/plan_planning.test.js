#!/usr/bin/env node
'use strict';

// Kërkesa: "po aplikoj, po me tabe më mirë" — tab-e të reja te Raportet.
// U shtuan dy: **Prodhimi kundrejt planit** dhe **Komentet dhe arsyet**.
//
// Ajo që mbrohet këtu:
//  1. plani kundrejt prodhimit llogaritet vetëm brenda të njëjtës njësi
//     (kg me kg, copë me copë — kurrë të përziera);
//  2. statusi “Realizuar” është brenda 99,5–100,5%, jo barazi e saktë;
//  3. përmbledhja javore mbledh të njëjtën njësi në të njëjtën javë;
//  4. komentet mblidhen nga të tria vendet (dita, punonjësi, produkti);
//  5. arsyeja njihet vetëm kur fjala kyçe ndodhet në tekst, dhe komenti
//     mbetet fjalë për fjalë — pa hamendje nga AI;
//  6. të dy tab-et kanë linkun “Hap” dhe dalin edhe në Excel;
//  7. tab-et e vjetra nuk u prishën dhe emrat e fletëve nuk përsëriten.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp(null, `
;globalThis.__T = {
  state, db, blankRecord, normalizeRecord, render, reportRecords,
  planDayRows, planWeekRows, planSummary, planReportHTML, planStatus,
  commentRows, commentSummary, commentReason, commentsReportHTML,
  xlPlanSheet, xlCommentsSheet, xlsxBytes, COMMENT_REASONS,
};`);
const w = dom.window, T = w.__T, doc = w.document;
doc.getElementById('app').hidden = false;

const mk = (nr, date, plan, extra = {}) => {
  const r = T.blankRecord(nr);
  r.date = date;
  r.room = extra.room || 'Dhoma A';
  r.responsible = { name: extra.responsible || 'Ambra K', signature: '' };
  r.plan = plan.map((p) => ({ ...r.plan[0], ...p }));
  r.comments = extra.dayComment || '';
  return T.normalizeRecord(r);
};
const reset = (records, tab = 'plan') => {
  T.db.records = records;
  T.state.report = { from: '', to: '', product: '', packaging: '', status: '', client: '', employee: '', room: '', tab, exportType: 'products' };
  T.state.route = 'reports';
  T.render();
};
const set = () => [
  mk('010', '2026-11-09', [{ product: 'Fik i thatë', unit: 'kg', planned: '16000', actual: '14160', packaging: 'Kuti' }], { dayComment: 'Nuk u mbajt 8 orë për shkak të stokut' }),
  mk('011', '2026-11-10', [{ product: 'Fik i thatë', unit: 'kg', planned: '14000', actual: '14200', packaging: 'Kuti', comment: 'dendësi e mirë' }]),
  mk('012', '2026-11-11', [{ product: 'Kumbulla', unit: 'copë', planned: '5000', actual: '4000', packaging: 'Kuti' }], { dayComment: 'Mungesa e dy punëtorëve, pritje e gjatë' }),
];

test('tab-et e raporteve: gjashtë tab-e, dy të reja', () => {
  reset(set());
  const tabs = [...doc.querySelectorAll('[data-action="report-tab"]')].map((b) => b.textContent.trim());
  assert.equal(JSON.stringify(tabs), JSON.stringify(['Përmbledhje', 'Kohëzgjatja e proceseve', 'Prodhimi kundrejt planit', 'Gjurmimi i punonjësit', 'Kontrolli plan ↔ peshime', 'Komentet dhe arsyet']));
  // Tab-i i ri hapet dhe shfaq të dy kartat.
  const text = doc.querySelector('#report-results').textContent.replace(/\s+/g, ' ');
  assert.match(text, /Prodhimi kundrejt planit/);
  assert.match(text, /Përmbledhje javore/);
  // Tab-et e vjetra vazhdojnë të punojnë.
  doc.querySelector('[data-action="report-tab"][data-tab="summary"]').click();
  assert.match(doc.querySelector('#report-results').textContent, /Prodhimi sipas produktit/);
});

test('plani kundrejt prodhimit jep përqindjen e saktë për rresht', () => {
  reset(set());
  const rows = T.planDayRows(T.reportRecords());
  assert.equal(rows.length, 3);
  const a = rows.find((x) => x.nr === '010');
  assert.equal(a.planned, 16000);
  assert.equal(a.produced, 14160);
  assert.equal(a.diff, -1840);
  assert.equal(a.pct, 88.5);
  assert.equal(T.planStatus(a).label, 'Nën plan');
  const b = rows.find((x) => x.nr === '011');
  assert.equal(b.pct, 101.4);
  assert.equal(T.planStatus(b).label, 'Mbi plan');
  // Rreshtat vijnë sipas datës.
  assert.equal(JSON.stringify(rows.map((x) => x.nr)), '["010","011","012"]');
});

test('kg dhe copë nuk mblidhen kurrë bashkë', () => {
  reset(set());
  const day = T.planDayRows(T.reportRecords());
  const kg = day.filter((x) => x.unit === 'kg');
  assert.equal(kg.length, 2, 'dy rreshta kg, një copë — jo tre të përzier');
  const week = T.planWeekRows(day);
  assert.equal(JSON.stringify(week.map((x) => x.unit).sort()), '["copë","kg"]');
  const kgWeek = week.find((x) => x.unit === 'kg');
  assert.equal(kgWeek.planned, 30000, 'vetëm kg: 16 000 + 14 000');
  assert.equal(kgWeek.produced, 28360, 'vetëm kg: 14 160 + 14 200');
  assert.equal(kgWeek.count, 2);
  const copWeek = week.find((x) => x.unit === 'copë');
  assert.equal(copWeek.planned, 5000);
  assert.equal(copWeek.produced, 4000);
});

test('“Realizuar” është brenda 99,5–100,5%, jo barazi e saktë', () => {
  reset(set());
  assert.equal(T.planStatus({ planned: 1000, produced: 1000, pct: 100 }).label, 'Realizuar');
  assert.equal(T.planStatus({ planned: 1000, produced: 997, pct: 99.7 }).label, 'Realizuar');
  assert.equal(T.planStatus({ planned: 1000, produced: 1004, pct: 100.4 }).label, 'Realizuar');
  assert.equal(T.planStatus({ planned: 1000, produced: 900, pct: 90 }).label, 'Nën plan');
  assert.equal(T.planStatus({ planned: 1000, produced: 1200, pct: 120 }).label, 'Mbi plan');
  assert.equal(T.planStatus({ planned: null, produced: 10, pct: null }).label, 'Pa plan');
  assert.equal(T.planStatus({ planned: 10, produced: null, pct: null }).label, 'Pa prodhim');
});

test('rreshti me plan pa prodhim shënohet veç, jo si 0% i fshehtë', () => {
  reset([mk('020', '2026-11-09', [{ product: 'Fik', unit: 'kg', planned: '1000', actual: '', packaging: 'Kuti' }])]);
  const x = T.planDayRows(T.reportRecords())[0];
  assert.equal(x.planned, 1000);
  assert.equal(x.produced, null, 'pa sasi të prodhuar nuk hamendësohet zero');
  assert.equal(T.planStatus(x).label, 'Pa prodhim');
  const sum = T.planSummary([x]);
  assert.equal(sum.noProduction, 1);
});

test('komentet mblidhen nga dita, punonjësi dhe produkti', () => {
  const r = T.blankRecord('030');
  r.date = '2026-11-10';
  r.comments = 'Nuk u mbajt 8 orë për shkak të stokut';
  r.plan[0] = { ...r.plan[0], product: 'Fik', comment: 'dendësia e mirë' };
  r.employees[0] = { ...r.employees[0], name: 'Arta Hoxha', comment: 'pritje e gjatë te peshorja' };
  reset([T.normalizeRecord(r)], 'comments');
  const rows = T.commentRows(T.reportRecords());
  assert.equal(rows.length, 3, 'tri komente nga tri vende');
  assert.equal(JSON.stringify(rows.map((x) => x.kind).sort()), '["Dita","Produkti","Punonjësi"]');
  const reasons = T.commentSummary(rows).map((x) => x.label);
  assert.ok(reasons.includes('Stok / lëndë e parë'));
  assert.ok(reasons.includes('Cilësi / dendësi'));
  assert.ok(reasons.includes('Pritje / vonesë'));
});

test('arsyeja njihet vetëm nga fjala kyçe; komenti mbetet fjalë për fjalë', () => {
  assert.equal(T.commentReason('Nuk u mbajt 8 orë për shkak të stokut')[0], 'Stok / lëndë e parë');
  assert.ok(T.commentReason('Mungesa e dy punëtorëve').includes('Mungesë punëtorësh'));
  assert.ok(T.commentReason('Riparim i peshores').includes('Riparim / defekt'));
  assert.equal(T.commentReason('dendësi e mirë')[0], 'Shënim pozitiv', '“mirë” nuk është arsye e ditës së dobët');
  assert.equal(T.commentReason('Shënim pa fjalë kyçe')[0], 'Tjetër');
  // Komenti del i plotë në faqe, i pa shkurtuar në burim.
  reset(set(), 'comments');
  const text = doc.querySelector('#report-results').textContent;
  assert.match(text, /Nuk u mbajt 8 orë për shkak të stokut/);
  assert.match(text, /Mungesa e dy punëtorëve, pritje e gjatë/);
});

test('tab-i i komenteve numëron sa herë dhe sa formularë', () => {
  reset(set(), 'comments');
  const text = doc.querySelector('#report-results').textContent.replace(/\s+/g, ' ');
  assert.match(text, /Komentet dhe arsyet/);
  assert.match(text, /Sa herë/);
  assert.match(text, /Stok \/ lëndë e parë/);
  const sum = T.commentSummary(T.commentRows(T.reportRecords()));
  const stok = sum.find((x) => x.label === 'Stok / lëndë e parë');
  assert.equal(stok.count, 1);
  assert.equal(stok.records.size, 1);
  assert.match(stok.examples[0].text, /stokut/);
});

test('të dy tab-et kanë linkun “Hap” për formularin', () => {
  reset(set(), 'plan');
  const planLinks = [...doc.querySelectorAll('#report-results [data-action="open-record"]')];
  assert.ok(planLinks.length >= 3, 'një link për çdo rresht plani');
  assert.equal(planLinks[0].dataset.id, T.db.records[0].id);
  reset(set(), 'comments');
  const commentLinks = [...doc.querySelectorAll('#report-results [data-action="open-record"]')];
  assert.ok(commentLinks.length >= 1, 'link te formulari edhe te komentet');
});

test('Excel-i i planit: kolonat, totalet me formulë dhe blloku javor', () => {
  reset(set());
  const sheet = T.xlPlanSheet();
  assert.equal(JSON.stringify(sheet.columns.map((c) => c.h)), JSON.stringify([
    'Nr.', 'Data', 'Java', 'Formulari', 'Punonjësi', 'Produkti', 'Njësia', 'Plani', 'Prodhimi', 'Diferenca', '%', 'Statusi',
  ]));
  assert.equal(sheet.rows[0][3], '010');
  assert.equal(sheet.rows[0][7], 16000);
  assert.equal(sheet.rows[0][8], 14160);
  assert.equal(sheet.rows[0][9], -1840);
  assert.equal(sheet.rows[0][11], 'Nën plan');
  assert.equal(JSON.stringify(sheet.total.sumCols), '[7,8]');
  assert.equal(sheet.extra[0].title, 'PËRMBLEDHJE JAVORE');
  assert.equal(sheet.extra[0].rows.length, 2, 'një rresht për javë e njësi');
  const bytes = T.xlsxBytes({ title: 'BioBes', sheets: [sheet] });
  assert.ok(bytes.length > 3000);
});

test('Excel-i i komenteve: komenti i plotë dhe përmbledhja sipas arsyes', () => {
  reset(set(), 'comments');
  const sheet = T.xlCommentsSheet();
  assert.equal(sheet.name, 'Komentet');
  const row = sheet.rows.find((r) => String(r[6]).includes('stokut'));
  assert.ok(row, 'komenti i stokut është në fletë');
  assert.equal(row[4], 'Dita');
  assert.match(row[7], /Stok/);
  const sum = sheet.extra[0];
  assert.equal(sum.title, 'PËRMBLEDHJE SIPAS ARSYES');
  assert.ok(sum.rows.some((r) => r[0] === 'Stok / lëndë e parë' && r[1] === 1));
  const bytes = T.xlsxBytes({ title: 'BioBes', sheets: [sheet] });
  assert.ok(bytes.length > 3000);
});

test('të gjitha fletët: emra të veçantë dhe brenda 31 karaktereve', () => {
  reset(set());
  const sheets = [T.xlPlanSheet(), T.xlCommentsSheet()];
  const names = sheets.map((s) => s.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((n) => n.length <= 31));
  const bytes = T.xlsxBytes({ title: 'BioBes — Raportet', sheets });
  assert.ok(bytes.length > 4000);
});

run();
