const { Before, After, AfterStep, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const path = require('path');
const { closeSharedSession, shouldKeepBrowserOpen } = require('./world');
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
  const delayMs = getStepDelayMs();
  if (delayMs > 0 && this.page && !this.page.isClosed()) {
    await this.page.waitForTimeout(delayMs).catch(() => {});
  }

  if (result.status !== 'FAILED') return;
  if (!this.page || this.page.isClosed()) return;

  const tags = (pickle.tags || []).map((t) => String(t.name || ''));
  const isScheduleTc = tags.includes('@schedule');
  const isTaskTc = tags.includes('@task');
  if (!isScheduleTc && !isTaskTc) return;

  try {
    if (isTaskTc) {
      const TaskManagementPage = require('../pages/admin/projects/management/TaskManagement/TaskManagementPage');
      const taskPage = this.taskManagementPage || new TaskManagementPage(this.page);
      const modalOpen = await taskPage.createTaskModal().isVisible({ timeout: 800 }).catch(() => false);
      const viewOpen = await taskPage.viewTaskModal().isVisible({ timeout: 800 }).catch(() => false);
      const addColOpen = await taskPage
        ._addColumnDialog()
        .isVisible({ timeout: 800 })
        .catch(() => false);
      if (!modalOpen && !viewOpen && !addColOpen) return;
      await taskPage.logStep('Step failed — closing task overlays for next TC');
      await taskPage.dismissOpenOverlays();
      return;
    }

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

After({ tags: '@note' }, async function () {
  if (!this.page || this.page.isClosed()) return;

  try {
    const EditNotePage = require('../pages/admin/common/Note/EditNotePage');
    const notePage = this.editNotePage || new EditNotePage(this.page);
    await notePage.dismissOpenMenus();
    await notePage.closeNoteFormIfOpen();
    await notePage.clearNotesSearch();
  } catch {
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  this.editNotePage = null;
  this.notePage = null;
  this.deleteNotePage = null;
  this.createNoteValidationPage = null;
});

After(async function (scenario) {
  if (scenario.result.status === 'FAILED' && this.page && !this.page.isClosed()) {
    const safeName = scenario.pickle.name.replace(/[<>:"/\\|?*]+/g, '_');
    await captureScreenshot(this.page, path.join(getScreenshotDir(), `${safeName}.png`));
  }
  await this.cleanup();
});

function waitForEnterToKeepBrowser() {
  return new Promise((resolve) => {
    console.log('\n[Browser] Left open so you can inspect the page.');
    console.log('[Browser] Press ENTER here when you want to close it.\n');

    if (!process.stdin.isTTY) {
      console.log('[Browser] No interactive terminal — leaving the browser open until you stop the process (Ctrl+C).');
      return;
    }

    // Prefer readline over raw-mode stdin — Cursor/PowerShell often drops Enter in raw mode.
    try {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('', () => {
        rl.close();
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

AfterAll({ timeout: 24 * 60 * 60 * 1000 }, async function () {
  if (shouldKeepBrowserOpen()) {
    await waitForEnterToKeepBrowser();
  }
  await closeSharedSession();
});
