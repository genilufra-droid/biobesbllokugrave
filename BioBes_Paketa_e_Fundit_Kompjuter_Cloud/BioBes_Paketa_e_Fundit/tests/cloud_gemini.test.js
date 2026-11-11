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

test('gives up after four attempts on persistent 503', async () => {
  let calls = 0;
  dom.window.fetch = async () => {
    calls += 1;
    return response(503, { error: 'unavailable' });
  };
  await assert.rejects(
    () => api.cloudGemini([{ text: 'test' }], new AbortController().signal),
    /unavailable/,
  );
  assert.equal(calls, 4);
});

test('honours Retry-After before retrying', async () => {
  const queue = [response(429, { error: 'rate' }, { 'retry-after': '1' }), response(200, { ok: true })];
  let calls = 0;
  dom.window.fetch = async () => queue[calls++];
  const started = Date.now();
  const result = await api.cloudGemini([{ text: 'test' }], new AbortController().signal);
  const elapsed = Date.now() - started;
  assert.equal(result.ok, true);
  assert.ok(elapsed >= 900, `expected a Retry-After wait, got ${elapsed}ms`);
});

test('aborts immediately when the signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => api.cloudGemini([{ text: 'test' }], controller.signal),
    (error) => error.name === 'AbortError',
  );
});

test('careful mode sends thinking=high; the default request is unchanged', async () => {
  const bodies = [];
  const w = dom.window;
  api.setFastWait();
  const original = w.fetch;
  w.fetch = async (_url, options) => { bodies.push(JSON.parse(options.body)); return { ok: true, status: 200, json: async () => ({ candidates: [] }) }; };
  try {
    const parts = [{ text: 'SKEDARI EXCEL: x' }];
    await api.cloudGemini(parts, new AbortController().signal);
    await api.cloudGemini(parts, new AbortController().signal, true);
  } finally { w.fetch = original; }
  assert.deepEqual(Object.keys(bodies[0]).sort(), ['anonymous', 'consent', 'freeTier', 'parts']);
  assert.equal(bodies[1].thinking, 'high');
});

run();
