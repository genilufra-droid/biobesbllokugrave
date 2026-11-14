#!/usr/bin/env node
'use strict';

// Skanim real: 7 formularë BioBes në 14 faqe (PDF me imazhe, i rrotulluar).
// Testi ruan sjelljen e leximit mbi të dhënat e vërteta të nxjerra faqe për faqe
// (leximet/BioBes_7_formulare_14_faqe.lexim.json) dhe mbulon dy defekte që u
// gjetën me atë rast:
//   1. totali i shtypur (SH) nuk verifikohej kur qelizat vinin si objekte {value,…};
//   2. data “19.11.2026” ishte lexuar gabim nga presja e shtypur “/” (është 9.11.2026).
// Leximi real me emrat e letrës mbahet jashtë repo-s (shih .gitignore).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const api = loadApp().window.__BIOBES__;
const plain = (x) => JSON.parse(JSON.stringify(x));

// Fixture i anonimizuar: e njëjta strukturë (14 faqe, 7 formularë, të njëjtat
// rreshta/totale), pa të dhëna personale — kështu testi xhiron në çdo klon.
const file = path.resolve(__dirname, 'fixtures/scan_14_pages.json');
const scan = JSON.parse(fs.readFileSync(file, 'utf8'));
const read = () => api.aiReadings(scan, {
  fileName: scan.document.file_name,
  pageCount: scan.document.page_count,
});

test('14 faqe → 7 formularë, secili me faqen PARA dhe PAS', () => {
  const result = read();
  assert.equal(result.document.pageCount, 14);
  assert.equal(result.document.formCount, 7);
  assert.deepEqual(
    plain(result.forms.map((x) => x.reading.pages)),
    [
      { front: 1, back: 2 }, { front: 3, back: 4 }, { front: 5, back: 6 },
      { front: 7, back: 8 }, { front: 9, back: 10 }, { front: 11, back: 12 },
      { front: 13, back: 14 },
    ]
  );
  assert.deepEqual(
    plain(result.forms.map((x) => x.reading.header.nr.value)),
    ['001', '002', '003', '004', '005', '006', '007']
  );
});

test('numri dhe data nuk kalohen nga një formular te tjetri', () => {
  const forms = plain(read().forms.map((x) => x.reading.header));
  assert.deepEqual(forms.map((h) => h.date.value), [
    '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09',
    null, '2026-11-11', '2026-11-12',
  ]);
  // Formulari 005 ka datë të dëmtuar: mbetet null, nuk huazohet nga 004/006.
  assert.equal(forms[4].date.needsReview, true);
});

test('totali i shtypur verifikohet edhe kur qelizat janë objekte', () => {
  const { reading } = read().forms[0];
  assert.ok(!reading.warnings.some((w) => w.includes('totali i shtypur i kilogramëve')),
    '1476 duhet të verifikohet nga 20 rreshtat');
  assert.equal(reading.printedTotals.peshimi1.kg.value, '1476');
  assert.equal(reading.weights.peshimi1.filter((r) => r.table === 1).length, 20);
});

test('mospërputhja e totalit raportohet, vlera nuk ndryshohet', () => {
  // Formulari 004: rreshtat japin 1571 kg, letra shkruan 1569.
  const { record, reading } = read().forms[3];
  assert.equal(reading.printedTotals.peshimi1.kg.value, '1569');
  assert.ok(reading.warnings.some((w) => w.includes('1569') && w.includes('1571')));
  // Vlera e lexuar mbetet ashtu siç është, pa u “korrigjuar” nga totali.
  assert.equal(record.weighings[0].rows[4].kg, '174');
});

test('faqja PAS mban vetëm komentet, peshimi 4 nuk përzihet me 1', () => {
  const { reading } = read().forms[2];
  assert.equal(reading.comments[0].page, 6);
  assert.equal(reading.comments[0].formArea, 'KOMENTE');
  // Teksti mbahet siç është lexuar, por kërkon kontroll për fjalët e paqarta.
  assert.ok(reading.comments[0].value.length > 0);
  assert.equal(reading.comments[0].needsReview, true);
  assert.equal(reading.weights.peshimi1.length, 0);
});

test('çdo formular mban faqen, zonën dhe sigurinë për secilën vlerë', () => {
  const forms = read().forms;
  for (const form of forms) {
    const { reading } = form;
    assert.ok(reading.header.nr.page >= 1 && reading.header.nr.page <= 14);
    for (const row of reading.weights.peshimi1.concat(reading.weights.peshimi2, reading.weights.peshimi3)) {
      assert.ok(row.kg.page === 1 || row.kg.page === 7);
      assert.match(row.kg.formArea, /PESHIMI \d · faqja (PARA|PAS) · rreshti \d+ · Kg/);
    }
  }
});

test('të gjithë formularët e skanimit real kërkojnë kontroll', () => {
  for (const form of read().forms) {
    assert.equal(form.reading.needsReview, true, `formulari ${form.reading.formNumber}`);
    assert.ok(form.reading.uncertain.length > 0);
  }
});

run();
