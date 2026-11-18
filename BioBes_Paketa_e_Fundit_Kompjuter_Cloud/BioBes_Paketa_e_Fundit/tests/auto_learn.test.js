#!/usr/bin/env node
'use strict';

// Hapat 1–4 të një kliku: mësim nga korrigjimet, lexim i dytë vetëm për qelizat
// e dyshimta, përputhje horizontale brenda ditës, dhe kontrolli i orëve.
//
// Të katër e rrisin saktësinë, por secili mund ta ulë atë nëse lirohet: një
// mësim i gabuar përhapet në çdo formular, një përputhje e gjerë ndryshon emra
// të vërtetë, dhe një kontroll ore i rremë bllokon punën e ditës. Prandaj këtu
// kontrollohet edhe ana e kundërt: kur sistemi duhet të heshtë.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const api = dom.window.__BIOBES__;
const w = dom.window;

const sure = (value) => ({ value, confidence: 0.96 });
const unsure = (value) => ({ value, confidence: 0.41, needsReview: true });

function reading(fields = {}) {
  return {
    header: { responsible: sure('Arta Hoxha'), totalHours: sure('8') },
    employees: [{ start: sure('08:00'), end: sure('16:00'), comment: sure(''), signature: sure('') }],
    comments: [],
    weights: { peshimi1: [] },
    uncertain: [],
    ...fields,
  };
}

function item(record, r, warnings = []) {
  return { record, reading: r, warnings, missingNumber: false, sources: [], originals: [], confirmedDigest: '' };
}

function resetLearn() {
  api.learnClear();
}

// ---------------------------------------------------------------------------
// Hapi 1: mësim nga korrigjimet njerëzore.
// ---------------------------------------------------------------------------

test('learnRecord ruan vetëm fushat e lejuara', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnRecord('attachments.0.url', 'a', 'b');
  api.learnRecord('plan.0.unknownField', 'a', 'b');
  const list = api.learnAll();
  assert.equal(list.length, 1, 'vetëm një fushë e lejuar u ruajt');
  assert.equal(list[0].path, 'plan.0.product');
});

test('learnRecord nuk ruan kur vlera nuk ndryshon', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djathë', 'djathë');
  assert.equal(api.learnAll().length, 0, 'ndryshimi vetëm i shkronjave nuk është gabim');
  api.learnRecord('plan.0.product', '  ', 'Djathë');
  assert.equal(api.learnAll().length, 0, 'vlera bosh nuk mësohet');
});

test('learnRecord numëron përsëritjet e të njëjtit gabim', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  const list = api.learnAll();
  assert.equal(list.length, 1, 'një rresht i vetëm, jo tre');
  assert.equal(list[0].count, 3);
});

test('learnApply hesht nën pragun e dy korrigjimeve', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  const r = api.blankRecord('041');
  r.plan[0].product = 'Djatë';
  const applied = api.learnApply(r);
  assert.equal(applied.length, 0, 'një gabim i vetëm nuk zbatohet automatikisht');
  assert.equal(r.plan[0].product, 'Djatë', 'vlera mbetet e paprekur');
});

test('learnApply zbaton gabimin e përsëritur dhe raporton burimin', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  const r = api.blankRecord('041');
  r.plan[0].product = 'Djatë';
  const applied = api.learnApply(r);
  assert.equal(r.plan[0].product, 'Djathë', 'vlera u korrigjua');
  assert.equal(applied.length, 1);
  assert.equal(applied[0].from, 'Djatë');
  assert.equal(applied[0].to, 'Djathë');
  assert.equal(applied[0].count, 2);
});

test('learnApply prek vetëm vlerën që përputhet me gabimin e njohur', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  const r = api.blankRecord('041');
  r.plan[0].product = 'Gjizë';
  api.learnApply(r);
  assert.equal(r.plan[0].product, 'Gjizë', 'produkt tjetër nuk ndryshohet');
});

test('learnApply nuk shkruan në fushë që mungon', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  const r = api.blankRecord('041');
  r.plan = [];
  assert.doesNotThrow(() => api.learnApply(r));
});

test('learnPanelHTML shfaqet vetëm kur ka modele të përsëritura', () => {
  resetLearn();
  assert.equal(api.learnPanelHTML(), '', 'pa mësim paneli nuk shfaqet');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  assert.equal(api.learnPanelHTML(), '', 'një korrigjim i vetëm nuk mjafton');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  const html = api.learnPanelHTML();
  assert.match(html, /learn-panel/);
  assert.match(html, /Djatë/);
  assert.match(html, /data-action="learn-clear"/);
});

test('learnClear fshin mësimin', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnClear();
  assert.equal(api.learnAll().length, 0);
  assert.equal(api.learnPanelHTML(), '');
});

test('batchBuildItems zbaton mësimin, paralajmëron dhe ruan origjinalin e leximit', () => {
  resetLearn();
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  api.learnRecord('plan.0.product', 'Djatë', 'Djathë');
  const r = api.blankRecord('041');
  r.plan[0].product = 'Djatë';
  const group = {
    id: 'g1', status: 'ready', files: [new w.File(['x'], 'a.pdf', { type: 'application/pdf' })],
    results: [{ record: r, warnings: [], reading: reading() }],
  };
  const built = api.batchBuildItems([group]);
  assert.ok(!built.error);
  assert.equal(built.items.length, 1);
  const it = built.items[0];
  assert.equal(it.record.plan[0].product, 'Djathë', 'mësimi u zbatua');
  assert.ok(it.warnings.some((x) => /U korrigjua nga mësimi/.test(x)), 'përdoruesi njoftohet');
  assert.ok(it.autoOriginal, 'origjinali i leximit ruhet për të mësuar nga korrigjimet');
  assert.equal(it.autoOriginal.plan[0].product, 'Djathë', 'origjinali pasqyron atë që u shfaq');
  resetLearn();
});

// ---------------------------------------------------------------------------
// Hapi 3: përputhja horizontale brenda ditës.
// ---------------------------------------------------------------------------

test('editDistance numëron ndryshimet e shkronjave', () => {
  assert.equal(api.editDistance('djathe', 'djathe'), 0);
  assert.equal(api.editDistance('djathe', 'djatht'), 1);
  assert.equal(api.editDistance('djathe', 'gjize'), 4);
  assert.equal(api.editDistance('', 'abc'), 3);
});

test('autoCloseEnough ruan fjalët e shkurtra nga hamendja', () => {
  assert.equal(api.autoCloseEnough('djathe', 'djatht'), true, 'fjalë e mesme, një shkronjë');
  assert.equal(api.autoCloseEnough('djat', 'djot'), false, 'fjalë e shkurtër nuk hamendësohet');
  assert.equal(api.autoCloseEnough('djathe', 'xyzab'), false, 'fjalë krejt tjetër');
  assert.equal(api.autoCloseEnough('djathe', 'djathe'), false, 'e njëjta fjalë nuk është "afër"');
});

test('autoNormalizeNames merr shkronjat e listës bazë kur përputhja është e plotë', () => {
  api.db.catalog.products = ['Djathë'];
  const r = api.blankRecord('041');
  r.plan[0].product = 'DJATHE';
  const items = [item(r, reading())];
  api.autoNormalizeNames(items);
  assert.equal(r.plan[0].product, 'Djathë', 'shkronjat u rregulluan nga lista');
  assert.equal(items[0].warnings.length, 0, 'përputhja e plotë nuk kërkon kontroll');
});

test('autoNormalizeNames rregullon gabimin e vogël që përsëritet në dokument', () => {
  api.db.catalog.products = [];
  const a = api.blankRecord('041');
  a.plan[0].product = 'Djathë';
  a.plan[1].product = 'Djathë';
  const b = api.blankRecord('042');
  b.plan[0].product = 'Djatht';
  const items = [item(a, reading()), item(b, reading())];
  api.autoNormalizeNames(items);
  assert.equal(b.plan[0].product, 'Djathë', 'gabimi u rregullua');
  assert.equal(a.plan[0].product, 'Djathë', 'i sakti nuk u prek');
  const warned = items.filter((x) => x.warnings.length);
  assert.equal(warned.length, 1, 'paralajmërimi shkon vetëm te formulari i prekur');
  assert.match(warned[0].warnings[0], /U përputh me listën/);
});

test('autoNormalizeNames nuk ndryshon emra të vërtetë që nuk përsëriten', () => {
  api.db.catalog.products = [];
  const r = api.blankRecord('041');
  r.plan[0].product = 'Gjizë';
  const items = [item(r, reading())];
  api.autoNormalizeNames(items);
  assert.equal(r.plan[0].product, 'Gjizë', 'pa kandidat të përsëritur nuk ndryshohet');
  assert.equal(items[0].warnings.length, 0);
});

test('autoNormalizeNames rregullon edhe emrin e punonjësit', () => {
  api.db.catalog.employees = [];
  const a = api.blankRecord('041');
  a.employees = [
    { ...a.employees[0], name: 'Arben Krasniqi' },
    { ...a.employees[0], name: 'Arben Krasniqi' },
  ];
  const b = api.blankRecord('042');
  b.employees[0].name = 'Arben Krasniq';
  const items = [item(a, reading()), item(b, reading())];
  api.autoNormalizeNames(items);
  assert.equal(b.employees[0].name, 'Arben Krasniqi');
});

// ---------------------------------------------------------------------------
// Hapi 4: kontrolli i orëve.
// ---------------------------------------------------------------------------

test('hoursValue lexon të gjitha format e shkruara me dorë', () => {
  assert.equal(api.hoursValue('8'), 8);
  assert.equal(api.hoursValue('8:30'), 8.5);
  assert.equal(api.hoursValue('8.30'), 8.5);
  assert.equal(api.hoursValue('8,30'), 8.5);
  assert.equal(api.hoursValue('08:00'), 8);
  assert.equal(api.hoursValue(''), null);
  assert.equal(api.hoursValue('—'), null);
  assert.equal(api.hoursValue('99:00'), null);
});

test('hoursIssues hesht kur orari përputhet', () => {
  const r = api.blankRecord('041');
  r.employees[0] = { ...r.employees[0], name: 'Arben', start: '08:00', end: '16:00', breakMinutes: '0' };
  const rd = reading({ employees: [{ start: sure('08:00'), end: sure('16:00'), totalHours: sure('8') }] });
  assert.deepEqual([...api.hoursIssues(r, rd)], []);
});

test('hoursIssues kap orën e lexuar gabim', () => {
  const r = api.blankRecord('041');
  r.employees[0] = { ...r.employees[0], name: 'Arben', start: '08:00', end: '16:00', breakMinutes: '0' };
  // Formulari shkruan 4 orë, por 08:00–16:00 është 8 orë: një "1" u lexua "4".
  const rd = reading({ employees: [{ start: sure('08:00'), end: sure('16:00'), totalHours: sure('4') }] });
  const issues = api.hoursIssues(r, rd);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /Arben/);
  assert.match(issues[0], /Kontrollo/);
});

test('hoursIssues kap mospërputhjen e totalit të ditës', () => {
  const r = api.blankRecord('041');
  r.employees = [
    { ...r.employees[0], name: 'Arben', start: '08:00', end: '16:00', breakMinutes: '0' },
    { ...r.employees[0], name: 'Blerina', start: '08:00', end: '12:00', breakMinutes: '0' },
  ];
  const rd = reading({
    header: { responsible: sure('Arta Hoxha'), totalHours: sure('10') },
    employees: [
      { start: sure('08:00'), end: sure('16:00'), totalHours: sure('8') },
      { start: sure('08:00'), end: sure('12:00'), totalHours: sure('4') },
    ],
  });
  const issues = api.hoursIssues(r, rd);
  assert.equal(issues.length, 1, 'vetëm totali i ditës është i gabuar');
  assert.match(issues[0], /gjithsej/i);
});

test('hoursIssues nuk shpik problem kur formula e orës mungon', () => {
  const r = api.blankRecord('041');
  r.employees[0] = { ...r.employees[0], start: '', end: '', breakMinutes: '' };
  const rd = reading({ employees: [{ totalHours: sure('8') }] });
  assert.deepEqual([...api.hoursIssues(r, rd)], [], 'pa orar nuk ka çfarë të kontrollohet');
});

test('autoVerifyItem bllokon formularin kur orët nuk përputhen', () => {
  const r = api.blankRecord('041');
  r.date = '2026-11-18';
  r.responsible.name = 'Arta Hoxha';
  r.plan[0].product = 'Djathë';
  r.plan[0].actual = '10';
  r.plan[0].unit = 'kg';
  r.weighings[0].product = 'Djathë';
  r.weighings[0].rows[0] = { bags: '1', kg: '100', packaging: '20', sum: '80' };
  r.employees[0] = { ...r.employees[0], name: 'Arben', start: '08:00', end: '16:00', breakMinutes: '0' };
  const rd = reading({ employees: [{ start: sure('08:00'), end: sure('16:00'), totalHours: sure('4') }] });
  const verdict = api.autoVerifyItem(item(r, rd));
  assert.equal(verdict.ok, false, 'orari i gabuar nuk kalon në heshtje');
  assert.ok(verdict.blockers.some((x) => /Arben/.test(x)));
});

// ---------------------------------------------------------------------------
// Hapi 2: lexim i dytë vetëm për qelizat e dyshimta.
// ---------------------------------------------------------------------------

test('readingUncertainAreas mbledh qelizat e paqarta dhe me besim të ulët', () => {
  const rd = reading({
    header: { responsible: unsure('Arta Hoxha'), totalHours: sure('8') },
    uncertain: [{ formArea: 'e1.totalHours', readAs: '4' }],
  });
  const areas = api.readingUncertainAreas(rd);
  assert.ok(areas.includes('e1.totalHours'), 'qeliza e listuar si e paqartë');
  assert.equal(areas.length, 1, 'qelizat e sigurta nuk përfshihen');
});

test('mergeSecondOpinion pranon vetëm përputhjen e plotë', () => {
  const first = reading({
    header: { responsible: unsure('Arta Hoxha'), totalHours: sure('8') },
    uncertain: [{ formArea: 'h.responsible' }],
  });
  const second = reading({ header: { responsible: sure('Arta Hoxha'), totalHours: sure('8') } });
  // Fusha duhet të ketë formArea që të përputhet.
  first.header.responsible.formArea = 'h.responsible';
  second.header.responsible.formArea = 'h.responsible';
  const promoted = api.mergeSecondOpinion(first, second);
  assert.equal(promoted, 1);
  assert.equal(first.header.responsible.needsReview, false);
  assert.equal(first.header.responsible.confidence, 0.99);
  assert.equal(first.header.responsible.secondOpinion, true);
});

test('mergeSecondOpinion nuk pranon lexime që ndryshojnë', () => {
  const first = reading({ header: { responsible: unsure('Arta Hoxha'), totalHours: sure('8') } });
  const second = reading({ header: { responsible: sure('Arta Hoxhaj'), totalHours: sure('8') } });
  first.header.responsible.formArea = 'h.responsible';
  second.header.responsible.formArea = 'h.responsible';
  const promoted = api.mergeSecondOpinion(first, second);
  assert.equal(promoted, 0, 'dy lexime të ndryshme nuk janë provë');
  assert.equal(first.header.responsible.needsReview, true, 'qeliza mbetet për sy njeriu');
  assert.equal(first.header.responsible.confidence, 0.41);
});

test('mergeSecondOpinion nuk e zbret besimin e qelizës së sigurt', () => {
  const first = reading();
  const second = reading();
  first.header.totalHours.formArea = 'h.totalHours';
  second.header.totalHours.formArea = 'h.totalHours';
  const promoted = api.mergeSecondOpinion(first, second);
  assert.equal(promoted, 0, 'qeliza tashmë e sigurt nuk rikonfirmohet');
  assert.equal(first.header.totalHours.confidence, 0.96);
});

test('mergeSecondOpinion heq qelizat e zgjidhura nga lista e të paqartave', () => {
  const first = reading({ header: { responsible: unsure('Arta Hoxha'), totalHours: sure('8') }, uncertain: [{ formArea: 'h.responsible' }] });
  const second = reading({ header: { responsible: sure('Arta Hoxha'), totalHours: sure('8') } });
  first.header.responsible.formArea = 'h.responsible';
  second.header.responsible.formArea = 'h.responsible';
  api.mergeSecondOpinion(first, second);
  assert.equal((first.uncertain || []).length, 0, 'nuk mbetet e listuar si e paqartë');
  assert.ok((first.warnings || []).some((x) => /lexim të dytë/.test(x)), 'përdoruesi njoftohet');
});

test('autoSecondOpinion nuk bën kërkesë kur asnjë qelizë nuk është e dyshimtë', async () => {
  const group = {
    id: 'g1', status: 'ready', files: [new w.File(['x'], 'a.pdf', { type: 'application/pdf' })],
    results: [{ record: api.blankRecord('041'), warnings: [], reading: reading() }],
  };
  const res = await api.autoSecondOpinion([group], new AbortController().signal, null);
  assert.equal(res.groups, 0, 'asnjë kërkesë shtesë kuote');
  assert.equal(res.promoted, 0);
});

run();
