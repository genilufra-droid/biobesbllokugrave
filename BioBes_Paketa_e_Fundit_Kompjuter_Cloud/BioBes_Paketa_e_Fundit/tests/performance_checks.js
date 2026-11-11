#!/usr/bin/env node
'use strict';

// Static performance/UX checks for the current BioBes reading path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('BioBes_Cloud/web/app.js');
const cloud = read('BioBes_Cloud/web/cloud.js');
const edge = read('BioBes_Cloud/supabase/functions/biobes-read-form/index.ts');

test('batch gap is at most one second', () => {
  assert.match(app, /BATCH_AI_GAP_MS\s*=\s*1000/);
});

test('batch reads two groups concurrently', () => {
  assert.match(app, /Math\.min\(2,\s*queue\.length\)/);
});

test('multi-file preparation is parallelised', () => {
  assert.match(app, /Promise\.all\(files\.map\(async \(file,index\)=>/);
});

test('PDF objects are cached and not parsed twice', () => {
  assert.match(app, /const pdfCache=new WeakMap\(\)/);
  assert.match(app, /async function loadPdf\(file\)/);
  assert.match(app, /pdfCache\.set\(file,pdf\)/);
});

test('client retries four times with a bounded wait', () => {
  assert.match(cloud, /for\(let attempt=0;attempt<4;attempt\+\+\)/);
  assert.match(cloud, /if\(attempt<3\)/);
});

test('Edge Function can fall back across models for transient errors', () => {
  assert.match(edge, /gemini-3\.6-flash/);
  assert.match(edge, /gemini-3\.8-flash/);
  assert.match(edge, /!\[429,500,503\]\.includes\(upstream\.status\)/);
});

test('Edge Function handles Gemini 503 explicitly', () => {
  assert.match(edge, /upstream\.status===503\?503/);
});

test('Edge Function bounds tokens and uses low thinking for both models', () => {
  assert.match(edge, /maxOutputTokens:32768/);
  assert.match(edge, /thinkingConfig:\{thinkingLevel:'low'\}/);
});

test('editor renders all sections on one screen without tabs', () => {
  const editor = app.split(/\r?\n/).find((line) => line.startsWith('function editorHTML('));
  assert.ok(editor, 'editorHTML must exist');
  assert.doesNotMatch(editor, /editor-tabs/, 'editorHTML must not render the tab bar');
  assert.match(editor, /detailsHTML\(r,off\)\+staffHTML\(r,off\)\+weightsHTML\(r,off\)\+commentsHTML\(r,off\)/);
});

test('batch review renders all sections on one screen without tabs', () => {
  const editor = app.split(/\r?\n/).find((line) => line.startsWith('function batchEditorHTML('));
  assert.ok(editor, 'batchEditorHTML must exist');
  assert.doesNotMatch(editor, /editor-tabs/, 'batchEditorHTML must not render the tab bar');
  assert.match(editor, /detailsHTML\(r,false\)\+staffHTML\(r,false\)\+weightsHTML\(r,false\)\+commentsHTML\(r,false\)/);
});

run();
