#!/usr/bin/env node
'use strict';

// Word (.docx) import and the single, simplified "Lexo formularë" screen.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadApp, root } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const dom = loadApp();
const w = dom.window;
const api = w.__BIOBES__;
const { File, AbortController } = w;

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const p = (t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const tc = (t) => `<w:tc>${p(t)}</w:tc>`;
const tr = (...cells) => `<w:tr>${cells.map(tc).join('')}</w:tr>`;

function docx(body, extra = {}, name = 'formular.docx') {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${body}<w:sectPr/></w:body></w:document>`;
  const bytes = w.fflate.zipSync({ '[Content_Types].xml': w.fflate.strToU8('<Types/>'), 'word/document.xml': w.fflate.strToU8(xml), ...extra });
  return new File([bytes], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

test('docx is recognised as Word; legacy .doc gets a clear instruction', () => {
  assert.equal(api.fileKind(docx(p('x'))), 'word');
  assert.equal(api.fileKind(new File(['x'], 'a.DOCX')), 'word');
  assert.equal(api.fileKind(new File(['x'], 'vjeter.doc')), '');
  assert.throws(() => api.checkImportFiles([new File(['x'], 'vjeter.doc')]), /ruaje si \.docx ose PDF/);
  assert.throws(() => api.checkImportFiles([new File(['x'], 'a.txt')]), /Excel ose Word/);
});

test('paragraphs and table rows keep document order, Albanian letters and empty cells', async () => {
  const body = p('Nr. 41   Data: 05.11.2026') + p('Përgjegjëse: Shpëtime Çela')
    + `<w:tbl>${tr('Nr', 'Thasë', 'Kg', 'Ambalazh', 'Shuma')}${tr('1', '4', '25,5', '', '102')}${tr('', '', '', '', '')}${tr('3', '2', '1.250,5', '0,3', '2501')}</w:tbl>`
    + '<w:p><w:r><w:t xml:space="preserve">Komente: </w:t></w:r><w:del><w:r><w:delText>fshirë</w:delText></w:r></w:del><w:ins><w:r><w:t>në rregull</w:t></w:r></w:ins></w:p>';
  const text = await api.wordForAI(docx(body));
  const lines = text.split('\n');
  assert.equal(lines[0], 'SKEDARI WORD: formular.docx');
  assert.equal(lines[1], 'Nr. 41 Data: 05.11.2026');
  assert.equal(lines[2], 'Përgjegjëse: Shpëtime Çela');
  assert.equal(lines[3], 'TABELA 1');
  assert.equal(lines[4], 'RRESHTI 1: "Nr" | "Thasë" | "Kg" | "Ambalazh" | "Shuma"');
  assert.equal(lines[5], 'RRESHTI 2: "1" | "4" | "25,5" | "" | "102"');
  // The empty row is skipped but numbering still follows the table position.
  assert.equal(lines[6], 'RRESHTI 4: "3" | "2" | "1.250,5" | "0,3" | "2501"');
  assert.equal(lines[7], 'FUNDI I TABELËS 1');
  assert.doesNotMatch(text, /fshirë/);
  assert.match(text, /Komente: në rregull/);
});

test('prepareGeminiParts sends Word as text plus embedded scans', async () => {
  // fflate runs in the jsdom realm, so the bytes must be a jsdom Uint8Array.
  const png = w.Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  const file = docx(p('Formular i skanuar brenda Word-it, faqja 1'), { 'word/media/image1.png': png });
  const parts = await api.prepareGeminiParts([file], new AbortController().signal, new Map());
  assert.ok(parts[0].text.startsWith('SKEDARI WORD:'));
  assert.ok(parts.some((x) => x.text === 'Imazh i futur në Word 1'));
  assert.ok(parts.some((x) => x.inlineData && x.inlineData.mimeType === 'image/png' && x.inlineData.data.length > 20));
});

test('empty or broken Word files are refused with an Albanian message', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(() => api.prepareGeminiParts([docx('')], signal, new Map()), /nuk ka tekst ose fotografi/);
  const broken = new File([w.Uint8Array.from([0x50, 0x4b, 3, 4, 1, 2, 3, 4])], 'keq.docx');
  await assert.rejects(() => api.prepareGeminiParts([broken], signal, new Map()), /nuk u hap/);
  const notWord = new File([w.fflate.zipSync({ 'a.txt': w.fflate.strToU8('x') })], 'tjeter.docx');
  await assert.rejects(() => api.prepareGeminiParts([notWord], signal, new Map()), /nuk u hap/);
});

test('one reading screen: no duplicate menu entry, one required confirmation, Word accepted', () => {
  api.state.route = 'batch';
  api.render();
  const nav = [...w.document.querySelectorAll('#navigation [data-nav]')].map((b) => b.dataset.nav);
  assert.deepEqual(nav, ['dashboard', 'records', 'reports', 'batch', 'print', 'catalog']);
  const view = w.document.getElementById('view');
  assert.match(view.querySelector('#batch-files').accept, /\.docx/);
  assert.ok(view.querySelector('#batch-anonymous'));
  assert.equal(view.querySelector('#batch-free'), null);
  // Grouping options stay available, folded away by default.
  const advanced = view.querySelector('details.batch-advanced');
  assert.ok(advanced && !advanced.open);
  assert.ok(advanced.querySelector('#batch-photo-mode') && advanced.querySelector('#batch-pdf-mode'));
  assert.equal(view.querySelector('#document-files'), null);
});

test('Edge Function accepts Word text and keeps the reading rules', () => {
  const edge = fs.readFileSync(path.join(root, 'BioBes_Cloud/supabase/functions/biobes-read-form/index.ts'), 'utf8');
  assert.match(edge, /startsWith\('SKEDARI WORD:'\)/);
  assert.match(edge, /saktësisht 12 objekte/);
  assert.match(edge, /Asnjëherë mos ndrysho një vlerë vetëm që totali të dalë/);
  const prompt = edge.match(/const prompt=`([\s\S]*?)`;/)[1];
  assert.ok(!prompt.includes('${') && prompt.length < 6000);
});

run();
