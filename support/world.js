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
    const headed = !isHeadlessRun();
    this.browser = await chromium.launch({
      headless: !headed,
      args: headed ? ['--start-maximized'] : [],
    });
    this.context = await this.browser.newContext(
      headed
        ? { viewport: null }
        : { viewport: { width: 1280, height: 720 } }
    );
    this.page = await this.context.newPage();
  }
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

setWorldConstructor(CustomWorld);
