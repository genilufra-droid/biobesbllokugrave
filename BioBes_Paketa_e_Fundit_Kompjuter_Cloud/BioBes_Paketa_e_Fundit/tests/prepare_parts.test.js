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
const { prepareGeminiParts } = dom.window.__BIOBES__;
const { File, AbortController } = dom.window;
const PDFLib = dom.window.PDFLib;

test('rejects a PDF with more than six pages', async () => {
  const pdf = await PDFLib.PDFDocument.create();
  for (let i = 0; i < 7; i += 1) pdf.addPage();
  const bytes = await pdf.save();
  const file = new File([bytes], 'seven-pages.pdf', { type: 'application/pdf' });
  await assert.rejects(
    () => prepareGeminiParts([file], new AbortController().signal, new Map()),
    /më shumë se 6 faqe/,
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
