// pages/BasePage.js
const path = require('path');
const readline = require('readline');
const { captureScreenshot, getScreenshotDir } = require('../support/screenshots');

class BasePage {
  constructor(page) {
    this.page = page;
  }

  async goto(url) {
    await this.page.goto(url);
  }

  async waitForElement(selector) {
    await this.page.waitForSelector(selector);
  }

  async takeScreenshot(name) {
    await captureScreenshot(this.page, path.join(getScreenshotDir(), `${name}.png`));
  }

  async getCurrentURL() {
    return this.page.url();
  }

  async isVisible(selector) {
    return await this.page.locator(selector).isVisible();
  }

  async waitForEnterInTerminal(message = 'Press ENTER in the terminal to continue.') {
    console.log(`[Manual Step] ${message}`);

    if (!process.stdin.isTTY) {
      console.log('[Manual Step] No interactive terminal detected; continuing without waiting for ENTER.');
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise((resolve) => {
      rl.question('', () => {
        rl.close();
        resolve();
      });
    });
  }
}

module.exports = BasePage;
