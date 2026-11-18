#!/usr/bin/env node
'use strict';

// Tests for cloudGemini retry/backoff behaviour with a mocked fetch.
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
// Pritjet e riprovimit zëvendësohen me zero: testet matin numrin e provave,
// jo kalendarin. Kështu suite nuk pret 45 sekonda për një gabim të pritur.
api.setFastWait();

function response(status, data, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() in headers ? headers[name.toLowerCase()] : null) },
    json: async () => data,
  };
}

test('retries on 429 and 503, then succeeds', async () => {
  const queue = [response(429, { error: 'rate' }), response(503, { error: 'unavailable' }), response(200, { ok: true })];
  let calls = 0;
  dom.window.fetch = async () => queue[calls++];
  const result = await api.cloudGemini([{ text: 'test' }], new AbortController().signal);
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
});

test('does not retry on 401', async () => {
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return response(401, { error: 'unauthorized' });
  };
  await assert.rejects(
    () => api.cloudGemini([{ text: 'test' }], new AbortController().signal),
    /unauthorized/,
  );
  assert.equal(calls, 1);
});

test('gives up after five attempts on persistent 503', async () => {
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return response(503, { error: 'unavailable' });
  };
  await assert.rejects(
    () => api.cloudGemini([{ text: 'test' }], new AbortController().signal),
    /unavailable/,
  );
  assert.equal(calls, 5);
});

test('recovers from a burst of 503 UNAVAILABLE', async () => {
  // Gemini Free Tier kthen 503 kur modeli është i mbingarkuar; katër dështime
  // radhazi nuk duhet ta humbin grupin.
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return calls < 5 ? response(503, { error: 'unavailable' }) : response(200, { ok: true });
  };
  const result = await api.cloudGemini([{ text: 'test' }], new AbortController().signal);
  assert.equal(result.ok, true);
  assert.equal(calls, 5);
});

test('only one AI request is in flight at a time', async () => {
  // Katër kërkesa të mëdha njëherësh janë shkaku i 503; radha i rendit.
  let inFlight = 0;
  let peak = 0;
  dom.window.fetch = async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return response(200, { ok: true });
  };
  const signal = new AbortController().signal;
  await Promise.all([1, 2, 3, 4].map(() => api.cloudGemini([{ text: 'test' }], signal)));
  assert.equal(peak, 1);
});

test('honours Retry-After before retrying', async () => {
  const queue = [response(429, { error: 'rate' }, { 'retry-after': '1' }), response(200, { ok: true })];
  let calls = 0;
  dom.window.fetch = async () => queue[calls++];
  api.setFastWait();
  const result = await api.cloudGemini([{ text: 'test' }], new AbortController().signal);
  assert.equal(result.ok, true);
  assert.ok(dom.window.__BIOBES_WAITS__[0] >= 900, `expected a Retry-After wait, got ${dom.window.__BIOBES_WAITS__[0]}ms`);
});

test('503 waits grow exponentially instead of hammering', async () => {
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return calls < 4 ? response(503, { error: 'unavailable' }) : response(200, { ok: true });
  };
  api.setFastWait();
  await api.cloudGemini([{ text: 'test' }], new AbortController().signal);
  const waits = dom.window.__BIOBES_WAITS__;
  assert.equal(waits.length, 3);
  assert.ok(waits[1] > waits[0], `expected growth, got ${waits.join(', ')}`);
  assert.ok(waits[2] > waits[1], `expected growth, got ${waits.join(', ')}`);
  // Dridhja e rastësishme mban pritjen brenda 75–125% të bazës.
  assert.ok(waits[0] >= 2250 && waits[0] <= 3750, `first wait out of range: ${waits[0]}`);
});

test('after spent quota, later requests fail without hitting the network', async () => {
  // Katër punëtorë nisin njëherësh; kur kuota mbaron, të tjerët nuk duhet të
  // harxhojnë kërkesa për asnjë rezultat.
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return response(429, { error: 'quota', providerStatus: 'RESOURCE_EXHAUSTED' });
  };
  api.cloudQuotaReset();
  const signal = new AbortController().signal;
  await assert.rejects(() => api.cloudGemini([{ text: 'test' }], signal), /Kuota/);
  assert.equal(calls, 1, 'kërkesa e parë shkon në rrjet');
  await assert.rejects(() => api.cloudGemini([{ text: 'test' }], signal), /Kuota/);
  assert.equal(calls, 1, 'kërkesa e dytë ndalet para rrjetit');
  api.cloudQuotaReset();
});

test('a new batch clears the quota stop', async () => {
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return calls === 1 ? response(429, { error: 'quota', providerStatus: 'RESOURCE_EXHAUSTED' }) : response(200, { ok: true });
  };
  api.cloudQuotaReset();
  const signal = new AbortController().signal;
  await assert.rejects(() => api.cloudGemini([{ text: 'test' }], signal), /Kuota/);
  api.cloudQuotaReset();
  const result = await api.cloudGemini([{ text: 'test' }], signal);
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
});

test('aborts immediately when the signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => api.cloudGemini([{ text: 'test' }], controller.signal),
    (error) => error.name === 'AbortError',
  );
});

run();
