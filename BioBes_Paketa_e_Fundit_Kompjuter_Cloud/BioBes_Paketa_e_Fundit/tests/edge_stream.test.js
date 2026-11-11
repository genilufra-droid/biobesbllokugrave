#!/usr/bin/env node
'use strict';

// Runs the real Edge Function code in Node with a mocked Deno and a mocked
// Gemini stream. No request leaves the machine. Time limits are shortened
// 100x so that silence, stalls and loops can be exercised quickly.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { test, run } = require('./test_runner.js');

const file = path.join(__dirname, '..', 'BioBes_Cloud', 'supabase', 'functions', 'biobes-read-form', 'index.ts');
let source = fs.readFileSync(file, 'utf8');
for (const [name, real, quick] of [['TOTAL_MS', 125000, 1250], ['FIRST_MS', 40000, 400], ['STALL_MS', 30000, 300], ['MIN_LEFT_MS', 20000, 200]]) {
  const before = `const ${name}=${real};`;
  assert.ok(source.includes(before), `${name} must be ${real}`);
  source = source.replace(before, `const ${name}=${quick};`);
}

let handler = null;
let gemini = async () => new Response('{}', { status: 200 });
const calls = [];
const Deno = {
  env: { get: (k) => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'anon', BIOBES_GEMINI_API_KEY: 'secret-key' })[k] },
  serve: (callback) => { handler = callback; },
};
const fetchMock = async (url, init) => {
  url = String(url);
  if (url.includes('/auth/v1/user') || url.includes('/rest/v1/rpc/')) return new Response('{}', { status: 200 });
  calls.push(url);
  return gemini(url, init);
};
const warn = process.emitWarning; process.emitWarning = () => {};
const js = stripTypeScriptTypes(source);
process.emitWarning = warn;
new Function('Deno', 'fetch', js)(Deno, fetchMock);

const good = '{"plan":[],"employees":[],"weighings":[],"warnings":[]}';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function post() {
  calls.length = 0;
  return handler(new Request('https://test.supabase.co/functions/v1/biobes-read-form', {
    method: 'POST',
    headers: { authorization: 'Bearer test-access-token-1234567890', 'content-type': 'application/json' },
    body: JSON.stringify({ parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }], consent: true, anonymous: true, freeTier: true }),
  }));
}
// steps: [delayMs, text, finishReason?]; text is split across network chunks on purpose.
function stream(steps, init) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const stop = () => { try { controller.error(new DOMException('aborted', 'AbortError')); } catch (_) {} };
      init.signal.addEventListener('abort', stop);
      for (const [delay, text, finishReason] of steps) {
        await sleep(delay);
        if (init.signal.aborted) return;
        const event = 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, ...(finishReason ? { finishReason } : {}) }], usageMetadata: { totalTokenCount: 7 } }) + '\r\n\r\n';
        const cut = Math.floor(event.length / 2);
        controller.enqueue(encoder.encode(event.slice(0, cut)));
        await sleep(1);
        if (init.signal.aborted) return;
        controller.enqueue(encoder.encode(event.slice(cut)));
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}
// A model that accepts the request and then never sends anything.
function silent(init) {
  return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
}

test('streamed answer is joined and returned in the shape the page expects', async () => {
  gemini = async (_, init) => stream([[5, good.slice(0, 20)], [5, good.slice(20), 'STOP']], init);
  const res = await post();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.candidates[0].content.parts[0].text, good);
  assert.equal(body.candidates[0].finishReason, 'STOP');
  assert.equal(body.biobes.model, 'gemini-3.6-flash');
  assert.equal(body.biobes.attempts.length, 1);
  assert.match(calls[0], /gemini-3\.6-flash:streamGenerateContent\?alt=sse$/);
});

test('request keeps low thinking, the schema and the token bound, and never puts the key in the URL', async () => {
  let sent = null;
  gemini = async (url, init) => { sent = { url, init }; return stream([[1, good, 'STOP']], init); };
  assert.equal((await post()).status, 200);
  const payload = JSON.parse(sent.init.body);
  assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel, 'low');
  assert.equal(payload.generationConfig.temperature, 0);
  assert.equal(payload.generationConfig.maxOutputTokens, 32768);
  assert.ok(payload.generationConfig.responseSchema.properties.printed_totals);
  assert.doesNotMatch(sent.url, /secret-key/);
  assert.equal(sent.init.headers['x-goog-api-key'], 'secret-key');
});

test('thought parts are not mixed into the answer', async () => {
  gemini = async () => new Response('data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text: good }] }, finishReason: 'STOP' }] }) + '\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
  const body = await (await post()).json();
  assert.equal(body.candidates[0].content.parts[0].text, good);
});

test('a silent first model is dropped early and the second model answers', async () => {
  gemini = async (url, init) => (url.includes('3.6') ? silent(init) : stream([[20, good, 'STOP']], init));
  const started = Date.now();
  const res = await post();
  const elapsed = Date.now() - started;
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.biobes.model, 'gemini-3.8-flash');
  assert.equal(body.biobes.attempts[0].outcome, 'no_answer');
  assert.ok(elapsed >= 380 && elapsed < 800, `first model should be dropped after about 400 ms, took ${elapsed}`);
});

test('a model that is already answering is not cut at the first-answer limit', async () => {
  // First text arrives at 100 ms, the rest keeps coming until about 700 ms (> FIRST_MS).
  gemini = async (_, init) => stream([[100, '{"plan":[],'], [200, '"employees":[],'], [200, '"weighings":[],'], [200, '"warnings":[]}', 'STOP']], init);
  const res = await post();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.biobes.model, 'gemini-3.6-flash');
  assert.equal(calls.length, 1);
});

test('both models silent: 504 within the total budget, with the reason for each model', async () => {
  gemini = async (_, init) => silent(init);
  const started = Date.now();
  const res = await post();
  const elapsed = Date.now() - started;
  assert.equal(res.status, 504);
  assert.ok(elapsed < 1500, `must end inside the total budget, took ${elapsed}`);
  const body = await res.json();
  assert.deepEqual(body.attempts.map((a) => a.outcome), ['no_answer', 'deadline']);
  assert.match(body.error, /gemini-3\.6-flash nuk filloi të përgjigjej/);
  assert.match(body.error, /gemini-3\.8-flash nuk mbaroi brenda kohës/);
});

test('a stream that stops in the middle is abandoned after the stall limit', async () => {
  gemini = async (url, init) => (url.includes('3.6') ? stream([[5, '{"plan":['], [5000, ']}', 'STOP']], init) : stream([[5, good, 'STOP']], init));
  const res = await post();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.biobes.attempts[0].outcome, 'stalled');
  assert.equal(body.biobes.model, 'gemini-3.8-flash');
});

test('endless blanks or repeated text is detected as a loop and the other model is tried', async () => {
  for (const junk of [' '.repeat(120), '{"row":1,"bags":"5"},'.repeat(12)]) {
    gemini = async (url, init) => (url.includes('3.6') ? stream(Array.from({ length: 40 }, () => [2, junk]), init) : stream([[5, good, 'STOP']], init));
    const res = await post();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.biobes.attempts[0].outcome, 'loop');
    assert.equal(body.biobes.model, 'gemini-3.8-flash');
  }
});

test('twelve empty employee rows and 150 weighing rows are not mistaken for a loop', async () => {
  const employees = Array.from({ length: 12 }, () => ({ name: '', start: '', end: '', comment: '', signature: '' }));
  const weighings = Array.from({ length: 6 }, (_, i) => ({ index: i + 1, product: '', source: '', rows: Array.from({ length: 25 }, (_, r) => ({ row: r + 1, bags: '5', kg: '125', packaging: '25', sum: '100' })) }));
  const full = JSON.stringify({ plan: [], employees, weighings, warnings: [] });
  const steps = []; for (let i = 0; i < full.length; i += 500) steps.push([1, full.slice(i, i + 500)]);
  steps[steps.length - 1][2] = 'STOP';
  gemini = async (_, init) => stream(steps, init);
  const res = await post();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.candidates[0].content.parts[0].text, full);
  assert.equal(calls.length, 1);
});

test('overload on the first model (503) falls back; a rejected request (400) does not', async () => {
  gemini = async (url, init) => (url.includes('3.6') ? new Response(JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE' } }), { status: 503 }) : stream([[5, good, 'STOP']], init));
  let res = await post();
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  gemini = async () => new Response(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'secret detail' } }), { status: 400 });
  res = await post();
  assert.equal(res.status, 502);
  assert.equal(calls.length, 1);
  const text = await res.text();
  assert.match(text, /INVALID_ARGUMENT/);
  assert.doesNotMatch(text, /secret detail/);
});

test('persistent 429 and 503 keep their status for the page', async () => {
  gemini = async () => new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }), { status: 429 });
  assert.equal((await post()).status, 429);
  gemini = async () => new Response(JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE' } }), { status: 503 });
  assert.equal((await post()).status, 503);
});

test('an error sent inside the stream is treated like an HTTP error', async () => {
  gemini = async (url, init) => (url.includes('3.6') ? new Response('data: {"error":{"code":503,"status":"UNAVAILABLE"}}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } }) : stream([[5, good, 'STOP']], init));
  const res = await post();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).biobes.attempts[0].providerStatus, 'UNAVAILABLE');
});

test('a plain JSON answer (no stream) is still accepted', async () => {
  gemini = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: good }] }, finishReason: 'STOP' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  const res = await post();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).candidates[0].content.parts[0].text, good);
});

test('MAX_TOKENS is passed to the page so that it can explain the cut', async () => {
  gemini = async (_, init) => stream([[5, '{"plan":[', 'MAX_TOKENS']], init);
  const body = await (await post()).json();
  assert.equal(body.candidates[0].finishReason, 'MAX_TOKENS');
});

run();
