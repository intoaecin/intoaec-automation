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

/**
 * Native “Open file” / Explorer dialogs only appear in a headed browser.
 * This project defaults to headless unless HEADED=true — so @po-import-pdf (and PO_IMPORT_PDF_MANUAL)
 * turn on a visible window before world.init() runs (unless CI / HEADLESS / HEADED=false).
 */
Before(function (options = {}) {
  const { pickle } = options;
  if (
    process.env.HEADLESS === 'true' ||
    process.env.CI === 'true' ||
    process.env.HEADED === 'false'
  ) {
    return;
  }
  const importPdfScenario = pickle?.tags?.some((t) => t.name === '@po-import-pdf');
  const manualImport =
    process.env.PO_IMPORT_PDF_MANUAL === '1' ||
    /^true$/i.test(String(process.env.PO_IMPORT_PDF_MANUAL || ''));
  if (importPdfScenario || manualImport) {
    process.env.HEADED = 'true';
  }
});

Before(async function (options = {}) {
  const { pickle } = options;
  await this.init();
  this.poSmokeStepPause = !!pickle?.tags?.some((t) =>
    ['@po-smoke-po', '@po-smoke-full-journey', '@po-full-flow'].includes(t.name)
  );
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

/**
 * After each step in @po-smoke-full-journey (or legacy @po-smoke-po) or @po-full-flow: pause for headed runs.
 * PO_FLOW_STEP_PAUSE_MS: milliseconds (0 = off). If unset and HEADED=true, default 800ms.
 */
AfterStep(async function () {
  if (!this.poSmokeStepPause || !this.page) {
    return;
  }
  let ms;
  if (
    process.env.PO_FLOW_STEP_PAUSE_MS !== undefined &&
    process.env.PO_FLOW_STEP_PAUSE_MS !== ''
  ) {
    ms = Number(process.env.PO_FLOW_STEP_PAUSE_MS);
  } else if (process.env.HEADED === 'true') {
    ms = 800;
  } else {
    ms = 0;
  }
  if (!Number.isFinite(ms) || ms <= 0) {
    return;
  }
  await this.page.waitForTimeout(ms);
});
