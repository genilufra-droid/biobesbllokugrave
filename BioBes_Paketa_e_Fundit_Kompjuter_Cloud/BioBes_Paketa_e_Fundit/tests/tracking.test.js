#!/usr/bin/env node
'use strict';

// Gjurmimi i punonjësit sipas dhomës.
//
// Pyetja e përdoruesit: "X ka punuar 07:00–13:00, pastaj te cila dhomë ka
// kaluar". Ky test mbron:
//   1. Një ditë me disa intervale jep disa segmente, në rend kronologjik.
//   2. Formulari pa intervale jep një segment të vetëm për ditën, i shënuar
//      si i tillë — raporti nuk pretendon më shumë detaj nga ç'ka.
//   3. Totalet mblidhen sipas punonjësit dhe sipas dhomës.
//   4. Filtrat e raportit (data, dhomë, punonjës) vlejnë edhe për gjurmimin.
//   5. Fleta Excel e gjurmimit i ka të njëjtat rreshta.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp(null, `
;globalThis.__T = {
  state, db, blankRecord, normalizeRecord, trackingSegments, trackingTotals, trackingHTML,
  reportRecords, render, xlTrackingSheet, xlsxBytes, intervalMinutes, fmtMinutesLabel,
};`);
const w = dom.window;
const api = w.__T;

const emp = (name, start, end, room, intervals = []) => ({
  name, start, end, breakMinutes: '60', room, intervals,
  comment: '', signature: '', signatureName: name,
});
const iv = (name, start, end, room) => ({ name, start, end, room });

function fixture() {
  const a = api.blankRecord('001');
  a.date = '2026-11-10';
  a.room = 'Dhoma A';
  a.plan[0] = { ...a.plan[0], product: 'Saj Mali', actual: '300', unit: 'kg', packaging: 'thasë', status: 'Përfunduar' };
  a.employees[0] = emp('Arta Hoxha', '07:00', '17:00', 'Dhoma A', [
    iv('Arta Hoxha', '07:00', '13:00', 'Dhoma A'),
    iv('Arta Hoxha', '13:30', '17:00', 'Dhoma B'),
  ]);
  // Ditë e dytë, vetëm një interval, dhomë tjetër.
  a.employees[1] = emp('Besa Kola', '08:00', '12:00', 'Dhoma C', []);

  const b = api.blankRecord('002');
  b.date = '2026-11-11';
  b.room = 'Dhoma C';
  b.plan[0] = { ...b.plan[0], product: 'Boronicë', actual: '150', unit: 'kg', packaging: 'kuti', status: 'Në proces' };
  // Pa intervale: përdoret ora e ditës dhe dhoma e formularit.
  b.employees[0] = emp('Arta Hoxha', '07:00', '15:00', '', []);

  api.db.records = [a, b].map(api.normalizeRecord);
  api.state.report = {
    from: '', to: '', product: '', packaging: '', status: '', client: '',
    employee: '', room: '', tab: 'tracking', exportType: 'products',
  };
}

test('një ditë me dy intervale jep dy segmente, sipas radhës', () => {
  fixture();
  const segs = api.trackingSegments(api.reportRecords(), 'Arta Hoxha');
  const day1 = segs.filter((s) => s.date === '2026-11-10');
  assert.equal(day1.length, 2);
  assert.equal(day1[0].start, '07:00');
  assert.equal(day1[0].end, '13:00');
  assert.equal(day1[0].room, 'Dhoma A');
  assert.equal(day1[0].minutes, 360);
  assert.equal(day1[1].start, '13:30');
  assert.equal(day1[1].room, 'Dhoma B', 'kalimi në dhomën tjetër');
  assert.equal(day1[1].minutes, 210);
  assert.ok(day1[0].fromInterval && day1[1].fromInterval, 'të dy vijnë nga intervale të shkruara');
});

test('formulari pa intervale jep një segment dite, i shënuar si i tillë', () => {
  fixture();
  const segs = api.trackingSegments(api.reportRecords(), 'Arta Hoxha');
  const day2 = segs.filter((s) => s.date === '2026-11-11');
  assert.equal(day2.length, 1);
  assert.equal(day2[0].start, '07:00');
  assert.equal(day2[0].end, '15:00');
  assert.equal(day2[0].minutes, 480);
  assert.equal(day2[0].room, 'Dhoma C', 'dhoma merret nga formulari kur punonjësi s\'ka');
  assert.equal(day2[0].fromInterval, false, 'raporti e shënon që nuk vjen nga interval');
});

test('segments rradhiten kronologjikisht dhe filtrohen sipas emrit', () => {
  fixture();
  const all = api.trackingSegments(api.reportRecords(), '');
  const dates = all.map((s) => `${s.date} ${s.start}`);
  assert.deepEqual(JSON.parse(JSON.stringify(dates)), [
    '2026-11-10 07:00', '2026-11-10 08:00', '2026-11-10 13:30', '2026-11-11 07:00',
  ]);
  assert.equal(api.trackingSegments(api.reportRecords(), 'Besa').length, 1, 'kërkim i pjesshëm');
  assert.equal(api.trackingSegments(api.reportRecords(), 'arta hoxha').length, 3, 'pa shkronja të mëdha');
  assert.equal(api.trackingSegments(api.reportRecords(), 'Nuk Ekziston').length, 0);
});

test('totalet: minutat sipas punonjësit dhe sipas dhomës', () => {
  fixture();
  const { people, rooms } = api.trackingTotals(api.trackingSegments(api.reportRecords(), ''));
  const arta = people.find((p) => p.employee === 'Arta Hoxha');
  assert.equal(arta.minutes, 1050, '360 + 210 + 480');
  assert.equal(arta.count, 3, 'tre intervale');
  assert.equal(arta.rooms.size, 3, 'Dhoma A, B dhe C');
  const besa = people.find((p) => p.employee === 'Besa Kola');
  assert.equal(besa.minutes, 240);

  const byRoom = Object.fromEntries(rooms.map((r) => [r.room, r.minutes]));
  assert.deepEqual(byRoom, { 'Dhoma A': 360, 'Dhoma B': 210, 'Dhoma C': 720 });
  assert.equal(rooms.find((r) => r.room === 'Dhoma C').people.size, 2, 'dy punonjës në Dhoma C');
});

test('intervali i hapur (pa orë mbarimi) nuk shpiket si zero minuta', () => {
  const a = api.blankRecord('003');
  a.date = '2026-11-12';
  a.employees[0] = emp('Arta Hoxha', '07:00', '13:00', 'Dhoma A', [iv('Arta Hoxha', '07:00', '', 'Dhoma A')]);
  api.db.records = [api.normalizeRecord(a)];
  api.state.report = { from: '', to: '', product: '', packaging: '', status: '', client: '', employee: '', room: '', tab: 'tracking' };
  const segs = api.trackingSegments(api.reportRecords(), '');
  assert.equal(segs.length, 1);
  assert.equal(segs[0].minutes, null, 'pa orë mbarimi minuta është e panjohur, jo zero');
  const { people } = api.trackingTotals(segs);
  assert.equal(people[0].minutes, 0, 'totali nuk sajon minuta');
  assert.match(api.trackingHTML(api.reportRecords()), /—/, 'tabela shfaq vijë, jo 0 min');
});

test('intervali që kalon mesnatën llogaritet saktë', () => {
  const a = api.blankRecord('004');
  a.date = '2026-11-12';
  a.employees[0] = emp('Natë Ndërresa', '22:00', '06:00', 'Dhoma A', [iv('Natë Ndërresa', '22:00', '02:00', 'Dhoma A')]);
  api.db.records = [api.normalizeRecord(a)];
  api.state.report = { from: '', to: '', product: '', packaging: '', status: '', client: '', employee: '', room: '', tab: 'tracking' };
  const segs = api.trackingSegments(api.reportRecords(), '');
  assert.equal(segs[0].minutes, 240);
  assert.equal(api.fmtMinutesLabel(segs[0].minutes), '4:00 orë');
});

test('gjurmimi ndjek filtrat e raportit: data, dhomë dhe punonjës', () => {
  fixture();
  api.state.report.from = '2026-11-11';
  assert.equal(api.trackingSegments(api.reportRecords(), '').length, 1, 'vetëm dita e dytë');
  api.state.report.from = '';
  api.state.report.room = 'Dhoma B';
  const onlyB = api.trackingSegments(api.reportRecords(), '');
  assert.equal(onlyB.length, 1, 'vetëm intervali i dhomës B, jo e gjithë dita e formularit 001');
  assert.equal(onlyB[0].start, '13:30');
  assert.equal(onlyB[0].room, 'Dhoma B');
  api.state.report.room = '';
  api.state.report.employee = 'Besa';
  assert.equal(api.trackingSegments(api.reportRecords(), 'Besa').length, 1);
});

test('tab-i i gjurmimit: tabela, totalet dhe shënimi i ditës pa intervale', () => {
  fixture();
  api.state.route = 'reports';
  api.state.report.tab = 'tracking';
  api.render();
  const text = w.document.querySelector('#report-results').textContent;
  assert.match(text, /Gjurmimi i punonjësit sipas dhomës/);
  assert.match(text, /07:00/);
  assert.match(text, /13:30/);
  assert.match(text, /Dhoma B/);
  assert.match(text, /Kohë sipas punonjësit/);
  assert.match(text, /Kohë sipas dhomës/);
  assert.match(text, /17:30 orë/, 'totali i Artës 1050 min');
  assert.match(text, /\(dita\)/, 'segmenti pa intervale shënohet si ditë');
});

test('tab-i i gjurmimit me një punonjës të zgjedhur shfaq vetëm atë', () => {
  fixture();
  api.state.route = 'reports';
  api.state.report.tab = 'tracking';
  api.state.report.employee = 'Besa Kola';
  api.render();
  const text = w.document.querySelector('#report-results').textContent;
  assert.match(text, /Besa Kola/);
  assert.doesNotMatch(text, /Arta Hoxha/, 'punonjësi tjetër nuk shfaqet');
  assert.match(text, /4:00 orë/, '240 minuta');
});

test('shkrimi i emrit te fusha e gjurmimit filtron menjëherë', () => {
  fixture();
  api.state.route = 'reports';
  api.state.report.tab = 'tracking';
  api.render();
  const doc = w.document;
  const input = doc.querySelector('[data-report="employee"]');
  assert.ok(input, 'fusha e punonjësit ekziston');
  assert.equal(input.getAttribute('list'), 'tracking-employee-options');
  const options = [...doc.querySelectorAll('#tracking-employee-options option')].map((o) => o.value).sort();
  assert.deepEqual(options, ['Arta Hoxha', 'Besa Kola'].sort(), 'lista e sugjerimeve vjen nga të dhënat');
  input.value = 'Besa';
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(api.state.report.employee, 'Besa');
  assert.doesNotMatch(doc.querySelector('#report-results').textContent, /Arta Hoxha/);
});

test('Excel-i i gjurmimit: një rresht për interval, totali si formulë', () => {
  fixture();
  const sheet = api.xlTrackingSheet('Arta Hoxha');
  assert.equal(sheet.name, 'Gjurmimi');
  assert.equal(JSON.stringify(sheet.columns.map((c) => c.h)),
    JSON.stringify(['Data', 'Nr.', 'Punonjësi', 'Nga', 'Deri', 'Minuta', 'Dhoma', 'Burimi']));
  assert.equal(sheet.rows.length, 3);
  const first = sheet.rows[0];
  assert.equal(first[2], 'Arta Hoxha');
  assert.equal(first[3], '07:00');
  assert.equal(first[5], 360, 'minutat si numër');
  assert.equal(first[6], 'Dhoma A');
  assert.equal(first[7], 'Interval');
  const day2 = sheet.rows.find((r) => r[1] === '002');
  assert.equal(day2[7], 'Dita (hyrje–dalje)', 'segmenti i ditës shënohet qartë');
  // values[i] shfaqet te kolona i+1: Minuta është kolona 5, pra values[4].
  assert.equal(sheet.total.values[4], 1050);
  assert.equal(JSON.stringify(sheet.total.sumCols), '[5]');
  assert.match(sheet.subtitle, /Arta Hoxha/);
  assert.match(sheet.notes.join(' '), /Dhoma A 6:00 orë/);
});

test('pa të dhëna, gjurmimi thotë çfarë duhet bërë, jo tabelë bosh', () => {
  api.db.records = [];
  api.state.report = { from: '', to: '', product: '', packaging: '', status: '', client: '', employee: '', room: '', tab: 'tracking' };
  const html = api.trackingHTML(api.reportRecords());
  assert.match(html, /Nuk ka intervale për këtë përzgjedhje/);
  assert.match(html, /shto intervale te kartela/);
  assert.match(html, /pa të dhëna/, 'numëruesi nuk pretendon punë të regjistruar');
});

run();
