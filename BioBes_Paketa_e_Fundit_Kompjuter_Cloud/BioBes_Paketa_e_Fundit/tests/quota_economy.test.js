#!/usr/bin/env node
'use strict';

// Kursimi i kuotës: dy formularë (4 faqe) në një kërkesë. Pa këtë, 7 formularë
// harxhojnë 7 kërkesa; me të, 4. Bashkohen vetëm feta vazhduese të të njëjtit
// PDF — grupet e pavarura, të lexuarat dhe Excel-i nuk preken.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const api = dom.window.__BIOBES__;
const w = dom.window;

// Fetë e një PDF-i 14 faqesh, siç i prodhon batchSplitPdf.
function slice(from, to, source = 'AMBRA JAVA 46.pdf', size = 1000) {
  const file = new w.File(['x'], `${source.replace(/\.pdf$/i, '')}_faqet_${from}-${to}.pdf`, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return {
    id: `g${from}`,
    files: [file],
    originalFiles: [{ name: source, size }],
    privateFiles: null,
    status: 'pending',
    error: '',
    results: null,
    raw: null,
    workbook: null,
    sources: [],
    note: `Nga ${source}: faqet ${from}-${to}.`,
    pageOffset: from - 1,
    formNumber: (from - 1) / 2 + 1,
    pageCount: 14,
  };
}

test('shtatë formularë bëhen katër kërkesa, jo shtatë', () => {
  const groups = [slice(1, 2), slice(3, 4), slice(5, 6), slice(7, 8), slice(9, 10), slice(11, 12), slice(13, 14)];
  const merged = api.batchEconomyGroups(groups);
  assert.equal(merged.length, 4, '4 kërkesa për 7 formularë');
  assert.equal(merged.map((g) => g.files.length).join(','), '2,2,2,1');
  const pages = merged.map((g) => g.files.length * 2);
  assert.ok(pages.every((n) => n <= api.ECONOMY_PAGES), 'asnjë kërkesë mbi 4 faqe');
  assert.equal(merged[0].formNumber, 1, 'numri i formularit të parë ruhet');
  assert.equal(merged[0].pageOffset, 0, 'zhvendosja e faqeve ruhet');
  assert.match(merged[0].note, /Kursim kuote: 4 faqe \(2 formularë\)/);
});

test('grupet e pavarura nuk bashkohen me njëri-tjetrin', () => {
  const a = slice(1, 2, 'skanim A.pdf');
  const b = slice(1, 2, 'skanim B.pdf');
  const merged = api.batchEconomyGroups([a, b]);
  assert.equal(merged.length, 2, 'dy PDF të ndryshëm mbeten dy kërkesa');
});

test('feta jo vazhduese nuk bashkohen', () => {
  const merged = api.batchEconomyGroups([slice(1, 2), slice(5, 6)]);
  assert.equal(merged.length, 2, 'faqja 3-4 mungon: pa bashkim');
});

test('grupi i lexuar mbetet i paprekur', () => {
  const done = { ...slice(1, 2), status: 'ready', results: [{ record: api.blankRecord('001') }] };
  const merged = api.batchEconomyGroups([done, slice(3, 4)]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].status, 'ready');
  assert.equal(merged[0].results.length, 1, 'rezultati i lexuar nuk humbet');
});

test('Excel-i dhe fotot nuk bashkohen', () => {
  const xlsx = new w.File(['x'], 'model.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const excel = { id: 'e1', files: [xlsx], originalFiles: [xlsx], status: 'pending', results: null, workbook: null, privateFiles: null, sources: [] };
  const photo = new w.File(['x'], 'foto.jpg', { type: 'image/jpeg' });
  const photoGroup = { id: 'p1', files: [photo], originalFiles: [photo], status: 'pending', results: null, workbook: null, privateFiles: null, sources: [] };
  const merged = api.batchEconomyGroups([excel, photoGroup]);
  assert.equal(merged.length, 2);
});

test('origjinalet private nuk bashkohen (ata nuk dërgohen te Gemini)', () => {
  const a = { ...slice(1, 2), privateFiles: [{ name: 'orig.pdf' }] };
  const merged = api.batchEconomyGroups([a, slice(3, 4)]);
  assert.equal(merged.length, 2);
});

run();
