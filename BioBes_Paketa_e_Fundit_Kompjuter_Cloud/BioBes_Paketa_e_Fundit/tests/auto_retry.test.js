#!/usr/bin/env node
'use strict';

// Një gabim i përkohshëm i Gemini-t (503 UNAVAILABLE) nuk duhet t'i mbetet
// përdoruesit si "Nuk u lexua": grupi provohet edhe një herë, vetëm, para se
// leximi të mbyllet. Kuota e shpenzuar nuk riprovohet — ajo nuk rregullohet
// duke pritur.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

// batchGemini zëvendësohet brenda të njëjtit eval ku rron app.js, që testi të
// shohë saktësisht sa herë provohet secili grup — pa dërguar asnjë kërkesë.
function harness(behaviour) {
  const dom = loadApp(null, `
;globalThis.__calls = {};
;batchGemini = async (g) => {
  const key = g.files[0].name;
  globalThis.__calls[key] = (globalThis.__calls[key] || 0) + 1;
  return globalThis.__behaviour(key, globalThis.__calls[key]);
};
;batchPaint = () => {}; batchSetBusy = () => {}; batchError = (m) => { globalThis.__error = m; };
;batchBeginReview = () => { globalThis.__reviewed = true; }; announceReading = () => {};
;globalThis.__behaviour = ${behaviour};
;globalThis.__T = { batchState, batchRead, batchReset };
`);
  const w = dom.window;
  w.__calls = {};
  // Kutia e konfirmimit vizatohet me faqen e leximit; këtu futet drejtpërdrejt,
  // që batchRead të mos ndalet te kontrolli i anonimitetit.
  w.document.body.insertAdjacentHTML('beforeend', '<input id="batch-anonymous" type="checkbox" checked>');
  return w;
}

const group = (name, status = 'pending') => ({
  id: name,
  files: [{ name, type: 'application/pdf', size: 1000 }],
  originalFiles: [],
  privateFiles: null,
  status,
  error: '',
  results: null,
  raw: null,
  workbook: null,
  sources: [],
});

const okResult = [{ record: { nr: '001' }, warnings: [], reading: null }];

test('a transient 503 is retried and the group ends up read', async () => {
  const w = harness(`(key, n) => { if (n === 1) { const e = new Error('Gemini nuk e përfundoi kërkesën. (UNAVAILABLE #503)'); throw e; } return ${JSON.stringify(okResult)}; }`);
  const T = w.__T;
  T.batchState.groups = [group('a.pdf'), group('b.pdf')];
  T.batchState.busy = false;
  await T.batchRead();
  assert.deepEqual(w.__calls, { 'a.pdf': 2, 'b.pdf': 2 }, 'secila grup u provua dy herë');
  assert.deepEqual(T.batchState.groups.map((g) => g.status), ['ready', 'ready']);
  assert.equal(w.__reviewed, true, 'leximi mbyllet normalisht, pa gabim');
});

test('a group that succeeds first time is not retried', async () => {
  const w = harness(`() => ${JSON.stringify(okResult)}`);
  const T = w.__T;
  T.batchState.groups = [group('a.pdf')];
  T.batchState.busy = false;
  await T.batchRead();
  assert.deepEqual(w.__calls, { 'a.pdf': 1 });
  assert.equal(T.batchState.groups[0].status, 'ready');
});

test('a persistent failure is reported once, not retried forever', async () => {
  const w = harness(`() => { throw new Error('Gemini nuk e përfundoi kërkesën. (UNAVAILABLE #503)'); }`);
  const T = w.__T;
  T.batchState.groups = [group('a.pdf')];
  T.batchState.busy = false;
  await T.batchRead();
  assert.deepEqual(w.__calls, { 'a.pdf': 2 }, 'një provë + një riprovim, pastaj ndal');
  assert.equal(T.batchState.groups[0].status, 'error');
  assert.match(T.batchState.groups[0].error, /503/);
});

test('spent quota is not retried: waiting does not refill it', async () => {
  const w = harness(`() => { const e = new Error('Kuota e leximit me Gemini për sot është shpenzuar (RESOURCE_EXHAUSTED).'); e.quota = true; throw e; }`);
  const T = w.__T;
  T.batchState.groups = [group('a.pdf'), group('b.pdf'), group('c.pdf')];
  T.batchState.busy = false;
  await T.batchRead();
  // Asnjë grup nuk provohet dy herë: kuota nuk rregullohet duke pritur.
  assert.deepEqual(w.__calls, { 'a.pdf': 1, 'b.pdf': 1, 'c.pdf': 1 });
  assert.deepEqual(T.batchState.groups.map((g) => g.status), ['error', 'error', 'error']);
  assert.match(w.__error || '', /Kuota/);
  assert.match(w.__error || '', /Lexo vetëm/);
});

test('the retry does not touch groups that were already read', async () => {
  const w = harness(`() => { throw new Error('503'); }`);
  const T = w.__T;
  const ready = group('done.pdf', 'ready');
  ready.results = okResult;
  T.batchState.groups = [ready, group('a.pdf')];
  T.batchState.busy = false;
  await T.batchRead();
  assert.equal(w.__calls['done.pdf'], undefined, 'grupi i lexuar nuk riprovohet');
  assert.equal(T.batchState.groups[0].status, 'ready');
  assert.equal(T.batchState.groups[0].results, okResult, 'rezultati i vjetër mbetet i paprekur');
});

run();
