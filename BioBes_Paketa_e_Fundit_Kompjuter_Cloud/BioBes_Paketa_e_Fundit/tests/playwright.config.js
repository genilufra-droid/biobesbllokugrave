const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: 'ui.spec.js',
  timeout: 60_000,
  use: {
    baseURL: 'https://genilufra-droid.github.io/biobesbllokugrave/',
    headless: true,
  },
});
