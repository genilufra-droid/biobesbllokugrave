#!/usr/bin/env node
'use strict';

// Një dokument i bashkuar (PDF/foto) me disa formularë BioBes: faqja PARA mban
// të dhënat e ditës, planin, punonjësit dhe peshimet 1–3; faqja PAS mban
// KOMENTE dhe peshimet 4–6. Testet kontrollojnë ndarjen në formularë, faqen,
// zonën e formularit, sigurinë, needsReview dhe mospërziejen e vlerave.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const api = loadApp().window.__BIOBES__;
const plain = (x) => JSON.parse(JSON.stringify(x));

function cell(value, page, formArea, confidence = 0.9, needsReview = false) {
  return { value, page, formArea, confidence, needsReview };
}
function weighing(index, page, rows, product = `Produkti ${index}`, total = null) {
  return {
    index,
    product: cell(product, page, `PESHIMI ${index}`),
    rows: rows.map(([row, bags, kg, packaging, sum], i) => ({
      row,
      bags: cell(bags, page, `PESHIMI ${index} · rreshti ${row}`, 0.92),
      kg: cell(kg, page, `PESHIMI ${index} · rreshti ${row}`, 0.9),
      packaging: cell(packaging, page, `PESHIMI ${index} · rreshti ${row}`, 0.88),
      sum: cell(sum, page, `PESHIMI ${index} · rreshti ${row}`, 0.87),
    })),
    total: total ? { bags: cell(total[0], page, `PESHIMI ${index} · SH`), kg: cell(total[1], page, `PESHIMI ${index} · SH`), packaging: cell(total[2], page, `PESHIMI ${index} · SH`), sum: cell(total[3], page, `PESHIMI ${index} · SH`) } : undefined,
  };
}
function employees(page, first) {
  return Array.from({ length: 12 }, (_, i) => (i === 0
    ? { name: cell(first, page, 'Punonjësi 1', 0.8), start: cell('07:00', page, 'Punonjësi 1 · Fillim Pune', 0.95), end: cell('16:00', page, 'Punonjësi 1 · Mbarim Pune', 0.95), comment: cell(null, page, 'Punonjësi 1 · Komente'), signature: cell('firmë', page, 'Punonjësi 1 · Firma') }
    : { name: cell(null, page, `Punonjësi ${i + 1}`) }));
}
function formOne() {
  return {
    form_number: 1,
    pages: { front: 1, back: 2 },
    header: {
      record_number: cell('071', 1, 'Nr. i formularit', 0.97),
      date: cell('12/11/2026', 1, 'Data', 0.95),
      room: cell('Dhoma 2', 1, 'Dhoma', 0.9),
      responsible: { name: cell('Arta Shembulli', 1, 'Përgjegjësja', 0.9), signature: cell('firmë', 1, 'Firma e përgjegjëses', 0.7) },
      assistant: { name: cell(null, 1, 'Ndihmës përgjegjësja') },
      total_hours: cell('9', 1, 'Orë Gjithsej', 0.9),
    },
    plan: [{ product: cell('Fenë', 1, 'Produkti 1'), status: cell('organik', 1, 'Produkti 1 · Statusi'), ordered_quantity: cell('400', 1, 'Produkti 1 · Sasia'), produced_quantity: cell(null, 1, 'Produkti 1 · Sasia e prodhuar'), unit: cell(null, 1, 'Produkti 1 · Njësia'), packaging: cell('25', 1, 'Produkti 1 · Paketimi'), client: cell('787', 1, 'Produkti 1 · Klienti'), comment: cell(null, 1, 'Produkti 1 · Komente') }],
    employees: employees(1, 'Arta Shembulli'),
    weighings: [weighing(1, 1, [[1, '5', '125', '25', '100']], 'Fenë', ['5', '125', '25', '100']), weighing(2, 1, [[1, '3', '75', '15', '60']]), weighing(3, 1, []), weighing(4, 2, [[1, '2', '50', '10', '40']])],
    comments: cell('Dorëzim i plotë', 2, 'KOMENTE', 0.85),
    uncertain: [{ field: 'Punonjësi 2 · Emri', value: 'Besa P.', page: 1, formArea: 'Punonjësi 2', confidence: 0.3, reason: 'shkrim i paqartë' }],
    warnings: [],
  };
}
function formTwo() {
  return {
    form_number: 2,
    pages: { front: 3, back: 4 },
    header: {
      record_number: cell('072', 3, 'Nr. i formularit', 0.96),
      date: cell('12/11/2026', 3, 'Data', 0.94),
      room: cell('Dhoma 2', 3, 'Dhoma'),
      responsible: { name: cell('Besa Provë', 3, 'Përgjegjësja'), signature: cell(null, 3, 'Firma e përgjegjëses') },
      assistant: { name: cell(null, 3, 'Ndihmës përgjegjësja') },
      total_hours: cell(null, 3, 'Orë Gjithsej'),
    },
    plan: [{ product: cell('Kajsi', 3, 'Produkti 1'), status: cell(null, 3, 'Produkti 1 · Statusi'), ordered_quantity: cell(null, 3, 'Produkti 1 · Sasia'), produced_quantity: cell(null, 3, 'Produkti 1 · Sasia e prodhuar'), unit: cell(null, 3, 'Produkti 1 · Njësia'), packaging: cell(null, 3, 'Produkti 1 · Paketimi'), client: cell(null, 3, 'Produkti 1 · Klienti'), comment: cell(null, 3, 'Produkti 1 · Komente') }],
    employees: employees(3, 'Besa Provë'),
    weighings: [weighing(1, 3, [[1, null, '80', null, null]], 'Kajsi'), weighing(2, 3, []), weighing(3, 3, []), weighing(4, 4, [[1, '4', '100', '20', '80']])],
    comments: cell(null, 4, 'KOMENTE'),
    uncertain: [],
    warnings: [],
  };
}
function document() {
  return {
    document: { file_name: 'skanimet_e_bashkuara.pdf', page_count: 4 },
    forms: [formOne(), formTwo()],
  };
}

test('një dokument me 2 formularë kthen 2 lexime, jo një të përzier', () => {
  const result = api.aiReadings(document());
  assert.equal(result.document.formCount, 2);
  assert.equal(result.forms.length, 2);
  assert.deepEqual(plain(result.forms.map((x) => x.reading.pages)), [{ front: 1, back: 2 }, { front: 3, back: 4 }]);
  assert.deepEqual(plain(result.forms.map((x) => x.reading.header.nr.value)), ['071', '072']);
  assert.deepEqual(plain(result.forms.map((x) => x.reading.header.responsible.value)), ['Arta Shembulli', 'Besa Provë']);
  assert.deepEqual(plain(result.forms.map((x) => x.reading.header.room.value)), ['Dhoma 2', 'Dhoma 2']);
});

test('vlere e paqartë nuk bëhet vlerë; mbetet null me needsReview', () => {
  const result = api.aiReadings(document());
  const uncertain = result.forms[0].reading.uncertain[0];
  assert.equal(uncertain.value, null);
  assert.equal(uncertain.needsReview, true);
  assert.equal(result.forms[0].reading.needsReview, true);
  assert.equal(result.forms[1].reading.needsReview, false);
});

test('çdo vlerë mban faqen, zonën e formularit dhe sigurinë', () => {
  const { reading } = api.aiReadings(document()).forms[0];
  assert.equal(reading.header.nr.page, 1);
  assert.equal(reading.header.nr.formArea, 'Nr. i formularit');
  assert.equal(reading.header.nr.confidence, 0.97);
  assert.equal(reading.comments[0].page, 2);
  assert.equal(reading.comments[0].formArea, 'KOMENTE');
  const row = reading.weights.peshimi1[0];
  assert.equal(row.nrThas.value, '5');
  assert.equal(row.nrThas.page, 1);
  assert.equal(row.nrThas.formArea, 'PESHIMI 1 · rreshti 1');
  assert.equal(row.nrThas.confidence, 0.92);
  // Peshimi 4 është kolona e parë e faqes PAS: shkon te peshimi1, por rreshti
  // mban tabelën (4) dhe faqen (2) e vet, që të mos përzihet me peshimin 1.
  assert.equal(reading.weights.peshimi2[0].table, 2);
  assert.equal(reading.weights.peshimi1.length, 2);
  assert.equal(reading.weights.peshimi1[1].table, 4);
  assert.equal(reading.weights.peshimi1[1].kg.value, '50');
  assert.equal(reading.weights.peshimi1[1].kg.page, 2);
  assert.equal(reading.weights.peshimi1[1].nrThas.value, '2');
});

test('fusha bosh kthehet null dhe firma e lexuar mbahet', () => {
  const { record, reading } = api.aiReadings(document()).forms[0];
  assert.equal(record.assistant.name, '');
  assert.equal(record.plan[0].actual, '');
  assert.equal(reading.header.assistant.value, null);
  assert.equal(reading.header.assistant.needsReview, false);
  assert.equal(reading.header.responsibleSignature.value, 'firmë');
  assert.equal(reading.header.responsibleSignature.needsReview, false);
});

test('tabela e peshimit nuk zhvendoset: rreshti ruhet ashtu siç është shtypur', () => {
  const { record, reading } = api.aiReadings(document()).forms[1];
  assert.equal(record.weighings[0].rows[0].kg, '80');
  assert.equal(record.weighings[0].rows[0].bags, '');
  assert.equal(record.weighings[3].rows[0].kg, '100');
  assert.equal(reading.weights.peshimi1[0].kg.value, '80');
  assert.equal(reading.weights.peshimi1[1].kg.value, '100');
  assert.equal(reading.weights.peshimi1[1].kg.page, 4);
});

test('formulari i vjetër me fusha të sheshta ndahet sipas vendit të shtypur', () => {
  const flat = {
    multiple_forms: true,
    plan: [{ product: 'A' }, { product: 'B' }, { product: 'C' }, { product: 'Ä', status: 'ok' }],
    employees: [],
    weighings: [{ index: 1, rows: [{ row: 1, kg: '10' }] }, { index: 4, rows: [{ row: 1, kg: '20' }] }],
    comments: ['komenti i parë', 'komenti i dytë'],
    warnings: [],
  };
  const result = api.aiReadings(flat);
  assert.equal(result.document.formCount, 2);
  assert.equal(result.forms[0].record.plan[1].product, 'B');
  assert.equal(result.forms[1].record.plan[0].product, 'Ä');
  assert.equal(result.forms[0].record.weighings[0].rows[0].kg, '10');
  assert.equal(result.forms[0].record.weighings[3].rows[0].kg, '20');
  assert.equal(result.forms[1].record.weighings[0].rows[0].kg, '');
  assert.equal(result.forms[0].record.comments, 'komenti i parë');
  assert.equal(result.forms[1].record.comments, 'komenti i dytë');
});

test('aiRecord mban sjelljen e mëparshme për një formular të vetëm', () => {
  const single = api.aiRecord({ record_number: '05', date: '12/11/2026', plan: [], employees: [], weighings: [], warnings: [] });
  assert.equal(single.record.nr, '05');
  assert.equal(single.document.formCount, 1);
  assert.ok(single.forms[0].fields || single.forms[0].header);
});

test('numri i formularit nuk huazohet nga formulari tjetër', () => {
  const second = formTwo();
  second.header.record_number = cell(null, 3, 'Nr. i formularit');
  const result = api.aiReadings({ forms: [formOne(), second] });
  assert.equal(result.forms[1].record.nr !== '071', true);
  assert.ok(result.forms[1].warnings.some((x) => /Numri nuk u lexua/.test(x)));
});

run();
