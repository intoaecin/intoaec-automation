// pages/BasePage.js
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
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async getCurrentURL() {
    return this.page.url();
  }

  async isVisible(selector) {
    return await this.page.locator(selector).isVisible();
  }
}

module.exports = BasePage;