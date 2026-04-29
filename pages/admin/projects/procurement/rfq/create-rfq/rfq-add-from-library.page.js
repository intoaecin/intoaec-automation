const { expect } = require('@playwright/test');
const RFQComposePage = require('./rfq-compose.page');

/**
 * @param {string} tag
 * @param {string} [detail]
 */
function rfqLibLog(tag, detail) {
  const ts = new Date().toISOString();
  const suffix = detail ? ` — ${detail}` : '';
  // eslint-disable-next-line no-console
  console.log(`[RFQ add-from-library][${ts}] ${tag}${suffix}`);
}

/**
 * RFQ create: Add from library (shared Boq-style drawer with PO) → log row counts → Action → Compose → Send.
 * Default timeouts follow AGENTS.md baseline (60s); heavy waits use explicit longer caps on expects only.
 */
class RfqAddFromLibraryPage extends RFQComposePage {
  constructor(page) {
    super(page);
    /** AGENTS.md baseline step timeout; override with RFQ_DEFAULT_TIMEOUT_MS. */
    this.defaultTimeout = Number(process.env.RFQ_DEFAULT_TIMEOUT_MS) || 60000;
    /** Compose/send can exceed 60s on cold APIs (AGENTS.md: increase for heavy flows only). */
    this.composeModalTimeout =
      Number(process.env.RFQ_COMPOSE_MODAL_TIMEOUT_MS) || 180000;
  }

  /** Right-side library modal (same pattern as PO: table + Add/Cancel). */
  rfqLibraryDrawerRoot() {
    return this.page
      .locator('.MuiModal-root')
      .filter({ visible: true })
      .filter({ has: this.page.locator('table tbody') })
      .filter({ has: this.page.getByRole('button', { name: /^add$/i }) })
      .last();
  }

  async getRfqLineItemsRowCount() {
    rfqLibLog('getRfqLineItemsRowCount:start');
    const table = await this.ensureRfqLineItemsTableVisible();
    const n = await table.locator('tbody tr').count();
    rfqLibLog('getRfqLineItemsRowCount:ok', `rows=${n}`);
    return n;
  }

  async logRfqLineItemRowCount(label) {
    const n = await this.getRfqLineItemsRowCount();
    rfqLibLog('diagnosticRowCount', `${label || 'snapshot'}: rows=${n}`);
    return n;
  }

  async clickAddFromLibraryOnRfqForm() {
    rfqLibLog('clickAddFromLibraryOnRfqForm:start');
    await expect(this.page).toHaveURL(/rfq\/(create|edit)/i);
    const link = this.page
      .locator('span.pointer')
      .filter({ hasText: /add from library/i })
      .first();
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible({ timeout: this.defaultTimeout });
    await link.click({ force: true });
    rfqLibLog('clickAddFromLibraryOnRfqForm:clickedLink');
    await expect(this.rfqLibraryDrawerRoot()).toBeVisible({
      timeout: Math.max(this.defaultTimeout, 90000),
    });
    rfqLibLog('clickAddFromLibraryOnRfqForm:drawerVisible');
  }

  async expectRfqLibraryDrawerVisible() {
    rfqLibLog('expectRfqLibraryDrawerVisible:start');
    const root = this.rfqLibraryDrawerRoot();
    await expect(root).toBeVisible({ timeout: Math.max(this.defaultTimeout, 90000) });
    await expect(root.locator('table')).toBeVisible({
      timeout: Math.max(this.defaultTimeout, 60000),
    });
    await root
      .locator('.MuiSkeleton-root')
      .first()
      .waitFor({ state: 'hidden', timeout: 90000 })
      .catch(() => {});
    rfqLibLog('expectRfqLibraryDrawerVisible:ok');
  }

  async ensureRfqLibraryDrawerHasAtLeastTwoDataRows() {
    rfqLibLog('ensureRfqLibraryDrawerHasAtLeastTwoDataRows:start');
    const root = this.rfqLibraryDrawerRoot();
    await expect(root).toBeVisible({ timeout: 30000 });

    await root
      .locator('.MuiSkeleton-root')
      .first()
      .waitFor({ state: 'hidden', timeout: 90000 })
      .catch(() => {});

    let rowChecks = root.locator('tbody tr input[type="checkbox"]');
    let hasRows = await rowChecks
      .first()
      .isVisible({ timeout: 12000 })
      .catch(() => false);

    if (!hasRows) {
      rfqLibLog('ensureRfqLibraryDrawerHasAtLeastTwoDataRows:switchTab', 'try Library Items');
      const libTab = root.getByRole('tab', { name: /library items/i });
      if (await libTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await libTab.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(600);
        await root
          .locator('.MuiSkeleton-root')
          .first()
          .waitFor({ state: 'hidden', timeout: 90000 })
          .catch(() => {});
      }
      rowChecks = root.locator('tbody tr input[type="checkbox"]');
      hasRows = await rowChecks
        .first()
        .isVisible({ timeout: 12000 })
        .catch(() => false);
    }

    await expect(rowChecks.first()).toBeVisible({ timeout: 120000 });
    const n = await rowChecks.count();
    rfqLibLog('ensureRfqLibraryDrawerHasAtLeastTwoDataRows:checkboxRows', `count=${n}`);
    if (n < 2) {
      throw new Error(
        `RFQ add from library needs at least 2 grid rows with checkboxes; found ${n}. ` +
          'Seed My Items or Library Items in the app.'
      );
    }
  }

  async selectFirstTwoRowsInRfqLibraryGrid() {
    rfqLibLog('selectFirstTwoRowsInRfqLibraryGrid:start');
    await this.ensureRfqLibraryDrawerHasAtLeastTwoDataRows();
    const root = this.rfqLibraryDrawerRoot();
    const rowChecks = root.locator('tbody tr input[type="checkbox"]');
    await rowChecks.nth(0).scrollIntoViewIfNeeded();
    try {
      await rowChecks.nth(0).check({ timeout: 15000 });
    } catch {
      await rowChecks.nth(0).click({ force: true });
    }
    rfqLibLog('selectFirstTwoRowsInRfqLibraryGrid:row0');
    await rowChecks.nth(1).scrollIntoViewIfNeeded();
    try {
      await rowChecks.nth(1).check({ timeout: 15000 });
    } catch {
      await rowChecks.nth(1).click({ force: true });
    }
    rfqLibLog('selectFirstTwoRowsInRfqLibraryGrid:row1');
  }

  async clickAddInRfqLibraryDrawer() {
    rfqLibLog('clickAddInRfqLibraryDrawer:start');
    const root = this.rfqLibraryDrawerRoot();
    const addBtn = root.getByRole('button', { name: /^add$/i });
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();
    rfqLibLog('clickAddInRfqLibraryDrawer:clickedAdd');
    await expect(root).toBeHidden({ timeout: 120000 });
    await this.waitForNetworkSettled();
    await this.logRfqLineItemRowCount('afterLibraryAdd');
    rfqLibLog('clickAddInRfqLibraryDrawer:ok', 'drawer closed, row count logged');
  }

  /**
   * Optional hook if a step wants compose+send on this page instance (logs around inherited methods).
   */
  async composeAndSendEmailWithLibraryFlowLogs() {
    rfqLibLog('composeAndSendEmailWithLibraryFlow:start');
    await this.openActionMenuAndComposeEmail();
    rfqLibLog('composeAndSendEmailWithLibraryFlow:composeOpen');
    await this.sendEmailFromRfqComposeModal();
    rfqLibLog('composeAndSendEmailWithLibraryFlow:sendDone', 'expect toast in next step');
  }
}

module.exports = RfqAddFromLibraryPage;
