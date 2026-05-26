// pages/BasePage.js
const path = require('path');
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
}

module.exports = BasePage;