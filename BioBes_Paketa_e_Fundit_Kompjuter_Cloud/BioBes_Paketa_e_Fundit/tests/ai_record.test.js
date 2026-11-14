#!/usr/bin/env node
'use strict';

// Behavioural tests for the Gemini response mapper (aiRecord) using the real
// production function loaded from app.js in jsdom.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const { aiRecord } = dom.window.__BIOBES__;

function baseResponse(overrides = {}) {
  return {
    multiple_forms: false,
    record_number: '001',
    date: '2026-11-06',
    room: 'Dhoma 1',
    responsible: { name: 'Përgjegjësi', signature: 'A' },
    assistant: { name: 'Ndihmësi', signature: 'B' },
    plan: [
      { product: 'P1', status: 'OK', ordered_quantity: '10', produced_quantity: '8', unit: 'kg', packaging: '1kg', client: 'Klienti 1', comment: '' },
      { product: 'P2', status: 'OK', ordered_quantity: '5', produced_quantity: '5', unit: 'kg', packaging: '1kg', client: 'Klienti 2', comment: '' },
      { product: 'P3', status: 'OK', ordered_quantity: '2', produced_quantity: '2', unit: 'kg', packaging: '1kg', client: 'Klienti 3', comment: '' },
    ],
    employees: Array.from({ length: 12 }, (_, i) => ({ name: `Punonjësi ${i + 1}`, start: '08:00', end: '16:00', comment: '', signature: '' })),
    weighings: [
      { index: 1, product: 'P1', source: 'stock', rows: [{ row: 1, bags: '10', kg: '100', packaging: '1kg', sum: '100' }] },
      { index: 2, product: 'P2', source: 'stock', rows: [{ row: 1, bags: '5', kg: '50', packaging: '1kg', sum: '50' }] },
    ],
    comments: 'Komente ditore',
    warnings: [],
    ...overrides,
  };
}

test('maps a valid response into a complete record', () => {
  const result = aiRecord(baseResponse());
  assert.equal(result.record.nr, '001');
  assert.equal(result.record.date, '2026-11-06');
  assert.equal(result.record.room, 'Dhoma 1');
  assert.equal(result.record.plan.length, 3);
  assert.equal(result.record.employees.length, 12);
  assert.equal(result.record.weighings.length, 6);
  assert.equal(result.record.comments, 'Komente ditore');
  assert.equal(result.record.plan[0].planned, '10');
  assert.equal(result.record.plan[0].actual, '8');
});

test('rejects multiple separate forms', () => {
  assert.throws(() => aiRecord(baseResponse({ multiple_forms: true })), /disa formularë/);
});

test('rejects more than three products with data', () => {
  const plan = baseResponse().plan.concat([{ product: 'P4', status: 'OK', ordered_quantity: '1', produced_quantity: '1', unit: 'kg', packaging: '1kg', client: 'X', comment: '' }]);
  assert.throws(() => aiRecord(baseResponse({ plan })), /3 produkte/);
});

test('rejects more than twelve employees with data', () => {
  const employees = baseResponse().employees.concat([{ name: 'I 13', start: '08:00', end: '16:00', comment: '', signature: '' }]);
  assert.throws(() => aiRecord(baseResponse({ employees })), /12 punonjës/);
});

test('warns when the date is invalid', () => {
  const result = aiRecord(baseResponse({ date: '2026-13-40' }));
  assert.ok(result.warnings.some((w) => /Data nuk u lexua/.test(w)), 'invalid date must warn');
});

test('warns when a clock time is invalid', () => {
  const employees = baseResponse().employees.map((e, i) => (i === 0 ? { ...e, start: '25:00' } : e));
  const result = aiRecord(baseResponse({ employees }));
  assert.ok(result.warnings.some((w) => /kontrollo orën/.test(w)), 'invalid time must warn');
});

test('warns when an imported number is malformed', () => {
  const plan = baseResponse().plan.map((p, i) => (i === 0 ? { ...p, ordered_quantity: '12,5kg' } : p));
  const result = aiRecord(baseResponse({ plan }));
  assert.ok(result.warnings.some((w) => /kontrolluar/.test(w)), 'malformed number must warn');
});

test('proposes a number when the document has none', () => {
  const result = aiRecord(baseResponse({ record_number: '' }));
  assert.match(result.record.nr, /^\d{3,}$/);
  assert.ok(result.warnings.some((w) => /Numri nuk u lexua/.test(w)), 'missing number must warn');
});

test('keeps both tables when weighing indexes are duplicated', () => {
  // Më parë hidhej gabim dhe humbin të dyja tabelat. Tani tabela e dytë merr
  // vendin e parë të lirë, shënohet dhe paralajmërohet — asnjë vlerë nuk humbet.
  const weighings = [
    { index: 1, product: 'P1', source: 'stock', rows: [{ row: 1, kg: '180' }] },
    { index: 1, product: 'P2', source: 'stock', rows: [{ row: 1, kg: '170' }] },
  ];
  const { record, warnings } = aiRecord(baseResponse({ weighings }));
  // Formulari ka gjithmonë 6 tabela; rëndësi ka që të dyja vlerat u ruajtën.
  assert.equal(record.weighings[0].rows[0].kg, '180', 'tabela e parë ruhet');
  assert.equal(record.weighings[1].rows[0].kg, '170', 'tabela e dytë nuk humbi');
  assert.ok(record.weighings[1].product, 'produkti i tabelës së dytë u ruajt');
  assert.ok(warnings.some((w) => /i përsëritur/i.test(w)), 'u paralajmërua për kontroll');
});

test('keeps ordered and produced quantities separate', () => {
  const result = aiRecord(baseResponse());
  assert.equal(result.record.plan[0].planned, '10');
  assert.equal(result.record.plan[0].actual, '8');
  assert.notEqual(result.record.plan[0].planned, result.record.plan[0].actual);
});

run();
