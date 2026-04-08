const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

function isHeadlessRun() {
  return (
    process.env.HEADLESS === 'true' ||
    process.env.CI === 'true' ||
    process.env.HEADED === 'false'
  );
}

class CustomWorld {
  async init() {
    const session = await ensureSharedSession();
    this.browser = session.browser;
    this.context = session.context;
    this.page = session.page;
  }

  async cleanup() {
    // Browser is closed once in AfterAll (see hooks.js).
  }
}

setWorldConstructor(CustomWorld);

module.exports = { closeSharedSession };
