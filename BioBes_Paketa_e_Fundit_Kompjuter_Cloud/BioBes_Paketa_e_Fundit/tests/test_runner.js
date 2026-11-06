#!/usr/bin/env node
'use strict';

// Minimal zero-dependency test runner used by the BioBes regression suites.
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${name}`);
      console.error(`  ${(error && error.stack ? error.stack : String(error)).split('\n').slice(0, 4).join('\n  ')}`);
    }
  }
  if (failed) {
    console.error(`\n${failed} test(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} tests passed.`);
}

module.exports = { test, run };
