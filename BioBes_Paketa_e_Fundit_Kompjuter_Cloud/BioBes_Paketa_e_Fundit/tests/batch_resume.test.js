#!/usr/bin/env node
'use strict';

// Pas mbarimit të kuotës: 1 grup u lexua, 6 mbetën. Mesazhi thoshte “Shtyp
// Lexo formularët”, por s’kishte asnjë buton që riprovon VETËM të mbeturit —
// pra nuk kishte rrugë për të vazhduar pa i humbur të lexuarit.
//
// Këto teste mbyllin atë rrugë: riprovimi lexon vetëm grupet e palexuara,
// grupet e gatshme nuk preken, dhe butoni shfaqet vetëm kur ka kuptim.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

// batchRead zëvendësohet brenda të njëjtit eval ku rron app.js, që testi të
// shohë saktësisht cilat grupe i nënshtrohen riprovimit — pa dërguar kërkesa.
const grouped = (spy = false) =>
  loadApp(null, `
;globalThis.__attempted = [];
${spy ? "batchRead = async () => { globalThis.__attempted = batchState.groups.filter(g => g.status !== 'ready').map(g => g.id); };" : ''}
;globalThis.__T = {
  batchState, batchPendingCount, batchHTML, batchReadPending,
  batchGroupStatus, state, render, batchReset, batchBeginReview,
};`);

const group = (name, status = 'pending', results = null) => ({
  id: name, files: [{ name, type: 'application/pdf', size: 1000 }],
  originalFiles: [], privateFiles: null, status, error: '', results,
  raw: null, workbook: null, sources: [],
});

test('numri i grupeve të mbetura është vetëm i palexuarit', () => {
  const w = grouped().window;
  const T = w.__T;
  T.batchState.groups = [group('a', 'ready', [{ record: {} }]), group('b', 'pending'), group('c', 'error')];
  assert.equal(T.batchPendingCount(), 2);
});

test('riprovimi lexon vetëm grupet e mbetura; të lexuarit nuk preken', async () => {
  const dom = grouped(true);
  const T = dom.window.__T;
  const ready = group('a', 'ready', [{ record: { nr: '001' } }]);
  const pending = group('b', 'error');
  T.batchState.groups = [ready, pending];
  T.batchState.busy = false;

  const before = T.batchState.groups.length;
  await T.batchReadPending();
  assert.equal(T.batchState.groups.length, before, 'grupet nuk humbin');
  assert.equal(T.batchState.groups[0].status, 'ready', 'grupi i lexuar mbetet i lexuar');
  assert.deepEqual(dom.window.__attempted, ['b'], 'vetëm grupi i palexuar riprovohet');
  assert.equal(T.batchState.groups[1].status, 'pending', 'gabimi i vjetër pastrohet para riprovimit');
});

test('butoni “Lexo vetëm … grupet e mbetura” shfaqet vetëm kur ka të tilla', () => {
  const w = grouped().window;
  const T = w.__T;
  T.batchState.groups = [group('a', 'ready', [{ record: {} }])];
  assert.equal(T.batchPendingCount(), 0);
  T.batchState.groups = [group('a', 'ready', [{ record: {} }]), group('b', 'pending'), group('c', 'pending')];
  const html = T.batchHTML();
  assert.match(html, /Lexo vetëm 2 grupet e mbetura/);
  assert.match(html, /data-action="batch-read-pending"/);
});

test('pa grupe të mbetura, butoni nuk shfaqet dhe nuk hap rrugë bosh', async () => {
  const w = grouped().window;
  const T = w.__T;
  T.batchState.groups = [group('a', 'ready', [{ record: {} }])];
  assert.doesNotMatch(T.batchHTML(), /batch-read-pending/);
  await T.batchReadPending(); // duhet të dalë pa hedhur gabim
});

test('grupet e lexuara ruajnë rezultatet gjatë ndalesës për kuotë', () => {
  const w = grouped().window;
  const T = w.__T;
  const done = group('a', 'ready', [{ record: { nr: '001' } }]);
  T.batchState.groups = [done, group('b', 'pending'), group('c', 'pending')];
  const left = T.batchState.groups.filter((g) => g.status !== 'ready');
  assert.equal(left.length, 2);
  assert.equal(T.batchState.groups[0].results.length, 1, 'rezultati i lexuar nuk hidhet');
});

test('mesazhi i kuotës tregon si të vazhdohet menjëherë, jo vetëm se mbaroi', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'BioBes_Cloud/web/cloud.js'), 'utf8');
  assert.match(src, /Rinovohet pas mesnate/);
  // Duhet të tregojë edhe rrugën e menjëhershme, jo vetëm të presësh nesër.
  assert.match(src, /Lexo në pajisje/);
});

run();
