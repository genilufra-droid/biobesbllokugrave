#!/usr/bin/env node
'use strict';

// Tests for batchResultsFromWorkbook against the real approved template.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp, root } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const { batchResultsFromWorkbook, generateFormWorkbook, blankRecord } = dom.window.__BIOBES__;
const XLSX = dom.window.XLSX;

function approvedWorkbook() {
  return XLSX.read(fs.readFileSync(path.join(root, 'Modele_Bosh/Model_25_Rreshta_2_Faqe.xlsx')), { type: 'buffer', cellStyles: true });
}

test('reads the approved template into one record', () => {
  const results = batchResultsFromWorkbook(approvedWorkbook());
  assert.ok(Array.isArray(results), 'must return an array');
  assert.equal(results.length, 1);
  assert.ok(results[0].record, 'must return a record');
  assert.equal(results[0].record.plan.length, 3);
  assert.equal(results[0].record.employees.length, 12);
  assert.equal(results[0].record.weighings.length, 6);
});

test('warns when the approved template has no number or date', () => {
  const results = batchResultsFromWorkbook(approvedWorkbook());
  assert.ok(results[0].warnings.some((w) => /Numri nuk ishte i plotësuar/.test(w)));
  assert.ok(results[0].warnings.some((w) => /Data nuk u lexua/.test(w)));
});

test('reads multiple approved sheets as separate forms', () => {
  const source = approvedWorkbook();
  const sheet = source.Sheets.FORMULARI;
  const multi = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(multi, sheet, 'FORMULARI');
  XLSX.utils.book_append_sheet(multi, sheet, 'FORMULARI_2');
  const results = batchResultsFromWorkbook(multi);
  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.record && r.record.plan.length === 3));
});

test('returns null for a workbook that is not the approved model', () => {
  const other = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['Hello', 'World']]);
  XLSX.utils.book_append_sheet(other, sheet, 'Sheet1');
  assert.equal(batchResultsFromWorkbook(other), null);
});

test('rejects more than ten approved forms', () => {
  const source = approvedWorkbook();
  const sheet = source.Sheets.FORMULARI;
  const many = XLSX.utils.book_new();
  for (let i = 0; i < 11; i += 1) XLSX.utils.book_append_sheet(many, sheet, `FORMULARI_${i + 1}`);
  assert.throws(() => batchResultsFromWorkbook(many), /më shumë se 10 formularë/);
});

test('writes twelve staff rows into the shifted grid of the approved model', async () => {
  const record = blankRecord('007');
  record.date = '2026-11-09';
  record.employees = record.employees.map((e, i) => ({
    ...e, name: `Punonjësi ${i + 1}`, start: '08:00', end: '16:00', comment: `Koment ${i + 1}`, signature: `Firma ${i + 1}`,
  }));
  record.weighings[0].product = 'Mollë';
  record.weighings[0].rows[0] = { row: 1, bags: '10', kg: '100', packaging: '2', sum: '102' };
  record.weighings[3].product = 'Kajsi';
  record.weighings[3].rows[24] = { row: 25, bags: '3', kg: '30', packaging: '0', sum: '30' };
  record.comments = 'Komente për ditën';
  const { bytes } = await generateFormWorkbook([{ nr: '007', record }]);
  const out = XLSX.read(bytes, { type: 'buffer' });
  const sh = out.Sheets.NR_007;
  assert.equal(sh['!ref'], 'A1:AC106', 'the sheet grew by the four inserted rows');
  for (let i = 0; i < 12; i += 1) {
    const row = 12 + i;
    assert.equal(sh[`C${row}`].v, `Punonjësi ${i + 1}`, `employee ${i + 1} name`);
    assert.equal(sh[`P${row}`].v, `Koment ${i + 1}`, `employee ${i + 1} comment`);
    assert.match(sh[`N${row}`].f, new RegExp(`IF\\(OR\\(J${row}=`), `employee ${i + 1} hours formula points at its own row`);
  }
  assert.deepEqual(
    Object.keys(sh).filter((key) => /^C\d+$/.test(key) && typeof sh[key].v === 'string' && sh[key].v.startsWith('Punonjësi ')).length,
    12, 'no staff row is written outside the twelve-row block');
  assert.equal(sh.A24.v, '3.   PESHAT', 'the weighing caption moved down with the grid');
  assert.equal(sh.A51.v, 25, 'front page still ends with weighing row 25');
  assert.match(sh.H52.f, /SUM\(H27:H51\)/, 'front totals cover the shifted grid');
  assert.match(sh.B86.f, /SUM\(B61:B85\)/, 'back totals cover the shifted grid');
  assert.equal(sh.A85.v, 25, 'back page ends with weighing row 25');
  assert.match(String(sh.E55.v ?? sh.E55.f ?? ''), /007|E2/, 'back page mirrors the form number');
  const area = out.Workbook.Names.filter((n) => n.Name === '_xlnm.Print_Area');
  assert.match(area[0].Ref, /\$A\$1:\$AC\$53/, 'front print area');
  assert.match(area[0].Ref, /\$A\$55:\$AC\$106/, 'back print area');
});

test('a written form is read back with the same twelve employees', async () => {
  const record = blankRecord('011');
  record.date = '2026-11-10';
  record.employees = record.employees.map((e, i) => ({ ...e, name: `Emri ${i + 1}`, start: '07:30', end: '15:30' }));
  const { bytes } = await generateFormWorkbook([{ nr: '011', record }]);
  const found = dom.window.__BIOBES__.readApprovedExcel(XLSX.read(bytes, { type: 'buffer' }));
  assert.ok(found, 'the written workbook must look like the approved model');
  assert.equal(found.record.employees.length, 12);
  assert.deepEqual(found.record.employees.map((e) => e.name), record.employees.map((e) => e.name));
  assert.deepEqual(found.record.employees.map((e) => e.start), record.employees.map((e) => e.start));
});

run();