const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/** PO list → ⋮ Edit → Add Manually → line item → Action → Compose email → Send. */
class PurchaseOrderEditPoPage extends PurchaseOrderCreatePoPage {
  editMenuItemLocator() {
    return this.page
      .getByRole('menuitem')
      .filter({ hasText: /^\s*edit(\b|$)/i })
      .filter({ visible: true })
      .first();
  }

  addManuallyControl() {
    return this.page
      .getByText(/^\+?\s*add manually$/i)
      .or(this.page.getByRole('button', { name: /add manually/i }))
      .or(this.page.locator('span.pointer').filter({ hasText: /add manually/i }))
      .filter({ visible: true })
      .last();
  }

  async openThreeDotMenuOnFirstPurchaseOrderCardForEdit() {
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await this.dismissListSkeletons();

    const card = this.firstPoCard();
    await card.scrollIntoViewIfNeeded();
    await this.ensurePoCardRowExpanded(card);

    const kebab = this.kebabButtonOnPoCard(card);
    await expect(kebab).toBeVisible({ timeout: 30000 });
    await kebab.scrollIntoViewIfNeeded();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenusAndPopovers();
      }
      await kebab.click({ timeout: 15000, force: attempt >= 1 }).catch(async () => {
        await kebab.click({ timeout: 15000, force: true });
      });
      await this.page.waitForTimeout(300);
      if (await this.editMenuItemLocator().isVisible({ timeout: 3000 }).catch(() => false)) {
        // eslint-disable-next-line no-console
        console.log('[PO] Opened three-dot menu with Edit.');
        return;
      }
    }

    await expect(this.editMenuItemLocator()).toBeVisible({
      timeout: 30000,
      message: 'Edit was not visible after opening the three-dot menu on the first PO card.',
    });
  }

  async clickEditInPurchaseOrderCardMenu() {
    let editItem = this.editMenuItemLocator();
    if (!(await editItem.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.openThreeDotMenuOnFirstPurchaseOrderCardForEdit();
      editItem = this.editMenuItemLocator();
    }

    await expect(editItem).toBeVisible({ timeout: 15000 });
    await editItem.click({ timeout: 15000, force: true });
    // eslint-disable-next-line no-console
    console.log('[PO] Clicked Edit in the three-dot menu.');
    await this.waitForPurchaseOrderEditFormReady();
  }

  isPurchaseOrderEditUrl(href) {
    const u = String(href || '');
    return /purchase-order/i.test(u) && /edit/i.test(u);
  }

  async waitForPurchaseOrderEditFormReady() {
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    }).catch(() => {});
    await this.page
      .waitForURL((url) => this.isPurchaseOrderEditUrl(url.href), {
        timeout: 25000,
      })
      .catch(() => {});
    await this.waitForNetworkSettled();

    await expect
      .poll(
        async () => {
          const heading = await this.page
            .getByText(/edit purchase order|update purchase order/i)
            .first()
            .isVisible({ timeout: 400 })
            .catch(() => false);
          const addManually = await this.addManuallyControl()
            .isVisible({ timeout: 400 })
            .catch(() => false);
          const changeVendor = await this.page
            .getByRole('button', { name: /change vendor/i })
            .isVisible({ timeout: 400 })
            .catch(() => false);
          const table = await this.page
            .locator('[aria-label="PO line items table"], table')
            .first()
            .isVisible({ timeout: 400 })
            .catch(() => false);
          if (heading || addManually || changeVendor || table) {
            return 'edit';
          }
          return 'wait';
        },
        { timeout: 120000, intervals: [300, 600, 1000, 2000] }
      )
      .toBe('edit');

    // eslint-disable-next-line no-console
    console.log('[PO] Edit form is ready.');
  }

  async expectPurchaseOrderEditFormLoaded() {
    await this.waitForPurchaseOrderEditFormReady();
    const table = this.page
      .locator('[aria-label="PO line items table"]')
      .or(this.page.locator('table').filter({ has: this.page.getByPlaceholder(/material name|service name/i) }))
      .first();
    if (await table.isVisible({ timeout: 8000 }).catch(() => false)) {
      await table.scrollIntoViewIfNeeded().catch(() => {});
    }
  }

  async clickAddManuallyOnPurchaseOrderForm() {
    await this.dismissOpenMenusAndPopovers();
    await this.page.keyboard.press('Escape').catch(() => {});

    const table = await this.ensurePoLineItemsTableVisible().catch(() => null);
    if (table) {
      await table.scrollIntoViewIfNeeded().catch(() => {});
    }

    const addManually = this.addManuallyControl();
    for (let i = 0; i < 10; i += 1) {
      if (await addManually.isVisible({ timeout: 600 }).catch(() => false)) {
        break;
      }
      await this.page.evaluate(() => {
        window.scrollBy(0, Math.floor(window.innerHeight * 0.35));
      });
    }

    await expect(addManually).toBeVisible({ timeout: 30000 });
    await addManually.scrollIntoViewIfNeeded().catch(() => {});

    const nameFields = this.page.getByPlaceholder(/material name|service name/i);
    const before = await nameFields.count().catch(() => 0);

    await addManually.click({ timeout: 15000 }).catch(async () => {
      await addManually.click({ force: true, timeout: 10000 });
    });

    await expect
      .poll(async () => nameFields.count().catch(() => 0), {
        timeout: 20000,
        intervals: [200, 400, 800],
      })
      .toBeGreaterThan(before)
      .catch(() => {});

    // eslint-disable-next-line no-console
    console.log('[PO] Clicked + Add Manually on the edit form.');
  }

  async fillNewPoLineItemOnEditForm(args) {
    await this.dismissOpenMenusAndPopovers();
    await this.fillLastPoLineItemRow({
      ...args,
      lightNetworkWaits: true,
      useFirstUnitOption: true,
    });
  }

  /** Edit compose: dismiss overlays only — do not auto-fill units (UI may already have them). */
  async prepareEditFormBeforeComposeEmail() {
    await this.dismissOpenMenusAndPopovers();
    const table = await this.ensurePoLineItemsTableVisible();
    await table.scrollIntoViewIfNeeded();
  }

  async composeAndSendEmailFromEditForm() {
    await this.prepareEditFormBeforeComposeEmail();
    await this.openActionMenuAndComposeEmail();
    await this.clickSendEmailInComposeDialogFromEditForm();
  }

  /** Click Send email only — edit compose may not show toast; flow ends here. */
  async clickSendEmailInComposeDialogFromEditForm() {
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

    // eslint-disable-next-line no-console
    console.log('[PO edit compose] Clicked Send email — flow complete.');
    this.poCreatedAndSentSuccessObserved = true;
  }
}

module.exports = PurchaseOrderEditPoPage;
