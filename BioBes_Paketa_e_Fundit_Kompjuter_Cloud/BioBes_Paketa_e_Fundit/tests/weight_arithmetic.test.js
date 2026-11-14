#!/usr/bin/env node
'use strict';

// Kontrolli aritmetik i formularit: SHUMA = KG − AMBALAZHI.
//
// Rasti real që e nxori këtë test: tabela shkruan KG 1476 dhe AMBALAZHI 320,
// pra shuma duhet të jetë 1156, por në letër ishte shkruar 122. Sistemi e
// ruante 122 pa e vënë re. Tani e llogarit vetë në pajisje dhe e raporton.
//
// Rregulli i paprekshëm: kontrolli VETËM krahaso — asnjë shifër e letrës nuk
// zëvendësohet dhe as "korrigjohet" që totali të dalë.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const api = loadApp().window.__BIOBES__;

const rowsOf = (list) => list.map((r) => ({ bags: r.bags ?? '', kg: r.kg ?? '', packaging: r.packaging ?? '', sum: r.sum ?? '' }));
const find = (list, pattern) => list.find((w) => pattern.test(w));

test('rasti real: 1476 − 320 llogaritet 1156, jo 122', () => {
  const printed = { kg: '1476', packaging: '320', sum: '122' };
  const check = api.weighCheckCalc(rowsOf([{ kg: '1476', packaging: '320', sum: '122' }]), printed);
  assert.equal(check.net.expected, 1156);
  assert.equal(check.net.written, 122);
  assert.equal(check.net.ok, false);

  const issues = api.weighCheckIssues(rowsOf([{ kg: '1476', packaging: '320', sum: '122' }]), printed, 'Peshimi 1');
  assert.equal(issues.length, 1);
  assert.match(issues[0], /1156/);
  assert.match(issues[0], /122/);
  assert.match(issues[0], /1034/); // diferenca
  assert.match(issues[0], /nuk u ndryshuan/i);
});

test('shuma e saktë nuk prodhon asnjë paralajmërim', () => {
  const printed = { kg: '1476', packaging: '320', sum: '1156' };
  const rows = rowsOf([{ kg: '1000', packaging: '200', sum: '800' }, { kg: '476', packaging: '120', sum: '356' }]);
  assert.equal(api.weighCheckCalc(rows, printed).net.ok, true);
  assert.equal(api.weighCheckIssues(rows, printed, 'Peshimi 1').length, 0);
});

test('kur letra nuk ka shumë të shkruar, krahasohet me shumën e rreshtave', () => {
  const rows = rowsOf([{ kg: '1000', packaging: '200', sum: '800' }, { kg: '476', packaging: '120', sum: '300' }]);
  const issues = api.weighCheckIssues(rows, { kg: '', packaging: '', sum: '' }, 'Peshimi 1');
  assert.ok(find(issues, /rreshti 2/), issues.join(' | '));
  assert.match(find(issues, /rreshti 2/), /476 − Ambalazhi 120 = 356/);
});

test('pa KG ose pa Ambalazh nuk shpiket asnjë diferencë', () => {
  const check = api.weighCheckCalc(rowsOf([{ kg: '100', sum: '50' }]), { kg: '100', sum: '50' });
  assert.equal(check.net.ready, false);
  assert.equal(check.net.expected, null);
  assert.equal(api.weighCheckIssues(rowsOf([{ kg: '100', sum: '50' }]), { kg: '100', sum: '50' }, 'P').length, 0);
});

test('vlera e paqartë ([e paqartë]) nuk llogaritet si zero', () => {
  const check = api.weighCheckCalc(rowsOf([{ kg: '[e paqartë]', packaging: '20', sum: '80' }]), {});
  assert.equal(check.sums.seen.kg, false);
  assert.equal(check.net.ready, false);
});

test('numrat me presje dhe me pikë trajtohen njësoj', () => {
  const check = api.weighCheckCalc(rowsOf([{ kg: '100,5', packaging: '0,5', sum: '100' }]), { kg: '100,5', packaging: '0,5', sum: '100' });
  assert.equal(check.net.expected, 100);
  assert.equal(check.net.ok, true);
});

test('rreshtat e peshimit në formular marrin paralajmërimin automatik', () => {
  const data = {
    forms: [{
      record_number: '001',
      header: {},
      weighings: [{
        index: 1,
        product: 'Fenë',
        rows: [{ row: 1, bags: '3', kg: '1476', packaging: '320', sum: '122' }],
        total: { kg: '1476', packaging: '320', sum: '122' },
      }],
    }],
  };
  const form = api.aiReadings(data, { fileName: 'x.pdf', pageCount: 2 }).forms[0];
  const note = find(form.warnings, /1156/);
  assert.ok(note, 'duhet paralajmërim për kontrollin aritmetik: ' + form.warnings.join(' | '));
  assert.match(note, /1156/);
  assert.match(note, /122/);
  // Vlerat e letrës mbeten të paprekura.
  assert.equal(form.record.weighings[0].rows[0].sum, '122');
  assert.equal(form.record.weighings[0].rows[0].kg, '1476');
  assert.equal(form.record.weighings[0].printedTotal.sum, '122');
});

test('formulari i saktë nuk shënohet si gabim aritmetik', () => {
  const data = {
    forms: [{
      record_number: '002',
      header: {},
      weighings: [{
        index: 1,
        product: 'Kajsi',
        rows: [{ row: 1, kg: '500', packaging: '100', sum: '400' }],
        total: { kg: '500', packaging: '100', sum: '400' },
      }],
    }],
  };
  const form = api.aiReadings(data, { fileName: 'x.pdf', pageCount: 2 }).forms[0];
  assert.equal(find(form.warnings, /1156/), undefined);
});

test('kutia nën tabelë shfaq llogaritjen, jo vetëm gabimin', () => {
  const group = { rows: rowsOf([{ kg: '1476', packaging: '320', sum: '122' }]), printedTotal: { kg: '1476', packaging: '320', sum: '122' } };
  const html = api.weighCheckHTML(group, 0);
  assert.match(html, /1156/);
  assert.match(html, /class="weight-check bad"/);
  assert.match(html, /1476 − 320 = 1156/);

  const good = api.weighCheckHTML({ rows: rowsOf([{ kg: '500', packaging: '100', sum: '400' }]), printedTotal: { kg: '500', packaging: '100', sum: '400' } }, 1);
  assert.match(good, /class="weight-check ok"/);
});

test('kutia e kontrollit shfaqet në formularin e peshimeve', () => {
  const record = api.blankRecord('001');
  record.weighings[0].rows[0] = { bags: '', kg: '1476', packaging: '320', sum: '122' };
  record.weighings[0].printedTotal = { bags: '', kg: '1476', packaging: '320', sum: '122' };
  const html = api.weightsHTML(record, true);
  assert.match(html, /id="weight-check-0"/);
  assert.match(html, /mospërputhje aritmetike/i);
  // Tabela mbetet e lexueshme: vlerat si në letër.
  assert.match(html, /value="122"/);
});

test('pa mospërputhje, karta e peshimeve nuk shfaq alarm', () => {
  const record = api.blankRecord('002');
  record.weighings[0].rows[0] = { bags: '', kg: '500', packaging: '100', sum: '400' };
  record.weighings[0].printedTotal = { bags: '', kg: '500', packaging: '100', sum: '400' };
  const html = api.weightsHTML(record, true);
  assert.doesNotMatch(html, /mospërputhje aritmetike/i);
  assert.match(html, /aritmetika përputhet/);
});

test('regjistrimi i ruajtur mban totalin e shtypur pas normalizimit', () => {
  const record = api.blankRecord('003');
  record.weighings[0].rows[0] = { bags: '', kg: '1476', packaging: '320', sum: '122' };
  record.weighings[0].printedTotal = { bags: '', kg: '1476', packaging: '320', sum: '122' };
  const again = api.normalizeRecord(JSON.parse(JSON.stringify(record)));
  assert.equal(again.weighings[0].printedTotal.kg, '1476');
  assert.equal(again.weighings[0].printedTotal.sum, '122');
  const issues = api.weighCheckIssues(again.weighings[0].rows, again.weighings[0].printedTotal, 'Peshimi 1');
  assert.ok(find(issues, /1156/), 'kontrolli duhet të punojë edhe pas rihapjes së formularit');
});

run();
