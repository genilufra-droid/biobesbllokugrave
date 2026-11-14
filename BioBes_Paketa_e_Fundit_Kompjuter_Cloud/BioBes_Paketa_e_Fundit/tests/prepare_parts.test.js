#!/usr/bin/env node
'use strict';

// Tests for prepareGeminiParts: PDF page limit, Excel text extraction, and
// inline-data preparation using the real production function.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp, root } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const { prepareGeminiParts, batchSplitPdf } = dom.window.__BIOBES__;
const { File, AbortController } = dom.window;
const PDFLib = dom.window.PDFLib;

// Mbi 6 faqe nuk hidhet më gabim: PDF-ja e gjatë ndahet para se të dërgohet
// (shih large_pdf.test.js). prepareGeminiParts merr vetëm pjesë deri në 6 faqe.
test('prepares every page of a PDF up to the per-call limit', async () => {
  const pdf = await PDFLib.PDFDocument.create();
  for (let i = 0; i < 6; i += 1) pdf.addPage();
  const bytes = await pdf.save();
  const file = new File([bytes], 'six-pages.pdf', { type: 'application/pdf' });
  const parts = await prepareGeminiParts([file], new AbortController().signal, new Map());
  assert.ok(parts.some((p) => p.inlineData && p.inlineData.mimeType === 'application/pdf'));
});

test('a corrupt PDF reports a clear error', async () => {
  const file = new File([new Uint8Array([1, 2, 3, 4])], 'broken.pdf', { type: 'application/pdf' });
  await assert.rejects(
    () => prepareGeminiParts([file], new AbortController().signal, new Map()),
    /nuk u hap/,
  );
});

test('prepares a one-page PDF as inline data', async () => {
  const pdf = await PDFLib.PDFDocument.create();
  pdf.addPage();
  const bytes = await pdf.save();
  const file = new File([bytes], 'one-page.pdf', { type: 'application/pdf' });
  const parts = await prepareGeminiParts([file], new AbortController().signal, new Map());
  assert.ok(parts.some((p) => p.inlineData && p.inlineData.mimeType === 'application/pdf'));
  assert.ok(parts.some((p) => p.text && /one-page\.pdf/.test(p.text)));
});

test('splits a 14-page scanned PDF into seven two-page forms', async () => {
  const pdf = await PDFLib.PDFDocument.create();
  for (let i = 0; i < 14; i += 1) pdf.addPage();
  const file = new File([await pdf.save()], 'seven-forms.pdf', { type: 'application/pdf' });
  const groups = await batchSplitPdf(file, 2, new AbortController().signal);
  assert.equal(groups.length, 7);
  assert.deepEqual(Array.from(groups, (x) => x.pageOffset), [0, 2, 4, 6, 8, 10, 12]);
  assert.deepEqual(Array.from(groups, (x) => x.formNumber), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(groups.every((x) => x.pageCount === 14 && x.file.name.endsWith('.pdf')));
});

test('prepares the approved Excel as text, without inline media', async () => {
  const bytes = fs.readFileSync(path.join(root, 'Modele_Bosh/Model_25_Rreshta_2_Faqe.xlsx'));
  const file = new File([bytes], 'approved.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const parts = await prepareGeminiParts([file], new AbortController().signal, new Map());
  assert.ok(parts.some((p) => p.text && p.text.startsWith('SKEDARI EXCEL:')));
  assert.ok(parts.some((p) => p.text && /FLETA 1/.test(p.text)));
});

test('appends the extraction instruction at the end', async () => {
  const pdf = await PDFLib.PDFDocument.create();
  pdf.addPage();
  const file = new File([await pdf.save()], 'page.pdf', { type: 'application/pdf' });
  const parts = await prepareGeminiParts([file], new AbortController().signal, new Map());
  const last = parts[parts.length - 1];
  assert.match(last.text, /Extract the fields from these files/);
});

run();
