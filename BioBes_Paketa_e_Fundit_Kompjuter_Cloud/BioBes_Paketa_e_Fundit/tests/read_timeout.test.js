#!/usr/bin/env node
'use strict';

// Gabimi "Leximi kaloi kohën" nuk duhet të vijë nga pritjet e riprovimit.
// Kur 429 ktheu 30/60/90 s pritje, thirrja harxhonte 180 s brenda vetes, ndërsa
// kufiri i jashtëm ishte 140 s — kështu që leximi aborterohej dhe arsyeja e
// vërtetë humbte. Testet matin buxhetin, jo vetëm mesazhin.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const api = dom.window.__BIOBES__;
const { AbortController } = dom.window;
const signal = () => new AbortController().signal;

api.cloud.config = { url: 'https://test.supabase.co', key: 'test-key' };
api.cloud.client = {
  auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
};
api.batchState.busy = false;

function reply(status, data, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (n) => (n.toLowerCase() in headers ? headers[n.toLowerCase()] : null) },
    json: async () => data,
  };
}
const rateBody = { error: 'rate', httpStatus: 429, providerStatus: 'RATE_LIMIT_EXCEEDED' };

// Koha e pritjeve kapet duke matur kohëzgjatjen reale me një pretendo-timer.
function withFakeClock(fn) {
  const waits = [];
  api.setFastWait(); // pritja bëhet e menjëhershme; vetëm anulohet
  return fn(waits);
}

test('429 pa Retry-After: pritjet nuk e kalojnë buxhetin e dhënë', async () => {
  // Buxhet zero => nuk duhet të pritet fare, por as të varet pafund.
  let calls = 0;
  dom.window.fetch = async () => { calls += 1; return reply(429, rateBody); };
  const start = Date.now();
  await assert.rejects(() => api.cloudGemini([{ text: 'x' }], signal(), 0), /Shumë kërkesa/i);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 5000, `duhej të ndalej shpejt, zgjati ${elapsed} ms`);
  assert.ok(calls >= 1, 'bëri së paku një kërkesë');
});

test('me buxhet të vogël, ndalon dhe nuk harxhon kërkesa pa fund', async () => {
  let calls = 0;
  dom.window.fetch = async () => { calls += 1; return reply(429, rateBody); };
  api.setFastWait();
  const start = Date.now();
  await assert.rejects(() => api.cloudGemini([{ text: 'x' }], signal(), 1000), /Shumë kërkesa/i);
  assert.ok(Date.now() - start < 6000);
  assert.ok(calls <= 4, `kërkesat mbeten të kufizuara (ishin ${calls})`);
});

test('Retry-After i madh nuk pritet kur buxheti nuk e mban', async () => {
  api.setFastWait();
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return reply(429, rateBody, { 'retry-after': '120' }); // Google kërkon 120 s
  };
  const start = Date.now();
  await assert.rejects(() => api.cloudGemini([{ text: 'x' }], signal(), 2000), /Shumë kërkesa/i);
  assert.ok(Date.now() - start < 6000, 'nuk pret 120 s brenda një kërkese');
  assert.equal(calls, 1, 'pasi s’ka kohë për një provë tjetër, nuk provon më kot');
});

test('Retry-After i vogël respektohet kur buxheti e lejon', async () => {
  api.setFastWait();
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return calls === 1 ? reply(429, rateBody, { 'retry-after': '2' }) : reply(200, { ok: true });
  };
  const result = await api.cloudGemini([{ text: 'x' }], signal(), 120000);
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
});

test('kuota mbaron brenda buxhetit: gabimi është kuota, jo koha', async () => {
  api.setFastWait();
  dom.window.fetch = async () => reply(429, { error: 'q', httpStatus: 429, providerStatus: 'RESOURCE_EXHAUSTED' });
  try {
    await api.cloudGemini([{ text: 'x' }], signal(), 60000);
    assert.fail('duhet të dështojë');
  } catch (e) {
    assert.match(e.message, /kuota/i);
    assert.equal(e.timeout, undefined, 'nuk është gabim kohe');
  }
});

test('gabim i menjëhershëm 400 nuk shndërrohet në gabim kohe', async () => {
  api.setFastWait();
  dom.window.fetch = async () => reply(400, { error: 'dokument i pavlefshëm' });
  try {
    await api.cloudGemini([{ text: 'x' }], signal(), 60000);
    assert.fail('duhet të dështojë');
  } catch (e) {
    assert.match(e.message, /dokument i pavlefshëm/);
    assert.ok(!e.timeout, 'arsyeja e vërtetë ruhet');
  }
});

run();
