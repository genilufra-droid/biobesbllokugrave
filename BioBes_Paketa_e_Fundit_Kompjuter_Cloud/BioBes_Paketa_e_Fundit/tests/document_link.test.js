#!/usr/bin/env node
'use strict';

// Kërkesa: "Duhet një link, p.sh. ku thotë formular, klikon e hap dokumentin."
//
// Më parë dokumenti origjinal ishte vetëm një buton "Shkarko": një klik e
// shkarkonte skedarin dhe, në telefon, ai thjesht humbte në dosjen e
// shkarkimeve. Tani klikimi e hap dokumentin brenda faqes.
//
// Këto teste mbrojnë sjelljen reale, jo tekstin:
//  1. emri i dokumentit është një link i klikueshëm (jo më buton shkarkimi);
//  2. një klik e hap dokumentin brenda aplikacionit (PDF në kuadër, foto si imazh);
//  3. skedari vjen nga cloud-i privat dhe nuk krijohet asnjë lidhje e përhershme;
//  4. dokumentet e lexuara rishtazi hapen drejt nga kujtesa lokale;
//  5. biblioteka i gjen të gjitha dokumentet dhe i hap me kërkim;
//  6. regjistrimi pa dokument e thotë qartë, pa e thyer faqen;
//  7. Escape e mbyll dhe lidhja lokale lirohet (pa rrjedhje memorie).
const assert = require('node:assert/strict');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const HOOK = `
;globalThis.__DOC__ = {
  docKind, docFmtSize, docItemsFor, docLinksHTML, docBadge, docLibraryEntries,
  docLibraryFiltered, docLibraryHTML, recordDocCell, cloudAttachmentsHTML,
  docShowList, docClose, docOpen, docOpenLibrary, docOpenFromClick,
  docRegisterDocs, docStore, docView, state, db, cloud, docNrCell, recordRows, dashboardHTML, historyHTML, renderHistoryList, recordsHTML() { return ''; },
};`;

const boot = (extra = '') => loadApp(null, HOOK + extra).window;

// Regjistrim i ruajtur me dy dokumente private në cloud.
const record = () => ({
  id: 'rec-1',
  nr: '041',
  date: '2026-11-12',
  responsible: { name: 'Arta Hoxha', signature: '' },
  assistant: { name: '', signature: '' },
  plan: [],
  employees: [],
  weighings: [],
  comments: '',
  isDemo: false,
  attachments: [
    { name: 'formulari-041-faqja-1.pdf', path: 'user-1/rec-1/a.pdf', type: 'application/pdf', size: 51200 },
    { name: 'formulari-041-faqja-2.jpg', path: 'user-1/rec-1/b.jpg', type: 'image/jpeg', size: 2048 },
  ],
});

// db lexohet drejt nga moduli: nuk zëvendësohet objekti, vetëm mbushet —
// që tabelat dhe biblioteka të shohin të njëjtat regjistrime si në faqe.
const loadDb = (D, recs) => {
  D.db.records.splice(0, D.db.records.length, ...recs);
};

test('lloji i dokumentit njihet nga emri dhe nga tipi MIME', () => {
  const D = boot().__DOC__;
  assert.equal(D.docKind('a.pdf', ''), 'pdf');
  assert.equal(D.docKind('a.PDF', ''), 'pdf');
  assert.equal(D.docKind('skanim', 'image/jpeg'), 'image');
  assert.equal(D.docKind('foto.HEIC', ''), 'image');
  assert.equal(D.docKind('raport.xlsx', ''), 'sheet');
  assert.equal(D.docKind('dok.docx', ''), 'word');
  assert.equal(D.docKind('x.pdf', 'application/octet-stream'), 'pdf');
});

test('madhësia e skedarit shkruhet në njësi të lexueshme', () => {
  const D = boot().__DOC__;
  assert.equal(D.docFmtSize(0), '');
  assert.equal(D.docFmtSize(700), '700 B');
  assert.equal(D.docFmtSize(51200), '50 KB');
  assert.equal(D.docFmtSize(3 * 1024 * 1024), '3.0 MB');
});

test('dokumentet e regjistrimit nxirren me emër, lloj dhe rrugë', () => {
  const D = boot().__DOC__;
  const items = D.docItemsFor(record());
  assert.equal(items.length, 2);
  // jsdom kalon mes realm-eve: krahasohet përmbajtja, jo identiteti i vargut.
  assert.equal(items.map(i => i.name).join('|'), 'formulari-041-faqja-1.pdf|formulari-041-faqja-2.jpg');
  assert.equal(items[0].kind, 'pdf');
  assert.equal(items[1].kind, 'image');
  assert.equal(items[0].path, 'user-1/rec-1/a.pdf');
  assert.equal(items[1].size, 2048);
});

test('emri i dokumentit është link që hapet me një klik — jo më vetëm "Shkarko"', () => {
  const D = boot().__DOC__;
  const html = D.docLinksHTML(D.docItemsFor(record()));
  assert.match(html, /class="doc-link"/, 'duhet të jetë link i klikueshëm');
  assert.match(html, /data-doc-open/, 'klikimi duhet të njihet nga dëgjuesi');
  assert.match(html, /Hape →/, 'fjalë që tregon qartë se çfarë bën klikimi');
  assert.match(html, /formulari-041-faqja-1\.pdf/);
  assert.doesNotMatch(html, /data-action="cloud-open-original"/, 'nuk mbetet butoni i vjetër i shkarkimit');
  assert.doesNotMatch(html, /download=/, 'klikimi nuk shkarkon dokumentin');
});

test('klikimi shfaq dokumentin brenda aplikacionit, pa shkarkim', async () => {
  const w = boot();
  const D = w.__DOC__;
  loadDb(D, [record()]);
  const items = D.docItemsFor(record());
  // Lidhja lokale e skedarit simulohet: URL.createObjectURL mungon në jsdom.
  items[0].url = 'blob:https://biobes.test/aaa';
  await D.docOpen(items, 0);
  const root = w.document.getElementById('dialog-root');
  const frame = root.querySelector('iframe.doc-frame');
  assert.ok(frame, 'PDF-ja hapet në kuadër brenda faqes');
  assert.equal(frame.getAttribute('src'), 'blob:https://biobes.test/aaa');
  assert.equal(root.querySelectorAll('.modal-layer.doc-layer').length, 1, 'dritarja hapet një herë');
  assert.match(root.textContent, /formulari-041-faqja-1\.pdf/);
  // Dokumenti i dytë është një fotografi: shfaqet si imazh, jo si kuadër.
  items[1].url = 'blob:https://biobes.test/bbb';
  await D.docOpen(items, 1);
  const img = root.querySelector('img.doc-image');
  assert.ok(img, 'fotografia shfaqet si imazh');
  assert.equal(img.getAttribute('src'), 'blob:https://biobes.test/bbb');
  assert.match(root.textContent, /2 nga 2/, 'navigimi tregon se ku je');
  D.docClose();
  assert.equal(root.innerHTML, '', 'mbyllja e pastron dritaren');
});

test('skedari vjen nga cloud-i privat dhe nuk krijohet lidhje e përhershme', async () => {
  const w = boot();
  const D = w.__DOC__;
  loadDb(D, [record()]);
  // Supabase-i simulohet: regjistrohet saktësisht çfarë kërkohet.
  const calls = [];
  calls.length = 0;
  D.cloud.user = { id: 'user-1' };
  D.cloud.client = { storage: { from: (bucket) => ({ download: async (path) => {
    calls.push({ bucket, path });
    return { data: new w.Blob(['%PDF-1.4 prova'], { type: 'application/pdf' }), error: null };
  } }) } };
  // URL e përkohshme e tab-it, që nuk ekziston në jsdom.
  w.URL.createObjectURL = () => 'blob:https://biobes.test/local';
  w.URL.revokeObjectURL = () => { w.__revoked = true; };

  const entries = D.docLibraryEntries();
  await D.docOpen(entries, 0);

  assert.equal(calls.length, 1, 'një kërkesë e vetme për skedarin e klikuar');
  assert.equal(calls[0].bucket, 'biobes-daily-documents-private');
  assert.equal(calls[0].path, 'user-1/rec-1/a.pdf');
  assert.equal(D.docView.owns, true, 'lidhja lokale mbahet mend për t’u liruar');
  assert.equal(w.document.querySelector('#dialog-root iframe.doc-frame').getAttribute('src'), 'blob:https://biobes.test/local');
  assert.doesNotMatch(w.document.getElementById('dialog-root').innerHTML, /supabase\.co/, 'asnjë lidhje e përhershme publike në faqe');
  D.docClose();
  assert.equal(w.__revoked, true, 'lidhja lokale lirohet kur mbyllet');
  assert.equal(D.docView.url, '');
});

test('dokumenti i një projekti tjetër nuk hapet', async () => {
  const w = boot();
  const D = w.__DOC__;
  D.cloud.user = { id: 'user-1' };
  const entries = D.docItemsFor({ attachments: [{ name: 'x.pdf', path: 'dikush-tjeter/rec/a.pdf', type: 'application/pdf', size: 10 }] });
  await D.docOpen(entries, 0);
  assert.match(w.document.getElementById('dialog-root').textContent, /nuk është i disponueshëm/i);
  assert.equal(w.document.querySelector('#dialog-root iframe'), null, 'asnjë dokument nuk shfaqet');
  D.docClose();
});

test('dokumentet e lexuara rishtazi hapen drejt nga pajisja', async () => {
  const w = boot();
  const D = w.__DOC__;
  const item = { sources: [
    { name: 'skanim_faqet_1-2.pdf', url: 'blob:https://biobes.test/skanim' },
    { name: 'skanim_faqet_3-4.pdf', url: 'blob:https://biobes.test/skanim2' },
  ] };
  const entries = D.docItemsFor(null, item);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].local, true);
  await D.docOpen(entries, 0);
  const frame = w.document.querySelector('#dialog-root iframe.doc-frame');
  assert.ok(frame, 'skedari lokal hapet pa pritur cloud-in');
  assert.equal(frame.getAttribute('src'), 'blob:https://biobes.test/skanim');
  D.docClose();
});

test('regjistrimi pa dokument e thotë qartë, pa e thyer faqen', async () => {
  const w = boot();
  const D = w.__DOC__;
  const html = D.cloudAttachmentsHTML({ attachments: [] });
  assert.equal(html, '', 'karta nuk shfaqet kur s’ka dokumente');
  const cell = D.recordDocCell({ id: 'x', nr: '002', attachments: [] });
  assert.match(cell, /—/, 'tabela tregon vizë, jo buton bosh');
  assert.doesNotMatch(cell, /data-doc-record/);
  // Klikimi në një enë bosh nuk hedh gabim.
  const empty = { dataset: {}, hasAttribute: () => false };
  D.docStore.items = [];
  await D.docOpenFromClick(empty);
  assert.equal(w.document.querySelector('#dialog-root iframe'), null);
});

test('tabela e regjistrimeve ka link direkt te dokumenti', () => {
  const D = boot().__DOC__;
  const cell = D.recordDocCell(record());
  assert.match(cell, /data-doc-record="rec-1"/);
  assert.match(cell, /Hap 2 dokumente|Hap dokumentin/);
  assert.match(cell, /për formularin 041/, 'lexuesi i ekranit e di për cilin formular është');
  const two = D.recordDocCell({ ...record(), attachments: [...record().attachments, { name: 'shtese.pdf', path: 'user-1/rec-1/c.pdf', type: 'application/pdf', size: 1 }] });
  assert.match(two, /Hap 3 dokumente/, 'numri i dokumenteve tregohet kur janë disa');
});

test('biblioteka i gjen të gjitha dokumentet dhe kërkon brenda tyre', () => {
  const w = boot();
  const D = w.__DOC__;
  const second = { ...record(), id: 'rec-2', nr: '042', date: '2026-11-13',
    attachments: [{ name: 'formulari-042.pdf', path: 'user-1/rec-2/d.pdf', type: 'application/pdf', size: 900 }] };
  loadDb(D, [record(), second]);
  const { all, list } = D.docLibraryFiltered();
  assert.equal(all.length, 3, 'tre dokumente gjithsej');
  assert.equal(list.length, 3, 'pa kërkim shfaqen të gjitha');
  D.state.docSearch = '042';
  const found = D.docLibraryFiltered();
  assert.equal(found.list.length, 1, 'kërkimi po filtron');
  assert.equal(found.list[0].name, 'formulari-042.pdf');
  D.state.docSearch = 'arta';
  assert.equal(D.docLibraryFiltered().list.length, 3, 'kërkimi punon edhe me emrin e përgjegjëses');
  D.state.docSearch = '';
  const html = D.docLibraryHTML();
  assert.match(html, /Dokumentet e ruajtura/);
  assert.match(html, /data-doc-lib="rec-1"/, 'çdo rresht hap dokumentin');
  assert.match(html, /id="doc-search"/, 'ka fushë kërkimi');
  assert.match(html, /Nr\. 041/, 'rreshti tregon numrin e formularit');
});

test('biblioteka lidh dokumentin e klikuar me regjistrimin e saktë', async () => {
  const w = boot();
  const D = w.__DOC__;
  loadDb(D, [record()]);
  const calls = [];
  D.cloud.user = { id: 'user-1' };
  D.cloud.client = { storage: { from: () => ({ download: async (path) => {
    calls.push(path);
    return { data: new w.Blob(['x'], { type: 'image/jpeg' }), error: null };
  } }) } };
  w.URL.createObjectURL = () => 'blob:https://biobes.test/lib';
  w.URL.revokeObjectURL = () => {};
  // Klikohet dokumenti i dytë (fotografia) nga biblioteka.
  await D.docOpenLibrary('rec-1', 'formulari-041-faqja-2.jpg');
  assert.equal(calls.join('|'), 'user-1/rec-1/b.jpg', 'hapet pikërisht skedari i klikuar');
  const img = w.document.querySelector('#dialog-root img.doc-image');
  assert.ok(img, 'lloji i duhur i shfaqjes sipas skedarit');
  D.docClose();
});

test('regjistrimet e lexuar kanë linkun "Krahaso me dokumentin" të klikueshëm', () => {
  const w = boot();
  const D = w.__DOC__;
  const item = { sources: [{ name: 'skanim_faqet_1-2.pdf', url: 'blob:https://biobes.test/x' }] };
  const html = D.docLinksHTML(D.docRegisterDocs('__review', D.docItemsFor(null, item)));
  assert.match(html, /data-doc-open/);
  assert.match(html, /skanim_faqet_1-2\.pdf/);
  assert.match(html, /Hape →/);
});

test('numri i formularit është vetë linku kur ka dokument', () => {
  const w = boot();
  const D = w.__DOC__;
  const withDoc = D.recordDocCell(record());
  assert.match(withDoc, /data-doc-record="rec-1"/);
  // Pa dokument: numri mbetet thjesht tekst, pa link që nuk bën asgjë.
  const nrPlain = D.docNrCell({ id: 'y', nr: '007', attachments: [] });
  assert.equal(nrPlain, '007');
  const nrLink = D.docNrCell(record());
  assert.match(nrLink, /class="doc-nr"/);
  assert.match(nrLink, />041</);
  assert.match(nrLink, /Hap dokumentin e formularit 041/);
});

test('tabelat e regjistrimeve: numri i kolonave përputhet me kryet', () => {
  const w = boot();
  const D = w.__DOC__;
  loadDb(D, [record()]);
  // Faqja e regjistrimeve ndërtohet nga e njëjta funksion si tabela kryesore.
  const row = D.recordRows(D.db.records);
  assert.equal((row.match(/<td/g) || []).length, 7, '7 qeliza në rresht');
  // Pamja kryesore: koka dhe rreshtat kanë të njëjtin numër kolonash.
  const dash = D.dashboardHTML();
  const dashHead = dash.slice(dash.indexOf('<thead>'), dash.indexOf('</thead>'));
  assert.equal((dashHead.match(/<th[\s>]/g) || []).length, 7, 'pamja kryesore: 7 kolona në krye');
  assert.match(dashHead, /Dokumenti/, 'pamja kryesore: kolona e dokumentit ekziston');
  assert.equal((dash.match(/<td/g) || []).length, 7, 'pamja kryesore: 7 qeliza në rresht');

  // Faqja e regjistrimeve ndërtohet më vonë në DOM: kontrollohet tabela e vërtetë.
  const view = w.document.getElementById('view') || w.document.body.appendChild(w.document.createElement('div'));
  view.id = 'view';
  view.innerHTML = D.historyHTML();
  D.renderHistoryList();
  const table = view.querySelector('#history-list table');
  assert.ok(table, 'tabela e regjistrimeve vizatohet');
  assert.equal(table.querySelectorAll('thead th').length, 7, 'regjistrimet: 7 kolona në krye');
  assert.match(table.querySelector('thead').textContent, /Dokumenti/);
  const cells = table.querySelectorAll('tbody tr:first-child td');
  assert.equal(cells.length, 7, 'regjistrimet: 7 qeliza në rresht');
  assert.ok(table.querySelector('tbody [data-doc-record]'), 'numri/dokumenti hapet me klik');
});

test('Escape e mbyll dokumentin', async () => {
  const w = boot();
  const D = w.__DOC__;
  const entries = D.docItemsFor(record());
  entries[0].url = 'blob:https://biobes.test/esc';
  await D.docOpen(entries, 0);
  const root = w.document.getElementById('dialog-root');
  assert.ok(root.querySelector('.doc-layer'));
  const closeBtn = root.querySelector('.doc-close');
  assert.ok(closeBtn, 'ka buton mbylljeje');
  closeBtn.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(root.innerHTML, '', 'Escape pastron dritaren');
  assert.equal(root.innerHTML, '', 'Escape pastron dritaren');
});

run();
