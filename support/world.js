const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

function isHeadlessRun() {
  return (
    process.env.HEADLESS === 'true' ||
    process.env.CI === 'true' ||
    process.env.HEADED === 'false'
  );
}

/** One browser per process; closed in AfterAll (hooks.js). */
let sharedSession = null;

async function ensureSharedSession() {
  if (sharedSession) {
    return sharedSession;
  }
  const headless = isHeadlessRun();
  const browser = await chromium.launch({
    headless,
    ...(headless ? {} : { args: ['--start-maximized'] }),
  });
  const context = await browser.newContext(
    headless ? {} : { viewport: null }
  );
  const page = await context.newPage();
  sharedSession = { browser, context, page };
  return sharedSession;
}

async function closeSharedSession() {
  if (!sharedSession?.browser) {
    return;
  }
  try {
    await sharedSession.browser.close();
  } finally {
    sharedSession = null;
  }
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
