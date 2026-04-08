const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

function isHeadlessRun() {
  return (
    process.env.HEADLESS === 'true' ||
    process.env.CI === 'true' ||
    process.env.HEADED === 'false'
  );
}

let sharedSession = null;

async function ensureSharedSession() {
  if (sharedSession) {
    const { browser, context, page } = sharedSession;
    // Recover if a prior run closed the page/context unexpectedly.
    if (page && !page.isClosed()) return sharedSession;
    if (context) {
      const newPage = await context.newPage().catch(() => null);
      if (newPage) {
        sharedSession = { browser, context, page: newPage };
        return sharedSession;
      }
    }
    // If we can't recover cleanly, drop the session and recreate.
    sharedSession = null;
  }

  const headless = isHeadlessRun();
  const browser = await chromium.launch({
    headless,
    args: headless ? [] : ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: headless ? { width: 1280, height: 720 } : null
  });

  const page = await context.newPage();
  sharedSession = { browser, context, page };
  return sharedSession;
}

async function closeSharedSession() {
  if (!sharedSession) return;
  const { browser } = sharedSession;
  sharedSession = null;
  await browser.close().catch(() => {});
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
