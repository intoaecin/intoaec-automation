const { expect } = require('@playwright/test');
const WorkOrderAddFromLibraryPage = require('./work-order-add-from-library.page');

/** Work Order create form: Action → Create (save without compose email). */
class WorkOrderActionCreatePage extends WorkOrderAddFromLibraryPage {
  constructor(page) {
    super(page);
    this.woCreateSuccessObserved = false;
  }

  /**
   * Login assumed done — navigate + create → title → line item → vendor → Action → Create.
   */
  async completeWorkOrderActionCreateJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderActionCreateFlow(title);
  }

  /**
   * Login assumed done — navigate + create → title → library line item → vendor → Action → Create.
   */
  async completeWorkOrderActionCreateFromLibraryJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.completeWorkOrderActionCreateFromLibraryFlow(title);
  }

  /**
   * Single atomic flow: create form → title → line item → vendor → Action → Create.
   */
  async completeWorkOrderActionCreateFlow(title = 'electrician') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManuallyWithRandomDetails();
    await this.addWorkOrderVendorFromModal();
    await this.openActionMenuAndChooseCreate();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → Action → Create flow finished.');
  }

  /** create form → title → Add from library (first radio) → vendor → Action → Create */
  async completeWorkOrderActionCreateFromLibraryFlow(title = 'electrician') {
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemFromLibraryFirstRadio();
    await this.addWorkOrderVendorFromModal();
    await this.openActionMenuAndChooseCreate();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → library → Action → Create flow finished.');
  }

  /** Codegen: Action button → Create menu item */
  async openActionMenuAndChooseCreate() {
    await this.dismissVisibleToastNotifications().catch(() => {});

    const actionBtn = this.page.getByRole('button', { name: 'Action' }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.woUiTimeout });
    await actionBtn.scrollIntoViewIfNeeded().catch(() => {});
    await actionBtn.click({ timeout: 30000 });

    const createItem = this.page
      .getByText('Create', { exact: true })
      .or(this.page.getByRole('menuitem', { name: /^create$/i }))
      .or(
        this.page
          .getByRole('menuitem')
          .filter({ hasText: /^(create|create\s+wo|create\s+work order)$/i })
      )
      .first();
    await expect(createItem).toBeVisible({ timeout: this.woUiTimeout });
    await createItem.click({ timeout: 30000 });

    const raceTimeout = this.woFastMode ? 25000 : 60000;
    const toast = this.locatorWoCreatedFromActionMenuToast();
    await Promise.race([
      toast.waitFor({ state: 'visible', timeout: raceTimeout }).then(() => {
        this.woCreateSuccessObserved = true;
      }),
      this.page
        .getByRole('button', { name: /create work order/i })
        .waitFor({ state: 'visible', timeout: raceTimeout })
        .then(() => {
          this.woCreateSuccessObserved = true;
        })
        .catch(() => {}),
      this.page
        .waitForURL(/client\/profile|work[-_]?order(?!\/create)/i, {
          timeout: raceTimeout,
        })
        .then(() => {
          this.woCreateSuccessObserved = true;
        })
        .catch(() => {}),
    ]).catch(() => {});

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[WO action create] Clicked Action → Create.');
  }

  locatorWoCreatedFromActionMenuToast() {
    const re =
      /work order created[\s&.,-]*sent|work order created successfully|wo created successfully|work order saved successfully|created successfully/i;
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body, [role="alert"]')
      .filter({ hasText: re })
      .first();
  }

  async expectWorkOrderCreatedFromActionMenuToast() {
    if (this.woCreateSuccessObserved) {
      return;
    }

    const toast = this.locatorWoCreatedFromActionMenuToast();
    if (await toast.isVisible({ timeout: this.woFastMode ? 8000 : 15000 }).catch(() => false)) {
      return;
    }

    await expect(
      this.page.getByRole('button', { name: /create work order/i })
    ).toBeVisible({ timeout: this.woUiTimeout });
    await expect(this.page.getByText(/wo no|work order no/i).first()).toBeVisible({
      timeout: this.woUiTimeout,
    });
  }
}

module.exports = WorkOrderActionCreatePage;
