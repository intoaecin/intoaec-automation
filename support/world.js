const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

class CustomWorld {
  async init() {
    const headed = process.env.HEADED === 'true';
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
