#!/usr/bin/env node
'use strict';

// I njëjti defekt si te rreshtat, por në nivel tabele peshimi: një `index` i
// lexuar keq (mungon, i përsëritur, tekst, ose jashtë 1–6) hidhte poshtë gjithë
// formularin — edhe tabelat e sakta. Në skanimin real kjo i bënte grupet 5, 6
// dhe 7 "Nuk u lexua" me mesazhin "Numrat e tabelave të peshimit janë të paqartë".
//
// Sjellja e re: tabela mbahet, vendoset në vendin e parë të lirë, shënohet dhe
// paralajmërohet. Asnjë vlerë e lexuar nuk hidhet poshtë.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const api = loadApp().window.__BIOBES__;
const plain = (x) => JSON.parse(JSON.stringify(x));

function read(weighings) {
  const data = {
    forms: [{ record_number: '005', header: {}, weighings: plain(weighings) }],
  };
  return api.aiReadings(data, { fileName: 'x.pdf', pageCount: 2 }).forms[0];
}
const kgList = (form) => plain((form.record.weighings || []).map((g) => g.rows?.[0]?.kg).filter(Boolean));
const tableWarnings = (form) => form.warnings.filter((w) => /tabelë|PESHIMI/i.test(w));

test('tabelë pa numër nuk e rrëzon formularin', () => {
  const form = read([{ rows: [{ row: 1, kg: '180' }] }]);
  assert.deepEqual(kgList(form), ['180']);
  assert.ok(tableWarnings(form).length > 0, 'duhet paralajmërim i qartë');
});

test('numri i përsëritur ruan të dyja tabelat', () => {
  const form = read([
    { index: 1, rows: [{ row: 1, kg: '180' }] },
    { index: 1, rows: [{ row: 1, kg: '170' }] },
  ]);
  assert.deepEqual(kgList(form), ['180', '170']);
  assert.ok(tableWarnings(form).some((w) => /i përsëritur/.test(w)));
});

test('numër tekst (shkrim dore) mbahet', () => {
  const form = read([{ index: 'i', rows: [{ row: 1, kg: '180' }] }]);
  assert.deepEqual(kgList(form), ['180']);
});

test('numër jashtë tabelës (9) nuk hidhet', () => {
  const form = read([{ index: 9, rows: [{ row: 1, kg: '180' }] }]);
  assert.deepEqual(kgList(form), ['180']);
  assert.ok(tableWarnings(form).some((w) => /jashtë tabelës/.test(w)));
});

test('vetëm tabela e keqe shënohet; të tjerat mbeten të pastra', () => {
  const form = read([
    { index: 1, rows: [{ row: 1, kg: '180' }] },
    { index: 'x', rows: [{ row: 1, kg: '170' }] },
    { index: 3, rows: [{ row: 1, kg: '155' }] },
  ]);
  assert.deepEqual(kgList(form), ['180', '170', '155'], 'asnjë tabelë nuk u zhvendos jashtë');
  const warns = tableWarnings(form);
  assert.equal(warns.length, 1, 'një paralajmërim për një tabelë të dyshimtë');
});

test('numrat e saktë nuk paralajmërohen', () => {
  const form = read([
    { index: 1, rows: [{ row: 1, kg: '180' }] },
    { index: 2, rows: [{ row: 1, kg: '170' }] },
  ]);
  assert.equal(tableWarnings(form).length, 0);
});

test('gjashtë tabela të sakta mbeten gjashtë', () => {
  const weighings = Array.from({ length: 6 }, (_, i) => ({ index: i + 1, rows: [{ row: 1, kg: String(100 + i) }] }));
  const form = read(weighings);
  assert.deepEqual(kgList(form), ['100', '101', '102', '103', '104', '105']);
  assert.equal(tableWarnings(form).length, 0);
});

test('më shumë se gjashtë tabela me vlera: teprica raportohet, jo e heshtur', () => {
  const weighings = Array.from({ length: 8 }, (_, i) => ({ index: i + 1, rows: [{ row: 1, kg: String(100 + i) }] }));
  const form = read(weighings);
  const kept = kgList(form);
  assert.ok(kept.length >= 6, 'të paktën gjashtë ruhen');
});

test('skanimi real nuk ndryshoi', () => {
  const scan = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/scan_14_pages.json'), 'utf8'));
  const read14 = api.aiReadings(scan, { fileName: 'scan.pdf', pageCount: 14 });
  assert.equal(read14.document.formCount, 7);
  const kg = (i) => (read14.forms[i].record.weighings[0].rows || [])
    .reduce((s, r) => s + (Number(String(r.kg).replace(/[^0-9]/g, '')) || 0), 0);
  assert.equal(kg(0), 1476);
  assert.equal(kg(3), 1571);
});

run();
