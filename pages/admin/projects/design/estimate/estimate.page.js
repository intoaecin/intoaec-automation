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
    this.estimateTitleInput = page.getByLabel(/Estimate title/i);
    this.createdOnInput = page.getByLabel(/Created on/i);
    this.validTillInput = page.getByLabel(/Valid till/i);
    this.addSectionButton = page.getByRole('button', { name: 'Add Section' });
    this.sectionNameInput = page.locator('input[placeholder*="Section Name"], input[name*="section"]').first();
    this.addManuallyButton = page.getByRole('button', { name: 'Add manually' });
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
  }

  formatDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

  async addSection(name) {
    await expect(this.addSectionButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addSectionButton.click();
    await expect(this.sectionNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.sectionNameInput.fill(name);
    await this.page.getByRole('button', { name: 'Add' }).click();
    await this.waitForNetworkIdle();
  }

  async addManualItem(item) {
    await expect(this.addManuallyButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addManuallyButton.click();

    if (item.name !== undefined) {
      await expect(this.itemNameInput).toBeVisible({ timeout: this.defaultTimeout });
      await this.itemNameInput.fill(item.name);
    }

    await expect(this.descriptionInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.descriptionInput.fill(item.description || 'test description');
    await expect(this.qtyInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.qtyInput.fill(String(item.qty || 1));
    await expect(this.unitInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.unitInput.fill(item.unit || 'Nos');
    await expect(this.rateInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.rateInput.fill(String(item.rate || 100));
    await expect(this.profitInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.profitInput.fill(String(item.profit || 10));
    await expect(this.addItemButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addItemButton.click();
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
      await this.addManualItem({
        name: `bulk-item-${i + 1}`,
        description: 'test description',
        qty: 1,
        unit: 'Nos',
        rate: 100,
        profit: 10
      });
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
