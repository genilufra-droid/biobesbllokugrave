#!/usr/bin/env node
'use strict';

// Tests for batchResultsFromWorkbook against the real approved template.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp, root } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const { batchResultsFromWorkbook } = dom.window.__BIOBES__;
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
  assert.equal(results[0].record.employees.length, 8);
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

run();
