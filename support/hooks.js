const { Before, After, AfterStep, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const path = require('path');
const { closeSharedSession } = require('./world');
const { captureScreenshot, getScreenshotDir } = require('./screenshots');

/** Default step/scenario timeout (ms) — see AGENTS.md; 120s for slow login/navigation between scenarios */
setDefaultTimeout(120000);

/**
 * When running headed (default), pause after each step so actions are visible (debug/demos).
 * Headless (HEADLESS=true or CI=true): no delay. Override with STEP_DELAY_MS (0 disables). Default 2000ms.
 */
function isHeadlessRun() {
  return (
    process.env.HEADLESS === 'true' ||
    process.env.CI === 'true' ||
    process.env.HEADED === 'false'
  );
}

function isHeadedRun() {
  return !isHeadlessRun();
}

function getStepDelayMs() {
  if (isHeadlessRun()) return 0;
  const raw = process.env.STEP_DELAY_MS;
  if (raw === '0') return 0;
  if (raw === undefined || raw === '') return 2000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 2000;
}

Before(async function () {
  await this.init();
});

/**
 * Failure screenshots: disabled by default. Set SCREENSHOTS_ENABLED=true to write PNGs under screenshots/.
 */
AfterStep(async function ({ pickle, result }) {
  if (result.status !== 'FAILED') return;
  if (!this.page || this.page.isClosed()) return;

  const tags = (pickle.tags || []).map((t) => String(t.name || ''));
  const isScheduleTc = tags.some(
    (t) =>
      t === '@schedule' ||
      /^@TC\d{2}$/i.test(t) ||
      t === '@TS01' ||
      t === '@TS02' ||
      t === '@TS03' ||
      t === '@TS04' ||
      t === '@TS06' ||
      t === '@TS07' ||
      t === '@TS08' ||
      t === '@TS10' ||
      t === '@TS11' ||
      t === '@TS12' ||
      t === '@TS13' ||
      t === '@TS14'
  );
  if (!isScheduleTc) return;

  try {
    const SchedulePage = require('../pages/admin/projects/management/Schedule/SchedulePage');
    const schedulePage = this.schedulePage || new SchedulePage(this.page);
    const panelOpen = await schedulePage.formPanel().isVisible({ timeout: 800 }).catch(() => false);
    const wcOpen = await schedulePage
      ._workingCalendarDialog()
      .isVisible({ timeout: 800 })
      .catch(() => false);
    if (!panelOpen && !wcOpen) return;
    if (wcOpen) {
      await schedulePage.logStep('Step failed — closing working calendar dialog for next TC');
      await schedulePage._ensureWorkingCalendarDialogClosed().catch(() => {});
      return;
    }
    await schedulePage.logStep('Step failed — closing schedule off-canvas for next TC');
    await schedulePage.dismissOpenOverlays();
  } catch {
    await this.page.keyboard.press('Escape').catch(() => {});
  }
});

After(async function (scenario) {
  if (scenario.result.status === 'FAILED' && this.page && !this.page.isClosed()) {
    const safeName = scenario.pickle.name.replace(/[<>:"/\\|?*]+/g, '_');
    await captureScreenshot(this.page, path.join(getScreenshotDir(), `${safeName}.png`));
  }
  await this.cleanup();
});

AfterAll(async function () {
  await closeSharedSession();
});
