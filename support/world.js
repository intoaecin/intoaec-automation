const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

/** One browser + page for the whole Cucumber run so scenarios reuse the same login session. */
let sharedSession = null;

async function ensureSharedSession() {
  if (sharedSession) {
    return sharedSession;
  }
  const headed = process.env.HEADED === 'true';
  const browser = await chromium.launch({
    headless: !headed,
    // Real monitor: fill the window so viewport matches the user’s resolution (not a fixed 1920×1080).
    args: headed ? ['--start-maximized'] : [],
  });
  const context = await browser.newContext(
    headed
      ? {
          // No fixed viewport — use the maximized browser window (works across screen sizes).
          viewport: null,
        }
      : {
          // Headless has no window; keep a large desktop viewport so layout breakpoints behave like a real monitor.
          viewport: { width: 1920, height: 1080 },
        }
  );
  const page = await context.newPage();
  sharedSession = { browser, context, page };
  return sharedSession;
}

async function closeSharedSession() {
  if (sharedSession) {
    await sharedSession.browser.close();
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
