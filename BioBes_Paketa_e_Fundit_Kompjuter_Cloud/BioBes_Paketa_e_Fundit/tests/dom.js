#!/usr/bin/env node
'use strict';

// Loads the real BioBes front-end in jsdom with the cloud adapter disabled.
// The vendor scripts and app.js/cloud.js are evaluated in order so the tests
// can call the production functions directly.
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'BioBes_Cloud/web');

function loadApp(appOverride = null, customHook = null) {
  let html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
  // External scripts are loaded manually below, in the same order as the page.
  html = html.replace(/<script[^>]+src="[^"]+"><\/script>/g, '');
  const dom = new JSDOM(html, {
    url: 'https://biobes.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      // Keep the cloud adapter offline and deterministic.
      window.BIOBES_CLOUD_CONFIG = { supabaseUrl: '', supabasePublishableKey: '' };
      window.matchMedia = () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      });
      window.scrollTo = () => {};
      window.alert = () => {};
      window.confirm = () => true;
    },
  });
  const { window } = dom;
  const vendor = [
    'vendor/fflate.min.js',
    'vendor/pdf-lib.min.js',
    'vendor/fontkit.min.js',
    'vendor/xlsx.full.min.js',
    'vendor/supabase.min.js',
  ];
  for (const rel of vendor) {
    window.eval(fs.readFileSync(path.join(web, rel), 'utf8'));
  }
  // app.js and cloud.js share top-level lexical bindings (state, db, batchState,
  // importState). Evaluate them together so the production functions can see
  // their real dependencies, then expose a test hook.
  const appCode = appOverride || fs.readFileSync(path.join(web, 'app.js'), 'utf8');
  const cloudCode = fs.readFileSync(path.join(web, 'cloud.js'), 'utf8');
  const hook = `
;globalThis.__BIOBES__ = {
  aiRecord, aiReadings, parseAIJson, batchResultsFromWorkbook, batchSplitPdf, prepareGeminiParts, prepareOCRPhoto, optionalCatalog, parseAlNumber, dateFromImport, timeFromImport, fmt,
  // Ndihmës testesh: pritjet bëhen të menjëhershme, pritjet regjistrohen dhe
  // gjendja e kuotës pastrohet, që testet të mos trashëgojnë flamurin e njëri-tjetrit.
  setFastWait: () => { globalThis.__BIOBES_WAITS__=[]; batchWait = async (ms, signal) => { if(signal.aborted) throw new DOMException('aborted','AbortError'); globalThis.__BIOBES_WAITS__.push(ms); }; cloudLastAiStart=0; cloudQuotaReset(); },
  cloudForgotShow, cloudForgotRequest, generatePrintablePDF, editorHTML, batchEditorHTML, cloudGemini, cloudQuotaReset, readApprovedExcel, blankRecord,
  normalizeRecord, generateFormWorkbook, planPrintPages,
  planReadingCalls, slicePdf, shiftPages, mergeReadingChunks, readFilesWithGemini,
  ocrHintsFromPageCounts, ocrHintsForFiles, geminiForParts, scannedPageWarning,
  aiArea, aiAreaCode, readCacheKey, readCacheGet, readCacheSet, readCacheClear,
  wordForAI, fileKind, checkImportFiles, batchHTML, updateNav, render,
  state, db, cloud, batchState, importState,
  weighCheckCalc, weighCheckIssues, weighCheckHTML, weightsHTML, groupTotals, hoursFor,
};`;
  window.eval(appCode + '\n' + cloudCode + (customHook || hook));
  return dom;
}

module.exports = { loadApp, root, web };
