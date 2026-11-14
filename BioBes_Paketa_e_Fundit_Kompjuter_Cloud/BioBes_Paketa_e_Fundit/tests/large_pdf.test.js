#!/usr/bin/env node
'use strict';

// Një PDF i skanuar me shumë faqe (si skanimi real 7 formularë / 14 faqe) duhet
// të lexohet i tëri. Më parë prepareGeminiParts hidhte gabim mbi 6 faqe, kështu
// që çdo skanim real refuzohej. Tani PDF-ja e gjatë ndahet në pjesë, lexohet
// pjesë për pjesë dhe ribashkohet si NJË dokument me numra faqesh 1 … N.
//
// Testi përdor funksionet e prodhimit: planReadingCalls, slicePdf, shiftPages,
// mergeReadingChunks dhe readFilesWithGemini. Vetëm cloudGemini zëvendësohet,
// sepse rrjeti nuk thirret në test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const api = dom.window.__BIOBES__;
const { File, AbortController } = dom.window;
const PDFLib = dom.window.PDFLib;
const signal = () => new AbortController().signal;
// Objektet vijnë nga një realm tjetër (jsdom); kthehen në të dhëna të thjeshta.
const plain = (x) => JSON.parse(JSON.stringify(x));

// Rrjeti zëvendësohet (si te cloud_gemini.test.js); cloudGemini i prodhimit xhiron
// i paprekur, kështu që testi provon rrugën e vërtetë të leximit.
api.cloud.config = { url: 'https://test.supabase.co', key: 'test-public-key' };
api.cloud.client = {
  auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
};
api.batchState.busy = false;
// Gemini kthen përgjigjen si tekst JSON, ashtu si shërbimi.
function mockGemini(payloads) {
  // Cache-i i leximit do t'i shërbente të njëjtit skedar pa thirrje rrjeti;
  // këta teste matin rrjedhën e rrjetit, ndaj fshihet para secilit skenar.
  api.readCacheClear();
  const calls = [];
  dom.window.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    const inline = body.parts.filter((p) => p.inlineData);
    calls.push({ inline: inline.length, mime: inline.map((p) => p.inlineData.mimeType) });
    const payload = typeof payloads === 'function' ? payloads(calls.length - 1) : payloads[calls.length - 1];
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(payload) }] } }],
      }),
    };
  };
  return calls;
}

// PDF i vërtetë me N faqe (PDFLib i prodhimit, jo dokument i rremë).
async function makePdf(pages, name) {
  const pdf = await PDFLib.PDFDocument.create();
  // Çdo faqe me përmasë të vet: faqet krejt bosh identike prodhojnë PDF me bajt
  // identikë, dhe cache-i (me të drejtë) i njëson. Formularët realë ndryshojnë.
  for (let i = 0; i < pages; i += 1) { const page = pdf.addPage(); page.setSize(400 + i, 600 + i); }
  return new File([await pdf.save()], name, { type: 'application/pdf' });
}

// Formular minimal me numër dhe një peshim, ashtu si e kthen Gemini.
function form(number, page, extra = {}) {
  return {
    formNumber: number,
    record_number: String(number).padStart(3, '0'),
    pages: { front: page, back: page + 1 },
    fields: [{ id: 'nr', value: String(number).padStart(3, '0'), page, formArea: 'Nr.', confidence: 0.9, needsReview: false }],
    plan: [],
    employees: [],
    weighings: [{ index: 1, page: page + 1, rows: [{ row: 1, page: page + 1, thas: String(number), kg: '100' }] }],
    comments: [],
    uncertain: [],
    ...extra,
  };
}

test('plani i leximit e pranon një PDF 14-faqësh dhe e ndan në pjesë', async () => {
  const file = await makePdf(14, 'skanim.pdf');
  const calls = await api.planReadingCalls([file]);
  assert.equal(calls.length, 3, '14 faqe → 6 + 6 + 2');
  assert.deepEqual(plain(calls.map((c) => c.offset)), [0, 6, 12]);
  assert.deepEqual(plain(calls.map((c) => c.files.length)), [1, 1, 1]);
  assert.equal(calls[0].total, 14);
});

test('një PDF deri në 6 faqe kalon si një thirrje e vetme', async () => {
  const file = await makePdf(6, 'gjashte.pdf');
  const calls = await api.planReadingCalls([file]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].offset, 0);
  assert.equal(calls[0].files.length, 1);
  assert.equal(calls[0].files[0].name, file.name, 'skedari origjinal dërgohet i paprerë');
});

test('pjesa e PDF-së mban vetëm faqet e veta', async () => {
  const file = await makePdf(14, 'skanim.pdf');
  const slice = await api.slicePdf(file, 6, 6);
  assert.match(slice.name, /faqet_7-12\.pdf$/);
  const pdf = await PDFLib.PDFDocument.load(await slice.arrayBuffer());
  assert.equal(pdf.getPageCount(), 6);
});

test('mbi 20 faqe refuzohet me kufi të qartë, jo me gabim të fshehtë', async () => {
  const file = await makePdf(22, 'shume.pdf');
  await assert.rejects(() => api.planReadingCalls([file]), /22 faqe.*deri në 20 faqe/s);
});

test('numrat e faqeve zhvendosen sipas pjesës', () => {
  const chunk = { forms: [{ record_number: '004', fields: [{ id: 'nr', value: '004', page: 1 }], weighings: [{ index: 1, page: 2, rows: [{ row: 1, page: 2 }] }] }] };
  const shifted = api.shiftPages(chunk, 6);
  assert.equal(shifted.forms[0].fields[0].page, 7);
  assert.equal(shifted.forms[0].weighings[0].page, 8);
  assert.equal(shifted.forms[0].weighings[0].rows[0].page, 8);
  assert.equal(shifted.forms[0].record_number, '004', 'vlera nuk ndryshon, vetëm faqja');
});

test('pjesët ribashkohen si një dokument me 7 formularë', () => {
  const chunks = [
    { offset: 0, data: { document: { pageCount: 6, formCount: 3 }, forms: [form(1, 1), form(2, 3), form(3, 5)] } },
    { offset: 6, data: { document: { pageCount: 6, formCount: 3 }, forms: [form(4, 1), form(5, 3), form(6, 5)] } },
    { offset: 12, data: { document: { pageCount: 2, formCount: 1 }, forms: [form(7, 1)] } },
  ];
  const merged = api.mergeReadingChunks(chunks, 14);
  assert.equal(merged.document.pageCount, 14);
  assert.equal(merged.forms.length, 7);
  assert.deepEqual(plain(merged.forms.map((f) => f.record_number)), ['001', '002', '003', '004', '005', '006', '007']);
  // Faqet mbeten ata të PDF-së, jo të pjesës.
  assert.deepEqual(plain(merged.forms.map((f) => f.fields[0].page)), [1, 3, 5, 7, 9, 11, 13], 'faqet e PDF-së, jo të pjesës');
  assert.equal(merged.forms[3].fields[0].page, 7);
  assert.equal(merged.forms[6].fields[0].page, 13);
  assert.equal(merged.forms[0].weighings[0].rows[0].page, 2, 'rreshti i peshimit mbetet në faqen e vet');
  assert.equal(merged.forms[6].weighings[0].page, 14, 'peshimi i formularit të fundit në faqen 14');
  assert.ok(merged.forms.every((f) => f.formNumber), 'numri i radhës mbetet');
});

test('bishti i një formulari të prerë bashkohet, nuk bëhet formular i ri', () => {
  const tail = {
    fields: [], plan: [], employees: [], comments: [],
    weighings: [{ index: 2, page: 1, rows: [{ row: 3, thas: '6', kg: '180' }] }],
  };
  const chunks = [
    { offset: 0, data: { forms: [form(1, 1), { ...form(2, 5), weighings: [{ index: 1, page: 6, rows: [{ row: 1, thas: '5', kg: '155' }] }] }] } },
    { offset: 6, data: { forms: [tail, form(3, 3)] } },
  ];
  const merged = api.mergeReadingChunks(chunks, 10);
  assert.equal(merged.forms.length, 3, '3 formularë, jo 4');
  assert.deepEqual(plain(merged.forms.map((f) => f.record_number)), ['001', '002', '003']);
  const second = merged.forms[1];
  assert.equal(second.weighings.length, 2, 'peshimi i prerë u kthye te formulari i vet');
  assert.equal(second.weighings[1].rows[0].kg, '180');
  assert.equal(second.weighings[1].page, 7, 'faqja u zhvendos saktë');
});

test('formular i plotë në pjesën e dytë nuk bashkohet gabimisht', () => {
  const empty = { fields: [], plan: [], employees: [], weighings: [], comments: [] };
  const chunks = [
    { offset: 0, data: { forms: [form(1, 1), form(2, 3)] } },
    // Formular pa numër, por me vlera: është formular i vërtetë, jo bisht.
    { offset: 6, data: { forms: [{ ...empty, record_number: '', employees: [{ row: 1, name: 'Anonim' }] }] } },
  ];
  const merged = api.mergeReadingChunks(chunks, 12);
  assert.equal(merged.forms.length, 3);
});

test('readFilesWithGemini lexon 14 faqe në 3 thirrje dhe kthen një dokument', async () => {
  const file = await makePdf(14, 'skanim.pdf');
  const pages = [
    { document: { pageCount: 6, formCount: 3 }, forms: [form(1, 1), form(2, 3), form(3, 5)] },
    { document: { pageCount: 6, formCount: 3 }, forms: [form(4, 1), form(5, 3), form(6, 5)] },
    { document: { pageCount: 2, formCount: 1 }, forms: [form(7, 1)] },
  ];
  const calls = mockGemini(pages);
  const data = await api.readFilesWithGemini([file], signal(), null);
  assert.equal(calls.length, 3, 'tre thirrje për 14 faqe');
  assert.ok(calls.every((c) => c.inline === 1 && c.mime[0] === 'application/pdf'));
  assert.equal(data.document.pageCount, 14, 'dokumenti mbetet 14 faqe');
  assert.equal(data.forms.length, 7, 'shtatë formularë në një dokument');
  assert.deepEqual(plain(data.forms.map((f) => f.fields[0].page)), [1, 3, 5, 7, 9, 11, 13], 'faqet reale 1 … 14');
  // Leximi i prodhimit e pranon rezultatin e bashkuar.
  const read = api.aiReadings(data, { fileName: 'skanim.pdf', pageCount: data.document.pageCount });
  assert.equal(read.document.formCount, 7);
  assert.equal(read.document.pageCount, 14);
});

test('readFilesWithGemini nuk e thyen leximin kur PDF-ja është e vogël', async () => {
  const file = await makePdf(2, 'dy-faqe.pdf');
  const payload = { document: { pageCount: 2, formCount: 1 }, forms: [form(1, 1)] };
  const calls = mockGemini([payload]);
  const data = await api.readFilesWithGemini([file], signal(), null);
  assert.equal(calls.length, 1, 'një thirrje e vetme');
  assert.deepEqual(plain(data), plain(payload), 'përgjigja kthehet e paprekur');
});

test('anulimi ndalon midis pjesëve', async () => {
  api.readCacheClear();
  const file = await makePdf(14, 'skanim.pdf');
  const controller = new AbortController();
  dom.window.fetch = async () => {
    controller.abort();
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ forms: [form(1, 1)] }) }] } }],
      }),
    };
  };
  await assert.rejects(() => api.readFilesWithGemini([file], controller.signal, null), /abort/i);
});

// Prova mbi skanimin REAL (i anonimizuar): i njëjti dokument 14-faqësh, i lexuar
// drejt dhe i lexuar i ndarë në 6+6+2, duhet të japë rezultat identik. Kjo është
// arsyeja pse ndarja mund të ndizet pa kontroll shtesë nga përdoruesi.
test('skanimi real 14-faqësh jep të njëjtin lexim kur ndahet', () => {
  const scan = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/scan_14_pages.json'), 'utf8'));
  const asProd = (part) => JSON.parse(JSON.stringify(part));
  const direct = api.aiReadings(JSON.parse(JSON.stringify(scan)), { fileName: 'scan.pdf', pageCount: 14 });

  const merged = api.mergeReadingChunks([
    { offset: 0, data: { forms: asProd(scan.forms.slice(0, 3)) } },
    { offset: 6, data: { forms: asProd(scan.forms.slice(3, 6)) } },
    { offset: 12, data: { forms: asProd(scan.forms.slice(6)) } },
  ], 14);
  const split = api.aiReadings(merged, { fileName: 'scan.pdf', pageCount: 14 });

  assert.equal(split.document.formCount, 7);
  assert.equal(split.document.pageCount, 14);
  const signature = (read) => JSON.stringify(read.forms.map((f) => [
    f.record.nr, f.record.date,
    f.reading.pages,
    (f.record.weighings || []).map((w) => w.rows.map((r) => [r.bags, r.kg, r.packaging, r.sum])),
  ]));
  assert.equal(signature(split), signature(direct), 'ndarja nuk humb dhe nuk dyfishon asnjë rresht');
});

run();
