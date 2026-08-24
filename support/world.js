const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { resolvePathForWorld } = require('./googleIntegrationStorage');

function isHeadlessRun() {
  return (
    process.env.HEADLESS === 'true' ||
    process.env.CI === 'true' ||
    process.env.HEADED === 'false'
  );
}

/** Headed runs keep the browser open after tests unless KEEP_BROWSER=false. */
function shouldKeepBrowserOpen() {
  if (process.env.KEEP_BROWSER === 'false') return false;
  if (process.env.KEEP_BROWSER === 'true') return true;
  return !isHeadlessRun();
}

let sharedSession = null;

async function ensureSharedSession() {
  if (sharedSession) {
    const { browser, context, page } = sharedSession;
    const browserAlive = browser && browser.isConnected();
    // Recover if a prior run closed the page/context unexpectedly.
    if (browserAlive && page && !page.isClosed()) return sharedSession;
    if (browserAlive && context) {
      const newPage = await context.newPage().catch(() => null);
      if (newPage) {
        sharedSession = { browser, context, page: newPage };
        return sharedSession;
      }
    }
    // If we can't recover cleanly, drop the session and recreate.
    await browser?.close().catch(() => {});
    sharedSession = null;
  }

  const headless = isHeadlessRun();
  const keepOpen = shouldKeepBrowserOpen();
  const browser = await chromium.launch({
    headless,
    args: headless ? [] : ['--start-maximized'],
    // Keep Chromium alive if the test process is interrupted while inspecting.
    handleSIGINT: !keepOpen,
    handleSIGTERM: !keepOpen,
    handleSIGHUP: !keepOpen,
  });

  const contextOptions = {
    viewport: headless ? { width: 1280, height: 720 } : null,
  };

  const storageStatePath = resolvePathForWorld();
  if (storageStatePath) {
    console.log(`[World] Loading browser storage state from ${storageStatePath}`);
    contextOptions.storageState = storageStatePath;
  }

  const context = await browser.newContext(contextOptions);

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
    // Drop stale page objects if the shared page was recreated.
    this.myOrganizationPage = null;
    this.myAccountPage = null;
    this.warehousePage = null;
    this.servicesPage = null;
    this.vendorLoginPage = null;
    this.vendorProfilePage = null;
    this.vendorOrganizationPage = null;
    this.vendorProductsPage = null;
    this.vendorServicesPage = null;
  }

  async cleanup() {
    if (!this.page || this.page.isClosed()) return;
    if (!/schedule/i.test(this.page.url())) return;

    try {
      const SchedulePage = require('../pages/admin/projects/management/Schedule/SchedulePage');
      const schedulePage = this.schedulePage || new SchedulePage(this.page);
      if (await schedulePage.isOnScheduleModule()) {
        await schedulePage.dismissOpenOverlays();
      }
    } catch {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }
}

setWorldConstructor(CustomWorld);

module.exports = { closeSharedSession, shouldKeepBrowserOpen };
