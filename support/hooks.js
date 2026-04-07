const { Before, After, AfterStep, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(30000);

Before(async function (options = {}) {
  const { pickle } = options;
  await this.init();
  this.poSmokeStepPause = !!pickle?.tags?.some((t) =>
    ['@po-smoke-po', '@po-smoke-full-journey', '@po-full-flow'].includes(t.name)
  );
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
