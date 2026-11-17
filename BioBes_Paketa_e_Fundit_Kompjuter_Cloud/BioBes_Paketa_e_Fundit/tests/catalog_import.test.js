#!/usr/bin/env node
'use strict';

// Kërkesa: "Duhet një import nga Exceli, që të mos i shkruaj klientët e
// punonjësit manualisht."
//
// Listat bazë (klientët, punonjësit, produktet…) mbushen një për një me dorë.
// Këto teste provojnë importin e vërtetë nga një skedar Excel/CSV: njihen
// titujt shqip, rreshtat e pavlefshëm hidhen poshtë, dublikatat nuk shtohen,
// dhe lista që ruhet nuk prish formularët e ruajtur më parë.
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const HOOK = `
;globalThis.__IMP__ = {
  db, state, catalogPlan, catalogPick, catalogHeaderKind, catalogLooksLikeHeader,
  catalogRowsFromWorkbook, catalogGuessKind, catalogExisting, catalogHTML,
  catalogImportHTML, catalogImportModal, catalogImportSave, catalogImportFile, comboOptions,
  CATALOG_KINDS, catalogRows: () => catalogImport.rows,
  setImport: (rows, kind, existing) => {
    catalogImport.rows = rows; catalogImport.sheet = 'Sheet1'; catalogImport.file = 'klientet.xlsx';
    catalogImport.kind = kind || 'clients';
    catalogImport.plan = catalogPlan(rows, catalogImport.kind, existing || catalogExisting(catalogImport.kind));
    return catalogImport.plan;
  },
};`;
const boot = () => loadApp(null, HOOK).window;
// commit zëvendësohet brenda të njëjtit eval ku rron app.js: vetëm kështu
// funksioni i importit e shikon versionin e rremë në vend të cloud-it.
const bootWithCommit = (body = 'globalThis.__SAVED__ = next; return true;') =>
  loadApp(null, HOOK + `\n;commit = async (next) => { ${body} };`).window;
const rowsOf = (...rows) => rows.map(r => (Array.isArray(r) ? r : [r]));

// ---------------------------------------------------------------------------
// 1. Njohja e titujve të kolonave
// ---------------------------------------------------------------------------
test('titujt e kolonave njihen në shqip dhe në anglisht', () => {
  const K = boot().__IMP__.catalogHeaderKind;
  for (const h of ['Klientët', 'Klienti', 'klient', 'KLIENTET', 'Customer', 'buyer', 'Konsumator']) assert.equal(K(h), 'clients', h);
  for (const h of ['Punonjësit', 'Punonjesit', 'punonjës', 'Employees', 'staff', 'Puntorët']) assert.equal(K(h), 'employees', h);
  for (const h of ['Përgjegjëset', 'Pergjegjeset', 'Manager', 'responsibles']) assert.equal(K(h), 'responsibles', h);
  for (const h of ['Produktet', 'Produkti', 'Products', 'Artikuj']) assert.equal(K(h), 'products', h);
  for (const h of ['Paketimi', 'Lloj paketimi', 'Packaging', 'Ambalazhi']) assert.equal(K(h), 'packages', h);
  for (const h of ['Njësia', 'Units', 'UOM']) assert.equal(K(h), 'units', h);
  for (const h of ['Statusi', 'Status']) assert.equal(K(h), 'statuses', h);
  for (const h of ['Burimi', 'Sources']) assert.equal(K(h), 'sources', h);
});

test('titulli i vetëm i fletës (“Klientët”) njihet si kokë, jo si emër', () => {
  const I = boot().__IMP__;
  assert.equal(I.catalogLooksLikeHeader(['Klientët']), true);
  assert.equal(I.catalogLooksLikeHeader(['Punonjësit']), true);
  assert.equal(I.catalogLooksLikeHeader(['Klient']), true);
  assert.equal(I.catalogLooksLikeHeader(['Emri Klientit']), true);
  // Një emër i vërtetë nuk ngatërrohet me titull.
  assert.equal(I.catalogLooksLikeHeader(['Arta Hoxha']), false);
  assert.equal(I.catalogLooksLikeHeader(['Kafe Arta']), false);
  assert.equal(I.catalogLooksLikeHeader(['Klient X 2024']), false, 'numrat tregojnë emër, jo titull');
});

test('kokë me dy kolona njihet, qoftë edhe vetëm njëra titull', () => {
  const I = boot().__IMP__;
  assert.equal(I.catalogLooksLikeHeader(['Klienti', 'Qyteti']), true);
  assert.equal(I.catalogLooksLikeHeader(['Arta Hoxha', 'Durrës']), false);
});

// ---------------------------------------------------------------------------
// 2. Nxjerrja e emrit nga rreshti
// ---------------------------------------------------------------------------
test('emri merret nga kolona e parë e plotë, pa numra dhe pa hapësira', () => {
  const P = boot().__IMP__.catalogPick;
  assert.equal(P(['Arta Hoxha'], 'clients').name, 'Arta Hoxha');
  assert.equal(P(['  ', 'Kafe Arta  '], 'clients').name, 'Kafe Arta');
  assert.equal(P([123], 'clients').name, '123');
  // Qeliza e titullit nuk merret si emër.
  assert.equal(P(['Klienti', 'Arta Hoxha'], 'clients').name, 'Arta Hoxha');
  // Burimi: fjala “stok” përcakton llojin dhe nuk bëhet emër.
  // jsdom kalon mes realm-eve: krahasohen fushat, jo identiteti i objektit.
  const stok = P(['Marrë nga stoku', 'stok'], 'sources');
  assert.equal(stok.name, 'Marrë nga stoku');
  assert.equal(stok.sourceKind, 'stock');
  const tjeter = P(['Depo e re', 'Tjetër'], 'sources');
  assert.equal(tjeter.name, 'Depo e re');
  assert.equal(tjeter.sourceKind, 'other');
});

// ---------------------------------------------------------------------------
// 3. Plani: të reja / ekzistuese / të pavlefshme
// ---------------------------------------------------------------------------
test('plani i importit i ndan saktë të rejat nga ekzistuesit', () => {
  const I = boot().__IMP__;
  const plan = I.setImport(rowsOf(['Arta Hoxha'], ['Besa Kola'], ['arta hoxha'], ['  Arta  Hoxha '], [''], ['12'], ['x']), 'clients', ['Arta Hoxha']);
  // Arta ekziston; 'arta hoxha' dhe '  Arta  Hoxha ' janë i njëjti emër.
  assert.equal(plan.add.join('|'), 'Besa Kola', 'shtohet vetëm emri i vërtetë i re');
  assert.equal(plan.add.length, 1);
  assert.equal(plan.have.length, 1, 'ekzistuesi raportohet veçmas');
  // '12' (vetëm numra), 'x' (një shkronjë) dhe boshja hidhen poshtë.
  assert.equal(plan.bad.length, 3);
});

test('dublikatat brenda të njëjtit skedar nuk shtohen dy herë', () => {
  const I = boot().__IMP__;
  const plan = I.setImport(rowsOf(['Kafe Arta'], ['KAFE ARTA'], ['kafe arta']), 'clients', []);
  assert.equal(plan.add.length, 1, 'një emër i vetëm edhe pse tre rreshta');
});

test('krahasimi injoron theksat, shkronjat e mëdha dhe hapësirat', () => {
  const I = boot().__IMP__;
  // 'Përgjegjësja ANI' është emër i vërtetë; i njëjti emër me theksa të tjera
  // nuk duhet të shtohet dy herë, dhe emri ekzistues nuk duhet të kontrollohet si listë.
  const plan = I.setImport(rowsOf(['Arta Hoxhaj'], ['arta hoxhaj']), 'employees', ['ARTA HOXHAJ']);
  assert.equal(plan.add.length, 0, 'i njëjti emër me shkronja të mëdha nuk dublikohet');
  assert.equal(plan.have.length, 1);
  const accented = I.setImport(rowsOf(['Besa Çela'], ['besa cela']), 'employees', ['BESA CELA']);
  assert.equal(accented.add.length, 0, 'theksi nuk e krijon si emër të re');
  assert.equal(accented.have.length, 1);
});

test('emrat e gjatë dhe qelizat me formulë numerike trajtohen pa e thyer faqen', () => {
  const I = boot().__IMP__;
  const long = 'A'.repeat(161);
  const plan = I.setImport(rowsOf([long], ['Emër ' + 'B'.repeat(40)]), 'clients', []);
  assert.equal(plan.tooLong.length, 1, 'emri mbi 160 shkronja hidhet me shpjegim');
  assert.equal(plan.add.length, 1);
});

test('kufiri i listës respektohet (2000 emra)', () => {
  const I = boot().__IMP__;
  const many = rowsOf(...Array.from({ length: 2100 }, (_, i) => ['Klienti ' + i]));
  const plan = I.setImport(many, 'clients', []);
  assert.equal(plan.add.length, 2000, 'plani kufizohet në 2000 emra');
  assert.ok(plan.add.length <= 2000);
});

// ---------------------------------------------------------------------------
// 4. Lloji i listës
// ---------------------------------------------------------------------------
test('lloji i listës merret nga titulli, kur ka', () => {
  const I = boot().__IMP__;
  assert.equal(I.catalogGuessKind(rowsOf(['Arta']), ['Punonjësit'], 'auto'), 'employees');
  assert.equal(I.catalogGuessKind(rowsOf(['Firma X']), ['Klientët'], 'auto'), 'clients');
  assert.equal(I.catalogGuessKind(rowsOf(['Firma X']), null, 'products'), 'products', 'zgjedhja e përdoruesit respektohet');
});

test('pa titull, emrat me dy fjalë propozohen si punonjës', () => {
  const I = boot().__IMP__;
  assert.equal(I.catalogGuessKind(rowsOf(['Arta Hoxha'], ['Besa Kola'], ['Dritan Meta']), null, 'auto'), 'employees');
  // Emrat e firmave një fjalë mbeten klientë.
  assert.equal(I.catalogGuessKind(rowsOf(['Arta'], ['Besa'], ['Dritan']), null, 'auto'), 'clients');
});

// ---------------------------------------------------------------------------
// 5. Skedari i vërtetë: Excel dhe CSV
// ---------------------------------------------------------------------------
test('lexohet një skedar Excel i vërtetë me një kolonë klientësh', () => {
  const w = boot();
  const I = w.__IMP__;
  // Ndërtohet një .xlsx i vërtetë me SheetJS, pikërisht siç do të bënte Excel-i.
  w.eval(`
    globalThis.__WB__ = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(globalThis.__WB__,
      XLSX.utils.aoa_to_sheet([['Klienti'],['Kafe Arta'],['Market Besa'],['Kafe Arta'],[''],['12345']]), 'Klientet');
  `);
  const { sheet, rows } = I.catalogRowsFromWorkbook(w.__WB__);
  assert.equal(sheet, 'Klientet');
  assert.equal(rows.length, 5, 'rreshti bosh hidhet, të tjerët mbeten');
  const header = I.catalogLooksLikeHeader(rows[0]) ? rows[0] : null;
  assert.ok(header, 'titulli “Klienti” njihet');
  const data = rows.slice(1);
  assert.equal(I.catalogGuessKind(data, header, 'auto'), 'clients');
  const plan = I.setImport(data, 'clients', []);
  assert.equal(plan.add.length, 2, 'dy klientë të vërtetë, pa dublikatë');
  assert.equal(plan.bad.length, 1, 'numri 12345 hidhet poshtë');
});

test('lexohet CSV me pikëpresje, siç ruan Excel-i shqip', () => {
  const w = boot();
  const I = w.__IMP__;
  w.eval(`
    globalThis.__CSV__ = XLSX.read('Klienti;Qyteti\\nKafe Arta;Durrës\\nMarket Besa;Tirana\\n', {type:'string'});
  `);
  const { rows } = I.catalogRowsFromWorkbook(w.__CSV__);
  assert.equal(rows.length, 3, 'titulli mbetet në rreshtat e lexuar; hoqet vetëm kur njihet si kokë');
  assert.equal(I.catalogLooksLikeHeader(rows[0]), true, 'titulli njihet');
  const plan = I.setImport(rows.slice(1), 'clients', []);
  assert.equal(plan.add.length, 2);
  assert.equal(plan.add[0], 'Kafe Arta');
  assert.equal(plan.add[1], 'Market Besa');
});

test('fleta e parë e zbrazët kapërcehet, merret e para me përmbajtje', () => {
  const w = boot();
  const I = w.__IMP__;
  w.eval(`
    globalThis.__WB2__ = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(globalThis.__WB2__, XLSX.utils.aoa_to_sheet([]), 'Bosh');
    XLSX.utils.book_append_sheet(globalThis.__WB2__, XLSX.utils.aoa_to_sheet([['Punonjësit'],['Arta Hoxha']]), 'Lista');
  `);
  const { sheet, rows } = I.catalogRowsFromWorkbook(w.__WB2__);
  assert.equal(sheet, 'Lista');
  assert.equal(rows.length, 2);
});

// ---------------------------------------------------------------------------
// 6. Ruajtja në listë
// ---------------------------------------------------------------------------
test('ruajtja shton vetëm të rejat, i rendit dhe nuk prek regjistrimet', async () => {
  const w = bootWithCommit();
  const I = w.__IMP__;
  // commit-i simulohet: kap objektin që do të ruhej në cloud.
  I.db.records.push({ id: 'r1', nr: '001', date: '2026-11-01', responsible: { name: 'Arta' }, assistant: { name: '' },
    plan: [{ product: 'Saj Mali', status: '', planned: '', actual: '', unit: '', packaging: '', client: 'Kafe Arta', packageCount: '', comment: '' }],
    employees: [], weighings: [], comments: '', isDemo: false, attachments: [] });
  const before = JSON.stringify(I.db.records);
  I.db.catalog.clients.push('Besa');
  I.setImport(rowsOf(['Kafe Arta'], ['Zana'], ['besa'], ['Arta Hoxha']), 'clients', I.catalogExisting('clients'));
  await I.catalogImportSave();
  const saved = w.__SAVED__;
  assert.ok(saved, 'commit u thirr');
  assert.equal(saved.catalog.clients.join('|'), 'Arta Hoxha|Besa|Kafe Arta|Zana', 'të rejat u shtuan dhe u renditën, pa dublikatë');
  assert.equal(saved.catalog.clients.filter(x => x === 'Kafe Arta').length, 1);
  assert.equal(JSON.stringify(saved.records), before, 'regjistrimet e ruajtura nuk ndryshojnë');
  // commit-i i vërtetë e zëvendëson db me gjendjen e ruajtur; këtu versioni i
  // rremë nuk e bën, prandaj kontrollohet vetëm objekti që shkoi në commit.
});

test('klienti i ri shfaqet në sugjerimet e formularit', async () => {
  const w = bootWithCommit('db = next; return true;');
  const I = w.__IMP__;
  I.setImport(rowsOf(['Kafe Arta'], ['Zana Market']), 'clients', []);
  await I.catalogImportSave();
  const opts = I.comboOptions('clients').map(o => o.label);
  assert.equal(opts.join('|'), 'Kafe Arta|Zana Market', 'komboja i ofron menjëherë');
});

test('pa emra të reja, ruajtja nuk bën asgjë dhe e thotë', async () => {
  const w = bootWithCommit('globalThis.__CALLED__ = true; return true;');
  const I = w.__IMP__;
  let called = false;
  I.db.catalog.clients.push('Kafe Arta');
  I.setImport(rowsOf(['Kafe Arta']), 'clients', I.catalogExisting('clients'));
  await I.catalogImportSave();
  called = !!w.__CALLED__;
  assert.equal(called, false, 'commit nuk thirret kur s’ka asgjë të re');
  assert.match(w.document.getElementById('toast').textContent, /Nuk ka emra të reja/i);
});

// ---------------------------------------------------------------------------
// 7. Ndërfaqja
// ---------------------------------------------------------------------------
test('faqja ka butonin “Importo nga Excel” dhe listën e klientëve', () => {
  const I = boot().__IMP__;
  const html = I.catalogHTML();
  assert.match(html, /data-action="catalog-import"/, 'butoni i importit');
  assert.match(html, /Importo nga Excel/);
  assert.match(html, /Klientët/, 'lista e klientëve u shtua');
  assert.match(html, /id="add-clients"/, 'klientët shtohen edhe me dorë');
  // Skedari pranon Excel dhe CSV. Input-i lexohet nga HTML-i i ruajtur, sepse
  // testi ndërton faqen pa elementët e jashtëm të app-it.
  const fs = require('node:fs'), path = require('node:path');
  const pageHtml = fs.readFileSync(path.join(__dirname, '..', 'BioBes_Cloud/web/index.html'), 'utf8');
  const tag = pageHtml.match(/<input[^>]+id="catalog-import-file"[^>]*>/);
  assert.ok(tag, 'input-i i skedarit ekziston ne faqe');
  assert.match(tag[0], /\.xlsx/);
  assert.match(tag[0], /\.csv/);
});

test('paraqitja tregon të rejat, ekzistuesit dhe të hedhurat', () => {
  const I = boot().__IMP__;
  I.setImport(rowsOf(['Kafe Arta'], ['Zana'], ['Arta Hoxha'], ['12']), 'clients', ['Arta Hoxha']);
  const html = I.catalogImportHTML();
  assert.match(html, /2 të reja/);
  assert.match(html, /1 ekzistojnë/);
  assert.match(html, /1 të hedhura/);
  assert.match(html, /Kafe Arta/, 'emrat e rinj shfaqen');
  assert.match(html, /Zgjidh skedar tjetër|import-preview/);
  assert.match(html, /id="catalog-import-kind"/, 'lloji i listës ndryshohet para ruajtjes');
});

test('lloji i listës ndryshohet dhe plani rillogaritet', () => {
  const I = boot().__IMP__;
  I.setImport(rowsOf(['Arta Hoxha'], ['Besa Kola']), 'clients', []);
  assert.equal(I.db.catalog.clients.length, 0);
  // I njëjti skedar mund të jetë listë punonjësish.
  I.setImport(rowsOf(['Arta Hoxha'], ['Besa Kola']), 'employees', []);
  const html = I.catalogImportHTML();
  assert.match(html, /Punonjësit/);
});

test('modal-i hapet me butonin e ruajtjes aktiv kur ka emra të rejë', () => {
  const w = boot();
  const I = w.__IMP__;
  I.setImport(rowsOf(['Kafe Arta']), 'clients', []);
  I.catalogImportModal();
  const root = w.document.getElementById('dialog-root');
  const save = root.querySelector('[data-import-save]');
  assert.ok(save, 'butoni ekziston');
  assert.match(save.textContent, /Shto 1 emra/);
  assert.equal(save.disabled, false);
  assert.ok(root.querySelector('#catalog-import-kind'));
  assert.ok(root.querySelector('.import-preview'));
});

test('modal-i çaktivizon ruajtjen kur nuk ka asgjë të re', () => {
  const w = boot();
  const I = w.__IMP__;
  I.db.catalog.clients.push('Kafe Arta');
  I.setImport(rowsOf(['Kafe Arta']), 'clients', I.catalogExisting('clients'));
  I.catalogImportModal();
  const save = w.document.querySelector('#dialog-root [data-import-save]');
  assert.equal(save.disabled, true);
});

// ---------------------------------------------------------------------------
// 8. Rastet e gabimit
// ---------------------------------------------------------------------------
test('skedari i dëmtuar jep mesazh të qartë, jo gabim teknik', async () => {
  const w = boot();
  const I = w.__IMP__;
  I.catalogImportModal();
  // Rasti real: skedari u hoq ose u mbyll para se të lexohej.
  const file = { name: 'klientet.xlsx', size: 100, arrayBuffer: async () => { throw new Error('NotReadableError'); } };
  await I.catalogImportFile(file);
  const err = w.document.getElementById('catalog-import-error');
  assert.ok(err, 'ka vend për mesazhin');
  assert.match(err.textContent, /nuk mund të lexohet/i);
  assert.match(err.textContent, /klientet\.xlsx/, 'emri i skedarit tregohet');
});

test('skedari i madh refuzohet pa e lexuar', async () => {
  const w = boot();
  const I = w.__IMP__;
  I.catalogImportModal();
  const file = { name: 'i_madh.xlsx', size: 13 * 1024 * 1024, arrayBuffer: async () => { throw new Error('nuk duhet lexuar'); } };
  await I.catalogImportFile(file);
  assert.match(w.document.getElementById('catalog-import-error').textContent, /12 MB/);
});

test('skedari me vetëm titull jep mesazh të kuptueshëm', async () => {
  const w = boot();
  const I = w.__IMP__;
  I.catalogImportModal();
  w.eval(`
    globalThis.__ONLY_HEADER__ = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(globalThis.__ONLY_HEADER__, XLSX.utils.aoa_to_sheet([['Klienti']]), 'K');
    globalThis.__BYTES__ = XLSX.write(globalThis.__ONLY_HEADER__, {bookType:'xlsx', type:'array'});
  `);
  const buf = w.__BYTES__;
  const file = { name: 'boshe.xlsx', size: buf.byteLength, arrayBuffer: async () => buf };
  await I.catalogImportFile(file);
  assert.match(w.document.getElementById('catalog-import-error').textContent, /vetëm titullin/i);
});

run();
