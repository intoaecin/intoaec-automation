const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/**
 * Edit PO → Add from library (BoqAddFromLibraryModal / slide-over) → Action → Compose email.
 */
class PurchaseOrderAddFromLibraryPoPage extends PurchaseOrderCreatePoPage {
  /** Library slide-over / drawer: table + header Add/Cancel (BoqAddFromLibraryModal). */
  libraryDrawerRoot() {
    return this.page
      .locator(
        '.MuiDrawer-root, .MuiModal-root, .offcanvas.show, aside.offcanvas.show, [role="dialog"]'
      )
      .filter({ visible: true })
      .filter({ has: this.page.locator('table tbody') })
      .filter({ has: this.page.getByRole('button', { name: /^add$/i }) })
      .last();
  }

  /** Visible "Add from library" near the PO line items toolbar (avoids hidden duplicate nodes). */
  locatorAddFromLibraryOnPoForm() {
    const table = this.page.locator('[aria-label="PO line items table"]');
    const nearLineItems = table
      .locator('xpath=ancestor::*[.//span[contains(@class,"pointer")]][position()<=6]')
      .last()
      .locator('span.pointer, button, a')
      .filter({ hasText: /add from library/i })
      .filter({ visible: true });

    return nearLineItems.first().or(
      this.page
        .getByText(/add from library/i)
        .filter({ visible: true })
        .last()
    );
  }

  async scrollPoLineItemsSectionIntoView() {
    const table = await this.ensurePoLineItemsTableVisible();
    await table.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    });
    await this.page.evaluate(() => {
      const tableEl = document.querySelector('[aria-label="PO line items table"]');
      if (!tableEl) return;
      let node = tableEl.parentElement;
      while (node && node !== document.body) {
        const { overflowY } = window.getComputedStyle(node);
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          node.scrollHeight > node.clientHeight
        ) {
          const rect = tableEl.getBoundingClientRect();
          const parentRect = node.getBoundingClientRect();
          if (rect.bottom > parentRect.bottom || rect.top < parentRect.top) {
            node.scrollTop += rect.top - parentRect.top - parentRect.height / 3;
          }
        }
        node = node.parentElement;
      }
    });
  }

  async clickAddFromLibraryLinkWithFallback(link) {
    await expect(link).toBeVisible({ timeout: 60000 });
    await link.scrollIntoViewIfNeeded().catch(() => {});

    const strategies = [
      () => link.click({ timeout: 20000 }),
      () => link.click({ force: true, timeout: 20000 }),
      () => link.evaluate((el) => el.click()),
    ];

    let lastError;
    for (const attempt of strategies) {
      try {
        await attempt();
        return;
      } catch (error) {
        lastError = error;
        await this.scrollPoLineItemsSectionIntoView();
      }
    }
    throw lastError;
  }

  async clickAddFromLibraryOnPurchaseOrderForm() {
    await expect(this.page).toHaveURL(/purchase-order\/edit/);
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();
    await this.scrollPoLineItemsSectionIntoView();
    await this.waitForNetworkSettled();

    const link = this.locatorAddFromLibraryOnPoForm();
    await this.clickAddFromLibraryLinkWithFallback(link);

    await expect(this.libraryDrawerRoot()).toBeVisible({ timeout: 90000 });
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

  /** Click Send email only — edit-form compose may not redirect to PO list; flow ends here. */
  async clickSendEmailInComposeDialogToCompleteAddFromLibraryFlow() {
    await this.waitForComposeEmailModalReady();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();
    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });
    await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
    } catch (error) {
      await send.click({ timeout: 15000, force: true });
    }
  }
}

module.exports = PurchaseOrderAddFromLibraryPoPage;
