#!/usr/bin/env node
'use strict';

// Lightweight, offline regression checks for the approved workbook and core
// parsing/rounding helpers. Run from this package root with: node tests/core_checks.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'BioBes_Cloud/web/app.js');
const app = fs.readFileSync(appPath, 'utf8');
const sourceLines = app.split(/\r?\n/);
const wanted = ['num', 'hoursFor', 'roundHoursTotal', 'timeFromImport', 'importedNumber'];
const functions = wanted.map((name) => {
  const line = sourceLines.find((item) => item.startsWith(`function ${name}(`));
  assert.ok(line, `Could not find production helper ${name} in app.js`);
  return line;
});
const context = {
  str: (value, max = Infinity) => String(value ?? '').slice(0, max),
};
vm.createContext(context);
vm.runInContext(`${functions.join('\n')}\nglobalThis.helpers={${wanted.join(',')}};`, context);
const h = context.helpers;

assert.equal(h.num('12,5'), 12.5, 'decimal comma');
assert.equal(h.num('12.5'), 12.5, 'decimal point');
assert.equal(h.num(''), null, 'empty numeric input');
assert.ok(Number.isNaN(h.num('12,5x')), 'reject malformed numeric input');

assert.equal(h.hoursFor({ start: '08:00', end: '08:15' }), 0.25);
assert.equal(h.hoursFor({ start: '23:30', end: '00:15' }), 0.75, 'overnight shift');
assert.equal(h.hoursFor({ start: '24:00', end: '24:15' }), null, 'reject invalid clock time');
assert.equal(h.roundHoursTotal(29 / 60), 0, 'under half-hour rounds down');
assert.equal(h.roundHoursTotal(30 / 60), 1, 'half-hour rounds up');
assert.equal(
  h.roundHoursTotal(h.hoursFor({ start: '08:00', end: '08:15' }) + h.hoursFor({ start: '09:00', end: '09:15' })),
  1,
  'sum exact employee minutes before rounding the total',
);

assert.equal(h.timeFromImport('12:00 AM'), '00:00');
assert.equal(h.timeFromImport('1:05 PM'), '13:05');
assert.equal(h.timeFromImport(0.5), '12:00', 'Excel time fraction');
assert.equal(h.timeFromImport('25:00'), '', 'reject invalid imported clock time');

const warnings = [];
assert.equal(h.importedNumber('12,75', 'sasia', warnings), '12.75');
assert.equal(h.importedNumber('12.75', 'sasia', warnings), '12.75');
assert.equal(h.importedNumber('12,75kg', 'sasia', warnings), '');
assert.equal(warnings.length, 1, 'bad imported value must create a manual-review warning');

// Inspect the actual approved template with the vendored parser (offline).
const xlsxPath = path.join(root, 'BioBes_Cloud/web/vendor/xlsx.full.min.js');
const XLSX = require(xlsxPath);
const templatePath = path.join(root, 'Modele_Bosh/Model_25_Rreshta_2_Faqe.xlsx');
const workbook = XLSX.read(fs.readFileSync(templatePath), { type: 'buffer', cellStyles: true });
assert.deepEqual(workbook.SheetNames, ['FORMULARI']);
const sheet = workbook.Sheets.FORMULARI;
assert.equal(String(sheet.A47.v), '25');
assert.equal(String(sheet.A81.v), '25');
assert.match(String(sheet.C6.v).toLocaleLowerCase('sq'), /produkt/);
assert.match(String(sheet.Q6.v).toLocaleLowerCase('sq'), /klient/);
const printArea = workbook.Workbook.Names.find((item) => item.Name === '_xlnm.Print_Area');
assert.ok(printArea, 'approved template defines a print area');
assert.equal((printArea.Ref.match(/\$A\$\d+:\$AC\$\d+/g) || []).length, 2, 'two A4 page regions');

// Safety checks: the delivered public cloud configuration must be blank, and
// reading must stay client-side for recognized approved workbooks.
const config = fs.readFileSync(path.join(root, 'BioBes_Cloud/web/cloud-config.js'), 'utf8');
assert.match(config, /supabaseUrl:\s*''/);
assert.match(config, /supabasePublishableKey:\s*''/);
assert.match(app, /function batchResultsFromWorkbook\(/);
assert.match(app, /function looksLikeApproved\(/);
assert.match(app, /const BATCH_MAX=10/);
assert.match(app, /function batchReviewed\(item\)/);
const edge = fs.readFileSync(path.join(root, 'BioBes_Cloud/supabase/functions/biobes-read-form/index.ts'), 'utf8');
assert.match(edge, /httpStatus:upstream\.status/);
assert.match(edge, /Gemini upstream rejected request/);
assert.match(edge, /if\(upstream\.status===404\)/);
assert.match(edge, /upstream\.status===403/);
assert.doesNotMatch(edge, /console\.error\([^\n]*(?:secret|parts|body)/i, 'do not log API secrets or document payloads');

console.log('BioBes core checks passed.');
