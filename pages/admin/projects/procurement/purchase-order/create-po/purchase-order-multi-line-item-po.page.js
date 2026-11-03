const { expect } = require('@playwright/test');
const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');

/**
 * Many manual rows: MUI unit menus can stay open and block the next "Add manually" click.
 * This subclass waits for the listbox to close, dismisses overlays, and defaults unit to Nos
 * (set PO_MULTI_LINE_RANDOM_UNITS=1 to pick randomly from PO_MULTI_LINE_UNITS).
 */
class PurchaseOrderMultiLineItemPoPage extends PurchaseOrderCreatePoPage {
  static defaultUnitPool() {
    const raw = process.env.PO_MULTI_LINE_UNITS || 'Nos,Kg,Mtr';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  static useRandomUnits() {
    return /^1|true|yes$/i.test(
      String(process.env.PO_MULTI_LINE_RANDOM_UNITS || '')
    );
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  pick(arr) {
    return arr[this.randomInt(0, arr.length - 1)];
  }

  /**
   * Procurement-style material name: words only (no digits), unique enough per row via word combo.
   */
  randomRelevantItemName() {
    const qualifiers = [
      'Galvanized',
      'Structural',
      'Commercial-grade',
      'Heavy-duty',
      'Precast',
      'Annealed',
      'Epoxy-coated',
      'Fire-rated',
    ];
    const materials = [
      'steel',
      'copper',
      'aluminum',
      'PVC',
      'concrete',
      'timber',
      'brass',
      'stainless',
    ];
    const forms = [
      'rebar bundle',
      'conduit run',
      'cable tray',
      'pipe section',
      'sheet stock',
      'fastener kit',
      'insulation roll',
      'junction box',
      'grating panel',
      'anchor bolts',
      'duct segment',
      'wire spool',
    ];
    const q = this.pick(qualifiers);
    const m = this.pick(materials);
    const f = this.pick(forms);
    const patterns = [
      () => `${q} ${m} ${f}`,
      () => `${m} ${f}`,
      () => `${q} ${f}`,
    ];
    return this.pick(patterns)();
  }

  randomLineItemArgs(lineIndex) {
    let unitLabel = 'Nos';
    if (PurchaseOrderMultiLineItemPoPage.useRandomUnits()) {
      const pool = PurchaseOrderMultiLineItemPoPage.defaultUnitPool();
      unitLabel = pool[this.randomInt(0, pool.length - 1)];
    }
    const ts = Date.now();
    return {
      itemName: this.randomRelevantItemName(),
      description: `Auto L${lineIndex} ${ts} rnd${this.randomInt(1, 999999)}`,
      quantity: String(this.randomInt(1, 99)),
      unitLabel,
      rate: String(this.randomInt(10, 9999)),
    };
  }

  async clickAddManuallyOnPurchaseOrderForm() {
    await this.dismissOpenMenusAndPopovers();
    await super.clickAddManuallyOnPurchaseOrderForm();
  }

  /**
   * Same as base row fill, but unit: resilient locator, wait for menu close, then rate.
   */
  async fillLastPoLineItemRow({
    itemName,
    description,
    quantity,
    unitLabel,
    rate,
  }) {
    const table = await this.ensurePoLineItemsTableVisible();
    const dataRow = table.locator('tbody tr').last();
    await expect(dataRow).toBeVisible({ timeout: 30000 });

    const nameField = dataRow.getByPlaceholder(/material name/i).first();
    await expect(nameField).toBeVisible({ timeout: this.defaultTimeout });
    await nameField.click();
    await nameField.fill(itemName);

    await dataRow.getByText(/^Add Description$/i).click();

    const descDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText(/add description/i) })
      .last();
    await expect(descDialog).toBeVisible({ timeout: 20000 });
    const descField = descDialog.locator('textarea').first().or(
      descDialog.locator('input').first()
    );
    await descField.fill(description);
    await descDialog.getByRole('button', { name: /^Add$/i }).click();
    await expect(descDialog).toBeHidden({ timeout: 20000 });

    const qtyInput = dataRow.locator('td').nth(1).locator('input').first();
    await qtyInput.fill(String(quantity));
    await qtyInput.blur();
    await this.waitForNetworkSettled();

    await this.selectPoLineRowUnit(dataRow, unitLabel);

    const rateInput = dataRow.locator('td').nth(3).locator('input').first();
    await expect(rateInput).toBeVisible({ timeout: 20000 });
    await rateInput.click();
    await rateInput.fill(String(rate));
    await rateInput.blur();

    await this.waitForNetworkSettled();
    await this.dismissOpenMenusAndPopovers();
  }

  async addManyManualLineItemsWithRandomDetails(count) {
    const n = Math.max(1, Number(count) || 1);
    for (let i = 1; i <= n; i++) {
      const args = this.randomLineItemArgs(i);
      await this.addLineItemManually(args);
    }
  }
}

module.exports = PurchaseOrderMultiLineItemPoPage;
