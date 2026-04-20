// pages/BasePage.js
class BasePage {
  constructor(page) {
    this.page = page;
  }

  getLatestOpenPageFromContext() {
    try {
      const context = this.page?.context?.();
      if (!context) {
        return null;
      }
      const pages = context.pages().filter((p) => !p.isClosed());
      return pages.length ? pages[pages.length - 1] : null;
    } catch {
      return null;
    }
  }

  async ensureActivePage() {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    const recovered = this.getLatestOpenPageFromContext();
    if (recovered) {
      this.page = recovered;
      return this.page;
    }

    throw new Error('No active browser page is available for this step.');
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

  /**
   * Block until the user presses Enter in the terminal (same pattern as PO flows).
   * Use when a headed run needs a manual gate after Explorer upload, etc.
   */
  async waitForEnterInTerminal(promptText) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    await new Promise((resolve) => {
      rl.question(`${promptText}\n`, () => {
        rl.close();
        resolve(undefined);
      });
    });
  }
}

module.exports = BasePage;
