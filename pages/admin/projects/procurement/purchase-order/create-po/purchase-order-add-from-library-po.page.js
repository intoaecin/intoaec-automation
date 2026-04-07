const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/**
 * Edit PO → Add from library (BoqAddFromLibraryModal / slide-over) → Action → Compose email.
 */
class PurchaseOrderAddFromLibraryPoPage extends PurchaseOrderCreatePoPage {
  /** Right-side library modal: table + header Add/Cancel (CreatePOTable + BoqAddFromLibraryModal). */
  libraryDrawerRoot() {
    return this.page
      .locator('.MuiModal-root')
      .filter({ visible: true })
      .filter({ has: this.page.locator('table tbody') })
      .filter({ has: this.page.getByRole('button', { name: /^add$/i }) })
      .last();
  }

  async clickAddFromLibraryOnPurchaseOrderForm() {
    await expect(this.page).toHaveURL(/purchase-order\/edit/);
    const link = this.page
      .locator('span.pointer')
      .filter({ hasText: /add from library/i })
      .first();
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible({ timeout: 60000 });
    await link.click({ force: true });
    await expect(this.libraryDrawerRoot()).toBeVisible({ timeout: 45000 });
  }

  async expectPurchaseOrderLibraryDrawerVisible() {
    const root = this.libraryDrawerRoot();
    await expect(root).toBeVisible({ timeout: 90000 });
    await expect(root.locator('table')).toBeVisible({ timeout: 60000 });
    await root
      .locator('.MuiSkeleton-root')
      .first()
      .waitFor({ state: 'hidden', timeout: 90000 })
      .catch(() => {});
  }

  /**
   * Default tab is My Items; if empty, switch to Library Items (org default library).
   */
  async ensureLibraryDrawerHasAtLeastTwoDataRows() {
    const root = this.libraryDrawerRoot();
    await expect(root).toBeVisible({ timeout: 30000 });

    await root
      .locator('.MuiSkeleton-root')
      .first()
      .waitFor({ state: 'hidden', timeout: 90000 })
      .catch(() => {});

    let rowChecks = root.locator('tbody tr input[type="checkbox"]');
    const hasRows = await rowChecks
      .first()
      .isVisible({ timeout: 12000 })
      .catch(() => false);

    if (!hasRows) {
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
    }

    await expect(rowChecks.first()).toBeVisible({ timeout: 120000 });
    const n = await rowChecks.count();
    if (n < 2) {
      throw new Error(
        `Add from library needs at least 2 grid rows with checkboxes; found ${n}. ` +
          'Seed My Items or Library Items in the app.'
      );
    }
  }

  async selectFirstTwoRowsInPurchaseOrderLibraryGrid() {
    await this.ensureLibraryDrawerHasAtLeastTwoDataRows();
    const root = this.libraryDrawerRoot();
    const rowChecks = root.locator('tbody tr input[type="checkbox"]');
    await rowChecks.nth(0).scrollIntoViewIfNeeded();
    try {
      await rowChecks.nth(0).check({ timeout: 15000 });
    } catch {
      await rowChecks.nth(0).click({ force: true });
    }
    await rowChecks.nth(1).scrollIntoViewIfNeeded();
    try {
      await rowChecks.nth(1).check({ timeout: 15000 });
    } catch {
      await rowChecks.nth(1).click({ force: true });
    }
  }

  async clickAddInPurchaseOrderLibraryDrawer() {
    const root = this.libraryDrawerRoot();
    const addBtn = root.getByRole('button', { name: /^add$/i });
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();
    await expect(root).toBeHidden({ timeout: 120000 });
    await this.waitForNetworkSettled();
  }

  async openPurchaseOrderActionMenuAndChooseComposeEmailOnly() {
    await this.openActionMenuAndComposeEmail();
  }
}

module.exports = PurchaseOrderAddFromLibraryPoPage;
