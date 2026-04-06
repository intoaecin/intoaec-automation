const BasePage = require('../../../../BasePage');
const { expect } = require('@playwright/test');

class EstimatePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.createEstimateButton = page.getByRole('button', { name: /create estimate/i }).first();
    this.startFromScratchButton = page.getByText(/start from scratch/i).first();
    this.proceedButton = page.getByRole('button', { name: /proceed/i }).first();
    this.estimateTitleInput = page.getByRole('textbox', { name: /interior project estimate|estimate title/i }).first();
    this.createdOnInput = page.locator('label:has-text("Created on")').locator('xpath=following::input[1]').first();
    this.validTillInput = page.locator('label:has-text("Valid till")').locator('xpath=following::input[1]').first();
    this.addSectionButton = page.locator('.MuiBox-root.css-zir2wb').first();
    this.sectionNameInput = page.locator('.MuiFormControl-root.MuiTextField-root.css-1nf09ib input').first();
    this.addAnotherManualRowLink = page.locator('.pr-1.pointer.fw-600').first();
    this.addManuallyButton = page.locator('.pr-1.pointer.fw-600').first();
    this.itemNameInput = page.locator('.MuiFormControl-root.MuiTextField-root.css-utsrz3 input').first();
    this.descriptionInput = page.locator('textarea[placeholder*="Description"], textarea[name*="description"], input[placeholder*="Description"]').first();
    this.qtyInput = page.locator('input[placeholder="Qty"], input[name*="qty"]').first();
    this.unitInput = page.locator('input[placeholder*="Unit"], input[name*="unit"]').first();
    this.rateInput = page.locator('input[placeholder*="Rate"], input[name*="rate"]').first();
    this.profitInput = page.locator('input[placeholder*="Profit"], input[name*="profit"]').first();
    this.addItemButton = page.getByRole('button', { name: 'Add Item' });
    this.addFromLibraryButton = page.getByText(/add from library/i).first();
    this.offCanvas = page.locator('.offcanvas.show').first();
    this.offCanvasFirstCheckbox = page.locator('.offcanvas.show input[type="checkbox"]').first();
    this.offCanvasAddButton = page.locator('.offcanvas.show button:has-text("Add")').first();
    this.chargeNameInput = page.getByRole('textbox', { name: /charge name/i }).first();
    this.chargeValueInput = page.getByRole('textbox', { name: /enter value|value/i }).first();
    this.addDiscountButton = page.getByText(/\+\s*add discount/i).first();
    this.addTaxButton = page.getByText(/\+\s*add tax/i).first();
    this.roundOffCheckbox = page.getByRole('checkbox', { name: /round up/i }).first();
    this.chooseTemplateButton = page.getByRole('button', { name: /choose from template/i }).first();
    this.digitalSignatureCheckbox = page.getByRole('checkbox', { name: /show digital signature on/i }).first();
    this.manageColumnButton = page.getByRole('button', { name: /manage columns?/i }).first();
    this.columnNameInput = page.getByRole('textbox', { name: /new column name/i }).first();
    this.columnTypeSelect = page.getByText(/^text$/i).first();
    this.applyButton = page.getByRole('button', { name: 'Apply' });
    this.actionButton = page.getByRole('button', { name: 'Action' });
    this.composeEmailButton = page.getByText(/compose email/i).first();
    this.sendEmailButton = page.getByRole('button', { name: /send email/i }).first();
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

  async addSection(name) {
    await this.addSectionButton.scrollIntoViewIfNeeded();
    await expect(this.addSectionButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addSectionButton.dblclick();
    await expect(this.sectionNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.sectionNameInput.fill(name);
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
    // 1. Click "Add Manually" if we are adding a second item
    if (manualIndex > 0) {
      const addManuallyBtn = this.page.getByText('Add Manually', { exact: false }).first();
      await expect(addManuallyBtn).toBeVisible({ timeout: this.defaultTimeout });
      await addManuallyBtn.click();
      await this.page.waitForTimeout(1000);
    }

    // 2. Locate the parent div
    const itemNameContainer = this.page.locator(`#estimate-itemName-0-${manualIndex}`);

    // 3. Double click "Add Item name"
    const addItemText = itemNameContainer.getByText('Add Item name', { exact: false }).first();
    await expect(addItemText).toBeVisible({ timeout: this.defaultTimeout });
    await addItemText.dblclick();

    // 4. Type the Name
    const itemNameInput = itemNameContainer.locator('input').first();
    await expect(itemNameInput).toBeVisible({ timeout: this.defaultTimeout });

    if (item.name !== undefined) {
      await itemNameInput.fill(item.name);
      // Pressing 'Enter' is safer than 'Tab' to lock in Material UI table values
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(800);
    }

    // --- 🚨 OPTION 2: THE MODAL SAFETY NET 🚨 ---
    // If the Description dialog opens accidentally, this catches it and clicks "Close"
    const dialogBox = this.page.locator('[role="dialog"]').first();
    if (await dialogBox.isVisible({ timeout: 1500 }).catch(() => false)) {
      // Look for the Close button inside the specific MuiDialogActions div you mentioned
      const closeBtn = dialogBox
        .locator('.MuiDialogActions-root button')
        .filter({ hasText: 'Close' })
        .first();

      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
        await this.page.waitForTimeout(500); // Wait for the animation to close
      } else {
        // Ultimate fallback: Just hit the Escape key to close the modal
        await this.page.keyboard.press('Escape');
      }
    }
    // --------------------------------------------

    const row = itemNameContainer.locator('xpath=ancestor::tr[1]');

    // (OPTION 1: I completely removed the code that intentionally clicked the description)

    // 5. Handle Grid Cells safely (Qty, Unit, Rate)
    const fillGridCell = async (placeholder, value) => {
      const input = row
        .locator(`input[placeholder*="${placeholder}"], input[name*="${placeholder.toLowerCase()}"]`)
        .first();
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.fill(String(value));
        await this.page.keyboard.press('Tab');
      }
    };

    await fillGridCell('Qty', item.qty);
    await fillGridCell('Unit', item.unit);
    await fillGridCell('Rate', item.rate);
    await fillGridCell('Profit', item.profit);

    await this.waitForNetworkIdle();
  }

  async addFromLibraryFirstItem() {
    // 1. Click "Add from library"
    const addFromLibBtn = this.page.getByText('Add from library', { exact: false }).first();
    await expect(addFromLibBtn).toBeVisible({ timeout: this.defaultTimeout });
    await addFromLibBtn.click();

    // Wait a moment for the Library Modal and Table data to fully load
    await this.page.waitForTimeout(2000);

    // 2. Find the very first row inside the Table Body (ignoring the header)
    const firstRow = this.page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });

    // 3. Locate the checkbox input, but grab its parent element (..) to click the visible box!
    const visibleCheckbox = firstRow.locator('input.PrivateSwitchBase-input[type="checkbox"]').locator('..');
    await visibleCheckbox.click();

    // Wait half a second for the UI to register the click and enable the Add button
    await this.page.waitForTimeout(500);

    // 4. Find the "Add" button using your exact locator
    const libraryAddBtn = this.page.locator('.pl-2.MuiBox-root button').filter({ hasText: /^Add$/i }).first();

    // SMART CHECK: Explicitly wait for it to be ENABLED before trying to click
    await expect(libraryAddBtn).toBeEnabled({ timeout: 5000 });
    await libraryAddBtn.click();

    // Wait for the popup to close and the item to be added to the grid
    await this.page.waitForTimeout(1000);
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
    const firstRadio = this.page.getByRole('radio').first();
    await expect(firstRadio).toBeVisible({ timeout: this.defaultTimeout });
    await firstRadio.click();
    await this.page.getByRole('button', { name: 'Add' }).click();
  }

  async addTaxFirstOption() {
    await expect(this.addTaxButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addTaxButton.click();
    const firstCheckbox = this.page.locator('[role="dialog"], .modal.show, .offcanvas.show').last().getByRole('checkbox').first();
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
    await this.columnTypeSelect.click();
    await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click();
    await this.page.getByRole('button', { name: 'Add' }).click();
    await expect(this.applyButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.applyButton.click();
    await this.waitForNetworkIdle();
  }

  async composeAndSendEmail() {
    const actionBtn = this.page.getByRole('button', { name: 'Action', exact: true }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await actionBtn.click();

    const composeMenuItem = this.page.getByRole('menuitem', { name: /compose email/i }).first();
    await expect(composeMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await composeMenuItem.click();

    // Compose popup takes time to render; wait for the Send button to be ready.
    const sendBtn = this.page.getByRole('button', { name: 'Send Email' }).first();
    await expect(sendBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(sendBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await sendBtn.click();

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
    const needle = message.trim();

    // Toastify often animates in/out; Playwright "visible" can be flaky. Poll DOM text instead.
    await expect
      .poll(
        async () =>
          this.page.evaluate((n) => {
            const want = n.toLowerCase();
            const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

            const candidates = document.querySelectorAll(
              '.Toastify, #react-toastify, [class*="Toastify__toast-container"], [class*="Toastify__toast-body"], .Toastify__toast'
            );
            for (const el of candidates) {
              if (collapse(el.textContent).includes(want)) return true;
            }
            return collapse(document.body.innerText).includes(want);
          }, needle),
        { timeout: this.defaultTimeout, intervals: [200, 400, 800, 1500] }
      )
      .toBeTruthy();

    // Optional: wait until the toast text is gone (auto-dismiss), without failing the step
    await expect
      .poll(
        async () =>
          this.page.evaluate((n) => {
            const want = n.toLowerCase();
            const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const roots = document.querySelectorAll('.Toastify, #react-toastify');
            for (const el of roots) {
              if (collapse(el.textContent).includes(want)) return false;
            }
            return true;
          }, needle),
        { timeout: 20000, intervals: [500, 1000] }
      )
      .toBeTruthy()
      .catch(() => {});
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
