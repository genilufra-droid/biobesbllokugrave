#!/usr/bin/env node
'use strict';

// Hapat e shpejtësisë: zonat si kod i shkurtër, cache-i i leximit, paralelizmi.
// Asnjë nga këto nuk guxon të ndryshojë një vlerë të lexuar — vetëm të mos e
// shpenzojë kohën dy herë.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const api = dom.window.__BIOBES__;
const plain = (x) => JSON.parse(JSON.stringify(x));

// --- Zonat: kodi i shkurtër -> teksti që shfaqet ---------------------------
test('kodi i shkurtër i peshimit zbërthehet saktë', () => {
  assert.equal(api.aiArea('w1.r3.kg', null), 'PESHIMI 1 · faqja PARA · rreshti 3 · Kg');
  assert.equal(api.aiArea('w4.r7.bags', null), 'PESHIMI 1 · faqja PAS · rreshti 7 · Nr. thas.');
  assert.equal(api.aiArea('w6.sh.packaging', null), 'PESHIMI 3 · faqja PAS · rreshti SH · Ambalazhi');
});

test('kodi i shkurtër i planit dhe punonjësve zbërthehet saktë', () => {
  assert.equal(api.aiArea('p2.planned', null), 'Produkti 2 · Sasia e porositur');
  assert.equal(api.aiArea('e11.start', null), 'Punonjësi 11 · Fillim Pune');
  assert.equal(api.aiArea('e1.signature', null), 'Punonjësi 1 · Firma');
});

test('zonat e thjeshta dhe teksti i plotë nuk prishën', () => {
  assert.equal(api.aiArea('nr', null), 'Numri i formularit');
  assert.equal(api.aiArea('responsible.name', null), 'Përgjegjësja');
  assert.equal(api.aiArea('comments', null), 'KOMENTE');
  // Teksti i vjetër kalon i paprekur.
  const old = 'PESHIMI 1 · faqja PARA · rreshti 2 · Ambalazhi';
  assert.equal(api.aiArea(old, null), old);
  // Bosh -> i paracaktuar.
  assert.equal(api.aiArea('', 'Zona'), 'Zona');
  assert.equal(api.aiArea(null, 'Zona'), 'Zona');
});

test('kod i panjohur nuk shpiket', () => {
  assert.equal(api.aiArea('x9.zzz', 'FALLBACK'), 'x9.zzz', 'kalohet si tekst, nuk hidhet poshtë');
});

// --- Leximi: zona ndërtohet edhe kur modeli e dërgon si kod ------------------
test('formArea nga kodi i shkurtër në leximin e plotë', () => {
  const data = {
    forms: [{
      record_number: '001',
      header: {},
      fields: [{ field: 'nr', value: '001', page: 1, formArea: 'nr', needsReview: false }],
      weighings: [{
        index: 1,
        rows: [{ row: 3, bags: { value: '6', page: 2, formArea: 'w1.r3.bags' }, kg: { value: '180', page: 2, formArea: 'w1.r3.kg' } }],
      }],
    }],
  };
  const read = api.aiReadings(plain(data), { fileName: 'x.pdf', pageCount: 2 });
  const row = read.forms[0].reading.weights.peshimi1[0];
  assert.equal(row.kg.formArea, 'PESHIMI 1 · faqja PARA · rreshti 3 · Kg');
  assert.equal(row.kg.value, '180', 'vlera nuk ndryshon');
  assert.equal(row.nrThas.formArea, 'PESHIMI 1 · faqja PARA · rreshti 3 · Nr. thas.');
});

test('pa formArea fare, zona ndërtohet nga fusha e kërkuar', () => {
  const data = {
    forms: [{
      record_number: '002',
      header: {},
      weighings: [{ index: 1, rows: [{ row: 1, kg: '100' }] }],
    }],
  };
  const read = api.aiReadings(plain(data), { fileName: 'x.pdf', pageCount: 2 });
  const row = read.forms[0].reading.weights.peshimi1[0];
  assert.equal(row.kg.formArea, 'PESHIMI 1 · faqja PARA · rreshti 1 · Kg');
  assert.equal(row.kg.value, '100');
});

// --- Punonjësit: vetëm rreshtat me vlera ------------------------------------
test('punonjësit e pjesshëm pranohen dhe pozicionet ruhen', () => {
  const data = {
    forms: [{
      record_number: '003',
      header: {},
      employees: [
        { name: 'Anonim Një', start: '08:00', end: '16:00' },
        { name: '', start: '', end: '' },
        { name: 'Anonim Tre', start: '09:00', end: '17:00' },
      ],
    }],
  };
  const read = api.aiReadings(plain(data), { fileName: 'x.pdf', pageCount: 2 });
  const staff = read.forms[0].record.employees;
  assert.equal(staff.length, 12, 'rreshtat bosh mbushen në pajisje');
  assert.equal(staff[0].name, 'Anonim Një');
  assert.equal(staff[2].name, 'Anonim Tre', 'rendi mbetet pozicioni');
  assert.equal(staff[1].name, '', 'rreshti bosh mbetet bosh');
});

// --- Cache-i: i njëjti skedar nuk rilexohet ---------------------------------
test('cache-i i leximit ruan dhe kthen të njëjtën dalje', async () => {
  api.readCacheClear();
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  const file = new dom.window.File([bytes], 'skanim.pdf', { type: 'application/pdf' });
  const key = await api.readCacheKey(file);
  assert.ok(key, 'hash-i u krijua');
  assert.equal(api.readCacheGet(key), null, 'bosh në fillim');

  const payload = { document: { pageCount: 2 }, forms: [{ record_number: '001' }] };
  api.readCacheSet(key, payload);
  assert.deepEqual(plain(api.readCacheGet(key)), plain(payload));
});

test('skedar i njëjtë => hash i njëjtë; skedar tjetër => hash tjetër', async () => {
  const a = new dom.window.File([new Uint8Array([1, 2, 3])], 'a.pdf', { type: 'application/pdf' });
  const b = new dom.window.File([new Uint8Array([1, 2, 3])], 'b.pdf', { type: 'application/pdf' });
  const c = new dom.window.File([new Uint8Array([1, 2, 4])], 'c.pdf', { type: 'application/pdf' });
  assert.equal(await api.readCacheKey(a), await api.readCacheKey(b), 'përmbajtja vendos, jo emri');
  assert.notEqual(await api.readCacheKey(a), await api.readCacheKey(c));
});

test('cache-i nuk e rikthen një lexim të skaduar', () => {
  api.readCacheClear();
  const key = 'TESTEXPIRE';
  dom.window.localStorage.setItem(`biobes.read.${key}`, JSON.stringify({ at: Date.now() - 30 * 86400000, data: { forms: [] } }));
  assert.equal(api.readCacheGet(key), null, 'i skaduar nuk përdoret');
});

// --- Skanimi real: asnjë vlerë nuk ndryshoi --------------------------------
test('skanimi real jep të njëjtat vlera si më parë', () => {
  const scan = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/scan_14_pages.json'), 'utf8'));
  const read = api.aiReadings(scan, { fileName: 'scan.pdf', pageCount: 14 });
  assert.equal(read.document.formCount, 7);
  assert.equal(read.document.pageCount, 14);
  const kg = (index) => (read.forms[index].record.weighings[0].rows || [])
    .reduce((sum, r) => sum + (Number(String(r.kg).replace(/[^0-9]/g, '')) || 0), 0);
  assert.equal(kg(0), 1476, 'formulari 001');
  assert.equal(kg(3), 1571, 'formulari 004');
  assert.deepEqual(plain(read.forms.map((f) => f.record.date)),
    ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '', '2026-11-11', '2026-11-12']);
});

run();
