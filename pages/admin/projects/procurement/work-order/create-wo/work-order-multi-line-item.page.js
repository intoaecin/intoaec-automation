const { expect } = require('@playwright/test');
const WorkOrderComposeSendPage = require('./work-order-compose-send.page');

/**
 * Many manual WO rows: MUI unit menus can stay open and block the next "Add manually" click.
 * Fills each new row in table order (Service Name → qty → unit → weight) like TC-01.
 */
class WorkOrderMultiLineItemPage extends WorkOrderComposeSendPage {
  static defaultUnitPool() {
    const raw = process.env.WO_MULTI_LINE_UNITS || 'Nos,Sqft,Rft,Kg';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  static useRandomUnits() {
    return /^1|true|yes$/i.test(
      String(process.env.WO_MULTI_LINE_RANDOM_UNITS || '')
    );
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  pick(arr) {
    return arr[this.randomInt(0, arr.length - 1)];
  }

  randomLineItemArgs(lineIndex) {
    let unitLabel = 'Nos';
    if (WorkOrderMultiLineItemPage.useRandomUnits()) {
      const pool = WorkOrderMultiLineItemPage.defaultUnitPool();
      unitLabel = pool[this.randomInt(0, pool.length - 1)];
    }
    return {
      scopeOfWork: `labour work ${lineIndex}`,
      description: null,
      quantity: this.buildRandomWoLineItemQuantity(),
      unitLabel,
      unitRate: this.buildRandomWoLineItemRate(),
    };
  }

  async clickAddManuallyOnWorkOrderForm() {
    await this.dismissOpenMenusAndPopovers();
    await super.clickAddManuallyOnWorkOrderForm();
  }

  async selectWoLineRowUnitForMultiLine(row, unitLabel = 'Nos') {
    await row.scrollIntoViewIfNeeded();
    const unitSelect = await this.getPoLineRowUnitSelectLocator(row);
    if (!unitSelect) {
      return;
    }

    await unitSelect.click({ timeout: 20000 }).catch(async () => {
      await unitSelect.click({ force: true, timeout: 10000 });
    });

    const listbox = this.page.getByRole('listbox').last();
    await expect(listbox).toBeVisible({ timeout: 20000 });

    const label = String(unitLabel || 'Nos').trim();
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const option = listbox
      .getByRole('option', { name: new RegExp(escaped, 'i') })
      .first();
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.click();
    } else {
      await this.pickFirstPoLineUnitFromOpenListbox(listbox);
    }

    await listbox.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await this.dismissOpenMenusAndPopovers();
  }

  locatorWoRowWeightInput(dataRow) {
    return dataRow
      .locator('input[aria-label="weight"]')
      .or(dataRow.getByRole('textbox', { name: /weight/i }))
      .or(dataRow.locator('td').nth(3).locator('input[type="number"], input[type="text"]').first())
      .first();
  }

  /**
   * Table-row fill for multi-line WO: scope → qty → unit → wait for weight enabled → rate.
   * Skips page-level codegen path so earlier rows are not overwritten.
   */
  async fillLastWoLineItemRow({
    scopeOfWork,
    quantity,
    unitLabel,
    unitRate,
    table: tableOverride,
  }) {
    const table = tableOverride || (await this.ensureWoLineItemsTableVisible());
    const dataRow = await this.getLastWoLineItemDataRow(table);
    await dataRow.scrollIntoViewIfNeeded().catch(() => {});
    await dataRow.click({ position: { x: 12, y: 12 }, timeout: 10000 }).catch(() => {});

    let scopeField = dataRow.getByRole('textbox', { name: 'Service Name' }).first();
    if (!(await scopeField.isVisible({ timeout: 5000 }).catch(() => false))) {
      scopeField = await this.resolveWoLineItemScopeField(dataRow);
    }

    await expect(scopeField).toBeVisible({ timeout: 20000 });
    await scopeField.click({ timeout: 15000 });
    await scopeField.fill(scopeOfWork);
    await scopeField.blur();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const qtyInput = await this.resolveWoLineQtyInput(dataRow);
    await expect(qtyInput).toBeVisible({ timeout: 20000 });
    await qtyInput.click({ timeout: 10000 });
    await qtyInput.fill(String(quantity));
    await qtyInput.blur();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await this.selectWoLineRowUnitForMultiLine(dataRow, unitLabel || 'Nos');

    const rateInput = this.locatorWoRowWeightInput(dataRow);
    let rateReady = false;
    try {
      await expect
        .poll(
          async () => {
            if (!(await rateInput.isVisible().catch(() => false))) {
              return false;
            }
            return rateInput.isEnabled().catch(() => false);
          },
          { timeout: this.woUiTimeout, intervals: [200, 400, 800, 1500, 2500] }
        )
        .toBe(true);
      rateReady = true;
    } catch {
      const inlineService = this.page
        .getByRole('textbox', { name: 'Service Name' })
        .filter({ visible: true })
        .last();
      if (
        (await inlineService.isVisible({ timeout: 3000 }).catch(() => false)) &&
        (await inlineService.isEnabled().catch(() => false))
      ) {
        await this.fillWoLineItemCodegenPattern({
          scopeOfWork,
          quantity,
          unitLabel,
          unitRate,
        });
        await this.dismissOpenMenusAndPopovers();
        return;
      }
    }

    if (!rateReady) {
      throw new Error(
        `WO multi-line: weight/rate field did not become enabled for scope "${scopeOfWork}".`
      );
    }

    await rateInput.scrollIntoViewIfNeeded();
    await rateInput.click({ timeout: 15000 });
    await rateInput.fill(String(unitRate));
    await rateInput.blur();

    await this.waitForWoUiSettled();
    await this.dismissOpenMenusAndPopovers();
  }

  async addManyManualWorkOrderLineItemsWithRandomDetails(count) {
    const n = Math.max(1, Number(count) || 1);
    for (let i = 1; i <= n; i += 1) {
      const args = this.randomLineItemArgs(i);
      // eslint-disable-next-line no-await-in-loop
      await this.addWorkOrderLineItemManually(args);
      if (i % 5 === 0 || i === n) {
        // eslint-disable-next-line no-console
        console.log(`[WO multi-line] Added ${i}/${n} manual line items.`);
      }
    }
  }

  /**
   * Login → WO create → title → many manual line items → vendor → Action → Compose → Send.
   */
  async completeWorkOrderComposeSendMultiLineJourney(
    title = 'electrician',
    lineItemCount = 20
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
      `[WO] Complete multi-line (${lineItemCount}) → compose → send flow finished.`
    );
  }
}

module.exports = WorkOrderMultiLineItemPage;
