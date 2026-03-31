const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  retries: 0,
  timeout: 60000,
  use: {
    actionTimeout: 15000,
    navigationTimeout: 30000
  }
});
