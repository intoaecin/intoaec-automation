const { Before, After, AfterStep, setDefaultTimeout } = require('@cucumber/cucumber');

/** Default step/scenario timeout (ms) — see AGENTS.md */
setDefaultTimeout(60000);

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

AfterStep(async function () {
  const ms = getStepDelayMs();
  if (ms > 0 && this.page) {
    await this.page.waitForTimeout(ms);
  }
});

After(async function () {
  await this.cleanup();
});
