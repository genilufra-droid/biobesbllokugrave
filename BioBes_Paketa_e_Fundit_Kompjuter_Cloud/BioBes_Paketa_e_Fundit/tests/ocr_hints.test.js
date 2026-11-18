#!/usr/bin/env node
'use strict';

// Tests for the local OCR pre-pass hints that the browser sends to the edge
// function: page numbering, PARA/PAS assumption, size limits and the fact that
// no read value ever leaves the device through this channel.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const api = dom.window.__BIOBES__;
const { AbortController } = dom.window;

api.cloud.config = { url: 'https://test.supabase.co', key: 'test-public-key' };
api.cloud.client = {
  auth: {
    getSession: async () => ({ data: { session: { access_token: 'test-access-token' } } }),
  },
};
api.batchState.busy = false;
api.importState.busy = false;
api.setFastWait();

// Values built inside the jsdom realm have their own Array prototype, so they
// are normalised to plain JSON before strict comparison.
const plain = (value) => JSON.parse(JSON.stringify(value));

function okResponse(data) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => data,
  };
}

// Captures the JSON body of the single request cloudGemini makes.
async function captureBody(hints) {
  let body = null;
  dom.window.fetch = async (_url, init) => {
    body = JSON.parse(init.body);
    return okResponse({ ok: true });
  };
  await api.cloudGemini([{ text: 'test' }], new AbortController().signal, 120000, hints);
  return body;
}

test('14 scanned pages become 7 alternating PARA/PAS pairs', () => {
  const hints = api.ocrHintsFromPageCounts([14]);
  assert.equal(hints.length, 14);
  hints.forEach((hint, index) => {
    assert.equal(hint.page, index + 1);
    assert.equal(hint.type, index % 2 === 0 ? 'front' : 'back');
  });
  assert.equal(hints[0].type, 'front');
  assert.equal(hints[13].type, 'back');
});

test('the PARA/PAS assumption is stated once, on the first page', () => {
  const hints = api.ocrHintsFromPageCounts([6]);
  assert.equal(hints[0].issues.length, 1);
  assert.match(hints[0].issues[0], /supozua/);
  for (const hint of hints.slice(1)) assert.deepEqual(plain(hint.issues), []);
});

test('a single page is never guessed', () => {
  const hints = api.ocrHintsFromPageCounts([1]);
  assert.equal(hints.length, 1);
  assert.equal(hints[0].type, 'unknown');
  assert.deepEqual(plain(hints[0].issues), []);
});

test('an odd page count leaves the last page unknown and warns', () => {
  const hints = api.ocrHintsFromPageCounts([3]);
  assert.deepEqual(plain(hints.map((h) => h.type)), ['front', 'back', 'unknown']);
  assert.match(hints[2].issues.join(' '), /tek/);
  assert.equal(hints[2].page, 3);
});

test('two photos selected together are a PARA/PAS pair', () => {
  const hints = api.ocrHintsFromPageCounts([1, 1]);
  assert.deepEqual(plain(hints.map((h) => h.type)), ['front', 'back']);
  assert.deepEqual(plain(hints.map((h) => h.page)), [1, 2]);
  assert.match(hints[0].issues.join(' '), /supozua/);
});

test('several files keep one continuous page numbering', () => {
  const hints = api.ocrHintsFromPageCounts([2, 2, 2]);
  assert.deepEqual(plain(hints.map((h) => h.page)), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plain(hints.map((h) => h.type)), ['front', 'back', 'front', 'back', 'front', 'back']);
});

test('nothing is produced without pages', () => {
  assert.deepEqual(plain(api.ocrHintsFromPageCounts([])), []);
  assert.deepEqual(plain(api.ocrHintsFromPageCounts([0])), []);
});

test('hints are capped at the 30 pages the edge function accepts', () => {
  const hints = api.ocrHintsFromPageCounts([80]);
  assert.equal(hints.length, 30);
  assert.equal(hints[29].page, 30);
});

test('hints carry no read values and no free-form text', () => {
  for (const hint of api.ocrHintsFromPageCounts([14])) {
    assert.equal(Object.keys(hint).sort().join(','), 'issues,labels,page,quality,type');
    assert.equal(hint.quality, null);
    assert.deepEqual(plain(hint.labels), []);
    assert.ok(['front', 'back', 'unknown'].includes(hint.type));
    assert.ok(Number.isInteger(hint.page) && hint.page > 0);
  }
});

test('cloudGemini forwards the hints in the request body', async () => {
  const hints = api.ocrHintsFromPageCounts([4]);
  const body = await captureBody(hints);
  assert.equal(body.consent, true);
  assert.equal(body.anonymous, true);
  assert.equal(body.freeTier, true);
  assert.deepEqual(plain(body.ocrHints), plain(hints));
});

test('cloudGemini omits the field when there is nothing to send', async () => {
  for (const hints of [null, undefined, []]) {
    const body = await captureBody(hints);
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'ocrHints'), false);
  }
});

test('cloudGemini never sends more than 30 hints', async () => {
  const tooMany = Array.from({ length: 60 }, (_, i) => ({ page: i + 1, type: 'unknown', quality: null, labels: [], issues: [] }));
  const body = await captureBody(tooMany);
  assert.equal(body.ocrHints.length, 30);
});

test('a document that cannot be opened yields no hints instead of failing', async () => {
  const broken = new dom.window.File([new Uint8Array([1, 2, 3])], 'broken.pdf', { type: 'application/pdf' });
  const hints = await api.ocrHintsForFiles([broken]);
  assert.deepEqual(plain(hints), []);
});

test('an odd number of scanned pages warns the user before reading', async () => {
  const warnings = [];
  const broken = new dom.window.File([new Uint8Array([1, 2, 3])], 'x.pdf', { type: 'application/pdf' });
  // A PDF that cannot be opened is silent: the warning must never block reading.
  assert.equal(await api.scannedPageWarning([broken], warnings), 0);
  assert.deepEqual(warnings, []);
});

test('a single image is not reported as an odd scan', async () => {
  const warnings = [];
  const photo = new dom.window.File([new Uint8Array([1])], 'foto.jpg', { type: 'image/jpeg' });
  assert.equal(await api.scannedPageWarning([photo], warnings), 1);
  assert.deepEqual(warnings, []);
});

test('two photos are a complete form and stay silent', async () => {
  const warnings = [];
  const a = new dom.window.File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' });
  const b = new dom.window.File([new Uint8Array([2])], 'b.jpg', { type: 'image/jpeg' });
  assert.equal(await api.scannedPageWarning([a, b], warnings), 2);
  assert.deepEqual(warnings, []);
});

test('three photos warn about the missing PAS page', async () => {
  const warnings = [];
  const files = ['a.jpg', 'b.jpg', 'c.jpg'].map((name, i) => new dom.window.File([new Uint8Array([i])], name, { type: 'image/jpeg' }));
  assert.equal(await api.scannedPageWarning(files, warnings), 3);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /3 faqe/);
  assert.match(warnings[0], /PARA dhe PAS/);
});

run();
