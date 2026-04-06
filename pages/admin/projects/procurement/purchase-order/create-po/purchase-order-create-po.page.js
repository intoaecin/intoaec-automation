const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');
const ProjectNavigationPage = require('../../../ProjectNavigationPage');
const ProjectProfilePage = require('../../../ProjectProfilePage');

/** Shared PO list + create/edit form flows (vendor, line items, compose, Action menu). */
class PurchaseOrderCreatePoPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    await this.page
      .waitForLoadState('networkidle', { timeout: 20000 })
      .catch(() => {});
  }

  async navigateToFirstProjectPurchaseOrderList() {
    const nav = new ProjectNavigationPage(this.page);
    await nav.navigateToProjects();
    await nav.clickFirstProject();
    await this.waitForNetworkSettled();

    const profile = new ProjectProfilePage(this.page);
    await profile.selectHeading('Procurement');
    await profile.clickModuleCard('Purchase Order');
    await this.waitForNetworkSettled();
    await this.ensurePurchaseOrderListReady();
  }

  async ensurePurchaseOrderListReady() {
    await this.page
      .waitForURL(
        (url) => {
          const href = typeof url === 'string' ? url : url.href;
          return (
            /tab=RFQAndPO/i.test(href) &&
            (/subTab=PO/i.test(href) || /subTab%3DPO/i.test(href))
          );
        },
        { timeout: 90000 }
      )
      .catch(() => {});

    await this.page.waitForLoadState('domcontentloaded');

    const poTab = this.page.getByRole('tab', { name: /purchase order/i });
    if (await poTab.isVisible({ timeout: 15000 }).catch(() => false)) {
      await poTab.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(400);
    }

    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
    await this.dismissListSkeletons();
  }

  async dismissListSkeletons() {
    await this.page
      .waitForFunction(
        () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
        { timeout: 20000 }
      )
      .catch(() => {});
  }

  purchaseOrderStartDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText(/get started/i) });
  }

  async openCreatePurchaseOrderStartDialog() {
    const createBtn = this.page.getByRole('button', {
      name: /create purchase order/i,
    });
    await expect(createBtn).toBeVisible({ timeout: this.defaultTimeout });
    await createBtn.click();
    const dialog = this.purchaseOrderStartDialog();
    await expect(dialog).toBeVisible({ timeout: 30000 });
    await expect(dialog.getByText(/get started/i)).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async startFromScratchAndProceed() {
    const dialog = this.purchaseOrderStartDialog();
    await expect(dialog).toBeVisible({ timeout: 15000 });
    const startOption = dialog.getByText(/start from scratch/i).first();
    await expect(startOption).toBeVisible({ timeout: 30000 });
    await startOption.click();
    const proceed = dialog.getByRole('button', { name: /^proceed$/i });
    await expect(proceed).toBeEnabled({ timeout: 30000 });
    await proceed.click();
    await this.page.waitForURL(/purchase-order\/create/, {
      timeout: this.defaultTimeout,
    });
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
  }

  async waitForPurchaseOrderCreateForm() {
    await this.page.waitForURL(/purchase-order\/create/, {
      timeout: this.defaultTimeout,
    });
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    const titleInput = this.page.locator('input[name="estimation name"]').first();
    await titleInput.waitFor({ state: 'visible', timeout: 90000 });
  }

  async fillPurchaseOrderTitle(title) {
    await this.waitForPurchaseOrderCreateForm();
    const input = this.page.locator('input[name="estimation name"]').first();
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.fill('');
    await input.fill(title);
    await expect
      .poll(async () => (await input.inputValue()).trim(), { timeout: 15000 })
      .toBe(title);
    await this.waitForNetworkSettled();
  }

  async addVendorDetailsWithFirstVendorRadio() {
    const addVendorBtn = this.page.getByRole('button', {
      name: /add vendor details/i,
    });
    await addVendorBtn.waitFor({ state: 'visible', timeout: 90000 });
    await addVendorBtn.scrollIntoViewIfNeeded();
    await expect(addVendorBtn).toBeEnabled({ timeout: 15000 });
    await addVendorBtn.click();

    const vendorModal = this.page.locator('.MuiModal-root').last();
    const panelHeading = vendorModal.getByText(
      /add vendor|select vendor|change vendor/i
    );
    await expect(panelHeading).toBeVisible({ timeout: 45000 });

    const skeleton = vendorModal.locator('.MuiSkeleton-root').first();
    if (await skeleton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skeleton.waitFor({ state: 'hidden', timeout: 90000 });
    }

    const noData = vendorModal.getByText(/no data found/i);
    if (await noData.isVisible({ timeout: 5000 }).catch(() => false)) {
      throw new Error(
        'Vendor modal has no organizations. Connect or invite a vendor in User Hub first.'
      );
    }

    const firstRadio = vendorModal.locator('table tbody input[type="radio"]').first();
    await firstRadio.waitFor({ state: 'visible', timeout: 60000 });
    await firstRadio.scrollIntoViewIfNeeded();

    try {
      await firstRadio.check({ timeout: 15000 });
    } catch {
      await firstRadio.click({ force: true });
    }
    await expect(firstRadio).toBeChecked({ timeout: 15000 });

    const addBtn = vendorModal.getByRole('button', { name: /^Add$/i }).last();
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await addBtn.click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.page
      .waitForLoadState('networkidle', { timeout: 45000 })
      .catch(() => {});

    await expect(this.page).toHaveURL(/purchase-order\/create/);

    await expect(
      this.page.getByRole('button', { name: /change vendor/i })
    ).toBeVisible({ timeout: 60000 });

    try {
      await expect(panelHeading).toBeHidden({ timeout: 30000 });
    } catch {
      /* Slide/off-canvas may still leave nodes in DOM; vendor add is confirmed by Change Vendor */
    }
  }

  async ensurePoLineItemsTableVisible() {
    const table = this.page.locator('[aria-label="PO line items table"]');
    await expect(table).toBeVisible({ timeout: this.defaultTimeout });
    await table.scrollIntoViewIfNeeded();
    return table;
  }

  async clickAddManuallyOnPurchaseOrderForm() {
    await this.ensurePoLineItemsTableVisible();
    const addManually = this.page
      .locator('span.pointer')
      .filter({ hasText: /add manually/i })
      .first();
    await addManually.waitFor({ state: 'visible', timeout: 90000 });
    await addManually.scrollIntoViewIfNeeded();
    await addManually.click({ force: true });
    await this.waitForNetworkSettled();
  }

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

    const unitSelect = dataRow.locator('td').nth(2).locator('.MuiSelect-select').first();
    await unitSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(`^${unitLabel}`, 'i') })
      .first()
      .click();

    const rateInput = dataRow.locator('td').nth(3).locator('input').first();
    await rateInput.fill(String(rate));
    await rateInput.blur();

    await this.waitForNetworkSettled();
  }

  async addLineItemManually(args) {
    await expect(this.page).toHaveURL(/purchase-order\/(create|edit)/);
    await this.clickAddManuallyOnPurchaseOrderForm();
    await this.fillLastPoLineItemRow(args);
  }

  async openActionMenuAndComposeEmail() {
    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.click();

    const compose = this.page.getByRole('menuitem', { name: /compose email/i });
    await expect(compose).toBeVisible({ timeout: this.defaultTimeout });
    await compose.click();

    const emailDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByText(/send email|subject|to/i) })
      .first();
    await expect(emailDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      emailDialog.getByRole('button', { name: /send email/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  async openActionMenuAndChooseUpdate() {
    const actionBtn = this.page.getByRole('button', { name: /^action$/i }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.click();
    const updateItem = this.page.getByRole('menuitem', { name: /^update$/i });
    await expect(updateItem).toBeVisible({ timeout: this.defaultTimeout });
    await updateItem.click();
    await this.waitForNetworkSettled();
  }

  async expectPurchaseOrderUpdatedSuccessToast() {
    const messageRe =
      /purchase order updated successfully|po updated successfully/i;
    const toastBody = this.page
      .locator('.Toastify__toast')
      .filter({ hasText: messageRe })
      .first();
    await expect(toastBody).toBeVisible({ timeout: this.defaultTimeout });
  }

  /**
   * React-Toastify: `role="alert"` is on `.Toastify__toast`, not `.Toastify__toast-body`.
   * `hasText` on `.Toastify__toast` still matches body copy (subtree).
   */
  locatorEmailSentSuccessToast() {
    const re =
      /email sent successfully|correo enviado|mail sent|reminder sent|sent successfully/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  locatorPoCreatedAndSentToast() {
    const re =
      /PO created[\s&.,-]*sent[\s\w&.,-]*successfully|PO created[\s&.,-]*sent[\s\w&.,-]*for approval/i;
    return this.page.locator('.Toastify__toast').filter({ hasText: re }).first();
  }

  /**
   * @param {{ prioritizeEmailSentToast?: boolean }} [options] - Reminder/list compose: assert toast before long networkidle so auto-dismiss cannot hide it.
   */
  async sendEmailFromComposeModal(options = {}) {
    const prioritizeEmailSentToast = !!options.prioritizeEmailSentToast;
    const emailDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: /send email/i }) })
      .first();
    await expect(emailDialog).toBeVisible({ timeout: this.defaultTimeout });
    const send = emailDialog.getByRole('button', { name: /send email/i });
    await expect(send).toBeEnabled({ timeout: this.defaultTimeout });
    await send.click();

    const emailSentToast = this.locatorEmailSentSuccessToast();
    const poCreatedSentToast = this.locatorPoCreatedAndSentToast();

    if (prioritizeEmailSentToast) {
      await expect(emailSentToast).toBeVisible({ timeout: 60000 });
      await this.page.waitForLoadState('domcontentloaded');
      await this.page
        .waitForLoadState('networkidle', { timeout: 25000 })
        .catch(() => {});
      await emailDialog.waitFor({ state: 'hidden', timeout: 90000 }).catch(() => {});
    } else {
      await this.waitForNetworkSettled();
      await Promise.race([
        emailDialog.waitFor({ state: 'hidden', timeout: 90000 }),
        emailSentToast.waitFor({ state: 'visible', timeout: 90000 }),
        poCreatedSentToast.waitFor({ state: 'visible', timeout: 90000 }),
      ]);
    }

    await this.dismissOpenMenusAndPopovers();

    const stillOpen = await emailDialog.isVisible().catch(() => false);
    if (stillOpen) {
      await emailDialog
        .waitFor({ state: 'hidden', timeout: 20000 })
        .catch(async () => {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
        });
    }
  }

  async dismissOpenMenusAndPopovers() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
  }

  /** Toast containers often sit above the list and steal clicks from the ⋮ button. */
  async dismissVisibleToastNotifications() {
    const closeSelectors =
      '.Toastify__toast .Toastify__close-button, .Toastify__close-button[aria-label], [class*="Toastify__close-button"]';
    for (let i = 0; i < 10; i++) {
      const btn = this.page.locator(closeSelectors).first();
      if (!(await btn.isVisible({ timeout: 400 }).catch(() => false))) {
        break;
      }
      await btn.click({ timeout: 3000 }).catch(() => {});
      await this.page.waitForTimeout(120);
    }
  }

  /** Visible compose-email dialog (MUI may keep hidden nodes in DOM). */
  visibleComposeEmailDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: /send email/i }) })
      .filter({ visible: true });
  }

  async waitForPurchaseOrderListReadyAfterComposeEmailSent() {
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    await expect(
      this.page.locator('.MuiModal-root').filter({ visible: true })
    )
      .toHaveCount(0, { timeout: 20000 })
      .catch(() => {});

    await this.page
      .locator('.MuiBackdrop-root')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'hidden', timeout: 25000 })
      .catch(() => {});

    for (let i = 0; i < 15; i++) {
      const count = await this.visibleComposeEmailDialog().count().catch(() => 0);
      if (count === 0) break;
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(220);
      if (i % 3 === 2) {
        await this.dismissOpenMenusAndPopovers();
      }
    }

    await expect(this.visibleComposeEmailDialog())
      .toHaveCount(0, { timeout: 20000 })
      .catch(() => {});

    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await this.firstPoCard().scrollIntoViewIfNeeded();
    await this.dismissVisibleToastNotifications();
    await this.dismissListSkeletons();
  }

  /**
   * ⋮ on a PO card — scoped to the card (`page.locator` in `has` is a common pitfall).
   */
  kebabButtonOnPoCard(card) {
    return card
      .locator('button:has(svg[data-testid="MoreVertIcon"])')
      .or(card.locator('button[aria-label*="more" i]'))
      .first();
  }

  async waitForPurchaseOrderListAfterCreateRedirect() {
    await this.page.waitForURL(/client\/profile/, {
      timeout: this.defaultTimeout,
    });
    await this.waitForNetworkSettled();
    await this.ensurePurchaseOrderListReady();
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: 90000,
    });
  }

  /** After Action → Update, app returns to client profile PO list (same URL pattern as create+send). */
  async waitForPurchaseOrderListAfterUpdateRedirect() {
    await this.waitForPurchaseOrderListAfterCreateRedirect();
  }

  async expectPoCreatedAndSentToast() {
    await expect(this.locatorPoCreatedAndSentToast()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  firstPoCard() {
    return this.page
      .locator('div.mt-3.mb-3')
      .filter({ has: this.page.getByText(/issued date|po no/i) })
      .first();
  }

  async clickKebabOnFirstPurchaseOrderCard() {
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    const card = this.firstPoCard();
    const kebab = this.kebabButtonOnPoCard(card);
    await kebab.scrollIntoViewIfNeeded();
    await kebab.click();
  }
}

module.exports = PurchaseOrderCreatePoPage;
