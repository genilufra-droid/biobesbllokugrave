#!/usr/bin/env node
'use strict';

// Paneli i kontrollit tregon faqen PARA/PAS, zonën e formularit, sigurinë dhe
// needsReview për vlerat e lexuara, dhe një kartë për çdo formular të dokumentit.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const api = dom.window.__BIOBES__;
const w = dom.window;

function cell(value, page, formArea, confidence = 0.9, needsReview = false) {
  return { value, page, formArea, confidence, needsReview };
}
function reading() {
  return {
    formNumber: 2,
    pages: { front: 3, back: 4 },
    header: { nr: cell('072', 3, 'Nr. i formularit', 0.96), date: cell('12/11/2026', 3, 'Data'),
      room: cell('Dhoma 2', 3, 'Dhoma'), responsible: cell('Besa Provë', 3, 'Përgjegjësja', 0.55, true),
      responsibleSignature: cell(null, 3, 'Firma e përgjegjëses'), assistant: cell(null, 3, 'Ndihmës'), assistantSignature: cell(null, 3, 'Firma'),
      totalHours: cell('8', 3, 'Orë Gjithsej') },
    employees: [{ row: 1, name: cell('Besa Provë', 3, 'Punonjësi 1 · Emri e Mbiemri'),
      start: cell('07:00', 3, 'Punonjësi 1 · Fillim Pune'), end: cell('[e paqartë]', 3, 'Punonjësi 1 · Mbarim Pune', 0.4, true),
      totalHours: null, comment: cell(null, 3, 'Punonjësi 1 · Komente'), signature: cell('firmë', 3, 'Punonjësi 1 · Firma') }],
    plan: [], weights: { peshimi1: [{ table: 4, row: 2, nrThas: cell('4', 4, 'PESHIMI 1 · faqja PAS · rreshti 2 · Nr. thas.'), kg: cell('100', 4, 'PESHIMI 1 · faqja PAS · rreshti 2 · Kg') }], peshimi2: [], peshimi3: [] },
    printedTotals: {}, comments: [{ value: 'Dorëzim i plotë', page: 4, formArea: 'KOMENTE', confidence: 0.85, needsReview: false }],
    uncertain: [{ value: null, page: 3, formArea: 'Punonjësi 1', confidence: 0.4, needsReview: true, readAs: 'Besa P.' }],
    needsReview: true, warnings: [],
  };
}

test('paneli i kontrollit shfaq faqen, zonën, sigurinë dhe needsReview', () => {
  const item = { record: api.blankRecord('072'), warnings: [], reading: reading(), formNumber: 2, formCount: 2, sources: [], originals: [] };
  api.batchState.items = [item];
  api.batchState.index = 0;
  api.batchState.phase = 'review';
  api.state.route = 'editor';
  api.state.draft = item.record;
  api.state.mode = 'new';
  api.render();
  const view = w.document.getElementById('view');
  const panel = view.querySelector('.reading-panel');
  assert.ok(panel, 'paneli i leximit duhet të render-ohet');
  const text = panel.textContent;
  assert.match(text, /Faqja PARA: 3/);
  assert.match(text, /Faqja PAS: 4/);
  assert.match(text, /NeedsReview = true/);
  assert.match(text, /PESHIMI 1 · faqja PAS · rreshti 2 · Kg/);
  assert.match(text, /\[e paqartë\]/, 'vlera e paqartë shfaqet si e tillë, jo si vlerë');
  assert.match(text, /55%/, 'siguria e përgjegjëses shfaqet në përqindje');
  assert.match(text, /2\/2|2 nga 2/, 'formulari 2 nga 2 tregohet');
  assert.ok(panel.querySelectorAll('tr.reading-flag').length >= 1, 'rreshtat për kontroll theksohen');
});

test('kontrolli i shpejtë liston vetëm qelizat e dyshimta, para tabelës së plotë', () => {
  const item = { record: api.blankRecord('072'), warnings: [], reading: reading(), formNumber: 2, formCount: 2, sources: [], originals: [] };
  api.batchState.items = [item];
  api.batchState.index = 0;
  api.batchState.phase = 'review';
  api.state.route = 'editor';
  api.state.draft = item.record;
  api.state.mode = 'new';
  api.render();
  const panel = w.document.getElementById('view').querySelector('.reading-panel');
  const risk = panel.querySelector('.reading-risk');
  assert.ok(risk, 'lista e rrezikut duhet të shfaqet');
  const rows = risk.querySelectorAll('li');
  assert.equal(rows.length, api.readingRiskRows(item).length, 'numri i qelizave të dyshimta përputhet');
  assert.ok(rows.length >= 2 && rows.length < 10, 'lista është e shkurtër, jo tabela e plotë');
  assert.match(risk.textContent, /Kontrollo vetëm këto \d+ qeliza/);
  assert.match(risk.textContent, /Mbarim Pune/, 'vlera e paqartë listohet e para');
  assert.match(risk.textContent, /faqja 3/, 'faqja reale e qelizës tregohet');
  // Rreshtat e sigurt nuk futen në listë.
  assert.doesNotMatch(risk.textContent, /Nr\. thas\./);
  // Tabela e plotë vazhdon të jetë aty, për krahasim me letrën.
  assert.ok(panel.querySelectorAll('table.reading-table tbody tr').length > rows.length);
});

test('kur asnjë qelizë nuk është e dyshimtë, lista e thotë qartë', () => {
  const clean = reading();
  clean.header.responsible = cell('Besa Provë', 3, 'Përgjegjësja', 0.97);
  clean.employees[0].end = cell('15:00', 3, 'Punonjësi 1 · Mbarim Pune', 0.95);
  clean.uncertain = [];
  clean.needsReview = false;
  const item = { record: api.blankRecord('072'), warnings: [], reading: clean, formNumber: 2, formCount: 2, sources: [], originals: [] };
  api.batchState.items = [item];
  api.batchState.index = 0;
  api.batchState.phase = 'review';
  api.state.route = 'editor';
  api.state.draft = item.record;
  api.state.mode = 'new';
  api.render();
  const panel = w.document.getElementById('view').querySelector('.reading-panel');
  assert.equal(panel.querySelectorAll('.reading-risk').length, 0, 'pa dyshime, pa listë');
  assert.match(panel.textContent, /Asnjë qelizë e dyshimtë/);
});

run();
