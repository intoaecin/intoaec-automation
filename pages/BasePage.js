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
    console.log('');
    console.log(`[Manual Step] ${message}`);
    console.log('[Manual Step] Waiting for ENTER...');

    if (!process.stdin.isTTY) {
      throw new Error(
        `[Manual Step] No interactive terminal — cannot wait for ENTER.\n` +
          `Run this test in a normal terminal (PowerShell/CMD), complete the manual action, then press ENTER.\n` +
          `Or set NOTE_ATTACHMENT_AUTO=1 for automatic attachment upload.`
      );
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise((resolve) => {
      rl.question('Press ENTER when ready > ', () => {
        rl.close();
        resolve();
      });
    });

    console.log('[Manual Step] Continuing...');
  }

  async promptForTextInTerminal(message, defaultValue = '') {
    console.log(`[Manual Step] ${message}`);

    if (!process.stdin.isTTY) {
      const value = String(defaultValue || '').trim();
      console.log(`[Manual Step] No interactive terminal — using "${value || '(empty)'}"`);
      return value;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    const answer = await new Promise((resolve) => {
      rl.question(`${message}${suffix}: `, (value) => {
        rl.close();
        resolve(value);
      });
    });

    return String(answer || defaultValue || '').trim();
  }
}

module.exports = BasePage;
