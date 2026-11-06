#!/usr/bin/env node
'use strict';

// Behavioural tests for the Gemini response parser (parseAIJson).
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const { parseAIJson } = dom.window.__BIOBES__;

const payload = JSON.stringify({
  multiple_forms: false,
  plan: [],
  employees: [],
  weighings: [],
  warnings: [],
});

function response(text, finishReason = 'STOP') {
  return { candidates: [{ finishReason, content: { parts: [{ text }] } }] };
}

test('parses a plain JSON response', () => {
  const result = parseAIJson(response(payload));
  assert.equal(result.multiple_forms, false);
  assert.equal(result.plan.length, 0);
});

test('parses JSON wrapped in markdown code fences', () => {
  const result = parseAIJson(response('```json\n' + payload + '\n```'));
  assert.equal(result.employees.length, 0);
});

test('joins multiple response parts', () => {
  const half = Math.floor(payload.length / 2);
  const result = parseAIJson({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: payload.slice(0, half) }, { text: payload.slice(half) }] } }],
  });
  assert.equal(result.weighings.length, 0);
});

test('rejects an empty response', () => {
  assert.throws(() => parseAIJson({}), /Gemini nuk ktheu rezultat/);
});

test('rejects a truncated response', () => {
  assert.throws(() => parseAIJson(response(payload, 'MAX_TOKENS')), /Leximi nuk u përfundua/);
});

test('rejects invalid JSON', () => {
  assert.throws(() => parseAIJson(response('not json')), /nuk ishte e lexueshme/);
});

test('rejects a response without the required arrays', () => {
  assert.throws(() => parseAIJson(response('{"plan":[],"employees":[]}')), /e paplotë/);
});

run();
