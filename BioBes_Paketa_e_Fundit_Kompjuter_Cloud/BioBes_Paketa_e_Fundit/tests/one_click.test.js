#!/usr/bin/env node
'use strict';

// Një klik: lexo → plotëso → ruaj.
//
// Këto teste mbrojnë pikën më të ndjeshme të automatizmit: porta e besimit.
// Ruajtja pa sy njeriu lejohet vetëm kur çdo qelizë u lexua me siguri dhe
// aritmetika përputhet. Nëse kjo portë lirohet, aplikacioni ruan të dhëna
// pagash dhe peshash të gabuara në heshtje — prandaj këtu kontrollohet rreptë.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const api = dom.window.__BIOBES__;
const w = dom.window;

// Qelizë e lexuar me siguri të lartë.
const sure = (value) => ({ value, confidence: 0.96 });

// Lexim i pastër: asnjë qelizë e dyshimtë.
function cleanReading(overrides = {}) {
  return {
    header: { responsible: sure('Arta Hoxha'), totalHours: sure('8') },
    employees: [{ start: sure('08:00'), end: sure('16:00'), comment: sure(''), signature: sure('') }],
    comments: [],
    weights: {
      peshimi1: [
        { row: 1, nrThas: sure('1'), kg: sure('100'), ambalazhi: sure('20'), shuma: sure('80') },
      ],
    },
    uncertain: [],
    ...overrides,
  };
}

// Regjistrim i plotë dhe aritmetikisht i saktë.
function cleanRecord() {
  const r = api.blankRecord('041');
  r.date = '2026-11-18';
  r.responsible.name = 'Arta Hoxha';
  r.plan[0].product = 'Djathë';
  r.plan[0].actual = '10';
  r.plan[0].unit = 'kg';
  r.weighings[0].product = 'Djathë';
  r.weighings[0].rows[0] = { bags: '1', kg: '100', packaging: '20', sum: '80' };
  return r;
}

function item(record, reading) {
  return {
    record,
    reading,
    warnings: [],
    missingNumber: false,
    sources: [],
    originals: [],
    confirmedDigest: '',
  };
}

// Katalogu bazë duhet të njohë njësinë 'kg', përndryshe validateRecord e refuzon.
if (!api.db.catalog.units.includes('kg')) api.db.catalog.units.push('kg');

test('formulari i pastër kalon portën e besimit', () => {
  const check = api.autoVerifyItem(item(cleanRecord(), cleanReading()));
  assert.equal(check.ok, true, `penguesit: ${check.blockers.join(' | ')}`);
  assert.equal(check.blockers.length, 0, `penguesit: ${check.blockers.join(' | ')}`);
  assert.equal(check.risk, 0);
});

test('qeliza e dyshimtë e ndalon ruajtjen automatike', () => {
  const reading = cleanReading();
  reading.header.responsible = { value: null, needsReview: true, formArea: 'p1.responsible' };
  const check = api.autoVerifyItem(item(cleanRecord(), reading));
  assert.equal(check.ok, false);
  assert.ok(check.risk >= 1, 'duhet të ketë të paktën një qelizë me rrezik');
  assert.ok(
    check.blockers.some((b) => /qeliza t\u00eb dyshimta/.test(b)),
    `penguesit: ${check.blockers.join(' | ')}`,
  );
});

test('sigures\u00eb e ul\u00ebt e AI-s\u00eb e ndalon ruajtjen automatike', () => {
  const reading = cleanReading();
  reading.weights.peshimi1[0].kg = { value: '100', confidence: 0.42 };
  const check = api.autoVerifyItem(item(cleanRecord(), reading));
  assert.equal(check.ok, false);
  assert.ok(check.risk >= 1);
});

test('aritmetika KG \u2212 Ambalazhi = Shuma duhet t\u00eb p\u00ebrputhet', () => {
  const record = cleanRecord();
  record.weighings[0].rows[0].sum = '75'; // 100 - 20 = 80, jo 75
  const check = api.autoVerifyItem(item(record, cleanReading()));
  assert.equal(check.ok, false);
  assert.ok(
    check.blockers.some((b) => /75|80/.test(b)),
    `penguesit: ${check.blockers.join(' | ')}`,
  );
});

test('formulari bosh nuk ruhet automatikisht', () => {
  const record = api.blankRecord('042');
  record.date = '2026-11-18';
  record.responsible.name = 'Arta Hoxha';
  const check = api.autoVerifyItem(item(record, cleanReading()));
  assert.equal(check.ok, false);
  assert.ok(
    check.blockers.some((b) => /bosh/.test(b)),
    `penguesit: ${check.blockers.join(' | ')}`,
  );
});

test('numri i palexuar dhe data e palexuar jan\u00eb pengues', () => {
  const record = cleanRecord();
  record.date = '';
  const check = api.autoVerifyItem(item(record, cleanReading()));
  assert.equal(check.ok, false);
  assert.ok(check.blockers.some((b) => /Data/.test(b)));

  const missing = item(cleanRecord(), cleanReading());
  missing.missingNumber = true;
  const check2 = api.autoVerifyItem(missing);
  assert.equal(check2.ok, false);
  assert.ok(check2.blockers.some((b) => /Numri/.test(b)));
});

test('p\u00ebrgjegj\u00ebsja e palexuar \u00ebsht\u00eb pengues', () => {
  const record = cleanRecord();
  record.responsible.name = '';
  const check = api.autoVerifyItem(item(record, cleanReading()));
  assert.equal(check.ok, false);
  assert.ok(check.blockers.some((b) => /P\u00ebrgjegj\u00ebsja/.test(b)));
});

test('p\u00eblqimi ruhet nj\u00eb her\u00eb dhe lexohet m\u00eb pas', () => {
  api.autoClearLast();
  try { w.localStorage.removeItem(api.AUTO_KEY); } catch (e) {}
  assert.equal(api.autoSettings().consent, false, 'parazgjedhja \u00ebsht\u00eb pa p\u00eblqim');
  api.autoSaveSettings({ consent: true, responsible: 'Arta Hoxha' });
  const saved = api.autoSettings();
  assert.equal(saved.consent, true);
  assert.equal(saved.responsible, 'Arta Hoxha');
});

test('p\u00ebrgjegj\u00ebsja e parazgjedhur plot\u00ebsohet kur mungon', () => {
  api.autoSaveSettings({ consent: true, responsible: 'Arta Hoxha' });
  assert.equal(api.autoDefaultResponsible(), 'Arta Hoxha');
});

test('signatura e skedar\u00ebve dallon dhe \u00ebsht\u00eb e q\u00ebndrueshme', () => {
  const a = new w.File(['x'], 'a.pdf', { type: 'application/pdf' });
  const b = new w.File(['y'], 'b.pdf', { type: 'application/pdf' });
  const s1 = api.autoSignature([a]);
  assert.equal(s1, api.autoSignature([a]), 'e nj\u00ebjta zgjedhje = e nj\u00ebjta signatur\u00eb');
  assert.notEqual(s1, api.autoSignature([b]), 'skedar\u00eb t\u00eb ndrysh\u00ebm = signatur\u00eb t\u00eb ndryshme');
});

test('batchBuildItems kthen gabim kur nj\u00eb grup nuk \u00ebsht\u00eb lexuar', () => {
  const built = api.batchBuildItems([{ status: 'pending', files: [], results: null }]);
  assert.ok(built.error, 'duhet t\u00eb kthej\u00eb gabim');
  assert.match(built.error, /lexuar/);
});

test('batchBuildItems nd\u00ebrton nj\u00eb artikull p\u00ebr \u00e7do rezultat', () => {
  const file = new w.File(['x'], 'a.pdf', { type: 'application/pdf' });
  const built = api.batchBuildItems([
    {
      status: 'ready',
      files: [file],
      originalFiles: [file],
      privateFiles: null,
      results: [
        { record: cleanRecord(), warnings: [], reading: cleanReading(), formNumber: 1, formCount: 2 },
        { record: cleanRecord(), warnings: [], reading: cleanReading(), formNumber: 2, formCount: 2 },
      ],
    },
  ]);
  assert.equal(built.items.length, 2);
  assert.equal(built.items[0].record.nr, '041');
  assert.equal(built.items[0].originals.length, 1);
});

test('mesazhet e ruajtjes jan\u00eb t\u00eb qarta p\u00ebr \u00e7do gabim', () => {
  assert.match(api.batchPersistMessage({ error: 'responsible' }), /p\u00ebrgjegj\u00ebsen/i);
  assert.match(api.batchPersistMessage({ error: 'duplicate' }), /num\u00ebr/i);
  assert.match(api.batchPersistMessage({ error: 'exists' }), /ruajtur/i);
  assert.match(api.batchPersistMessage({ error: 'invalid', detail: { message: 'X' } }), /X/);
  assert.match(api.batchPersistMessage({ error: 'thrown', message: 'Rrjeti' }), /Rrjeti/);
});

test('paneli i nj\u00eb kliku shfaq butonin dhe gjendjen e p\u00eblqimit', () => {
  const html = api.autoPanelHTML();
  assert.match(html, /Nj\u00eb klik: lexo dhe ruaj/);
  assert.match(html, /data-action="auto-run"/);
  assert.match(html, /Nj\u00eb klik/);
});

test('paneli ofron zhb\u00ebrjen kur ka ruajtje t\u00eb fundit', () => {
  try {
    w.localStorage.setItem(api.AUTO_LAST_KEY, JSON.stringify({ ids: ['a', 'b'], at: new Date().toISOString(), signature: 's', count: 2 }));
  } catch (e) {}
  const html = api.autoPanelHTML();
  assert.match(html, /data-action="auto-undo"/);
  assert.match(html, /Zhb\u00ebj ruajtjen e fundit \(2\)/);
  api.autoClearLast();
  assert.equal(api.autoLastBatch().ids.length, 0);
});

test('butoni i nj\u00eb kliku \u00ebsht\u00eb i pranish\u00ebm n\u00eb faqen e leximit', () => {
  const html = api.batchHTML();
  assert.match(html, /data-action="auto-run"/);
  assert.match(html, /class="oneclick"/);
});

// ---------------------------------------------------------------------------
// Integrim: tubacioni i vërtetë batchRead({auto:true}) → batchAutoFinish.
// Gemini dhe ruajtja zëvendësohen brenda të njëjtit eval ku rron app.js, që
// testi të shohë saktësisht çfarë do të ruhej — pa dërguar asnjë kërkesë.
// ---------------------------------------------------------------------------
test('një klik: ruan vetëm formularët e pastër, të tjerët i lë për kontroll', async () => {
  const d2 = loadApp(null, `
;globalThis.__saved=[]; globalThis.__opened=null;
;batchGemini = async (g) => globalThis.__results[g.files[0].name];
;batchPersist = async (items) => { globalThis.__saved.push(items.map(i=>i.record.nr)); return {ids:items.map(i=>i.record.id)}; };
;batchPaint = () => {}; batchSetBusy = () => {}; batchError = (m) => { globalThis.__error = m; };
;announceReading = () => {}; batchReset = () => {}; render = () => {};
;batchOpen = (i) => { globalThis.__opened = i; };
;globalThis.__T = { batchState, batchRead, db, autoVerifyItem };
`);
  const w2 = d2.window, T = w2.__T;
  if (!T.db.catalog.units.includes('kg')) T.db.catalog.units.push('kg');
  w2.document.body.insertAdjacentHTML('beforeend', '<input id="batch-anonymous" type="checkbox" checked>');
  w2.document.body.insertAdjacentHTML('beforeend', '<input id="batch-economy" type="checkbox">');

  const mk = (nr, clean) => {
    const r = api.blankRecord(nr);
    r.date = '2026-11-18';
    r.responsible.name = 'Arta Hoxha';
    r.plan[0].product = 'Djathë'; r.plan[0].actual = '10'; r.plan[0].unit = 'kg';
    r.weighings[0].product = 'Djathë';
    r.weighings[0].rows[0] = { bags: '1', kg: '100', packaging: '20', sum: clean ? '80' : '75' };
    return r;
  };
  const reading = cleanReading();
  w2.__results = {
    'a.pdf': [{ record: mk('041', true), warnings: [], reading, formNumber: 1, formCount: 1, missingNumber: false }],
    'b.pdf': [{ record: mk('042', false), warnings: [], reading, formNumber: 1, formCount: 1, missingNumber: false }],
  };
  const grp = (name) => ({
    id: name, files: [new w2.File(['x'], name, { type: 'application/pdf' })],
    originalFiles: [], privateFiles: null, status: 'pending', error: '',
    results: null, raw: null, workbook: null, sources: [],
  });
  T.batchState.groups = [grp('a.pdf'), grp('b.pdf')];

  await T.batchRead({ auto: true });

    assert.equal(w2.__saved.length, 1, 'një thirrje ruajtjeje');
  assert.equal(w2.__saved[0].length, 1, 'vetëm formulari i pastër u ruajt');
  assert.equal(w2.__saved[0][0], '041', 'u ruajt formulari 041');
  assert.equal(T.batchState.items.length, 1, 'formulari i dyshimtë mbeti për kontroll');
  assert.equal(T.batchState.items[0].record.nr, '042');
  assert.equal(T.batchState.phase, 'review');
  assert.match(w2.__error, /^Nj\u00eb klik: u ruajt\u00ebn 1 formular/);
});

run();
