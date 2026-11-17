#!/usr/bin/env node
'use strict';

// Kërkesa: "Duhet dhe një formë template shembull që shkarkohet e plotësohet —
// pra nga sistemi, tip shembulli."
//
// Skedari i shkarkuar duhet të jetë njëkohësisht shembull i qartë dhe një
// dokument që llogaritet vetë. Këto teste mbrojnë tri gjëra:
//   1. shablloni ndërtohet i plotë (formë + shembull + formula reale);
//   2. formulat janë të vërteta Excel, jo numra të shkruar dorazi;
//   3. skedari i plotësuar lexohet saktë kur kthehet — pa vlera të shpikura.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const HOOK = `
;globalThis.__TPL__ = {
  xlsxBytes, xlTemplateSheet, xlTemplateCells, xlColIndex, xlTime, xlTimeFromCell,
  xlIsTemplateSheet, readTemplateExcel, exportTemplateXlsx, templateUpload,
  templateReturnHTML, batchResultsFromWorkbook, readExcelFile, batchHTML,
  db, state, batchState, today, cells: () => xlTemplateCells(),
};`;

const boot = () => loadApp(null, HOOK).window;

// app.js është në 'use strict', prandaj funksionet e deklaruara në eval nuk
// derdhen në global — thirren përmes objektit të hook-ut, jo me emër të lirë.
function buildTemplate(w) {
  const T = w.__TPL__;
  const bytes = T.xlsxBytes({ title: 'BioBes — shabllon formulari', sheets: [T.xlTemplateSheet()] });
  return Buffer.from(bytes).toString('base64');
}
// Rilexon skedarin nga base64 brenda realm-it të faqes.
function reopen(w, b64, mutate = null) {
  w.eval(`globalThis.__OPEN_B64__ = ${JSON.stringify(b64)};
    globalThis.__OPEN_AB__ = (() => { const s = atob(globalThis.__OPEN_B64__);
      const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      return u.buffer; })();`);
  if (mutate) w.eval(mutate);
  return { name: 'BioBes_shabllon.xlsx', size: w.__OPEN_AB__.byteLength, arrayBuffer: async () => w.__OPEN_AB__ };
}

// ---------------------------------------------------------------------------
// 1. Shablloni ndërtohet dhe përmban formën e plotë
// ---------------------------------------------------------------------------
test('shablloni ndërtohet si skedar .xlsx i vlefshëm', () => {
  const w = boot();
  const b64 = buildTemplate(w);
  assert.ok(b64.length > 1000, 'skedari ka përmbajtje');
  const bytes = Buffer.from(b64, 'base64');
  assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'është arkiv zip/xlsx');
});

test('shablloni ka të gjitha seksionet e formularit', () => {
  const w = boot();
  const T = w.__TPL__;
  const cells = T.cells();
  const text = cells.filter(c => typeof c.v === 'string').map(c => c.v).join(' | ');
  for (const section of ['TË DHËNAT E DITËS', 'PLANI I PUNËS', 'PUNONJËSIT', 'PESHIMET']) {
    assert.match(text, new RegExp(section), `mungon seksioni ${section}`);
  }
  // Fushat kyçe të formularit real
  for (const field of ['Nr. formulari', 'Data', 'Përgjegjësja', 'Ndihmësja', 'Produkti', 'Klienti', 'Statusi', 'Njësia']) {
    assert.match(text, new RegExp(field), `mungon fusha ${field}`);
  }
});

test('shablloni vjen me shembull të plotësuar, jo bosh', () => {
  const w = boot();
  const cells = w.__TPL__.cells();
  const byRef = Object.fromEntries(cells.map(c => [c.r, c]));
  assert.equal(byRef['A10'].v, 'Saj Mali', 'rreshti provë i planit');
  assert.equal(byRef['B10'].v, 'Kafe Arta', 'klienti provë');
  assert.equal(byRef['E10'].v, 320, 'sasia e porositur');
  assert.equal(byRef['A19'].v, 'Arta Hoxha', 'punonjësja provë');
  assert.equal(byRef['A28'].v, 'Saj Mali', 'peshimi provë');
  assert.equal(byRef['D28'].v, 240, 'KG provë');
});

// ---------------------------------------------------------------------------
// 2. Formulat janë të vërteta — sistemi i shkruan, Excel-i llogarit
// ---------------------------------------------------------------------------
test('shuma e rreshtit të peshimit nuk shkruhet dorazi, por me formulë', () => {
  const w = boot();
  const byRef = Object.fromEntries(w.__TPL__.cells().map(c => [c.r, c]));
  assert.equal(byRef['H28'].f, 'IF(G28="","",G28-(D28+E28))', 'diferenca llogaritet');
  assert.match(byRef['I28'].f, /GABIM/, 'kontrolli shkruan GABIM kur nuk përputhet');
  assert.match(byRef['I28'].f, /OK/, 'dhe OK kur përputhet');
  assert.equal(byRef['H28'].v, undefined, 'nuk ka numër të shkruar nën formulë');
});

test('totalet janë formula SUM mbi rreshtat e duhur', () => {
  const w = boot();
  const byRef = Object.fromEntries(w.__TPL__.cells().map(c => [c.r, c]));
  assert.equal(byRef['E15'].f, 'SUM(E10:E14)', 'sasia e porositur');
  assert.equal(byRef['F15'].f, 'SUM(F10:F14)', 'sasia e prodhuar');
  assert.equal(byRef['C33'].f, 'SUM(C28:C32)', 'thasët');
  assert.equal(byRef['D33'].f, 'SUM(D28:D32)', 'KG');
  assert.equal(byRef['F33'].f, 'SUM(F28:F32)', 'shuma');
  // Totali nuk përfshin rreshtin e totalit vetë (referencë qarkore).
  assert.doesNotMatch(byRef['D33'].f, /D33/);
});

test('orët e punonjësve llogariten nga ora e fillimit dhe e mbarimit', () => {
  const w = boot();
  const byRef = Object.fromEntries(w.__TPL__.cells().map(c => [c.r, c]));
  assert.match(byRef['D19'].f, /\(C19-B19\)\*24/, 'ora = diferenca × 24');
  assert.match(byRef['D19'].f, /IF\(AND\(B19<>"",C19<>""\)/, 'bosh mbetet bosh, pa zero të rreme');
  assert.equal(byRef['D24'].f, 'SUM(D19:D23)', 'totali i orëve');
});

test('shablloni ka formulë edhe për rreshtat bosh, që përdoruesi të mos mbetet pa llogaritje', () => {
  const w = boot();
  const byRef = Object.fromEntries(w.__TPL__.cells().map(c => [c.r, c]));
  for (const r of [19, 20, 21, 22, 23]) assert.ok(byRef['D' + r].f, `orët për rreshtin ${r}`);
  for (const r of [28, 29, 30, 31, 32]) assert.ok(byRef['I' + r].f, `kontrolli për rreshtin ${r}`);
});

// ---------------------------------------------------------------------------
// 3. Vlerat e orës dhe datës janë të vërteta, jo tekst
// ---------------------------------------------------------------------------
test('ora shkruhet si fraksion dite, që formula të japë orë të sakta', () => {
  const T = boot().__TPL__;
  assert.equal(T.xlTime('08:00'), 8 / 24);
  assert.equal(T.xlTime('17:30'), 17.5 / 24);
  assert.equal(T.xlTime('00:00'), 0);
  assert.equal(T.xlTime('24:00'), null, 'orë e pavlefshme');
  assert.equal(T.xlTime('08:75'), null, 'minuta të pavlefshme');
  assert.equal(T.xlTime(''), null);
  // Dhe kthehet saktë nga qeliza
  assert.equal(T.xlTimeFromCell(8 / 24), '08:00');
  assert.equal(T.xlTimeFromCell(17.5 / 24), '17:30');
  assert.equal(T.xlTimeFromCell('08:00'), '08:00');
  assert.equal(T.xlTimeFromCell(''), '');
});

test('kolona A..I kthehet saktë në indeks', () => {
  const T = boot().__TPL__;
  assert.equal(T.xlColIndex('A'), 0);
  assert.equal(T.xlColIndex('B'), 1);
  assert.equal(T.xlColIndex('I'), 8);
  assert.equal(T.xlColIndex('J'), 9);
  assert.equal(T.xlColIndex('AA'), 26);
});

// ---------------------------------------------------------------------------
// 4. Kthimi: shablloni i plotësuar lexohet saktë
// ---------------------------------------------------------------------------
test('shablloni njihet si shabllon, jo si modeli i vjetër i formularit', async () => {
  const w = boot();
  const T = w.__TPL__;
  const file = reopen(w, buildTemplate(w));
  const wb = await T.readExcelFile(file);
  const sh = wb.Sheets[wb.SheetNames[0]];
  assert.equal(T.xlIsTemplateSheet(sh), true);
  const res = T.batchResultsFromWorkbook(wb);
  assert.equal(res.length, 1, 'një formular');
});

test('skedari i plotësuar kthehet në regjistrim me të gjitha fushat', async () => {
  const w = boot();
  const T = w.__TPL__;
  const file = reopen(w, buildTemplate(w));
  const wb = await T.readExcelFile(file);
  const [item] = T.batchResultsFromWorkbook(wb);
  const r = item.record;
  assert.equal(r.nr, '001');
  assert.equal(r.date, T.today(), 'data e shabllonit');
  // Plani
  assert.equal(r.plan[0].product, 'Saj Mali');
  assert.equal(r.plan[0].client, 'Kafe Arta');
  assert.equal(r.plan[0].status, 'Përfunduar');
  assert.equal(r.plan[0].unit, 'kg');
  assert.equal(r.plan[0].planned, '320');
  assert.equal(r.plan[0].actual, '305');
  assert.equal(r.plan[0].packaging, 'thasë');
  assert.equal(r.plan[0].packageCount, '61');
  // Punonjësit: ora e lexuar nga fraksioni i ditës
  assert.equal(r.employees[0].name, 'Arta Hoxha');
  assert.equal(r.employees[0].start, '08:00');
  assert.equal(r.employees[0].end, '16:00');
  assert.equal(r.employees[1].start, '08:00');
  assert.equal(r.employees[1].end, '17:30');
  // Peshimet
  assert.equal(r.weighings[0].product, 'Saj Mali');
  assert.equal(r.weighings[0].rows[0].kg, '240');
  assert.equal(r.weighings[0].rows[0].packaging, '36');
  assert.equal(r.weighings[0].rows[0].sum, '276');
  assert.equal(r.weighings[1].product, 'Boronicë');
});

test('burimi i peshimit njihet nga lista, që formularit t’i kalojë kontrolli', async () => {
  const w = boot();
  const T = w.__TPL__;
  const file = reopen(w, buildTemplate(w));
  const wb = await T.readExcelFile(file);
  const r = T.batchResultsFromWorkbook(wb)[0].record;
  assert.equal(r.weighings[0].source, 'stock', 'marrë nga stoku');
  assert.equal(r.weighings[1].source, 'other', 'jo nga stoku');
  assert.equal(r.weighings[0].rows.length, 25, 'grupi mban 25 rreshta, siç kërkon formulari');
});

test('shablloni me shumë të gabuar raportohet, nuk korrigjohet vetë', async () => {
  const w = boot();
  const T = w.__TPL__;
  // SH=290 ndërsa KG 240 + ambalazh 36 = 276 → duhet të qortojë.
  const b64 = buildTemplate(w);
  const file = reopen(w, b64, `
    const wb = XLSX.read(globalThis.__OPEN_AB__, {type:'array'});
    wb.Sheets[wb.SheetNames[0]]['G28'] = {t:'n', v:290};
    globalThis.__OPEN_AB__ = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  `);
  const wb = await T.readExcelFile(file);
  const [item] = T.batchResultsFromWorkbook(wb);
  const found = item.warnings.some(x => /nuk përputhet me KG \+ Ambalazh/i.test(x));
  assert.ok(found, 'paralajmërimi për shumën e gabuar: ' + JSON.stringify(item.warnings));
  // Vlera e shkruar nuk ndryshohet në heshtje
  assert.equal(item.record.weighings[0].rows[0].sum, '290', 'vlera e përdoruesit ruhet ashtu siç është');
});

test('shablloni i zbrazët nuk shpik vlera', async () => {
  const w = boot();
  const T = w.__TPL__;
  const b64 = buildTemplate(w);
  // Fshijmë të gjitha rreshtat provë, siç do bënte përdoruesi.
  const file = reopen(w, b64, `
    const wb = XLSX.read(globalThis.__OPEN_AB__, {type:'array'});
    const sh = wb.Sheets[wb.SheetNames[0]];
    for (const r of [10,11,19,20,28,29]) for (const c of 'ABCDEFGHI') delete sh[c + r];
    globalThis.__OPEN_AB__ = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  `);
  const wb = await T.readExcelFile(file);
  const r = T.batchResultsFromWorkbook(wb)[0].record;
  assert.equal(r.plan[0].product, '', 'produkt bosh mbetet bosh');
  assert.equal(r.plan[0].actual, '', 'sasi bosh mbetet bosh — jo 0');
  assert.equal(r.plan[0].planned, '', 'jo zero e shpikur');
  assert.equal(r.employees.filter(e => e.name).length, 0, 'pa punonjës të shpikur');
  assert.equal(r.weighings[0].product, '', 'pa peshim të shpikur');
});

test('numri që mungon në shabllon raportohet dhe propozohet i radhës', async () => {
  const w = boot();
  const T = w.__TPL__;
  const b64 = buildTemplate(w);
  const file = reopen(w, b64, `
    const wb = XLSX.read(globalThis.__OPEN_AB__, {type:'array'});
    const sh = wb.Sheets[wb.SheetNames[0]];
    delete sh['B5'];
    globalThis.__OPEN_AB__ = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  `);
  const wb = await T.readExcelFile(file);
  const [item] = T.batchResultsFromWorkbook(wb);
  assert.equal(item.missingNumber, true, 'sistemi e di që numri mungon');
  assert.ok(item.warnings.some(x => /Numri i formularit/i.test(x)), 'dhe e thotë');
  assert.match(item.record.nr, /^\d{3}$/, 'propozohet numri i radhës, me zero');
});

// ---------------------------------------------------------------------------
// 5. Ndërfaqja
// ---------------------------------------------------------------------------
test('ka buton shkarkimi në faqen “Lexo formularë” dhe te Printim', () => {
  const w = boot();
  const T = w.__TPL__;
  const batch = T.batchHTML();
  assert.match(batch, /data-action="template-download"/, 'butoni te Lexo formularë');
  assert.match(batch, /Shkarko shabllonin Excel/);
  const ret = T.templateReturnHTML();
  assert.match(ret, /data-action="template-download"/, 'shkarko');
  assert.match(ret, /data-action="template-upload"/, 'dhe ngarko mbrapsht');
  assert.match(ret, /lexohet në këtë pajisje/, 'thuhet qartë se nuk dërgohet askund');
});

test('faqja ka fushën e skedarit për shabllonin e plotësuar', () => {
  const pageHtml = fs.readFileSync(path.join(__dirname, '..', 'BioBes_Cloud/web/index.html'), 'utf8');
  const tag = pageHtml.match(/<input[^>]+id="template-upload-file"[^>]*>/);
  assert.ok(tag, 'input-i ekziston');
  assert.match(tag[0], /\.xlsx/);
});

test('ngarkimi i shabllonit e çon skedarin te leximi, pa e ruajtur vetë', async () => {
  const w = boot();
  const T = w.__TPL__;
  const b64 = buildTemplate(w);
  const file = reopen(w, b64);
  file.name = 'BioBes_shabllon.xlsx';
  await T.templateUpload(file);
  assert.equal(T.state.route, 'batch', 'kalon te faqja e leximit');
  assert.equal(T.batchState.groups.length, 1, 'skedari u vendos si grup');
  assert.equal(T.batchState.groups[0].status, 'pending', 'nuk u lexua dhe nuk u ruajt vetë');
  assert.equal(T.db.records.length, 0, 'asnjë regjistrim nuk u krijua automatikisht');
});

test('butoni e shkarkon skedarin me emrin e duhur dhe toast që shpjegon hapin tjetër', () => {
  const w = boot();
  const T = w.__TPL__;
  const clicks = [];
  // jsdom nuk ka URL.createObjectURL; kapim lidhjen dhe klikimin e vërtetë.
  w.URL.createObjectURL = () => 'blob:https://biobes.test/shabllon';
  w.URL.revokeObjectURL = () => {};
  w.document.createElement = ((orig) => (tag, ...rest) => {
    const el = orig.call(w.document, tag, ...rest);
    if (String(tag).toLowerCase() === 'a') el.click = () => clicks.push({ name: el.download, href: el.href });
    return el;
  })(w.document.createElement);
  T.exportTemplateXlsx();
  assert.equal(clicks.length, 1, 'u shkarkua një skedar');
  assert.match(clicks[0].name, /^BioBes_shabllon_\d{4}-\d{2}-\d{2}\.xlsx$/, 'emri ka datën: ' + clicks[0].name);
  const toast = w.document.getElementById('toast').textContent;
  assert.match(toast, /Plotësoje dhe ngarko/i, 'toast-i thotë çfarë të bëhet më pas: ' + toast);
});

test('skedar që nuk është Excel refuzohet me mesazh', async () => {
  const w = boot();
  await w.__TPL__.templateUpload({ name: 'foto.jpg', size: 100, arrayBuffer: async () => new ArrayBuffer(8) });
  assert.match(w.document.getElementById('toast').textContent, /Excel/i);
});

run();
