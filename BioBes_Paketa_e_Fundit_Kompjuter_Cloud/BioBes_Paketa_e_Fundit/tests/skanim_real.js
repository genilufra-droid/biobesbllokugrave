#!/usr/bin/env node
'use strict';
// Kalon leximin real të skanimit (7 formularë / 14 faqe) nëpër parserin e prodhimit
// dhe shkruan rezultatin si JSON pranë tij.
const fs = require('node:fs');
const path = require('node:path');
const { loadApp } = require('./dom.js');

const api = loadApp().window.__BIOBES__;
const file = path.resolve(__dirname, '../leximet/BioBes_7_formulare_14_faqe.lexim.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const result = api.aiReadings(data, {
  fileName: data.document.file_name,
  pageCount: data.document.pageCount,
});
const out = { document: result.document, forms: result.forms.map((f) => f.reading) };
const outFile = path.resolve(__dirname, '../leximet/BioBes_7_formulare_14_faqe.lexim.rezultat.json');
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');

console.log('document:', JSON.stringify(out.document));
for (const f of out.forms) {
  const w = Object.values(f.weights).flat().length;
  console.log(
    ` ${f.formNumber}: faqet ${f.pages.front}/${f.pages.back} nr=${f.header.nr.value}` +
    ` data=${f.header.date.value} punonjës=${f.employees.length} rreshta=${w}` +
    ` komente=${f.comments.length} review=${f.needsReview} paralajmërime=${f.warnings.length}`
  );
}
