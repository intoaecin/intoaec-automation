const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

class CustomWorld {
  async init() {
    const headed = process.env.HEADED === 'true';
    this.browser = await chromium.launch({ headless: !headed });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

setWorldConstructor(CustomWorld);
