const fs = require('fs');
const path = require('path');
const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');
const ProjectNavigationPage = require('../../../ProjectNavigationPage');
const ProjectProfilePage = require('../../../ProjectProfilePage');

class PurchaseOrderCreatePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded', {
      timeout: this.defaultTimeout,
    });
    await this.page.waitForLoadState('networkidle', {
      timeout: this.defaultTimeout,
    }).catch(() => {});
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
    const poTab = this.page.getByRole('tab', { name: /purchase order/i });
    if (await poTab.isVisible({ timeout: 8000 }).catch(() => false)) {
      await poTab.click();
      await this.waitForNetworkSettled();
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
        { timeout: this.defaultTimeout }
      )
      .catch(() => {});
  }

  async openCreatePurchaseOrderStartDialog() {
    await expect(
      this.page.getByRole('button', { name: /create purchase order/i })
    ).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.getByRole('button', { name: /create purchase order/i }).click();
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 30000 });
    await expect(this.page.getByText(/get started/i)).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async startFromScratchAndProceed() {
    await this.page.getByText(/^Start From Scratch$/i).click();
    const proceed = this.page
      .getByRole('dialog')
      .getByRole('button', { name: /^proceed$/i });
    await expect(proceed).toBeEnabled({ timeout: 30000 });
    await proceed.click();
    await this.page.waitForURL(/purchase-order\/create/, {
      timeout: this.defaultTimeout,
    });
    await this.waitForNetworkSettled();
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

  /**
   * Title only. Issued date is defaulted by the app (CreatePOTitle); avoid DatePicker automation (flaky / hidden inputs).
   */
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

  async addLineItemManually({ itemName, description, quantity, unitLabel, rate }) {
    await expect(this.page).toHaveURL(/purchase-order\/create/);

    const changeVendorBtn = this.page.getByRole('button', {
      name: /change vendor/i,
    });
    await expect(changeVendorBtn).toBeVisible({ timeout: 30000 });
    await changeVendorBtn.scrollIntoViewIfNeeded();

    const addManually = this.page.locator('span').filter({ hasText: /add manually/i }).first();
    await addManually.waitFor({ state: 'visible', timeout: 60000 });
    await addManually.scrollIntoViewIfNeeded();
    await addManually.click({ force: true });

    const table = this.page.locator('[aria-label="PO line items table"]');
    await expect(table).toBeVisible({ timeout: this.defaultTimeout });
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

  async sendEmailFromComposeModal() {
    const emailDialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('button', { name: /send email/i }) })
      .first();
    await expect(emailDialog).toBeVisible({ timeout: this.defaultTimeout });
    const send = emailDialog.getByRole('button', { name: /send email/i });
    await expect(send).toBeEnabled({ timeout: this.defaultTimeout });
    await send.click();
    await this.waitForNetworkSettled();
  }

  async expectPoCreatedAndSentToast() {
    const messageRe =
      /PO created[\s&.,-]*sent[\s\w&.,-]*successfully/i;

    const toastBody = this.page
      .locator('.Toastify__toast-body[role="alert"]')
      .filter({ hasText: messageRe })
      .first();

    await expect(toastBody).toBeVisible({ timeout: this.defaultTimeout });

    const screenshotDir = path.join(
      process.cwd(),
      'screenshots',
      'purchase-order',
      'create-po'
    );
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(
      screenshotDir,
      'po-created-sent-success.png'
    );

    const toastByXpath = this.page
      .locator('xpath=/html/body/div[1]/div/div[3]/div/div')
      .first();
    if (await toastByXpath.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toastByXpath.screenshot({ path: screenshotPath });
    } else {
      const toastCard = this.page
        .locator('div.Toastify__toast--success')
        .filter({ has: toastBody })
        .first();
      if (await toastCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await toastCard.screenshot({ path: screenshotPath });
      } else {
        await toastBody.screenshot({ path: screenshotPath });
      }
    }
  }
}

module.exports = PurchaseOrderCreatePage;
