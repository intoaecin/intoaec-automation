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

  /** Right-side library modal / drawer (same pattern as PO/WO: table + Add/Cancel). */
  rfqLibraryDrawerRoot() {
    return this.page
      .locator(
        '.MuiDrawer-root, .MuiModal-root, .offcanvas.show, aside.offcanvas.show, [role="dialog"]'
      )
      .filter({ visible: true })
      .filter({ has: this.page.locator('table tbody') })
      .filter({ has: this.page.getByRole('button', { name: /^add$/i }) })
      .last();
  }

  /**
   * Visible "Add from library" near RFQ line items (avoids hidden duplicate nodes / brittle span.pointer-only).
   */
  locatorAddFromLibraryOnRfqForm() {
    const table = this.page
      .locator('[aria-label*="line items" i]')
      .or(this.page.locator('table').filter({ has: this.page.getByPlaceholder(/material name/i) }))
      .first();

    const nearLineItems = table
      .locator('xpath=ancestor::*[.//span[contains(@class,"pointer")]][position()<=6]')
      .last()
      .locator('span.pointer, button, a, [role="button"]')
      .filter({ hasText: /add\s*from\s*library/i })
      .filter({ visible: true });

    return nearLineItems
      .first()
      .or(
        this.page
          .locator('span.pointer')
          .filter({ hasText: /add\s*from\s*library/i })
          .filter({ visible: true })
          .first()
      )
      .or(
        this.page
          .locator('button, a, [role="button"], span')
          .filter({ hasText: /add\s*from\s*library/i })
          .filter({ visible: true })
          .first()
      )
      .or(this.page.getByRole('button', { name: /add\s*from\s*library/i }).filter({ visible: true }).first())
      .or(this.page.getByText(/add\s*from\s*library/i).filter({ visible: true }).first());
  }

  async scrollRfqLineItemsSectionIntoView() {
    rfqLibLog('scrollRfqLineItemsSectionIntoView:start');
    await this.dismissOpenMenusAndPopovers().catch(() => {});
    // Avoid waiting on missing `main` (Playwright default timeout ~30s) — scroll any scroll parent.
    await this.scrollRfqFormTowardLineItems();

    const heading = this.page.getByText(/line items/i).filter({ visible: true }).first();
    if (await heading.isVisible({ timeout: 1500 }).catch(() => false)) {
      await heading.scrollIntoViewIfNeeded().catch(() => {});
    }

    const addManually = this.page
      .getByText(/add\s*manually/i)
      .filter({ visible: true })
      .first();
    if (await addManually.isVisible({ timeout: 1500 }).catch(() => false)) {
      await addManually.scrollIntoViewIfNeeded().catch(() => {});
    }

    const table = this.page
      .locator('[aria-label*="line items" i]')
      .or(this.page.locator('table').filter({ has: this.page.getByPlaceholder(/material name/i) }))
      .first();
    if (await table.isVisible({ timeout: 1500 }).catch(() => false)) {
      await table
        .evaluate((el) => {
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        })
        .catch(() => {});
    }

    await this.page.waitForTimeout(300);
    rfqLibLog('scrollRfqLineItemsSectionIntoView:done');
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
    await this.dismissVisibleToastNotifications().catch(() => {});
    await this.dismissOpenMenusAndPopovers().catch(() => {});

    // Ensure leftover vendor/library modals are not covering the form.
    const leftover = this.page
      .locator('.MuiModal-root, .MuiDrawer-root')
      .filter({ visible: true })
      .first();
    if (await leftover.isVisible({ timeout: 800 }).catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);
    }

    await this.scrollRfqLineItemsSectionIntoView();

    const link = this.locatorAddFromLibraryOnRfqForm();
    let visible = await link.isVisible({ timeout: 8000 }).catch(() => false);
    if (!visible) {
      await this.scrollRfqFormTowardLineItems();
      await this.page
        .evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        })
        .catch(() => {});
      await this.page.waitForTimeout(400);
      visible = await link.isVisible({ timeout: 10000 }).catch(() => false);
    }

    if (!visible) {
      const pageSnippet = await this.page.locator('body').innerText().catch(() => '');
      const hint = (pageSnippet || '')
        .split(/\n/)
        .map((s) => s.trim())
        .filter((s) => /library|manually|line item|material/i.test(s))
        .slice(0, 12)
        .join(' | ');
      throw new Error(
        `RFQ: could not find visible "Add from library" control. Nearby text: ${hint || '(none)'}`
      );
    }

    await expect(link).toBeVisible({ timeout: this.defaultTimeout });
    await link.scrollIntoViewIfNeeded().catch(() => {});

    const strategies = [
      () => link.click({ timeout: 20000 }),
      () => link.click({ force: true, timeout: 20000 }),
      () => link.evaluate((el) => el.click()),
    ];

    let lastError;
    for (const attempt of strategies) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await attempt();
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        rfqLibLog('clickAddFromLibraryOnRfqForm:retry', String(error && error.message));
        // eslint-disable-next-line no-await-in-loop
        await this.scrollRfqLineItemsSectionIntoView();
      }
    }

    if (!(await this.rfqLibraryDrawerRoot().isVisible({ timeout: 4000 }).catch(() => false))) {
      if (lastError) {
        throw lastError;
      }
    }

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

  async ensureRfqLibraryDrawerHasAtLeastNDataRows(minRows) {
    const needed = Math.max(1, Number(minRows) || 1);
    rfqLibLog('ensureRfqLibraryDrawerHasAtLeastNDataRows:start', `min=${needed}`);
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
      rfqLibLog('ensureRfqLibraryDrawerHasAtLeastNDataRows:switchTab', 'try Library Items');
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
    rfqLibLog('ensureRfqLibraryDrawerHasAtLeastNDataRows:checkboxRows', `count=${n}`);
    if (n < needed) {
      throw new Error(
        `RFQ add from library needs at least ${needed} grid rows with checkboxes; found ${n}. ` +
          'Seed My Items or Library Items in the app.'
      );
    }
  }

  async ensureRfqLibraryDrawerHasAtLeastTwoDataRows() {
    await this.ensureRfqLibraryDrawerHasAtLeastNDataRows(2);
  }

  async selectFirstNRowsInRfqLibraryGrid(count) {
    const n = Math.max(1, Number(count) || 1);
    rfqLibLog('selectFirstNRowsInRfqLibraryGrid:start', `n=${n}`);
    await this.ensureRfqLibraryDrawerHasAtLeastNDataRows(n);
    const root = this.rfqLibraryDrawerRoot();
    const rowChecks = root.locator('tbody tr input[type="checkbox"]');
    for (let i = 0; i < n; i += 1) {
      await rowChecks.nth(i).scrollIntoViewIfNeeded();
      try {
        await rowChecks.nth(i).check({ timeout: 15000 });
      } catch {
        await rowChecks.nth(i).click({ force: true });
      }
      rfqLibLog('selectFirstNRowsInRfqLibraryGrid:row', `index=${i}`);
    }
  }

  async selectFirstTwoRowsInRfqLibraryGrid() {
    await this.selectFirstNRowsInRfqLibraryGrid(2);
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
