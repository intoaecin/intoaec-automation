const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');

class EstimatePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.createEstimateButton = page.locator(
      'button:has-text("Create Estimate"), [role="button"]:has-text("Create Estimate"), button:has-text("Create estimate"), [role="button"]:has-text("Create estimate"), button:has-text("Create New Estimate"), [role="button"]:has-text("Create New Estimate"), button:has-text("New Estimate"), [role="button"]:has-text("New Estimate")'
    ).first();
    this.startFromScratchButton = page.getByText(/Start from scratch/i).first();
    this.proceedButton = page.locator('button:has-text("Proceed"), [role="button"]:has-text("Proceed")').first();
    this.estimateTitleInput = page.locator('label:has-text("Estimate title")').locator('xpath=following::input[1]').first();
    this.createdOnInput = page.locator('label:has-text("Created on")').locator('xpath=following::input[1]').first();
    this.validTillInput = page.locator('label:has-text("Valid till")').locator('xpath=following::input[1]').first();
    this.addAnotherManualRowLink = page.locator('.pr-1.pointer.fw-600');
    this.addManuallyButton = page.getByText(/add\s+manually/i, { exact: false }).first();
    this.itemNameInput = page.locator('input[placeholder*="Item Name"], input[name*="itemName"]').first();
    this.descriptionInput = page.locator('textarea[placeholder*="Description"], textarea[name*="description"], input[placeholder*="Description"]').first();
    this.qtyInput = page.locator('input[placeholder="Qty"], input[name*="qty"]').first();
    this.unitInput = page.locator('input[placeholder*="Unit"], input[name*="unit"]').first();
    this.rateInput = page.locator('input[placeholder*="Rate"], input[name*="rate"]').first();
    this.profitInput = page.locator('input[placeholder*="Profit"], input[name*="profit"]').first();
    this.addItemButton = page.getByRole('button', { name: 'Add Item' });
    this.addFromLibraryButton = page.getByRole('button', { name: 'Add from Library' });
    this.offCanvas = page.locator('.offcanvas.show').first();
    this.offCanvasFirstCheckbox = page.locator('.offcanvas.show input[type="checkbox"]').first();
    this.offCanvasAddButton = page.locator('.offcanvas.show button:has-text("Add")').first();
    this.addChargeButton = page.getByRole('button', { name: 'Add Charge' });
    this.chargeNameInput = page.locator('input[placeholder*="Charge Name"], input[name*="chargeName"]').first();
    this.chargeValueInput = page.locator('input[placeholder*="Value"], input[name*="chargeValue"]').first();
    this.addDiscountButton = page.getByRole('button', { name: 'Add Discount' });
    this.addTaxButton = page.getByRole('button', { name: 'Add Tax' });
    this.roundOffCheckbox = page.locator('label:has-text("Round Off"), input[name*="roundOff"]').first();
    this.chooseTemplateButton = page.getByRole('button', { name: 'Choose from template' });
    this.digitalSignatureCheckbox = page.locator('label:has-text("Digital Signature"), input[name*="signature"]').first();
    this.manageColumnButton = page.getByRole('button', { name: 'Manage Column' });
    this.columnNameInput = page.locator('input[placeholder*="Column Name"], input[name*="columnName"]').first();
    this.columnTypeSelect = page.locator('select[name*="type"]').first();
    this.applyButton = page.getByRole('button', { name: 'Apply' });
    this.actionButton = page.getByRole('button', { name: 'Action' });
    this.composeEmailButton = page.getByRole('button', { name: 'Compose Email' });
    this.sendEmailButton = page.getByRole('button', { name: 'Send Email' });
    this.emailDialog = page.locator('[role="dialog"], .modal.show, .offcanvas.show').first();
    this.recipientInput = page.locator('input[placeholder*="To"], input[name*="recipient"], input[name*="email"]').first();
    this.validationMessage = page.locator('[role="alert"], .toast-message, .ant-message-notice-content, .invalid-feedback').first();
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle', { timeout: this.defaultTimeout });
  }

  async clickCreateEstimate() {
    await expect(this.createEstimateButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.createEstimateButton.click();
    await this.waitForNetworkIdle();
  }

  async startFromScratchAndProceed() {
    await expect(this.startFromScratchButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.startFromScratchButton.click();
    await expect(this.proceedButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.proceedButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.proceedButton.click();
    await this.waitForNetworkIdle();
    await this.page.waitForTimeout(3000);
  }

  formatDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async fillEstimateTitleOnly(title) {
    await expect(this.estimateTitleInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.estimateTitleInput.fill(title);
  }

  async fillMandatoryDetails({ title, createdOffset = 0, validOffset = 7 }) {
    if (title !== undefined) {
      await expect(this.estimateTitleInput).toBeVisible({ timeout: this.defaultTimeout });
      await this.estimateTitleInput.fill(title);
    }

    await expect(this.createdOnInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.createdOnInput.fill(this.formatDate(createdOffset));

    await expect(this.validTillInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.validTillInput.fill(this.formatDate(validOffset));
  }

  sectionNameFieldLocator() {
    return this.page
      .getByPlaceholder(/add section name/i)
      .or(this.page.locator('input[placeholder*="Add section name"]'))
      .or(this.page.locator('input[placeholder*="add section name"]'))
      .or(this.page.locator('input[placeholder*="Section Name"]'))
      .or(this.page.locator('textarea[placeholder*="section"], textarea[placeholder*="Section"]'))
      .or(this.page.getByRole('textbox', { name: /add section name|section name/i }))
      .or(this.page.locator('#estimate-sectionName-0, #estimate-sectionName-0-0, input[id*="sectionName"]'))
      .first();
  }

  async addSection(name) {
    await this.page.locator('main, [role="main"], .main-content, .page-content').first().scrollIntoViewIfNeeded().catch(() => {});
    await this.page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });
    await this.page.waitForTimeout(500);

    let sectionInput = this.sectionNameFieldLocator();
    if (!(await sectionInput.isVisible({ timeout: 10000 }).catch(() => false))) {
      const addSectionCtl = this.page
        .locator('button, a, [role="button"], span.pointer')
        .filter({ hasText: /Add\s+Section/i })
        .first();
      if (await addSectionCtl.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addSectionCtl.scrollIntoViewIfNeeded();
        await addSectionCtl.click();
        await this.page.waitForTimeout(500);
      }
      sectionInput = this.sectionNameFieldLocator();
    }

    await sectionInput.scrollIntoViewIfNeeded();
    await expect(sectionInput).toBeVisible({ timeout: this.defaultTimeout });
    await sectionInput.click();
    await sectionInput.fill(name);
    await this.page.keyboard.press('Tab').catch(() => {});
    await this.page.waitForTimeout(600);
  }

  itemNameFieldForRow(manualIndex) {
    return this.page.locator(`#estimate-itemName-0-${manualIndex}`);
  }

  rowForManualIndex(manualIndex) {
    return this.itemNameFieldForRow(manualIndex).locator('xpath=ancestor::tr[1]');
  }

  async addManualItem(item, { manualIndex = 0 } = {}) {
    if (manualIndex > 0) {
      await expect(this.addAnotherManualRowLink.first()).toBeVisible({ timeout: this.defaultTimeout });
      await this.addAnotherManualRowLink.first().click();
      await this.page.waitForTimeout(500);
    }

    const itemNameField = this.itemNameFieldForRow(manualIndex);
    await expect(itemNameField).toBeVisible({ timeout: this.defaultTimeout });
    await itemNameField.click();

    if (item.name !== undefined) {
      await itemNameField.fill(item.name);
    }

    const row = this.rowForManualIndex(manualIndex);
    const descriptionInput = row.locator('textarea[placeholder*="Description"], input[placeholder*="Description"]').first();
    const qtyInput = row.locator('input[placeholder="Qty"], input[placeholder*="Qty"], input[name*="qty"]').first();
    const unitInput = row.locator('input[placeholder*="Unit"], input[name*="unit"]').first();
    const rateInput = row.locator('input[placeholder*="Rate"], input[name*="rate"]').first();
    const profitInput = row.locator('input[placeholder*="Profit"], input[name*="profit"]').first();

    await expect(descriptionInput).toBeVisible({ timeout: this.defaultTimeout });
    await descriptionInput.fill(item.description || 'test description');
    await expect(qtyInput).toBeVisible({ timeout: this.defaultTimeout });
    await qtyInput.fill(String(item.qty || 1));
    await expect(unitInput).toBeVisible({ timeout: this.defaultTimeout });
    await unitInput.fill(item.unit || 'Nos');
    await expect(rateInput).toBeVisible({ timeout: this.defaultTimeout });
    await rateInput.fill(String(item.rate || 100));
    await expect(profitInput).toBeVisible({ timeout: this.defaultTimeout });
    await profitInput.fill(String(item.profit || 10));
    await this.waitForNetworkIdle();
  }

  async addFromLibraryFirstItem() {
    await expect(this.addFromLibraryButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addFromLibraryButton.click();
    await expect(this.offCanvas).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.offCanvasFirstCheckbox).toBeVisible({ timeout: this.defaultTimeout });
    await this.offCanvasFirstCheckbox.click();
    await expect(this.offCanvasAddButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.offCanvasAddButton.click();
    await this.waitForNetworkIdle();
  }

  async addFromLibraryWithoutSelection() {
    await expect(this.addFromLibraryButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addFromLibraryButton.click();
    await expect(this.offCanvas).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.offCanvasAddButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.offCanvasAddButton.click();
  }

  async addCharge(name, value) {
    await expect(this.addChargeButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addChargeButton.click();
    await expect(this.chargeNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.chargeNameInput.fill(name);
    await expect(this.chargeValueInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.chargeValueInput.fill(String(value));
  }

  async switchChargeType(type, value) {
    const chargeTypeButton = this.page.getByText(type, { exact: false }).first();
    await expect(chargeTypeButton).toBeVisible({ timeout: this.defaultTimeout });
    await chargeTypeButton.click();
    await expect(this.chargeValueInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.chargeValueInput.fill(String(value));
  }

  async addDiscountFirstOption() {
    await expect(this.addDiscountButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addDiscountButton.click();
    const firstRadio = this.page.locator('input[type="radio"]').first();
    await expect(firstRadio).toBeVisible({ timeout: this.defaultTimeout });
    await firstRadio.click();
    await this.page.getByRole('button', { name: 'Add' }).click();
  }

  async addTaxFirstOption() {
    await expect(this.addTaxButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addTaxButton.click();
    const firstCheckbox = this.page.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: this.defaultTimeout });
    await firstCheckbox.click();
    await this.page.getByRole('button', { name: 'Add' }).click();
  }

  async enableRoundOff() {
    await expect(this.roundOffCheckbox).toBeVisible({ timeout: this.defaultTimeout });
    await this.roundOffCheckbox.click();
  }

  async addTermsFromTemplate() {
    await expect(this.chooseTemplateButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.chooseTemplateButton.click();
    const firstRadio = this.page.locator('input[type="radio"]').first();
    await expect(firstRadio).toBeVisible({ timeout: this.defaultTimeout });
    await firstRadio.click();
    await this.page.getByRole('button', { name: 'Add' }).click();
  }

  async enableDigitalSignature() {
    await expect(this.digitalSignatureCheckbox).toBeVisible({ timeout: this.defaultTimeout });
    await this.digitalSignatureCheckbox.click();
  }

  async addCustomColumn(name, type) {
    await expect(this.manageColumnButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.manageColumnButton.click();
    await expect(this.columnNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.columnNameInput.fill(name);
    await expect(this.columnTypeSelect).toBeVisible({ timeout: this.defaultTimeout });
    await this.columnTypeSelect.selectOption({ label: type });
    await this.page.getByRole('button', { name: 'Add' }).click();
    await expect(this.applyButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.applyButton.click();
    await this.waitForNetworkIdle();
  }

  async composeAndSendEmail() {
    await expect(this.actionButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.actionButton.click();
    await expect(this.composeEmailButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.composeEmailButton.click();
    await expect(this.emailDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.sendEmailButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.sendEmailButton.click();
    await this.waitForNetworkIdle();
  }

  async openComposeEmail() {
    await expect(this.actionButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.actionButton.click();
    await expect(this.composeEmailButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.composeEmailButton.click();
    await expect(this.emailDialog).toBeVisible({ timeout: this.defaultTimeout });
  }

  async clearRecipientField() {
    await expect(this.recipientInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.recipientInput.fill('');
  }

  async sendEmailFromPopup() {
    await expect(this.sendEmailButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.sendEmailButton.click();
    await this.waitForNetworkIdle();
  }

  async attemptSendEstimateEmail() {
    await this.composeAndSendEmail();
  }

  async removeLastItem() {
    const removeButtons = this.page.locator('button:has-text("Remove"), button:has-text("Delete"), [aria-label*="delete"]');
    const count = await removeButtons.count();
    if (count > 0) {
      await removeButtons.nth(count - 1).click();
      await this.waitForNetworkIdle();
    }
  }

  async addManualItems(count) {
    for (let i = 0; i < count; i += 1) {
      await this.addManualItem(
        {
          name: `bulk-item-${i + 1}`,
          description: 'test description',
          qty: 1,
          unit: 'Nos',
          rate: 100,
          profit: 10
        },
        { manualIndex: i }
      );
    }
  }

  async waitForModuleToLoad() {
    await expect(this.createEstimateButton).toBeVisible({ timeout: 110000 });
  }

  async waitForFormSlowHandling() {
    await this.waitForNetworkIdle();
    await expect(this.estimateTitleInput).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectValidationMessageVisible() {
    await expect(this.validationMessage).toBeVisible({ timeout: this.defaultTimeout });
  }

  async isToastVisible(message) {
    const toast = this.page.locator(`text=${message}`).first();
    await expect(toast).toBeVisible({ timeout: this.defaultTimeout });
    await expect(toast).toHaveText(new RegExp(message));
  }

  async expectChargeValueVisible() {
    await expect(this.chargeValueInput).toBeVisible({ timeout: this.defaultTimeout });
  }

  async getItemCount() {
    return this.page.locator('tbody tr').count();
  }

  async expectSectionVisible(name) {
    const section = this.page.getByText(name, { exact: false }).first();
    await expect(section).toBeVisible({ timeout: this.defaultTimeout });
  }

  async isColumnPresent(name) {
    const header = this.page.locator(`th:has-text("${name}")`).first();
    await expect(header).toBeVisible({ timeout: this.defaultTimeout });
  }

  async getDuplicateCount(name) {
    return this.page.locator(`tr:has-text("${name}")`).count();
  }
}

module.exports = EstimatePage;
