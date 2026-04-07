const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

class CustomWorld {
  async init() {
    // Headed by default (visible browser). Use HEADLESS=true or CI=true for headless (e.g. CI pipelines).
    const headless =
      process.env.HEADLESS === 'true' ||
      process.env.CI === 'true' ||
      process.env.HEADED === 'false';
    this.browser = await chromium.launch({
      headless,
      // Headed: maximize window so it fits the display; avoid a fixed oversized viewport.
      args: headless ? [] : ['--start-maximized']
    });
    this.context = await this.browser.newContext(
      headless
        ? { viewport: { width: 1280, height: 720 } }
        : { viewport: null }
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
