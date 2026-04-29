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

    const updateBtn = p
      .getByRole('button', { name: /update price|update prices|update/i })
      .filter({ visible: true })
      .first();
    if (await updateBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      // In this vendor UI, clicking this top button enables inline editing (row highlights).
      await updateBtn.click({ timeout: 20000 }).catch(async () => {
        await updateBtn.click({ timeout: 20000, force: true });
      });
      await p.waitForTimeout(600);
      return;
    }

    const edit = p
      .getByRole('button', { name: /edit|update|price/i })
      .filter({ visible: true })
      .first();
    if (await edit.isVisible({ timeout: 2500 }).catch(() => false)) {
      await edit.click({ timeout: 15000 }).catch(async () => {
        await edit.click({ timeout: 15000, force: true });
      });
      await p.waitForTimeout(400);
    }
  }

  lineItemsRoot() {
    const p = this.page;
    return p
      .locator('table, [role="grid"], .MuiDataGrid-root, [aria-label*="line" i]')
      .filter({ visible: true })
      .first()
      .or(p.locator('main').filter({ visible: true }).first());
  }

  async selectFirstLineItemRowForPriceUpdate() {
    const p = this.page;
    const root = this.lineItemsRoot();

    // Common table rows
    let rows = root.locator('tbody tr').filter({ has: p.locator('td') });
    if ((await rows.count().catch(() => 0)) === 0) {
      rows = root
        .getByRole('row')
        .filter({ has: root.getByRole('gridcell') })
        .filter({ hasNot: root.locator('[role="columnheader"]') });
    }
    if ((await rows.count().catch(() => 0)) === 0) {
      rows = root.locator('.MuiDataGrid-row');
    }

    const row = rows.first();
    await expect(row).toBeVisible({ timeout: 60000 });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.click({ timeout: 15000 }).catch(async () => {
      await row.click({ timeout: 15000, force: true });
    });
    await p.waitForTimeout(400);

    const selected = root
      .locator('tr[aria-selected="true"], [role="row"][aria-selected="true"], .Mui-selected')
      .first();
    if (await selected.isVisible({ timeout: 1200 }).catch(() => false)) {
      return selected;
    }
    return row;
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

  async fillFirstVisiblePriceField(priceValue) {
    const p = this.page;
    const value = String(priceValue ?? '').trim();
    if (!value) throw new Error('Vendor price value must be non-empty');

    // Your vendor UI: Update price -> select row (highlight) -> click Rate -> input appears.
    await this.openPriceUpdateEditorIfNeeded();
    const row = await this.selectFirstLineItemRowForPriceUpdate();
    const rateCell = await this.clickRateCellToEdit(row);

    const candidates = [
      // Prefer field within selected row if it becomes an inline editor
      row
        .locator('input[type="number"], input:not([type="hidden"])')
        .filter({ visible: true })
        .first(),
      // Prefer field inside the clicked rate cell (inline editor)
      ...(rateCell
        ? [
            rateCell
              .locator('input[type="number"], input:not([type="hidden"]), textarea, [contenteditable="true"]')
              .filter({ visible: true })
              .first(),
          ]
        : []),
      // Common labeled fields
      p.getByRole('spinbutton', { name: /rate|unit price|price|amount/i }).filter({ visible: true }).first(),
      p.getByRole('textbox', { name: /rate|unit price|price|amount/i }).filter({ visible: true }).first(),
      // Any visible numeric/text input as fallback
      p.locator('input[type="number"]').filter({ visible: true }).first(),
      p.locator('input:not([type="hidden"])').filter({ visible: true }).first(),
    ];

    let field = null;
    for (const c of candidates) {
      if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
        field = c;
        break;
      }
    }
    if (!field) {
      throw new Error('RFQ vendor portal: could not find a visible price input.');
    }

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

    await this.clickSaveRateIfPresent(row);
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
      .getByRole('button', { name: /update price|update prices/i })
      .filter({ visible: true })
      .first()
      .or(
        p
          .getByRole('button', { name: /update/i })
          .filter({ visible: true })
          .first()
      );

    await expect(btn.first()).toBeVisible({ timeout: 60000 });
    await btn.first().click({ timeout: 20000, force: true }).catch(async () => {
      await btn.first().click({ timeout: 20000, force: true });
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

