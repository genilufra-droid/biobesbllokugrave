#!/usr/bin/env node
'use strict';

// Një rresht i vetëm me numër të lexuar keq nuk guxon të hedhë poshtë gjithë
// formularin. Në skanimin real (7 formularë / 14 faqe) grupet 5 dhe 6 nuk u
// lexuan fare, sepse `aiReadBlock` hidhte gabim kur numri i rreshtit mungonte
// ose përsëritej — duke humbur edhe vlerat e sakta të rreshtave të tjerë.
//
// Sjellja e re: rreshti mbahet, vendoset sipas rendit, shënohet needsReview dhe
// paralajmërohet. Asnjë vlerë e lexuar nuk hidhet poshtë.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const api = loadApp().window.__BIOBES__;
const plain = (x) => JSON.parse(JSON.stringify(x));

function read(rows) {
  const data = {
    forms: [{
      record_number: '006',
      header: {},
      weighings: [{ index: 1, rows: plain(rows) }],
    }],
  };
  const result = api.aiReadings(data, { fileName: 'x.pdf', pageCount: 2 });
  assert.equal(result.forms.length, 1);
  return result.forms[0];
}
const rowsOf = (form) => form.reading.weights.peshimi1;
const hasWarning = (form, re) => form.warnings.some((w) => re.test(w));

test('rreshtat pa numër nuk e rrëzojnë formularin', () => {
  const form = read([{ kg: '22' }, { kg: '21' }]);
  assert.deepEqual(plain(rowsOf(form).map((r) => r.kg.value)), ['22', '21']);
  assert.ok(hasWarning(form, /pa numër rreshti/i), 'duhet paralajmërim i qartë');
});

test('numri i përsëritur nuk i hedh poshtë vlerat', () => {
  const form = read([{ row: 1, kg: '22' }, { row: 1, kg: '21' }]);
  const rows = rowsOf(form);
  assert.equal(rows.length, 2, 'dy rreshta, jo një');
  assert.deepEqual(plain(rows.map((r) => r.kg.value)), ['22', '21']);
  assert.deepEqual(plain(rows.map((r) => r.row)), [1, 2], 'rreshti i dytë u vendos pas të parit');
  assert.ok(hasWarning(form, /i përsëritur/i));
});

test('numër jo-numerik (shkrim dore) mbahet si rresht për kontroll', () => {
  const form = read([{ row: 'i', kg: '22' }]);
  assert.equal(rowsOf(form).length, 1);
  assert.equal(rowsOf(form)[0].kg.value, '22');
});

test('vetëm rreshtat e dyshimtë shënohen për kontroll', () => {
  const form = read([{ row: 1, kg: '22' }, { row: 1, kg: '21' }, { row: 3, kg: '18' }]);
  const rows = rowsOf(form);
  assert.equal(rows[0].kg.needsReview, false, 'rreshti 1 ishte i qartë');
  assert.equal(rows[1].kg.needsReview, true, 'rreshti i përsëritur shënohet');
  assert.equal(rows[2].kg.needsReview, false, 'rreshti 3 ishte i qartë');
});

test('numrat e saktë nuk shënohen dhe nuk paralajmërohen', () => {
  const form = read([{ row: 1, kg: '22' }, { row: 2, kg: '21' }]);
  assert.deepEqual(plain(rowsOf(form).map((r) => r.row)), [1, 2]);
  assert.ok(rowsOf(form).every((r) => r.kg.needsReview === false));
  assert.ok(!hasWarning(form, /numri i rreshtit/i), 'asnjë paralajmërim i rremë');
});

test('asnjë vlerë nuk humbet kur numri mungon', () => {
  const form = read([
    { kg: '180', bags: '6', packaging: '' },
    { kg: '170', bags: '6', packaging: '' },
    { kg: '155', bags: '5', packaging: '' },
  ]);
  const rows = rowsOf(form);
  assert.deepEqual(plain(rows.map((r) => r.kg.value)), ['180', '170', '155']);
  assert.deepEqual(plain(rows.map((r) => r.nrThas.value)), ['6', '6', '5']);
});

test('skanimi real mbetet i njëjtë (asnjë regres)', () => {
  const scan = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/scan_14_pages.json'), 'utf8'));
  const before = api.aiReadings(JSON.parse(JSON.stringify(scan)), { fileName: 'scan.pdf', pageCount: 14 });
  assert.equal(before.forms.length, 7);
  // 001 kishte 20 rreshta, 004 kishte 10 — numrat e shtypur ishin të qartë atje.
  const one = before.forms[0].record.weighings[0].rows.filter((r) => r.kg);
  assert.equal(one.length, 20);
  const four = before.forms[3].record.weighings[0].rows.filter((r) => r.kg);
  assert.equal(four.length, 10);
  assert.ok(one.every((r) => r.kg), 'vlerat nuk u zhvendosën');
});

run();
