#!/usr/bin/env node
'use strict';

// Repository-level security checks: no service-role/secret/Gemini keys in the
// public package, JWT verification enabled, and local secrets ignored.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./dom.js');
const { test, run } = require('./test_runner.js');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const config = read('BioBes_Cloud/web/cloud-config.js');
const cloud = read('BioBes_Cloud/web/cloud.js');
const edge = read('BioBes_Cloud/supabase/functions/biobes-read-form/index.ts');
const toml = read('BioBes_Cloud/supabase/config.toml');
const gitignore = read('BioBes_Cloud/.gitignore');
const manifest = read('SHA256SUMS.txt');

test('public cloud config contains a Supabase URL and publishable key', () => {
  assert.match(config, /supabaseUrl:\s*'https:\/\/[^']+'/);
  assert.match(config, /supabasePublishableKey:\s*'[^']+'/);
});

test('public cloud config contains no service-role, secret, or Gemini keys', () => {
  assert.doesNotMatch(config, /service_role/i, 'service_role must not appear in the public config');
  assert.doesNotMatch(config, /sb_secret_/i, 'sb_secret_ must not appear in the public config');
  assert.doesNotMatch(config, /AIza[0-9A-Za-z_-]{10,}/i, 'a Gemini API key must not appear in the public config');
  assert.doesNotMatch(config, /BIOBES_GEMINI_API_KEY\s*[:=]\s*['"][^'"]+/i, 'a Gemini key value must not appear in the public config');
});

test('cloud adapter contains no hardcoded Gemini key or service-role key', () => {
  assert.doesNotMatch(cloud, /AIza[0-9A-Za-z_-]{10,}/i, 'no hardcoded Gemini key in cloud.js');
  assert.doesNotMatch(cloud, /sb_secret_[0-9A-Za-z_-]{10,}/i, 'no hardcoded service key in cloud.js');
});

test('Edge Function contains no hardcoded Gemini key', () => {
  assert.doesNotMatch(edge, /AIza[0-9A-Za-z_-]{10,}/i, 'no hardcoded Gemini key in the Edge Function');
  assert.doesNotMatch(edge, /x-goog-api-key['"]\s*:\s*['"][^'"]+['"]/i, 'the Gemini key must come from the environment');
});

test('Edge Function keeps JWT verification enabled', () => {
  assert.match(toml, /\[functions\.biobes-read-form\]/);
  assert.match(toml, /verify_jwt\s*=\s*true/);
});

test('local secrets and Supabase temp files are ignored', () => {
  assert.match(gitignore, /\.env/);
  assert.match(gitignore, /supabase\/\.temp/);
  assert.match(gitignore, /supabase\/\.branches/);
  assert.match(gitignore, /\.DS_Store/);
  assert.match(gitignore, /Thumbs\.db/);
});

test('SHA-256 manifest does not include node_modules', () => {
  assert.doesNotMatch(manifest, /node_modules/);
});

test('Edge Function error log excludes secrets, prompts, and document payloads', () => {
  assert.doesNotMatch(edge, /console\.(?:log|error|warn)\(/, 'OCR edge does not log upstream or document content');
  assert.doesNotMatch(edge, /console\.error\([^\n]*(?:secret|parts|body|prompt|document)/i);
});

run();
