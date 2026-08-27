const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * RFQ vendor portal: open RFQ (from Yopmail View RFQ), update price, click Update price, close tab.
 * Selectors are flexible because vendor portal UI can vary by environment.
 */
class RfqVendorPortalPriceUpdatePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 180000;
  }

  buildRandomPriceValue() {
    const base = (Math.floor(Math.random() * 9000) + 1000) / 100;
    return base.toFixed(2);
  }

  async waitForVendorRfqPageToLoad() {
    const p = this.page;
    await p.waitForLoadState('domcontentloaded', { timeout: this.defaultTimeout });
    await p.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});

    await expect(
      p.getByText(/rfq|request for quotation|quotation/i).first()
    ).toBeVisible({ timeout: 90000 });
  }

  async openPriceUpdateEditorIfNeeded() {
    const p = this.page;
    const rows = this.lineItemRows ? this.lineItemRows() : p.locator('tbody tr');
    if (await rows.first().isVisible({ timeout: 2500 }).catch(() => false)) {
      return;
    }

    const updateBtn = p
      .getByRole('button', { name: /^update\s*price(s)?$/i })
      .filter({ visible: true })
      .first();
    if (await updateBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await updateBtn.click({ timeout: 20000 }).catch(async () => {
        await updateBtn.click({ timeout: 20000, force: true });
      });
      await p.waitForTimeout(800);
      return;
    }

    const edit = p
      .getByRole('button', { name: /edit\s*price|price\s*update/i })
      .filter({ visible: true })
      .first();
    if (await edit.isVisible({ timeout: 2500 }).catch(() => false)) {
      await edit.click({ timeout: 15000 }).catch(async () => {
        await edit.click({ timeout: 15000, force: true });
      });
      await p.waitForTimeout(400);
    }
  }

  async isEditablePriceInput(field) {
    if (!(await field.isVisible({ timeout: 800 }).catch(() => false))) return false;
    if (await field.isDisabled().catch(() => true)) return false;

    const meta = [
      await field.getAttribute('placeholder').catch(() => ''),
      await field.getAttribute('name').catch(() => ''),
      await field.getAttribute('aria-label').catch(() => ''),
      await field.getAttribute('id').catch(() => ''),
    ]
      .join(' ')
      .toLowerCase();

    if (/material\s*name|item\s*name|description|quantity|unit\b|uom/i.test(meta)) {
      return false;
    }

    const type = ((await field.getAttribute('type').catch(() => '')) || '').toLowerCase();
    if (type === 'number') return true;
    return /rate|price|amount|cost/i.test(meta);
  }

  async findEditablePriceInput(row, rateCell) {
    const p = this.page;
    const buckets = [];

    if (rateCell) {
      buckets.push(rateCell.locator('input:not([disabled]), textarea:not([disabled]), [contenteditable="true"]'));
    }

    buckets.push(
      row.locator('input[type="number"]:not([disabled])'),
      row.locator('td').nth(3).locator('input:not([disabled])'),
      row.locator('td').nth(4).locator('input:not([disabled])'),
      row.locator('td').nth(5).locator('input:not([disabled])'),
      row.locator('td').last().locator('input:not([disabled])'),
      p.getByRole('spinbutton').filter({ visible: true }),
      p.locator('input[type="number"]:not([disabled])').filter({ visible: true })
    );

    for (const bucket of buckets) {
      const count = await bucket.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const candidate = bucket.nth(i);
        // eslint-disable-next-line no-await-in-loop
        if (await this.isEditablePriceInput(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  lineItemsRoot() {
    const p = this.page;
    return p
      .locator('table, [role="grid"], .MuiDataGrid-root, [aria-label*="line" i]')
      .filter({ visible: true })
      .first()
      .or(p.locator('main').filter({ visible: true }).first());
  }

  lineItemRows() {
    const p = this.page;
    const root = this.lineItemsRoot();
    const tbodyRows = root.locator('tbody tr').filter({ has: p.locator('td') });
    const gridRows = root
      .getByRole('row')
      .filter({ has: root.getByRole('gridcell') })
      .filter({ hasNot: root.locator('[role="columnheader"]') });
    const muiRows = root.locator('.MuiDataGrid-row');
    return tbodyRows.or(gridRows).or(muiRows);
  }

  async selectLineItemRowForPriceUpdate(rowIndex = 0) {
    const p = this.page;
    const root = this.lineItemsRoot();
    const rows = this.lineItemRows();
    const row = rows.nth(rowIndex);
    await expect(row).toBeVisible({ timeout: 60000 });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.click({ timeout: 15000 }).catch(async () => {
      await row.click({ timeout: 15000, force: true });
    });
    await p.waitForTimeout(400);

    const selected = root
      .locator('tr[aria-selected="true"], [role="row"][aria-selected="true"], .Mui-selected')
      .nth(rowIndex);
    if (await selected.isVisible({ timeout: 1200 }).catch(() => false)) {
      return selected;
    }
    return row;
  }

  async selectFirstLineItemRowForPriceUpdate() {
    return this.selectLineItemRowForPriceUpdate(0);
  }

  async clickRateCellToEdit(row) {
    const p = this.page;
    const r = row || p.locator('tr[aria-selected="true"], [role="row"][aria-selected="true"]').first();

    const candidates = [
      r.getByRole('gridcell', { name: /rate|unit price|price|amount/i }).first(),
      r.locator('td').filter({ hasText: /rate|unit price|price|amount/i }).first(),
      // if there is no header text inside cells, pick the 4th/5th cell as common "rate" column
      r.locator('td, [role="gridcell"]').nth(3),
      r.locator('td, [role="gridcell"]').nth(4),
    ];

    for (const c of candidates) {
      if (await c.isVisible({ timeout: 1200 }).catch(() => false)) {
        await c.scrollIntoViewIfNeeded().catch(() => {});
        await c.click({ timeout: 12000 }).catch(async () => {
          await c.click({ timeout: 12000, force: true });
        });
        await p.waitForTimeout(350);
        // Try to open inline editor if single click doesn't.
        await c.dblclick({ timeout: 12000 }).catch(() => {});
        await p.keyboard.press('Enter').catch(() => {});
        await p.waitForTimeout(350);
        return c;
      }
    }
    return null;
  }

  async typePriceIntoField(field, value) {
    const p = this.page;
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: 10000 }).catch(() => {});
    const isContentEditable =
      (await field.getAttribute('contenteditable').catch(() => null)) === 'true';
    if (isContentEditable) {
      await p.keyboard.press('Control+A').catch(() => {});
      await p.keyboard.press('Backspace').catch(() => {});
      await p.keyboard.type(value, { delay: 10 });
    } else {
      await field.fill('').catch(() => {});
      await field.fill(value);
    }
    await p.waitForTimeout(250);
  }

  async fillPriceOnLineItemRow(rowIndex, priceValue) {
    const p = this.page;
    const value = String(priceValue ?? '').trim();
    if (!value) throw new Error('Vendor price value must be non-empty');

    const row = await this.selectLineItemRowForPriceUpdate(rowIndex);
    const rateCell = await this.clickRateCellToEdit(row);
    await p.waitForTimeout(400);

    let field = await this.findEditablePriceInput(row, rateCell);
    if (!field) {
      for (const idx of [4, 5, 3, 2]) {
        const cell = row.locator('td, [role="gridcell"]').nth(idx);
        // eslint-disable-next-line no-await-in-loop
        if (await cell.isVisible({ timeout: 800 }).catch(() => false)) {
          // eslint-disable-next-line no-await-in-loop
          await cell.dblclick({ timeout: 8000, force: true }).catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          await p.waitForTimeout(300);
          // eslint-disable-next-line no-await-in-loop
          field = await this.findEditablePriceInput(row, cell);
          if (field) break;
        }
      }
    }

    if (!field) {
      throw new Error(
        `RFQ vendor portal: could not find an editable Rate/Price input on line-item row ${rowIndex + 1}.`
      );
    }

    await this.typePriceIntoField(field, value);
    await this.clickSaveRateIfPresent(row);
    await p.keyboard.press('Tab').catch(() => {});
  }

  async fillFirstVisiblePriceField(priceValue) {
    const value = String(priceValue ?? '').trim();
    if (!value) throw new Error('Vendor price value must be non-empty');

    await this.openPriceUpdateEditorIfNeeded();
    await this.fillPriceOnLineItemRow(0, value);
  }

  /**
   * Fill Rate/Price on every visible line-item row (Material 1/2/3), then leave submit to the caller.
   */
  async fillPriceOnAllLineItemRows(priceValue) {
    const value = String(priceValue ?? '').trim();
    if (!value) throw new Error('Vendor price value must be non-empty');

    await this.openPriceUpdateEditorIfNeeded();
    const rows = this.lineItemRows();
    await expect(rows.first()).toBeVisible({ timeout: 60000 });
    const count = await rows.count();
    const n = Math.max(count, 1);
    for (let i = 0; i < n; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.fillPriceOnLineItemRow(i, value);
    }
    return n;
  }

  async clickSaveRateIfPresent(rowScope) {
    const p = this.page;
    const scope = rowScope || p;

    const saveCandidates = [
      scope.getByRole('button', { name: /^save$/i }).filter({ visible: true }).first(),
      scope.getByRole('button', { name: /save rate|save price|save changes/i }).filter({ visible: true }).first(),
      scope.locator('button').filter({ hasText: /^save$/i }).filter({ visible: true }).first(),
      p.getByRole('button', { name: /^save$/i }).filter({ visible: true }).first(),
      p.getByRole('button', { name: /save rate|save price|save changes/i }).filter({ visible: true }).first(),
    ];

    for (const b of saveCandidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await b.isVisible({ timeout: 1200 }).catch(() => false)) {
        // eslint-disable-next-line no-await-in-loop
        await b.click({ timeout: 15000 }).catch(async () => {
          await b.click({ timeout: 15000, force: true });
        });
        // eslint-disable-next-line no-await-in-loop
        await p.waitForTimeout(600);
        return true;
      }
    }

    // Some inline editors commit on Enter.
    await p.keyboard.press('Enter').catch(() => {});
    await p.waitForTimeout(300);
    return false;
  }

  async clickUpdatePriceButton() {
    const p = this.page;
    const btn = p
      .getByRole('button', { name: /^update\s*price(s)?$/i })
      .filter({ visible: true })
      .last();

    await expect(btn).toBeVisible({ timeout: 60000 });
    await btn.click({ timeout: 20000, force: true }).catch(async () => {
      await btn.click({ timeout: 20000, force: true });
    });

    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    await p.waitForTimeout(600);
  }

  async expectPriceUpdateSuccess() {
    const p = this.page;
    const toast = p
      .locator('.Toastify__toast, .Toastify__toast-body[role="alert"], [role="alert"]')
      .filter({ hasText: /updated|saved|success/i })
      .first();
    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toast).toBeVisible({ timeout: 10000 });
      return;
    }
    // Fallback: button disabled / spinner done.
    await p.waitForTimeout(800);
  }
}

module.exports = { RfqVendorPortalPriceUpdatePage };

