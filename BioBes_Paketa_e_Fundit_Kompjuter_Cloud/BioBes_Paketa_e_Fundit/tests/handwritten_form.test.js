#!/usr/bin/env node
'use strict';

// Regression for a real handwritten form (11.11.2026, room form with one
// weighing table) that came out half empty. The values below are what is
// written on the paper, in the shapes a reader returns them; the names are
// invented. No live OCR: this checks that nothing readable is thrown away
// between the Gemini answer and the editor.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const api = loadApp().window.__BIOBES__;
// Values come from the jsdom realm; compare them as plain data.
const plain = (x) => JSON.parse(JSON.stringify(x));
const empty = () => ({ name: '', start: '', end: '', comment: '', signature: '' });

function paper(over = {}) {
  return {
    multiple_forms: false, record_number: '01', date: '11/11/2026', weekday: 'E MËRKURË', iso_week: '45', room: '',
    record_numbers_seen: ['01'], dates_seen: ['11/11/2026'], total_hours: '', uncertain: [],
    responsible: { name: 'Arta Shembulli', signature: 'firmë' }, assistant: { name: 'Besa Provë', signature: 'firmë' },
    plan: [{ product: 'Fenë', status: 'organik', ordered_quantity: '400', produced_quantity: '', unit: '', packaging: '25', client: '787', comment: 'Cilësia mirë' }],
    employees: [
      { name: 'Arta Shembulli', start: '7⁰⁰', end: '16:⁰⁰', comment: '', signature: 'firmë' },
      { name: 'Besa Provë', start: '7 00', end: '16.00', comment: '', signature: 'firmë' },
      ...Array.from({ length: 10 }, empty),
    ],
    weighings: [{ index: 1, product: 'Fenë', source: '', rows: [
      { row: 1, bags: '5', kg: '125', packaging: '25', sum: '100' },
      { row: 2, bags: '10', kg: '250', packaging: '50', sum: '200.' },
    ] }],
    printed_totals: [{ index: 1, bags: '15', kg: '375', packaging: '75', sum: '300.' }],
    comments: '', warnings: [], ...over,
  };
}

test('the whole form arrives in the editor; the only warning is a real one', () => {
  const { record: r, warnings } = api.aiRecord(paper());
  assert.equal(r.nr, '01');
  assert.equal(r.date, '2026-11-11');
  assert.equal(r.responsible.name, 'Arta Shembulli');
  assert.deepEqual([r.plan[0].product, r.plan[0].status, r.plan[0].planned, r.plan[0].packaging, r.plan[0].client], ['Fenë', 'organik', '400', '25', '787']);
  assert.deepEqual(plain(r.employees.slice(0, 2).map((e) => [e.start, e.end])), [['07:00', '16:00'], ['07:00', '16:00']]);
  assert.deepEqual(plain(r.weighings[0].rows.slice(0, 2).map((x) => [x.bags, x.kg, x.packaging, x.sum])), [['5', '125', '25', '100'], ['10', '250', '50', '200']]);
  // The paper says week 45, but 11.11.2026 is in ISO week 46: a genuine slip on the form.
  assert.deepEqual(plain(warnings), ['Java ISO e shkruar “45” nuk përputhet me datën. Kontrolloje.']);
});

test('clock times as people write them', () => {
  for (const [written, time] of [['7', '07:00'], ['7:00', '07:00'], ['7.00', '07:00'], ['7,30', '07:30'], ['700', '07:00'], ['1600', '16:00'],
    ['7h', '07:00'], ['7h30', '07:30'], ['ora 8', '08:00'], ['16:00h', '16:00'], ['7⁰⁰', '07:00'], ['1:05 PM', '13:05']]) {
    assert.equal(api.timeFromImport(written), time, written);
  }
  for (const written of ['25:00', '7.5', '12:75', 'shtatë', '']) assert.equal(api.timeFromImport(written), '', written);
});

test('a day/month date that could be read both ways is kept and flagged only without a weekday', () => {
  const flagged = api.aiRecord(paper({ date: '6.11.2026', dates_seen: [], weekday: '', iso_week: '' }));
  assert.equal(flagged.record.date, '2026-11-06');
  assert.ok(flagged.warnings.some((x) => /u lexua si ditë\/muaj/.test(x)));
  // 6 November 2026 is a Friday: the weekday on the paper settles it.
  const settled = api.aiRecord(paper({ date: '6.11.2026', dates_seen: [], weekday: 'e premte', iso_week: '45' }));
  assert.equal(settled.record.date, '2026-11-06');
  assert.deepEqual(plain(settled.warnings), []);
  // A weekday that contradicts the date is still reported.
  const wrong = api.aiRecord(paper({ date: '6.11.2026', dates_seen: [], weekday: 'e hënë', iso_week: '' }));
  assert.ok(wrong.warnings.some((x) => /nuk përputhet me datën/.test(x)));
});

test('a wrong printed total is still reported; units are still refused', () => {
  const off = api.aiRecord(paper({ printed_totals: [{ index: 1, bags: '15', kg: '385', packaging: '75', sum: '300.' }] }));
  assert.ok(off.warnings.some((x) => /totali i shtypur i kilogramëve \(385\) nuk përputhet/.test(x)));
  const unit = paper();
  unit.weighings[0].rows[0].kg = '125 kg';
  const refused = api.aiRecord(unit);
  assert.equal(refused.record.weighings[0].rows[0].kg, '');
  assert.ok(refused.warnings.some((x) => /125 kg/.test(x)));
});

run();
