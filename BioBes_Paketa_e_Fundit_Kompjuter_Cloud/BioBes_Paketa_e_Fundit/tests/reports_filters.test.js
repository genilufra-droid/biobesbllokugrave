#!/usr/bin/env node
'use strict';

// Filtrat e raporteve.
//
// Çfarë mbron ky test:
//   1. Një regjistrim hyn vetëm nëse NJË rresht plani i plotëson TË GJITHA
//      filtrat — jo nëse filtri i produktit godet një rresht dhe ai i statusit
//      një tjetër.
//   2. Dhoma zbulohet me radhë: intervali → punonjësi → formulari.
//   3. Krahasimet nuk varen nga shkronjat e mëdha, theksat apo hapësirat.
//   4. Faqja i shkruan filtrat në `state.report` pa u rindërtuar (kursori),
//      dhe tab-et ndërrojnë përmbajtjen.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp(null, `
;globalThis.__F = {
  state, db, blankRecord, normalizeRecord, reportRecords, reportCountWithout,
  reportFilterKey, reportFilterSummary, reportRoomOf, reportPlanMatches,
  reportsHTML, reportResultsHTML, render, intervalMinutes, intervalsHTML,
  addInterval, delInterval, trackingSegments,
};`);
const w = dom.window;
const api = w.__F;

const planRow = (product, extra = {}) => ({
  product, status: '', planned: '', actual: '', unit: '', packaging: '',
  client: '', packageCount: '', minutes: '', comment: '', ...extra,
});

const employee = (name, extra = {}) => ({
  name, start: '', end: '', breakMinutes: '60', room: '', intervals: [],
  comment: '', signature: '', signatureName: '', ...extra,
});

function fixture() {
  const a = api.blankRecord('001');
  a.date = '2026-11-10';
  a.room = 'Dhoma A';
  a.plan[0] = planRow('Saj Mali', { status: 'Përfunduar', actual: '305', unit: 'kg', packaging: 'thasë', client: 'Kafe Arta', minutes: '90' });
  a.plan[1] = planRow('Boronicë', { status: 'Në proces', actual: '175', unit: 'kg', packaging: 'kuti', client: 'Market Besa', minutes: '45' });
  a.employees[0] = employee('Arta Hoxha', {
    start: '07:00', end: '16:00', room: 'Dhoma A',
    intervals: [
      { name: 'Arta Hoxha', start: '07:00', end: '13:00', room: 'Dhoma A' },
      { name: 'Arta Hoxha', start: '13:30', end: '16:00', room: 'Dhoma B' },
    ],
  });

  const b = api.blankRecord('002');
  b.date = '2026-11-11';
  b.room = 'Dhoma C';
  b.plan[0] = planRow('Saj Mali', { status: 'Përfunduar', actual: '290', unit: 'kg', packaging: 'thasë', client: 'Kafe Arta', minutes: '60' });
  // Rreshti i punonjësit nuk ka dhomë; dhoma vjen nga formulari (Dhoma C).
  b.employees[0] = employee('Besa Kola', { start: '08:00', end: '15:00' });

  // Formular me shkronja të mëdha dhe theksa të shkruara ndryshe nga UI-ja.
  const c = api.blankRecord('003');
  c.date = '2026-11-12';
  c.plan[0] = planRow('  SAJ   MALI ', { status: 'PËRFUNDUAR', actual: '100', unit: 'kg', packaging: 'Thasë', client: 'KAFE ARTA', minutes: '' });
  c.employees[0] = employee('ARTA HOXHA', { start: '07:00', end: '12:00', room: 'Dhoma Z' });

  api.db.records = [a, b, c].map(api.normalizeRecord);
}

const reset = (patch = {}) => {
  api.state.report = {
    from: '', to: '', product: '', packaging: '', status: '', client: '',
    employee: '', room: '', tab: 'summary', exportType: 'products',
  };
  Object.assign(api.state.report, patch);
};

test('pa filtra kthehen të gjithë regjistrimet', () => {
  fixture();
  reset();
  assert.equal(api.reportRecords().length, 3);
});

test('filtri i produktit punon pavarësisht shkronjave të mëdha dhe hapësirave', () => {
  fixture();
  reset({ product: 'saj mali' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001', '002', '003']);
  reset({ product: '  SAJ   MALI ' });
  assert.equal(api.reportRecords().length, 3, 'hapësirat e tepërta nuk duhet të thyejnë filtrin');
  reset({ product: 'boronic' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001'], 'kërkim i pjesshëm, jo vetëm barazi');
});

test('të gjitha filtrat duhet të plotësohen nga i njëjti rresht plani', () => {
  fixture();
  // "Saj Mali" + "Në proces" janë dy rreshta të ndryshëm të formularit 001.
  reset({ product: 'Saj Mali', status: 'Në proces' });
  assert.equal(api.reportRecords().length, 0, 'filtrat nuk duhet të kombinohen nga rreshta të ndryshëm');
  // "Boronicë" + "Në proces" janë i njëjti rresht.
  reset({ product: 'Boronicë', status: 'Në proces' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001']);
});

test('filtri i statusit, ambalazhit dhe klientit', () => {
  fixture();
  reset({ status: 'përfunduar' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001', '002', '003']);
  reset({ status: 'Në proces' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001']);
  reset({ packaging: 'kuti' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001']);
  reset({ client: 'market besa' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001']);
  reset({ client: 'Kafe Arta', packaging: 'kuti' });
  assert.equal(api.reportRecords().length, 0, 'klienti e ambalazhi janë në rreshta të ndryshëm');
});

test('dhoma: intervali mbizotëron punonjësin dhe formularin', () => {
  fixture();
  reset({ room: 'Dhoma B' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001'], 'Dhoma B vjen vetëm nga intervali i dytë');
  reset({ room: 'Dhoma C' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['002'], 'pa interval, dhoma merret nga formulari');
  reset({ room: 'Dhoma Z' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['003'], 'dhoma e punonjësit vlen kur formulari s\'ka dhomë');
  // Kur formulari 001 ka edhe dhomë formulari "Dhoma A" edhe intervale, dhoma e
  // punonjësit "Dhoma A" nuk duhet të fshehë "Dhoma B" të intervalit të dytë.
  reset({ room: 'Dhoma A' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001']);
});

test('filtri i punonjësit pranon intervalin dhe një emër me shkronja të mëdha', () => {
  fixture();
  reset({ employee: 'arta hoxha' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001', '003'], 'emri krahasohet pa shkronja të mëdha');
  reset({ employee: 'Besa' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['002'], 'kërkim i pjesshëm i emrit');
});

test('datat kufizojnë periudhën, edhe vetëm nga njëra anë', () => {
  fixture();
  reset({ from: '2026-11-11' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['002', '003']);
  reset({ to: '2026-11-10' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['001']);
  reset({ from: '2026-11-11', to: '2026-11-11' });
  assert.deepEqual(api.reportRecords().map((r) => r.nr), ['002']);
});

test('pa rezultat raporti thotë sa filtra janë aktivë, nuk duket si gabim', () => {
  fixture();
  reset({ room: 'Dhoma X' });
  const text = api.reportFilterSummary(api.reportRecords().length);
  assert.match(text, /0 regjistrime nga 3/);
  assert.match(text, /dhomë “Dhoma X”/);
  assert.match(text, /Hidh një filtër/);
  reset();
  assert.match(api.reportFilterSummary(3), /3 regjistrime nga 3 gjithsej/);
});

test('emri i combo-s shndërrohet në çelës të filtrit, dhe e panjohura kthehet null', () => {
  assert.equal(api.reportFilterKey('report-products'), 'product');
  assert.equal(api.reportFilterKey('report-packagings'), 'packaging');
  assert.equal(api.reportFilterKey('report-statuses'), 'status');
  assert.equal(api.reportFilterKey('report-clients'), 'client');
  assert.equal(api.reportFilterKey('report-employees'), 'employee');
  assert.equal(api.reportFilterKey('report-rooms'), 'room');
  assert.equal(api.reportFilterKey('report-nonsense'), null);
});

test('numëruesi tregon sa regjistrime hiqen nga secili filtër', () => {
  fixture();
  reset();
  assert.equal(api.reportCountWithout('room'), 3, 'pa filtër kthehen të 3');
  assert.equal(api.reportCountWithout('product'), 3);
  reset({ room: 'Dhoma B' });
  assert.equal(api.reportCountWithout('room'), 3, 'pa filtrin e dhomës do të ktheheshin të 3');
});

test('faqja shfaq të gjitha filtrat dhe ruan vlerën e shkruar', () => {
  fixture();
  reset({ product: 'Saj Mali', packaging: 'thasë', status: 'Përfunduar', client: 'Kafe Arta', room: 'Dhoma A', employee: 'Arta' });
  api.state.route = 'reports';
  api.render();
  const doc = w.document;
  const values = [...doc.querySelectorAll('#report-filters-page .report-filters .input')].map((el) => el.value);
  assert.deepEqual(values.slice(2), ['Saj Mali', 'thasë', 'Përfunduar', 'Kafe Arta', 'Arta', 'Dhoma A'],
    'produkti, ambalazhi, statusi, klienti, punonjësi dhe dhoma duhet të mbeten të shkruara');
  // Vetëm formulari 001 i plotëson të gjashtë filtrat njëherësh (003 ka dhomë Z).
  assert.match(doc.querySelector('#report-filters-page .small-note').textContent, /^1 regjistrime nga 3/);
});

test('shkrimi në filtër përditëson vetëm rezultatet, pa rindërtuar faqen', () => {
  fixture();
  reset();
  api.state.route = 'reports';
  api.render();
  const doc = w.document;
  const strip = doc.querySelector('#report-filters-page');
  const input = doc.querySelector('[data-combo="report-products"]');
  input.value = 'Boronicë';
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(api.state.report.product, 'Boronicë', 'teksti i shkruar merret si filtër edhe pa zgjedhur opsionin');
  // Fokusi vetë nuk matet dot me jsdom kur #app është i fshehur (elementet nuk
  // marrin fokus në një pemë display:none), prandaj matet ajo që e shkakton
  // humbjen e fokusit në një shfletues: a rindërtohet faqja.
  assert.equal(doc.querySelector('#report-filters-page'), strip, 'karta e filtrave nuk rindërtohet');
  assert.equal(doc.querySelector('[data-combo="report-products"]'), input, 'fusha e filtrit mbetet e njëjta nyje');
  assert.equal(doc.querySelector('[data-report="from"]').value, '', 'datat nuk preken');
  assert.match(doc.querySelector('#report-results').textContent, /Boronicë/);
  assert.match(doc.querySelector('#report-results').textContent, /175/);

  input.value = 'Boronic';
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(api.state.report.product, 'Boronic');
  assert.equal(doc.querySelector('[data-combo="report-products"]'), input, 'edhe pas shkrimit të dytë nyja është e njëjta');
  // Kërkimi i pjesshëm "Boronic" nuk gjen asnjë produkt, prandaj tabela është
  // bosh — por numëruesi i formularëve mbetet 1, jo 0.
  assert.match(doc.querySelector('#report-results').textContent, /Formularë1 Sipas datave të zgjedhura/);
  assert.match(doc.querySelector('#report-results').textContent, /Nuk ka të dhëna për këtë përzgjedhje/);
});

test('tab-i rindërtohet vetëm brenda zonës së rezultateve', () => {
  fixture();
  reset();
  api.state.route = 'reports';
  api.render();
  const doc = w.document;
  const strip = doc.querySelector('#report-filters-page');
  doc.querySelector('[data-action="report-tab"][data-tab="duration"]').click();
  assert.equal(doc.querySelector('#report-filters-page'), strip, 'filtrat nuk preken nga ndërrimi i tab-it');
});

test('tab-et ndërrojnë përmbajtjen dhe ruhen në state.report.tab', () => {
  fixture();
  reset();
  api.state.route = 'reports';
  api.render();
  const doc = w.document;
  const tabs = [...doc.querySelectorAll('#report-results .pill-tab')].map((b) => b.textContent.trim());
  assert.deepEqual(tabs, ['Përmbledhje', 'Kohëzgjatja e proceseve', 'Prodhimi kundrejt planit', 'Gjurmimi i punonjësit', 'Kontrolli plan ↔ peshime', 'Komentet dhe arsyet']);
  // Tab-i i katërt kontrollon planin kundrejt tabelave të peshimit.
  doc.querySelector('[data-action="report-tab"][data-tab="check"]').click();
  assert.match(doc.querySelector('#report-results').textContent, /Kontrolli plan ↔ peshime/);
  assert.doesNotMatch(doc.querySelector('#report-results').textContent, /Prodhimi sipas produktit/);
  doc.querySelector('[data-action="report-tab"][data-tab="tracking"]').click();
  assert.equal(api.state.report.tab, 'tracking');
  assert.match(doc.querySelector('#report-results').textContent, /Gjurmimi i punonjësit sipas dhomës/);
  assert.doesNotMatch(doc.querySelector('#report-results').textContent, /Prodhimi sipas produktit/,
    'tab-i i gjurmimit nuk duhet të mbajë tabelat e përmbledhjes');

  doc.querySelector('[data-action="report-tab"][data-tab="duration"]').click();
  assert.match(doc.querySelector('#report-results').textContent, /Kohëzgjatja e proceseve sipas produktit/);
  assert.ok(doc.querySelector('[data-action="report-tab"][data-tab="duration"]').classList.contains('active'),
    'tab-i aktiv duhet të shënohet');

  doc.querySelector('[data-action="report-tab"][data-tab="summary"]').click();
  assert.match(doc.querySelector('#report-results').textContent, /Prodhimi sipas produktit/);
});

test('pastro filtrat i heq të gjithë, por ruan tab-in e hapur', () => {
  fixture();
  reset({ product: 'Boronicë', room: 'Dhoma B', status: 'Në proces', tab: 'tracking' });
  api.state.route = 'reports';
  api.render();
  w.document.querySelector('[data-action="clear-filters"]').click();
  assert.equal(api.state.report.product, '');
  assert.equal(api.state.report.room, '');
  assert.equal(api.state.report.status, '');
  assert.equal(api.state.report.tab, 'tracking');
  assert.equal(api.reportRecords().length, 3);
});

test('intervali: minutat, orari pas mesnate dhe kolona e dhomës', () => {
  assert.equal(api.intervalMinutes({ start: '07:00', end: '13:00' }), 360);
  assert.equal(api.intervalMinutes({ start: '13:30', end: '16:00' }), 150);
  assert.equal(api.intervalMinutes({ start: '22:00', end: '02:00' }), 240, 'kalimi i mesnatës');
  assert.equal(api.intervalMinutes({ start: '7:00', end: '8:30' }), 90, 'ora pa zero');
  assert.equal(api.intervalMinutes({ start: '07:00', end: '' }), null);
  assert.equal(api.intervalMinutes({}), null);
  assert.equal(api.intervalMinutes(null), null);
});

test('edituesi i intervaleve: shton, ruan dhomën dhe fshin', () => {
  fixture();
  api.state.route = 'editor';
  api.state.mode = 'edit';
  api.state.draft = api.db.records[1]; // Besa Kola, pa intervale
  api.render();
  const doc = w.document;
  assert.match(doc.querySelector('#view').textContent, /Intervalet dhe dhomat/);

  // Shto intervalin e parë nga butoni i vërtetë.
  doc.querySelector('[data-action="add-interval"]').click();
  assert.equal(api.state.draft.employees[0].intervals.length, 1);
  const iv = api.state.draft.employees[0].intervals[0];
  assert.equal(iv.start, '08:00', 'propozohet fillimi i ditës');
  assert.equal(iv.end, '15:00', 'propozohet mbarimi i ditës');
  assert.equal(iv.room, 'Dhoma C', 'propozohet dhoma e formularit');

  // Shkruaj dhomën e dytë dhe orarin, siç bën përdoruesi.
  const room = doc.querySelector('[data-bind="employees.0.intervals.0.room"]');
  room.value = 'Dhoma B';
  room.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(api.state.draft.employees[0].intervals[0].room, 'Dhoma B');

  const start = doc.querySelector('[data-bind="employees.0.intervals.0.start"]');
  start.value = '7:05';
  start.dispatchEvent(new w.Event('change', { bubbles: true }));
  assert.equal(api.state.draft.employees[0].intervals[0].start, '07:05', 'ora normalizohet si te punonjësi');
  // Ora e pavlefshme nuk e prish të dhënën e ruajtur më parë.
  start.value = '7:5';
  start.dispatchEvent(new w.Event('change', { bubbles: true }));
  assert.equal(api.state.draft.employees[0].intervals[0].start, '07:05', 'ora e pavlefshme hidhet poshtë, e vjetra mbetet');

  // Shto intervalin e dytë: fillon aty ku mbaroi i pari.
  api.state.draft.employees[0].intervals[0].end = '13:00';
  api.render();
  doc.querySelector('[data-action="add-interval"]').click();
  const list = api.state.draft.employees[0].intervals;
  assert.equal(list.length, 2);
  assert.equal(list[1].start, '13:00', 'fillimi i intervalit të ri nuk mbivendoset');

  // Fshi të parin.
  w.document.querySelector('[data-action="del-interval"][data-emp="0"][data-iv="0"]').click();
  assert.equal(api.state.draft.employees[0].intervals.length, 1);
  assert.equal(api.state.draft.employees[0].intervals[0].start, '13:00');
});

test('intervali i ruajtur: punonjësi pa emër merr emrin e intervalit në gjurmim', () => {
  const r = api.blankRecord('009');
  r.date = '2026-11-13';
  r.employees[0] = employee('', {
    intervals: [{ name: 'Arta Hoxha', start: '07:00', end: '13:00', room: 'Dhoma A' }],
  });
  api.db.records = [api.normalizeRecord(r)];
  const segs = api.trackingSegments(api.db.records, 'Arta Hoxha');
  assert.equal(segs.length, 1);
  assert.equal(segs[0].employee, 'Arta Hoxha');
  assert.equal(segs[0].room, 'Dhoma A');
});

// Shiriti i shkarkimit shfaqej DY herë në tab-in e përmbledhjes: një herë si `${bar}`
// pas tab-eve dhe një herë me një thirrje të dytë `reportExportBar(rs.length)` pas
// kartave statistikore. Përdoruesi shihte të njëjtat 11 butona dy herë.
test('shiriti i shkarkimit shfaqet një herë, në çdo tab', () => {
  fixture();
  const tabs = ['summary', 'duration', 'plan', 'tracking', 'check', 'comments'];
  for (const tab of tabs) {
    reset({ tab });
    api.state.route = 'reports';
    api.render();
    const root = w.document.getElementById('report-results');
    assert.equal(root.querySelectorAll('.list-tools').length, 1,
      `tab-i ${tab} duhet të ketë saktësisht një shirit shkarkimi`);
    assert.equal(root.querySelectorAll('[data-action="export-report-pro"]').length, 1,
      `tab-i ${tab} duhet të ketë vetëm një buton "Të gjitha"`);
    assert.equal(root.querySelectorAll('.pill-tab').length, 6,
      `tab-i ${tab} duhet t'i mbajë gjashtë tab-et`);
  }
});

run();
