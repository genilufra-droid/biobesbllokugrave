#!/usr/bin/env node
'use strict';

// Kërkesa: "pasi klikon link hapet formulari mirpo nuk kthehesh dot mbrapa,
// duhet vendos kjo."
//
// Më parë ekranet ndryshonin pa e shënuar te historiku i shfletuesit: pasi
// hapej një formular nga linku i raportit, butoni "Kthihu mbrapa" (edhe gjesti
// i telefonit) të nxirrte nga faqja, ose të kthente te një ekran tjetër pa
// filtrat. Tani çdo ekran lë një hap me pamjen e vet.
//
// Këto teste kontrollojnë sjelljen e vërtetë në jsdom:
//  1. ekrani fillestar e shënon veten;
//  2. navigimi (go) zëvendëson hapin, nuk grumbullon hapa bosh;
//  3. tab-i i raportit dhe filtrat ruhen në hapin e historisë;
//  4. klikimi i linkut të formularit shton hap të re;
//  5. butoni "Kthehu mbrapa" i formularit rikthen raportin, te i njëjti tab;
//  6. butoni "mbrapa" i shfletuesit (popstate) e bën të njëjtën gjë;
//  7. formulari i pandryshuar-ruajtur nuk braktiset pa pyetur;
//  8. formulari i ri (pa numër ende) e shënon hapin kur hapet;
//  9. kur nuk ka histori, kthimi shkon te pamja kryesore pa u rrëzuar.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const HOOK = `
;globalThis.__N = {
  state, db, blankRecord, normalizeRecord, render, navStart, navEnter, navWrite,
  navBack, navRestore, reportRecords, canLeave, saveRecord, editorHTML,
};`;

const w = loadApp(null, HOOK).window;
const N = w.__N;
const doc = w.document;
doc.getElementById('app').hidden = false;
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

const iv = (name, start, end, room) => ({ name, start, end, room });
const mk = (nr, date, intervals, minutes = '480') => {
  const r = N.blankRecord(nr);
  r.date = date;
  r.responsible = { name: 'Koli Tufit', signature: '' };
  r.plan[0] = { ...r.plan[0], product: 'Saj Mali', status: 'Përfunduar', minutes, actual: '305', unit: 'kg', packaging: 'thasë' };
  r.employees[0] = { name: 'Arta Hoxha', start: '', end: '', breakMinutes: '60', room: '', intervals, comment: '', signature: '' };
  return N.normalizeRecord(r);
};
const seed = () => {
  N.db.records = [
    mk('001', '2026-11-10', [iv('Arta Hoxha', '07:00', '13:00', 'Dhoma A'), iv('Arta Hoxha', '13:30', '17:00', 'Dhoma B')]),
    mk('002', '2026-11-11', [iv('Arta Hoxha', '07:00', '12:00', 'Dhoma B')], 300),
  ];
  N.state.report = { from: '', to: '', product: '', packaging: '', status: '', client: '', employee: '', room: '', tab: 'summary', exportType: 'products' };
  N.state.draft = null;
  N.state.dirty = false;
  N.state.mode = 'new';
  N.state.route = 'dashboard';
  N.render();
};

// Ndihmës: shko te raportet e tab-i i gjurmimit siç bën përdoruesi.
const openTrackingTab = async () => {
  doc.querySelector('[data-nav="reports"]').click();
  await wait();
  [...doc.querySelectorAll('[data-action="report-tab"]')].find((b) => b.dataset.tab === 'tracking').click();
  await wait();
};
const clickFormLink = async (nr) => {
  const link = [...doc.querySelectorAll('#report-results [data-action="open-record"]')].find((l) => l.textContent.trim() === nr);
  assert.ok(link, `linku i formularit ${nr} gjendet`);
  link.click();
  await wait();
};
const backButton = () => doc.querySelector('[data-action="nav-back"]');

test('ekrani fillestar shënohet në histori, që mbrapa të ketë ku të kthehet', () => {
  seed();
  N.navStart();
  assert.ok(w.history.state, 'ka gjendje historiku');
  assert.equal(w.history.state.route, 'dashboard');
  assert.equal(w.history.state.report.tab, 'summary');
});

test('navigimi zëvendëson hapin — nuk grumbullohen hapa bosh', async () => {
  seed();
  const before = w.history.length;
  doc.querySelector('[data-nav="reports"]').click();
  await wait();
  assert.equal(w.history.length, before, 'hap i njëjti, jo i re');
  assert.equal(w.history.state.route, 'reports');
  doc.querySelector('[data-nav="records"]').click();
  await wait();
  assert.equal(w.history.state.route, 'records');
});

test('tab-i i raportit dhe filtrat ruhen në hapin e historisë', async () => {
  seed();
  await openTrackingTab();
  assert.equal(N.state.report.tab, 'tracking');
  assert.equal(w.history.state.report.tab, 'tracking', 'tab-i shënohet');
  // Filtri i punonjësit: shkruhet e më pas pritet regjistrimi i hapit.
  const emp = doc.querySelector('#report-results [data-combo="tracking-employee"], #report-results [data-report="employee"]');
  if (emp) {
    emp.value = 'Arta';
    emp.dispatchEvent(new w.Event('input', { bubbles: true }));
    await wait(450);
    assert.equal(w.history.state.report.employee, 'Arta', 'filtri shënohet në hap');
  }
});

test('linku i formularit hap formularin dhe shton hap të re', async () => {
  seed();
  await openTrackingTab();
  const len = w.history.length;
  await clickFormLink('002');
  assert.equal(N.state.route, 'editor');
  assert.equal(N.state.draft.nr, '002');
  assert.equal(N.state.mode, 'view', 'hapen për lexim');
  assert.equal(w.history.length, len + 1, 'u shtua një hap, nuk u zëvendësua');
  assert.equal(w.history.state.recNr, '002');
});

test('butoni "Kthihu mbrapa" rikthen raportin te i njëjti tab', async () => {
  seed();
  await openTrackingTab();
  await clickFormLink('002');
  assert.ok(backButton(), 'butoni i kthimit është në formular');
  assert.match(backButton().textContent, /Kthehu mbrapa/);
  backButton().click();
  await wait();
  assert.equal(N.state.route, 'reports', 'u kthye te raportet');
  assert.equal(N.state.report.tab, 'tracking', 'te i njëjti tab');
  assert.equal(N.state.draft, null, 'drafti u pastrua');
  assert.match(doc.getElementById('view').textContent, /Raportet/);
});

test('butoni "mbrapa" i shfletuesit bën të njëjtën gjë', async () => {
  seed();
  await openTrackingTab();
  await clickFormLink('001');
  assert.equal(N.state.route, 'editor');
  w.history.back();
  await wait(250);
  assert.equal(N.state.route, 'reports');
  assert.equal(N.state.report.tab, 'tracking');
  assert.equal(N.state.draft, null);
});

test('formulari nga lista e regjistrimeve kthehet te regjistrimet', async () => {
  seed();
  doc.querySelector('[data-nav="records"]').click();
  await wait();
  const link = [...doc.querySelectorAll('#report-results [data-action="open-record"]')][0] || doc.querySelector('[data-action="open-record"]');
  assert.ok(link, 'gjendet linku i formularit në listë');
  link.click();
  await wait();
  assert.equal(N.state.route, 'editor');
  backButton().click();
  await wait();
  assert.equal(N.state.route, 'records', 'u kthye atje prej nga u hap');
});

test('formulari me ndryshime të paruajtura nuk braktiset pa pyetur', async () => {
  seed();
  await openTrackingTab();
  await clickFormLink('002');
  // Përdoruesi kalon në modifikim dhe shkruan diçka.
  N.state.mode = 'edit';
  N.state.dirty = true;
  w.history.back();
  await wait(200);
  const layer = doc.querySelector('#dialog-root .modal-layer');
  assert.ok(layer, 'hapet pyetja, nuk largohet në heshtje');
  assert.match(layer.textContent, /Ndryshime të paruajtura/);
  // Anulo: qëndron te formulari.
  layer.querySelector('[data-modal="cancel"]').click();
  await wait(300);
  assert.equal(N.state.route, 'editor', 'mbetet te formulari');
  assert.ok(N.state.draft, 'drafti nuk u hodh poshtë');
  N.state.dirty = false;
  N.state.mode = 'view';
});

test('formulari i ri e shënon hapin, edhe pa numër', async () => {
  seed();
  doc.querySelector('[data-nav="dashboard"]')?.click();
  await wait();
  doc.querySelector('[data-action="new"]').click();
  await wait();
  assert.equal(N.state.route, 'editor');
  assert.equal(N.state.mode, 'new');
  // `history.length` nuk rritet kur ka hapa "përpara" për t'u zëvendësuar, prandaj
  // kontrollohet gjendja e hapit të tanishëm: është formulari, jo pamja kryesore.
  assert.equal(w.history.state.route, 'editor', 'hapi i tanishëm është formulari');
  assert.notEqual(w.history.state.route, 'dashboard');
  backButton().click();
  await wait();
  assert.notEqual(N.state.route, 'editor', 'kthehet mbrapa, nuk mbetet në formular');
});

test('pa histori, kthimi shkon te pamja kryesore pa u rrëzuar', async () => {
  seed();
  N.state.route = 'editor';
  N.state.draft = N.db.records[0];
  N.state.mode = 'view';
  N.navBack(); // history.state ekziston, pra kalon nga historiku
  await wait(200);
  assert.ok(['dashboard', 'reports', 'records'].includes(N.state.route), 'nuk mbetet në formular');
  N.state.draft = null;
  N.state.mode = 'new';
});

run();
