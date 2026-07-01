const { expect } = require('@playwright/test');
const WorkOrderComposeSendPage = require('./work-order-compose-send.page');

/**
 * Fast bulk manual WO rows: minimal waits, last-row fill, Nos unit skip when already set.
 * Set WO_MULTI_LINE_COUNT to override default row count (20).
 */
class WorkOrderMultiLineItemPage extends WorkOrderComposeSendPage {
  constructor(page) {
    super(page);
    this.woMultiLineRowTimeout = this.woFastMode ? 12000 : 30000;
  }

  static defaultLineCount() {
    const n = Number(process.env.WO_MULTI_LINE_COUNT);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
  }

  randomLineItemArgs(lineIndex) {
    return {
      scopeOfWork: `lw${lineIndex}`,
      description: null,
      quantity: String(1 + (lineIndex % 25)),
      unitLabel: 'Nos',
      unitRate: String(1000 + lineIndex * 137),
    };
  }

  async clickAddManuallyOnWorkOrderForm() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.ensureWoLineItemsTableVisible();
    await this.page
      .getByText(/line items/i)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});

    const candidates = [
      this.page.getByText('+ Add Manually').first(),
      this.page.getByText(/^\+?\s*Add Manually$/i).first(),
      this.page.getByText(/add manually/i).first(),
      this.page.locator('span.pointer').filter({ hasText: /add manually/i }).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 3000 }).catch(() => false)) {
        await candidate.scrollIntoViewIfNeeded();
        await candidate.click({ force: true, timeout: 15000 });
        return;
      }
    }

    throw new Error('WO multi-line: + Add Manually control not found.');
  }

  async getLastWoLineItemRowFast(table) {
    const row = table.locator('tbody tr').last();
    await expect(row).toBeVisible({ timeout: this.woMultiLineRowTimeout });
    return row;
  }

  async ensureWoLineRowUnitNos(dataRow) {
    const unitSelect = await this.getPoLineRowUnitSelectLocator(dataRow);
    if (!unitSelect) {
      return;
    }

    const display = await this.getPoLineRowUnitDisplayText(dataRow);
    if (!this.isPoLineUnitPlaceholderText(display)) {
      return;
    }

    await unitSelect.click({ timeout: 8000 }).catch(async () => {
      await unitSelect.click({ force: true, timeout: 5000 });
    });

    const listbox = this.page.getByRole('listbox').last();
    if (await listbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.pickFirstPoLineUnitFromOpenListbox(listbox);
      await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  locatorWoRowWeightInput(dataRow) {
    return dataRow
      .locator('input[aria-label="weight"]')
      .or(dataRow.getByRole('textbox', { name: /weight/i }))
      .or(dataRow.locator('td').nth(3).locator('input[type="number"], input[type="text"]').first())
      .first();
  }

  async fillActiveWoLineItemFast({ scopeOfWork, quantity, unitLabel = 'Nos', unitRate }) {
    const table = await this.ensureWoLineItemsTableVisible();
    const dataRow = await this.getLastWoLineItemRowFast(table);

    const serviceInRow = dataRow.getByRole('textbox', { name: 'Service Name' }).first();
    const serviceOnPage = this.page
      .getByRole('textbox', { name: 'Service Name' })
      .filter({ visible: true })
      .last();

    let scopeField = serviceInRow;
    if (!(await serviceInRow.isVisible({ timeout: 1500 }).catch(() => false))) {
      scopeField = serviceOnPage;
    }

    await expect(scopeField).toBeVisible({ timeout: this.woMultiLineRowTimeout });
    await scopeField.fill(scopeOfWork);

    const qtyInput = await this.resolveWoLineQtyInput(dataRow);
    await qtyInput.fill(String(quantity));

    await this.ensureWoLineRowUnitNos(dataRow);

    const rateInput = this.locatorWoRowWeightInput(dataRow);
    await expect
      .poll(async () => rateInput.isEnabled().catch(() => false), {
        timeout: this.woMultiLineRowTimeout,
        intervals: [80, 120, 200, 400, 800],
      })
      .toBe(true);

    await rateInput.fill(String(unitRate));
  }

  async addWorkOrderLineItemManually({
    scopeOfWork,
    quantity,
    unitLabel,
    unitRate,
  }) {
    if (!(await this.isWorkOrderTitleFieldVisible().catch(() => false))) {
      await this.waitForWorkOrderCreateForm();
    }
    await this.clickAddManuallyOnWorkOrderForm();
    await this.fillActiveWoLineItemFast({
      scopeOfWork,
      quantity,
      unitLabel,
      unitRate,
    });
    // eslint-disable-next-line no-console
    console.log(
      `[WO multi-line] Line item: scope="${scopeOfWork}" qty=${quantity} rate=${unitRate}`
    );
  }

  async addManyManualWorkOrderLineItemsWithRandomDetails(count) {
    const n = Math.max(1, Number(count) || WorkOrderMultiLineItemPage.defaultLineCount());
    const started = Date.now();
    for (let i = 1; i <= n; i += 1) {
      const args = this.randomLineItemArgs(i);
      // eslint-disable-next-line no-await-in-loop
      await this.addWorkOrderLineItemManually(args);
      if (i % 10 === 0 || i === n) {
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        // eslint-disable-next-line no-console
        console.log(`[WO multi-line] ${i}/${n} rows (${elapsed}s)`);
      }
    }
  }

  async completeWorkOrderComposeSendMultiLineJourney(
    title = 'electrician',
    lineItemCount = WorkOrderMultiLineItemPage.defaultLineCount()
  ) {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addManyManualWorkOrderLineItemsWithRandomDetails(lineItemCount);
    await this.addWorkOrderVendorFromModal();
    await this.composeAndSendWorkOrderEmail();
    // eslint-disable-next-line no-console
    console.log(
      `[WO] Multi-line (${lineItemCount}) compose → send finished.`
    );
  }
}

module.exports = WorkOrderMultiLineItemPage;
