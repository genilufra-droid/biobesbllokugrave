#!/usr/bin/env node
'use strict';

// Kohëzgjatja e proceseve.
//
// Pyetja e përdoruesit: "sa kohë zgjati një proces" dhe "sa orë shkuan për një
// produkt". Ky test mbron llogaritjen:
//   1. Minutat mblidhen sipas produkt + ambalazh + njësi.
//   2. "Kohë / njësi" është raport i shumave (minuta ÷ sasi), jo mesatare e
//      mesatareve.
//   3. Rreshtat pa minuta NUK hyjnë në total dhe numërohen veç.
//   4. Ndarja % i ndan minutat e produktit me totalin e minutave.
//   5. Fleta Excel ka kolonat e njëjta dhe totalin si formulë SUM.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp(null, `
;globalThis.__D = {
  state, db, blankRecord, normalizeRecord, processSummary, processRows, durationHTML, render,
  fmtMinutesLabel, fmtUnitMinutes, reportRecords, metrics, xlDurationSheet, xlsxBytes,
};`);
const w = dom.window;
const api = w.__D;

const planRow = (product, minutes, extra = {}) => ({
  product, status: '', planned: '', actual: '', unit: '', packaging: '',
  client: '', packageCount: '', minutes, comment: '', ...extra,
});

function fixture() {
  const a = api.blankRecord('001');
  a.date = '2026-11-10';
  a.plan = [
    planRow('Saj Mali', '90', { actual: '305', unit: 'kg', packaging: 'thasë' }),
    planRow('Boronicë', '45', { actual: '175', unit: 'kg', packaging: 'kuti' }),
  ];
  const b = api.blankRecord('002');
  b.date = '2026-11-11';
  b.plan = [
    planRow('Saj Mali', '60', { actual: '290', unit: 'kg', packaging: 'thasë' }),
    planRow('Mollë', '', { actual: '50', unit: 'kg', packaging: 'kasa' }),
    planRow('Dardhë', '15', { actual: '', unit: '', packaging: 'kasa' }),
  ];
  api.db.records = [a, b].map(api.normalizeRecord);
  api.state.report = {
    from: '', to: '', product: '', packaging: '', status: '', client: '',
    employee: '', room: '', tab: 'duration', exportType: 'products',
  };
}

test('minutat mblidhen sipas produktit, ambalazhit dhe njësisë', () => {
  fixture();
  const { rows } = api.processSummary(api.reportRecords());
  const saj = rows.find((x) => x.product === 'Saj Mali');
  assert.equal(saj.minutes, 150, '90 + 60 minuta');
  assert.equal(saj.qty, 595, '305 + 290 kg');
  assert.equal(saj.count, 2, 'dy rreshta plani');
  const boro = rows.find((x) => x.product === 'Boronicë');
  assert.equal(boro.minutes, 45);
  assert.equal(boro.qty, 175);
});

test('kohë / njësi është raport i shumave, jo mesatare e mesatareve', () => {
  fixture();
  const { rows, total, qty, perUnit } = api.processSummary(api.reportRecords());
  const saj = rows.find((x) => x.product === 'Saj Mali');
  // 150 min / 595 kg = 0.2521 min/kg. Mesatarja e 90/305 dhe 60/290 do të ishte
  // 0.2509 — shumë afër, prandaj krahasohet me raportin e saktë.
  assert.equal(Math.round(saj.perUnit * 10000) / 10000, Math.round((150 / 595) * 10000) / 10000);
  assert.equal(total, 210, '90 + 45 + 60 + 15');
  assert.equal(qty, 820, '305 + 175 + 290 + 50');
  assert.equal(Math.round(perUnit * 10000) / 10000, Math.round((210 / 820) * 10000) / 10000);
});

test('rreshtat pa minuta nuk hyjnë në total dhe numërohen veç', () => {
  fixture();
  const { rows, total, untimed } = api.processSummary(api.reportRecords());
  const molle = rows.find((x) => x.product === 'Mollë');
  assert.equal(molle.minutes, 0);
  assert.equal(molle.untimed, 1, 'një rresht pa minuta');
  assert.equal(untimed, 1);
  assert.equal(total, 210, 'pa minutat e Mollës, që nuk u shkruan');
});

test('minuta e pavlefshme nuk prish totalin', () => {
  const r = api.blankRecord('003');
  r.plan = [
    planRow('Saj Mali', '90', { actual: '100', unit: 'kg' }),
    planRow('Saj Mali', 'abc', { actual: '100', unit: 'kg' }),
    planRow('Saj Mali', '-5', { actual: '100', unit: 'kg' }),
    planRow('Saj Mali', '0', { actual: '100', unit: 'kg' }),
  ];
  api.db.records = [api.normalizeRecord(r)];
  api.state.report.product = '';
  const { total, untimed, rows } = api.processSummary(api.reportRecords());
  assert.equal(total, 90, 'zero nuk shton kohë, por nuk e prish totalin');
  assert.equal(untimed, 2, 'teksti dhe numri negativ hidhen poshtë; zero është e shkruar');
  assert.equal(rows[0].timed, 2, '90 dhe 0 kanë minutë të shkruar');
  assert.equal(rows[0].count, 1, '“Rreshta” numëron formularët, jo rreshtat e planit');
  assert.equal(rows[0].timed + rows[0].untimed, 4, 'të katër rreshtat e planit kontrollohen');
});

test('ndarja në përqindje i ndan minutat me totalin', () => {
  fixture();
  const { rows } = api.processSummary(api.reportRecords());
  const share = Object.fromEntries(rows.filter((x) => x.minutes).map((x) => [x.product, Math.round(x.share * 100)]));
  assert.equal(share['Saj Mali'], 71, '150/210');
  assert.equal(share['Boronicë'], 21, '45/210');
  assert.equal(share['Dardhë'], 7, '15/210');
  assert.equal(rows.find((x) => x.product === 'Mollë').share, 0);
});

test('formati i minutave: orë:minuta për totalin, minuta e dy dhjetore për njësinë', () => {
  assert.equal(api.fmtMinutesLabel(360), '6:00 orë');
  assert.equal(api.fmtMinutesLabel(150), '2:30 orë');
  assert.equal(api.fmtMinutesLabel(45), '45 min');
  assert.equal(api.fmtMinutesLabel(0), '0 min');
  assert.equal(api.fmtMinutesLabel(null), '');
  assert.equal(api.fmtUnitMinutes(0.2521), '0,25');
  assert.equal(api.fmtUnitMinutes(0.3), '0,3');
});

test('tab-i i kohëzgjatjes shfaq tabelën dhe njoftimin për rreshtat pa kohë', () => {
  fixture();
  api.state.route = 'reports';
  api.state.report.tab = 'duration';
  api.render();
  const text = w.document.querySelector('#report-results').textContent;
  assert.match(text, /Kohëzgjatja e proceseve sipas produktit/);
  assert.match(text, /Saj Mali/);
  assert.match(text, /2:30 orë/, 'totali i Saj Malit');
  assert.match(text, /3:30 orë/, 'totali i përgjithshëm 210 min');
  assert.match(text, /1 rreshta plani nuk kanë minuta të shkruara/, 'njoftimi për rreshtin pa kohë');
  assert.doesNotMatch(text, /Prodhimi sipas produktit/, 'tab-i i kohëzgjatjes nuk mbajt tabelat e përmbledhjes');
});

test('raporti i kohëzgjatjes respekton filtrat e raportit', () => {
  fixture();
  api.state.report.product = 'Boronicë';
  api.state.report.tab = 'duration';
  api.state.route = 'reports';
  api.render();
  const text = w.document.querySelector('#report-results').textContent;
  assert.match(text, /Boronicë/);
  assert.doesNotMatch(text, /Saj Mali/, 'produkti tjetër filtrohet');
  assert.match(text, /45 min/);
});

test('Excel-i i kohëzgjatjes: kolonat, vlerat numerike dhe formula e totalit', () => {
  fixture();
  const sheet = api.xlDurationSheet();
  assert.equal(sheet.name, 'Kohëzgjatja');
  // Vargu vjen nga realm-i i jsdom-it, prandaj krahasohet si tekst JSON.
  assert.equal(JSON.stringify(sheet.columns.map((c) => c.h)), JSON.stringify([
    'Nr.', 'Produkti', 'Paketimi', 'Minuta', 'Kohë / njësi (min)', 'Sasia',
    'Njësia', 'Rreshta', 'Pa kohë', 'Ndarja %',
  ]));
  const saj = sheet.rows.find((r) => r[1] === 'Saj Mali');
  assert.equal(saj[3], 150, 'minutat si numër, jo tekst');
  assert.equal(saj[5], 595);
  assert.equal(saj[8], 0, 'pa rreshta pa kohë');
  assert.equal(sheet.rows.find((r) => r[1] === 'Mollë')[8], 1);
  // values[i] shfaqet te kolona i+1: Minuta është kolona 3, pra values[2].
  assert.equal(sheet.total.values[2], 210);
  assert.equal(sheet.total.values[3], 0.26, 'kohë për njësi: 210 min / 820 kg = 0,2561');
  assert.equal(JSON.stringify(sheet.total.sumCols), '[3,5]', 'totali llogaritet me formulë mbi kolonat Minuta dhe Sasia');
  assert.ok(sheet.notes.some((n) => /pa minuta/.test(n)), 'shënimi për rreshtat pa kohë mbetet në fletë');
  const bytes = api.xlsxBytes({ title: 'BioBes', sheets: [sheet] });
  assert.ok((bytes.length || bytes.byteLength) > 2000, 'skedari xlsx ndërtohet');
});

test('pa asnjë rresht me minuta, raporti nuk pretendon kohë zero', () => {
  const r = api.blankRecord('004');
  r.plan = [planRow('Saj Mali', '', { actual: '100', unit: 'kg' })];
  api.db.records = [api.normalizeRecord(r)];
  api.state.report = { from: '', to: '', product: '', packaging: '', status: '', client: '', employee: '', room: '', tab: 'duration' };
  const { total, perUnit, untimed } = api.processSummary(api.reportRecords());
  assert.equal(total, 0);
  assert.equal(perUnit, null, 'pa minuta nuk shpiket kohë për njësi');
  assert.equal(untimed, 1);
  api.state.route = 'reports';
  api.render();
  const text = w.document.querySelector('#report-results').textContent;
  assert.match(text, /1 rreshta plani nuk kanë minuta/);
  assert.doesNotMatch(text, /0 min\/njësi/);
});

run();
