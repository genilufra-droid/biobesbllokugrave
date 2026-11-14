#!/usr/bin/env node
'use strict';

// Rruga pa Gemini: “Kontrollo pa Gemini”.
//
// Prova me skanimin real dha 0 nga 10 qeliza të sakta me OCR lokal (shih
// AUDITIM 7.14), prandaj kjo rrugë NUK shpiket asnjë lexim. Ajo hap faqen e
// kontrollit me formularë bosh, të emërtuar sipas faqeve, që përdoruesi t’i
// plotësojë vetë — pa kuotë, pa rrjet, pa dërguar asgjë.
//
// Këto teste mbrojnë tri gjëra: (1) nuk shpiket asnjë vlerë që nuk është
// lexuar; (2) numri/data merren vetëm kur janë të qarta në emrin e skedarit;
// (3) formularët bosh hyjnë në kontroll dhe ruhen si çdo tjetër.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const api = loadApp(null, `
;globalThis.__M = {
  batchManualReview, batchManualItem, batchManualNumber, batchManualDate, batchManualPages,
  batchManualBlocks, contiguousPages,
  batchState, blankRecord, normalizeRecord, weightsHTML, weighCheckIssues,
};`).window.__M;

const fakeGroup = (name, pageCount = null) => ({
  id: 'g-' + name,
  files: [{ name, type: 'application/pdf', size: 1000, ...(pageCount ? { pageCount } : {}) }],
  originalFiles: [], privateFiles: null, status: 'pending', error: '',
  results: null, raw: null, workbook: null, sources: [],
  ...(pageCount ? { pageCount } : {}),
});

const counts = (rows) => (rows || []).filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== '')).length;

test('formulari bosh nuk shpiket: asnjë vlerë, asnjë peshim', () => {
  const item = api.batchManualItem(fakeGroup('x.pdf'), 0, 1);
  assert.equal(item.record.weighings.length, 6);
  for (const group of item.record.weighings) assert.equal(counts(group.rows), 0, 'asnjë rresht i shpikur');
  assert.equal(item.record.comments, '');
  assert.equal(item.record.plan.every((p) => !p.product), true);
  assert.equal(item.record.employees.every((e) => !e.name), true);
});

test('numri merret nga emri i skedarit, pa e sajuar', () => {
  assert.equal(api.batchManualNumber('x', '06-12.11.2026_compressed_faqet_9-10.pdf'), '');
  assert.equal(api.batchManualNumber('x', 'BioBes_041.pdf'), '041');
  // “formulari 7” njihet si numër; numri i zhveshur nuk hamendësohet.
  assert.equal(api.batchManualNumber('x', 'skanim_formulari_7.pdf'), '7');
  assert.equal(api.batchManualNumber('x', 'skanim_7.pdf'), '');
  assert.equal(api.batchManualNumber('x', 'pa-numra.pdf'), '');
});

test('data merret vetëm kur është e qartë në emrin e skedarit', () => {
  // Skedari real: “06-12.11.2026” është interval, jo datë; e vetmja datë e qartë
  // është 12.11.2026. Nuk hamendësohet dita e fillimit.
  assert.equal(api.batchManualDate('06-12.11.2026_compressed.pdf'), '2026-11-12');
  assert.equal(api.batchManualDate('06-12.11.26_compressed.pdf'), '2026-11-12');
  assert.equal(api.batchManualDate('skanim 2026-11-09.pdf'), '2026-11-09');
  assert.equal(api.batchManualDate('pagina.pdf'), '');
});

test('numri i faqeve lexohet edhe kur grupi vjen i ndarë', () => {
  // `faqet_3-4` janë DY faqe (4 − 3 + 1). Më parë lexohej 4 — ai ishte defekti
  // që bënte 7 grupe të japin 28 formularë dhe të bllokohej kufiri 10.
  assert.equal(api.batchManualPages(fakeGroup('a_faqet_3-4.pdf')), 2);
  assert.equal(api.batchManualPages(fakeGroup('a_faqet_9-10.pdf')), 2);
  assert.equal(api.batchManualPages(fakeGroup('a_faqet_9.pdf')), 1);
  // Numri i faqeve të skedarit ka përparësi; `pageCount` i grupit është i PDF-së mëmë.
  assert.equal(api.batchManualPages(fakeGroup('a.pdf', 14)), 14);
  assert.equal(api.batchManualPages(fakeGroup('a.pdf')), 1);
});

test('një PDF 14-faqe jep 7 formularë bosh, me faqet e tyre', () => {
  const g = fakeGroup('BioBes_7_formulare_14_faqe.pdf', 14);
  api.batchState.groups = [g];
  const items = [];
  for (let i = 0; i < 7; i += 1) items.push(api.batchManualItem(g, i, 7));
  assert.equal(items.length, 7);
  assert.match(items[0].warnings[0], /faqja 1–2 e 14/);
  assert.match(items[6].warnings[0], /faqja 13–14 e 14/);
});

test('kontrolli pa Gemini nuk bën asnjë kërkesë rrjeti', async () => {
  const dom = loadApp(null, `;globalThis.__M = { batchManualReview, batchState };`);
  let calls = 0;
  dom.window.fetch = async () => { calls += 1; throw new Error('nuk duhet të thirret'); };
  const M = dom.window.__M;
  M.batchState.groups = [fakeGroup('BioBes_7_formulare_14_faqe.pdf', 14)];
  M.batchState.busy = false;
  await M.batchManualReview();
  assert.equal(calls, 0, 'asnjë kërkesë rrjeti');
  assert.equal(M.batchState.items.length, 7);
  assert.equal(M.batchState.phase, 'review');
});

test('formularët bosh hyjnë në kontroll me aritmetikë të gatshme', () => {
  const item = api.batchManualItem(fakeGroup('BioBes_041.pdf'), 0, 1);
  // Përdoruesi shkruan KG dhe Ambalazhin; kontrolli i formularit duhet t’i gjejë.
  item.record.weighings[0].rows[0] = { bags: '6', kg: '180', packaging: '15', sum: '160' };
  item.record.weighings[0].printedTotal = { bags: '', kg: '180', packaging: '15', sum: '160' };
  const issues = api.weighCheckIssues(item.record.weighings[0].rows, item.record.weighings[0].printedTotal, 'Peshimi 1');
  assert.ok(issues.some((w) => /180 − Ambalazhi 15 = 165/.test(w)), issues.join(' | '));
});

test('paralajmërimet thonë qartë se formulari u krijua bosh dhe pse', () => {
  const item = api.batchManualItem(fakeGroup('pagina.pdf'), 0, 1);
  const text = item.warnings.join(' | ');
  assert.match(text, /u krijua BOSH për t’u plotësuar me dorë/);
  assert.match(text, /0\/10 saktë në dorëshkrim/);
  assert.match(text, /Numri i formularit nuk u gjet/);
});


// --- Regresioni i skanimit 46-faqe (46 faqe → 23 blloqe, jo 28 formularë) ---
// Defekti: emri `…_faqet_13-14.pdf` lexohej si 14 faqe, prandaj 7 grupe × 14/2
// jepnin 28 formularë dhe kufiri 10 bllokonte gjithçka me “Ndaji në grupe”.

const scanGroups = (total, original = { name: 'ZARUA JAVA 46.pdf', size: 1000 }) => {
  const out = [];
  for (let a = 1; a < total; a += 2) {
    out.push({
      id: 'g' + a,
      files: [{ name: `ZARUA JAVA_${total}_faqet_${a}-${a + 1}.pdf`, type: 'application/pdf', size: 1000, pageCount: 2, pageOffset: a - 1 }],
      originalFiles: [{ ...original }],
      privateFiles: null, status: 'pending', error: '', results: null, raw: null, workbook: null, sources: [],
      pageOffset: a - 1,
    });
  }
  return out;
};

test('faqet e grupit nuk merren nga numri i fundit i emrit', () => {
  assert.equal(api.batchManualPages(fakeGroup('a_faqet_13-14.pdf')), 2);
  assert.equal(api.batchManualPages(fakeGroup('a_faqet_1-2.pdf')), 2);
  assert.equal(api.batchManualPages(fakeGroup('a_faqet_45-46.pdf')), 2);
  // Një skedar i vetëm = 1 faqe, edhe pa numra në emër.
  assert.equal(api.batchManualPages(fakeGroup('skanim.pdf')), 1);
});

test('46 faqe nga i njëjti PDF bashkohen në një bllok, jo 23 grupe', () => {
  const groups = scanGroups(46);
  const blocks = api.batchManualBlocks(groups);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].pages, 46);
});

test('46 faqe japin 23 formularë bosh, pa u bllokuar nga kufiri 10', async () => {
  const dom = loadApp(null, `;globalThis.__M = { batchManualReview, batchState };`);
  dom.window.fetch = async () => { throw new Error('nuk duhet të thirret'); };
  const M = dom.window.__M;
  M.batchState.groups = scanGroups(46);
  M.batchState.busy = false;
  await M.batchManualReview();
  assert.equal(M.batchState.error, '', 'nuk duhet të bllokohet');
  assert.equal(M.batchState.items.length, 23);
  assert.match(M.batchState.items[0].warnings[0], /faqja 1–2 e 46/);
  assert.match(M.batchState.items[22].warnings[0], /faqja 45–46 e 46/);
});

test('7 formularë / 14 faqe mbeten 7 (pa bashkim të gabuar)', async () => {
  const dom = loadApp(null, `;globalThis.__M = { batchManualReview, batchState };`);
  const M = dom.window.__M;
  // Skanim i një PDF-je 14-faqe të vetme, i ndarë në 7 grupe.
  M.batchState.groups = scanGroups(14, { name: 'BioBes_7_formulare_14_faqe.pdf', size: 2000 });
  M.batchState.busy = false;
  await M.batchManualReview();
  assert.equal(M.batchState.items.length, 7);
  assert.match(M.batchState.items[6].warnings[0], /faqja 13–14 e 14/);
});

test('grupe të pavarura nuk bashkohen ndërmjet tyre', () => {
  const a = { id: 'a', files: [{ name: 'dita1_faqet_1-2.pdf', pageCount: 2 }], originalFiles: [{ name: 'dita1.pdf', size: 10 }] };
  const b = { id: 'b', files: [{ name: 'dita2_faqet_1-2.pdf', pageCount: 2 }], originalFiles: [{ name: 'dita2.pdf', size: 20 }] };
  assert.equal(api.batchManualBlocks([a, b]).length, 2);
});

run();
