#!/usr/bin/env node
'use strict';

// Dita e punës dhe gjurma e plotë e punonjësit.
//
// Kërkesa e përdoruesit: *"kohëzgjatja është në ditë dhe orë, pra ose 2 ditë ose
// 5 orë 8 orë 2.5 ditë etj"* dhe *"gjurmimi duhet traceability: ku ishte, ku
// shkoi, te kush formular ka bërë hyrje, te kush dalje, dhe link me ato formular
// për t'i hapur"*.
//
// Ky test mbron tri gjëra:
//   1. Konvertimi ditë ↔ orë me bazën që e zgjedh përdoruesi (jo 8 e ngurtë).
//   2. Fushat e formularit (ditë + orë) shkruajnë minutat e sakta, dhe hyrja e
//      pavlefshme NUK e prish vlerën e ruajtur.
//   3. Gjurma: hyrje, dalje, formulari ku u shënuan, dhoma e mëparshme, dhoma
//      tjetër, ndërprerja — dhe linku që hap vërtet atë formular.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp(null, `
;globalThis.__W = {
  state, db, blankRecord, normalizeRecord, render, reportRecords,
  durationMinutes, fmtDuration, durationParts, durationFromParts, workdayMinutes,
  workdayLabel, syncDurationField, trackingSegments, trackingTrace, trackingMoves,
  trackingTotals, trackingHTML, xlTrackingSheet, xlDurationSheet, xlsxBytes,
  setWorkday, currentWorkday,
};`);
const w = dom.window;
const api = w.__W;

const iv = (name, start, end, room) => ({ name, start, end, room });
const record = (nr, date, intervals, minutes = '480', product = 'Saj Mali') => {
  const r = api.blankRecord(nr);
  r.date = date;
  r.responsible = { name: 'Koli Tufit', signature: '' };
  r.plan[0] = { ...r.plan[0], product, status: 'Përfunduar', minutes: String(minutes), actual: '305', unit: 'kg', packaging: 'thasë' };
  r.employees[0] = { name: 'Arta Hoxha', start: '', end: '', breakMinutes: '60', room: '', intervals, comment: '', signature: '' };
  return api.normalizeRecord(r);
};
const resetReport = (patch = {}) => {
  api.state.report = {
    from: '', to: '', product: '', packaging: '', status: '', client: '',
    employee: '', room: '', tab: 'tracking', exportType: 'products',
  };
  Object.assign(api.state.report, patch);
};
const twoDays = () => {
  api.db.records = [
    record('001', '2026-11-10', [iv('Arta Hoxha', '07:00', '13:00', 'Dhoma A'), iv('Arta Hoxha', '13:30', '17:00', 'Dhoma B')], 1200),
    record('002', '2026-11-11', [iv('Arta Hoxha', '07:00', '12:00', 'Dhoma B'), iv('Arta Hoxha', '12:30', '16:00', 'Dhoma C')], 300),
  ];
  resetReport();
};

test('dita e punës: parazgjedhja 8 orë, e ndryshueshme dhe e ruajtur', () => {
  assert.equal(api.workdayMinutes(undefined), 480);
  assert.equal(api.workdayMinutes('600'), 600);
  assert.equal(api.workdayMinutes('0'), 480, 'vlera e pavlefshme kthehet te 8 orë');
  assert.equal(api.workdayMinutes('5000'), 480, 'mbi 24 orë nuk pranohet');
  assert.equal(api.workdayMinutes(''), 480);
  assert.equal(api.workdayLabel(480), '8 orë');
  assert.equal(api.workdayLabel(450), '7:30 orë');
});

test('kohëzgjatja shkruhet dhe lexohet në ditë e orë', () => {
  const workday = 480;
  assert.equal(api.durationMinutes('2.5 ditë', workday), 1200);
  assert.equal(api.durationMinutes('2,5 ditë', workday), 1200, 'presja dhjetore');
  assert.equal(api.durationMinutes('2 dite', workday), 960);
  assert.equal(api.durationMinutes('5 orë', workday), 300);
  assert.equal(api.durationMinutes('5 ore', workday), 300);
  assert.equal(api.durationMinutes('8h', workday), 480);
  assert.equal(api.durationMinutes('2 ditë 4 orë', workday), 1200);
  assert.equal(api.durationMinutes('2d 4h', workday), 1200);
  assert.equal(api.durationMinutes('2 ditë e 4 orë', workday), 1200);
  assert.equal(api.durationMinutes('90 min', workday), 90);
  assert.equal(api.durationMinutes('2', workday), 120, 'numër i vetëm = orë');
  assert.equal(api.durationMinutes('', workday), null, 'bosh nuk është zero');
  assert.equal(api.durationMinutes('abc', workday), null);
  assert.equal(api.durationMinutes('-1 ditë', workday), null);
  assert.equal(api.durationMinutes('2 ditë abc', workday), null, 'mbetje e palexuar hidhet poshtë');
  // E njëjta shprehje, bazë tjetër: 2.5 ditë me ditë 10 orë = 25 orë.
  assert.equal(api.durationMinutes('2.5 ditë', 600), 1500);
});

test('formatimi i kohëzgjatjes: ditë të plota, pastaj orë:minuta', () => {
  assert.equal(api.fmtDuration(2880, 480), '6 ditë');
  assert.equal(api.fmtDuration(480, 480), '1 ditë');
  assert.equal(api.fmtDuration(1200, 480), '2 ditë 4:00 orë');
  assert.equal(api.fmtDuration(1500, 480), '3 ditë 1:00 orë');
  assert.equal(api.fmtDuration(300, 480), '5:00 orë');
  assert.equal(api.fmtDuration(45, 480), '45 min');
  assert.equal(api.fmtDuration(0, 480), '0 min');
  assert.equal(api.fmtDuration(null, 480), '');
  // Bazë 10 orë: e njëjta shumë minutash jep ditë të tjera.
  assert.equal(api.fmtDuration(1500, 600), '2 ditë 5:00 orë');
});

test('fushat ditë + orë shkruajnë minutat e sakta', () => {
  assert.equal(api.durationFromParts('2', '4', 480), '1200');
  assert.equal(api.durationFromParts('2', '1:30', 480), '1050', '"1:30" = një orë e gjysmë');
  assert.equal(api.durationFromParts('', '2.5', 480), '150');
  assert.equal(api.durationFromParts('1.5', '', 480), '720', 'ditë dhjetore');
  assert.equal(api.durationFromParts('', ''), '', 'të dyja bosh = bosh');
  assert.equal(api.durationFromParts('abc', ''), null);
  assert.deepEqual(JSON.parse(JSON.stringify(api.durationParts(1500, 480))), { days: '3', hours: '1:00' });
  assert.deepEqual(JSON.parse(JSON.stringify(api.durationParts(0, 480))), { days: '', hours: '' });
});

test('formulari: dy fushat shfaqen dhe përditësojnë minutat', () => {
  api.db.records = [record('001', '2026-11-10', [], 1200)];
  api.state.route = 'editor';
  api.state.mode = 'edit';
  api.state.draft = api.db.records[0];
  api.render();
  const doc = w.document;
  const host = doc.querySelector('[data-duration-field]');
  assert.ok(host, 'fusha e kohëzgjatjes ekziston');
  assert.equal(host.querySelector('[data-duration="days"]').value, '2');
  assert.equal(host.querySelector('[data-duration="hours"]').value, '4:00');
  assert.match(host.querySelector('[data-duration-hint]').textContent, /2 ditë 4:00 orë/);
  assert.match(host.querySelector('[data-duration-hint]').textContent, /1200 min/);

  const days = host.querySelector('[data-duration="days"]');
  days.value = '3';
  days.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(api.state.draft.plan[0].minutes, '1680', '3 ditë + 4 orë = 28 orë');
  assert.equal(host.querySelector('input[type="hidden"]').value, '1680', 'vlera e ruajtur sinkronizohet');

  const hours = host.querySelector('[data-duration="hours"]');
  hours.value = '2.5';
  hours.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(api.state.draft.plan[0].minutes, '1590', '3 ditë + 2.5 orë');

  // Hyrje e pavlefshme: vlera e ruajtur NUK prishet dhe fusha shënohet.
  hours.value = 'abc';
  hours.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(api.state.draft.plan[0].minutes, '1590');
  assert.match(host.querySelector('[data-duration-hint]').textContent, /Nuk u kuptua/);
  assert.ok(host.classList.contains('duration-invalid'));
});

test('ndryshimi i ditës së punës rimodelon të njëjtat minuta', () => {
  api.db.records = [record('001', '2026-11-10', [], 1200)];
  api.state.route = 'catalog';
  api.render();
  const doc = w.document;
  assert.match(doc.querySelector('#view').textContent, /Dita e punës/);
  // Butoni "10 orë" vendos bazën; 1200 min bëhen 2 ditë të plota.
  doc.querySelector('[data-action="set-workday"][data-minutes="600"]').click();
  assert.equal(api.currentWorkday(), 600, 'baza ruhet si preferencë e pajisjes');
  assert.equal(api.fmtDuration(1200), '2 ditë');
  assert.equal(api.fmtDuration(1500), '2 ditë 5:00 orë');
  assert.match(w.document.getElementById('toast').textContent, /10 orë|2 ditë/);
  // Vlera e pavlefshme nuk e prish bazën.
  api.setWorkday('abc');
  assert.equal(api.currentWorkday(), 600);
  api.setWorkday(99);
  assert.equal(api.currentWorkday(), 600, 'mbi 24 orë refuzohet');
  // Rihapja e faqes e ruan bazën (localStorage).
  assert.equal(w.localStorage.getItem('biobes-workday-minutes'), '600');
  // Kthim te 8 orë për testet e tjera.
  api.setWorkday(8);
  assert.equal(api.currentWorkday(), 480);
});

test('gjurmimi: hyrje, dalje, formulari dhe dhoma tjetër', () => {
  twoDays();
  const trace = api.trackingTrace(api.trackingSegments(api.db.records, ''));
  assert.equal(trace.length, 4);
  const first = trace[0];
  assert.equal(first.date, '2026-11-10');
  assert.equal(first.nr, '001', 'formulari që e vërteton hyrjen');
  assert.equal(first.start, '07:00', 'hyrja');
  assert.equal(first.end, '13:00', 'dalja');
  assert.equal(first.room, 'Dhoma A');
  assert.equal(first.next.room, 'Dhoma B', 'ku shkoi më pas');
  assert.equal(first.moved, true);
  assert.equal(first.gap, 30, 'ndërprerja 13:00 → 13:30');
  // Dita e dytë: Dhoma B → Dhoma C, formular tjetër.
  const third = trace[2];
  assert.equal(third.nr, '002');
  assert.equal(third.room, 'Dhoma B');
  assert.equal(third.next.room, 'Dhoma C');
  // Rreshti i fundit i ditës nuk ka "shkoi te".
  assert.equal(trace[1].next, null, 'nuk lidhet me ditën tjetër');
  assert.equal(trace[1].moved, false);
});

test('kalimet: sa herë, nga cila dhomë, sa kohë atje', () => {
  twoDays();
  const moves = api.trackingMoves(api.trackingTrace(api.trackingSegments(api.db.records, '')));
  assert.equal(moves.length, 2);
  assert.equal(moves[0].employee, 'Arta Hoxha');
  assert.deepEqual(JSON.parse(JSON.stringify([moves[0].from, moves[0].to, moves[0].count])), ['Dhoma A', 'Dhoma B', 1]);
  assert.equal(moves[0].minutes, 360, 'koha e qëndrimit në dhomën e parë');
  assert.equal(moves[1].from, 'Dhoma B');
  assert.equal(moves[1].to, 'Dhoma C');
  assert.equal(moves[1].minutes, 300);
});

test('gjurmimi në faqe: tabela e plotë me linkun e formularit', () => {
  twoDays();
  api.state.route = 'reports';
  api.state.report.tab = 'tracking';
  api.render();
  const doc = w.document;
  const text = doc.querySelector('#report-results').textContent.replace(/\s+/g, ' ');
  for (const needle of ['Formulari', 'Hyrje', 'Dalje', 'Shkoi te', 'Ndërprerja', '07:00', '13:30', 'Dhoma B', 'Dhoma C', '(30 min)']) {
    assert.ok(text.includes(needle), `tabela përmban “${needle}”`);
  }
  assert.match(text, /Kalimet nga një dhomë në tjetrën/);
  const links = [...doc.querySelectorAll('#report-results [data-action="open-record"]')];
  assert.equal(links.length, 4, 'një link për çdo segment, te formulari i vet');
  assert.deepEqual(links.map((l) => l.textContent.trim()), ['001', '001', '002', '002']);
  assert.equal(links[2].dataset.id, api.db.records[1].id, 'linku i dytë tregon formularin 002');
});

test('klikimi në link hap vërtet atë formular', async () => {
  twoDays();
  api.state.route = 'reports';
  api.state.report.tab = 'tracking';
  api.render();
  const doc = w.document;
  const link = [...doc.querySelectorAll('#report-results [data-action="open-record"]')].find((l) => l.textContent.trim() === '002');
  link.click();
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(api.state.route, 'editor');
  assert.equal(api.state.mode, 'view', 'hapen për lexim, jo për ndryshim');
  assert.equal(api.state.draft.nr, '002');
  assert.equal(api.state.draft.date, '2026-11-11');
  assert.match(doc.querySelector('#view').textContent, /Nr\. 002/);
});

test('Excel-i i gjurmimit: hyrje/dalje, kalimi dhe karta e kalimeve', () => {
  twoDays();
  const sheet = api.xlTrackingSheet('');
  assert.equal(JSON.stringify(sheet.columns.map((c) => c.h)), JSON.stringify([
    'Data', 'Nr.', 'Punonjësi', 'Hyrje', 'Dalje', 'Minuta', 'Dhoma', 'Burimi', 'Shkoi te', 'Nisi më', 'Ndërprerja (min)',
  ]));
  const row = sheet.rows[0];
  assert.equal(row[3], '07:00');
  assert.equal(row[4], '13:00');
  assert.equal(row[5], 360);
  assert.equal(row[8], 'Dhoma B');
  assert.equal(row[9], '13:30');
  assert.equal(row[10], 30);
  assert.equal(sheet.extra[0].rows.length, 2);
  assert.equal(sheet.extra[0].rows[0][1], 'Dhoma A');
  const bytes = api.xlsxBytes({ title: 'BioBes', sheets: [sheet] });
  assert.ok((bytes.length || bytes.byteLength) > 2000);
});

test('fleta e kohëzgjatjes shfaq ditë/orë, por totali mblidhet mbi minuta', () => {
  api.db.records = [record('001', '2026-11-10', [], 1200), record('002', '2026-11-11', [], 300)];
  resetReport();
  const sheet = api.xlDurationSheet();
  const saj = sheet.rows[0];
  assert.equal(saj[3], '3 ditë 1:00 orë', 'e njëjta kohë e lexueshme, 1500 min');
  assert.equal(saj[4], 1500, 'kolona numerike mbetet minuta');
  assert.equal(sheet.total.values[3], 1500);
  assert.equal(JSON.stringify(sheet.total.sumCols), '[4,6]', 'SUM vetëm mbi kolona numerike');
  assert.ok(sheet.notes.some((n) => /Një ditë pune = 8 orë/.test(n)), 'baza e ditës shpjegohet në fletë');
});

test('punonjësi që nuk lëviz dhomë nuk shpiket si kalim', () => {
  api.db.records = [record('001', '2026-11-10', [
    iv('Arta Hoxha', '07:00', '12:00', 'Dhoma A'),
    iv('Arta Hoxha', '12:30', '16:00', 'Dhoma A'),
  ])];
  resetReport();
  const trace = api.trackingTrace(api.trackingSegments(api.db.records, ''));
  assert.equal(trace[0].moved, false, 'e njëjta dhomë nuk është kalim');
  assert.equal(api.trackingMoves(trace).length, 0);
  assert.equal(api.trackingHTML(api.reportRecords()).includes('Kalimet nga një dhomë'), false, 'karta e kalimeve nuk shfaqet pa kalime');
});

run();
