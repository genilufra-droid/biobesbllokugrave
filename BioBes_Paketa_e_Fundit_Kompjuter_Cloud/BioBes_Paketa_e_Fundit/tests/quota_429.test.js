#!/usr/bin/env node
'use strict';

// Kuota e Gemini: 429 me RESOURCE_EXHAUSTED nuk rregullohet duke riprovuar.
// Më parë kodi bënte 5 kërkesa për çdo grup (1 + 4 riprovime) me pritje 5–15 s,
// duke shpenzuar kuotën për asnjë rezultat dhe duke lënë mesazhin e vërtetë të
// humbur. Tani kuota ndalon menjëherë dhe e thotë qartë.
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

function reply(status, data) {
  return { ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: async () => data };
}
const quotaBody = { error: 'Gemini nuk e përfundoi kërkesën.', httpStatus: 429, providerStatus: 'RESOURCE_EXHAUSTED', providerCode: 429 };
const rateBody = { error: 'Gemini nuk e përfundoi kërkesën.', httpStatus: 429, providerStatus: 'RATE_LIMIT_EXCEEDED' };

test('kuota e shpenzuar ndalon menjëherë, pa riprovuar', async () => {
  api.setFastWait();
  let calls = 0;
  dom.window.fetch = async () => { calls += 1; return reply(429, quotaBody); };
  await assert.rejects(() => api.cloudGemini([{ text: 'x' }], signal()), /kuota.*shpenzuar/i);
  assert.equal(calls, 1, 'një kërkesë e vetme, jo pesë');
});

test('gabimi i kuotës shënohet si quota për t’i ndalur grupet e tjera', async () => {
  api.setFastWait();
  dom.window.fetch = async () => reply(429, quotaBody);
  try {
    await api.cloudGemini([{ text: 'x' }], signal());
    assert.fail('duhet të dështojë');
  } catch (e) {
    assert.equal(e.quota, true);
  }
});

test('429 e zakonshme (jo kuotë) riprovohet dhe ka mesazh tjetër', async () => {
  api.setFastWait();
  let calls = 0;
  dom.window.fetch = async () => { calls += 1; return calls < 2 ? reply(429, rateBody) : reply(200, { ok: true }); };
  const result = await api.cloudGemini([{ text: 'x' }], signal());
  assert.equal(result.ok, true);
  assert.equal(calls, 2, 'një riprovim, pastaj sukses');
});

test('429 e zakonshme që vazhdon: mesazhi flet për kërkesa, jo për kuotë', async () => {
  api.setFastWait();
  dom.window.fetch = async () => reply(429, rateBody);
  await assert.rejects(() => api.cloudGemini([{ text: 'x' }], signal()), /Shumë kërkesa/i);
});

test('kuota nuk shënohet si gabim i përgjithshëm i shërbimit', async () => {
  api.setFastWait();
  // 503 mbetet i riprovueshëm; nuk duhet të ndalet si kuotë.
  let calls = 0;
  dom.window.fetch = async () => { calls += 1; return calls < 2 ? reply(503, { error: 'unavailable' }) : reply(200, { ok: true }); };
  const result = await api.cloudGemini([{ text: 'x' }], signal());
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
});

test('mesazhi i kuotës thotë qartë që dokumentet nuk humbën', async () => {
  api.setFastWait();
  dom.window.fetch = async () => reply(429, quotaBody);
  try {
    await api.cloudGemini([{ text: 'x' }], signal());
  } catch (e) {
    assert.match(e.message, /Nuk humbi asgjë/i);
  }
});

test('401 nuk riprovohet dhe nuk shënohet si kuotë', async () => {
  api.setFastWait();
  let calls = 0;
  dom.window.fetch = async () => { calls += 1; return reply(401, { error: 'unauthorized' }); };
  await assert.rejects(() => api.cloudGemini([{ text: 'x' }], signal()), /unauthorized/);
  assert.equal(calls, 1);
});

run();
