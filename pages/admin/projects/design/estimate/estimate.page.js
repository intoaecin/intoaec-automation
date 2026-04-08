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
    this.actionButton = page.getByRole('button', { name: 'Action', exact: true }).first();
    this.composeEmailButton = page.getByText(/compose email/i).first();
    this.sendEmailButton = page.getByRole('button', { name: /send email/i }).first();
    this.emailDialog = page.locator('[role="dialog"], .modal.show, .offcanvas.show').first();
    this.recipientInput = page.locator('input[placeholder*="To"], input[name*="recipient"], input[name*="email"]').first();
    this.validationMessage = page.locator('[role="alert"], .toast-message, .ant-message-notice-content, .invalid-feedback').first();
    // Default section title before rename (match anywhere visible; RBD subtree alone is unreliable in some builds).
    this.addSectionNamePlaceholders = page.getByText(/add section name/i);
    this.itemDroppableSections = page.locator('[data-rbd-droppable-id^="ITEMS/"]');

    // Draft-related locators
    this.saveAsDraftMenuItem = page.getByRole('menuitem', { name: /save as draft/i }).first();
    this.draftTab = page.getByRole('tab', { name: 'Draft', exact: true }).first();
    this.draftRowOptionsButton = page.locator('[id^="demo-customized-button"]').first();
    this.editMenuItem = page.getByRole('menuitem', { name: 'Edit', exact: true }).first();
    // Provided locator: getByRole('button').filter({ hasText: /^$/ }).nth(4)
    this.editPreviewButton = page.getByRole('button').filter({ hasText: /^$/ }).nth(4);
    this.backToEditBoqLink = page.getByText('Boq', { exact: true }).first();
    this.closePreviewButton = page.getByRole('button').first();

    // Start-from-template locators
    this.startFromTemplateCard = page
      .locator('div')
      .filter({ hasText: /^Start from templateStart building your estimation with our template$/ })
      .first();
    this.categoryCombo = page.getByRole('combobox').first();
    this.subCategoryCombo = page.getByRole('combobox').nth(1);
    // Template dropdown in the recorded flow had an empty label
    this.templateCombo = page.getByLabel('', { exact: true }).first();
    this.yesButton = page.getByRole('button', { name: 'Yes', exact: true }).first();
    this.estimateMainTab = page.getByRole('main').getByText('Estimate', { exact: true }).first();
    this.saveAsDraftContinueButton = page.getByRole('button', { name: 'Save as draft & Continue', exact: true }).first();

    // Section name placeholders: per DOM, a div with title="Add section name"
    this.addSectionNameTitles = page.getByTitle('Add section name');
  }

  randomLetters(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let out = '';
    for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  randomDigits(len) {
    const chars = '0123456789';
    let out = '';
    for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  async waitForNetworkIdle() {
    if (this.page.isClosed()) return;
    await this.page.waitForLoadState('networkidle', { timeout: this.defaultTimeout });
  }

  async clickCreateEstimate() {
    await expect(this.createEstimateButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.createEstimateButton.click();
    // Network can stay "busy" on dashboards; wait for the next UI state instead.
    await expect(this.startFromScratchButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  async startFromScratchAndProceed() {
    await expect(this.startFromScratchButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.startFromScratchButton.click();
    await expect(this.proceedButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.proceedButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.proceedButton.click();
    // Post-proceed, the form can be heavy and network may never fully go idle; use the repo's slow-load helper.
    await this.waitForFormSlowHandling();
  }

  async startFromTemplateAndProceed() {
    await expect(this.startFromTemplateCard).toBeVisible({ timeout: this.defaultTimeout });
    await this.startFromTemplateCard.click();
    await expect(this.proceedButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.proceedButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.proceedButton.click();
  }

  async selectTemplateFromPopup({ category, subCategory, template }) {
    await expect(this.categoryCombo).toBeVisible({ timeout: this.defaultTimeout });
    await this.categoryCombo.click();
    await this.page.getByRole('option', { name: category, exact: true }).click();

    await expect(this.subCategoryCombo).toBeVisible({ timeout: this.defaultTimeout });
    await this.subCategoryCombo.click();
    await this.page.getByRole('option', { name: subCategory }).click();

    await expect(this.templateCombo).toBeVisible({ timeout: this.defaultTimeout });
    await this.templateCombo.click();
    await this.page.getByRole('option', { name: template }).click();
  }

  async confirmTemplateSelectionYes() {
    await expect(this.yesButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.yesButton.click();
    await this.waitForFormSlowHandling();
  }

  async goBackToEstimateMainTab() {
    await expect(this.estimateMainTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.estimateMainTab.click();
    await this.page.waitForTimeout(800);
  }

  async clickSaveAsDraftContinue() {
    await expect(this.saveAsDraftContinueButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveAsDraftContinueButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.saveAsDraftContinueButton.click();
    // This screen often keeps background requests open; avoid waiting for full network idle.
    await this.page.waitForTimeout(1200);
    await expect(this.draftTab).toBeVisible({ timeout: this.defaultTimeout });
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

  async pickRandomCreatedOnAndValidTillFromCalendar() {
    const pickDay = async (labelText, day) => {
      const label = this.page.locator(`label:has-text("${labelText}")`).first();
      await expect(label).toBeVisible({ timeout: this.defaultTimeout });

      const container = label.locator('xpath=ancestor::div[1]');
      const btn = container.getByRole('button', { name: /choose date/i }).first();
      await expect(btn).toBeVisible({ timeout: this.defaultTimeout });
      await btn.click();

      const dayCell = this.page.getByRole('gridcell', { name: String(day), exact: true });
      await expect(dayCell).toBeVisible({ timeout: this.defaultTimeout });
      await dayCell.click();
      await this.page.waitForTimeout(400);
    };

    const createdDay = 1 + Math.floor(Math.random() * 20); // keep it low so validTill can be >= easily
    await pickDay('Created on', createdDay);

    // Valid till in UI is typically next month (as per screenshots), so any 1..28 is after created.
    // If it happens to be same month, we still keep it >= createdDay.
    let validDay = 1 + Math.floor(Math.random() * 28);
    if (validDay < createdDay) validDay = Math.min(createdDay + 1, 28);
    await pickDay('Valid till', validDay);
  }

  async fillSecondSectionItemAndMaterialCostsRandom() {
    const sectionIndex = 1;
    const manualIndex = 0;

    const itemNameContainer = this.itemNameFieldForSectionRow(sectionIndex, manualIndex);
    await expect(itemNameContainer).toBeVisible({ timeout: this.defaultTimeout });
    const itemRow = itemNameContainer.locator('xpath=ancestor::tr[1]');
    await expect(itemRow).toBeVisible({ timeout: this.defaultTimeout });

    const td = itemRow.locator('td');

    const fillSpinFromCell = async (cell, value) => {
      await cell.scrollIntoViewIfNeeded().catch(() => {});
      await cell.click({ force: true });
      // Some MUI grids render an editor without a standard input/role. Type into the focused editor.
      const txt = String(value);
      await this.page.keyboard.press('Control+A').catch(() => {});
      await this.page.keyboard.type(txt, { delay: 20 });
      await this.page.keyboard.press('Enter').catch(() => this.page.keyboard.press('Tab'));
      await this.page.waitForTimeout(400);
    };

    // Qty (1..5) usually in 3rd column.
    const qty = 1 + Math.floor(Math.random() * 5);
    await fillSpinFromCell(td.nth(2), qty);

    // Unit dropdown (3rd/4th column depending on UI)
    const unitCell = td.nth(3);
    await unitCell.dblclick({ force: true }).catch(() => unitCell.click({ force: true }));
    const options = this.page.getByRole('option');
    if (await options.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const optCount = await options.count().catch(() => 0);
      const pick = optCount > 0 ? Math.floor(Math.random() * optCount) : 0;
      await options.nth(pick).click();
      await this.page.waitForTimeout(300);
    } else {
      // fallback: pick "in" if present
      await this.page.getByRole('option', { name: 'in', exact: true }).click().catch(() => {});
      await this.page.waitForTimeout(300);
    }

    // Rate/Unit (3-digit)
    const rate = 100 + Math.floor(Math.random() * 900);
    await fillSpinFromCell(td.nth(4), rate);

    // Profit % (5..30)
    const profit = 5 + Math.floor(Math.random() * 26);
    await fillSpinFromCell(td.nth(5), profit);

    // Open item actions menu and click "Add Materials"
    const actionsBtnInRow = itemRow.getByRole('button', { name: /item-actions/i }).first();
    if (await actionsBtnInRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await actionsBtnInRow.click({ timeout: 20000 });
    } else {
      // Fallback to the recorded approach: nth(1)
      await this.page.getByRole('button', { name: 'item-actions' }).nth(1).click({ timeout: 20000 });
    }
    const addMaterials = this.page.locator('li').filter({ hasText: 'Add Materials' }).first();
    await expect(addMaterials).toBeVisible({ timeout: 15000 });
    await addMaterials.click();
    await this.page.waitForTimeout(800);

    // Material row wrapper id (per user): estimate-materialName-wrapper-1-0-0
    const materialWrapper = this.page.locator('#estimate-materialName-wrapper-1-0-0');
    await expect(materialWrapper).toBeVisible({ timeout: this.defaultTimeout });
    const materialRow = materialWrapper.locator('xpath=ancestor::tr[1]');
    await expect(materialRow).toBeVisible({ timeout: this.defaultTimeout });

    // Material name
    const matNameCell = materialWrapper.getByText(/add material name/i).first();
    if (await matNameCell.isVisible().catch(() => false)) {
      await matNameCell.dblclick();
      const input = materialWrapper.locator('input, textarea').first();
      await expect(input).toBeVisible({ timeout: 15000 });
      await input.fill(this.randomLetters(4));
      await this.page.keyboard.press('Enter').catch(() => this.page.keyboard.press('Tab'));
    }

    // Material description
    const matDescCell = materialWrapper.getByText(/add description/i).first();
    if (await matDescCell.isVisible().catch(() => false)) {
      await matDescCell.dblclick().catch(() => matDescCell.click());
      const descInput = this.page.locator(':focus');
      const ok = await descInput
        .evaluate((el) => !!(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')))
        .catch(() => false);
      if (ok) {
        await descInput.fill(this.randomLetters(10));
        await this.page.keyboard.press('Enter').catch(() => this.page.keyboard.press('Tab'));
      }
    }

    // Material Qty/Unit/Rate/Profit (columns 3..6 like items)
    const mtd = materialRow.locator('td');
    const mqty = 1 + Math.floor(Math.random() * 5);
    await fillSpinFromCell(mtd.nth(2), mqty);

    const mUnitCell = mtd.nth(3);
    await mUnitCell.dblclick({ force: true }).catch(() => mUnitCell.click({ force: true }));
    const mOptions = this.page.getByRole('option');
    if (await mOptions.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const optCount = await mOptions.count().catch(() => 0);
      const pick = optCount > 0 ? Math.floor(Math.random() * optCount) : 0;
      await mOptions.nth(pick).click();
      await this.page.waitForTimeout(300);
    }

    const mRate = 100 + Math.floor(Math.random() * 900);
    await fillSpinFromCell(mtd.nth(4), mRate);

    const mProfit = 5 + Math.floor(Math.random() * 26);
    await fillSpinFromCell(mtd.nth(5), mProfit);
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

  async clickAddSectionButton() {
    // Footer "+ Add Section" is usually the last button matching this name.
    const toolbarBtn = this.page.getByRole('button', { name: /add section/i }).last();
    await expect(toolbarBtn).toBeVisible({ timeout: this.defaultTimeout });
    await toolbarBtn.scrollIntoViewIfNeeded();

    const beforePlaceholders = await this.addSectionNamePlaceholders.count();
    const beforeDroppables = await this.itemDroppableSections.count();

    await toolbarBtn.click();
    await this.page.waitForTimeout(800);

    await expect
      .poll(
        async () => {
          const titles = await this.addSectionNamePlaceholders.count();
          const drops = await this.itemDroppableSections.count();
          return titles > beforePlaceholders || drops > beforeDroppables;
        },
        { timeout: this.defaultTimeout, intervals: [200, 400, 800, 1500] }
      )
      .toBeTruthy();
  }

  itemNameFieldForRow(manualIndex) {
    return this.page.locator(`#estimate-itemName-0-${manualIndex}`);
  }

  rowForManualIndex(manualIndex) {
    return this.itemNameFieldForRow(manualIndex).locator('xpath=ancestor::tr[1]');
  }

  itemNameFieldForSectionRow(sectionIndex, manualIndex) {
    return this.page.locator(`#estimate-itemName-${sectionIndex}-${manualIndex}`);
  }

  async fillSectionNameAtIndex(sectionIndex, name) {
    const titleCell = this.addSectionNameTitles.nth(sectionIndex);
    if (await titleCell.isVisible().catch(() => false)) {
      await titleCell.scrollIntoViewIfNeeded().catch(() => {});
      await titleCell.dblclick();
      await expect(this.sectionNameInput).toBeVisible({ timeout: this.defaultTimeout });
      await this.sectionNameInput.fill(name);
      await this.page.keyboard.press('Enter').catch(() => this.page.keyboard.press('Tab'));
      await this.page.waitForTimeout(600);
      return;
    }

    // Fallback: the page uses text placeholders
    const placeholder = this.addSectionNamePlaceholders.nth(sectionIndex);
    await expect(placeholder).toBeVisible({ timeout: this.defaultTimeout });
    await placeholder.dblclick();
    await expect(this.sectionNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.sectionNameInput.fill(name);
    await this.page.keyboard.press('Enter').catch(() => this.page.keyboard.press('Tab'));
    await this.page.waitForTimeout(600);
  }

  async ensureSectionExpanded(sectionIndex) {
    // In the DOM screenshots, each section header row has a chevron button (ExpandMoreIcon) when collapsed.
    const droppable = this.page.locator(`[data-rbd-droppable-id="ITEMS/${sectionIndex}"]`).first();
    if (await droppable.isVisible({ timeout: 2000 }).catch(() => false)) {
      const headerRow = droppable.locator('tr').first();
      const expandMore = headerRow.locator('button:has([data-testid="ExpandMoreIcon"])').first();
      if (await expandMore.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expandMore.click({ timeout: 20000 });
        await this.page.waitForTimeout(600);
      }
      return;
    }

    // Fallback: click the section header placeholder/title if we can't reach the droppable directly.
    const titleCell = this.addSectionNameTitles.nth(sectionIndex);
    if (await titleCell.isVisible({ timeout: 1500 }).catch(() => false)) {
      const row = titleCell.locator('xpath=ancestor::tr[1]');
      const expandMore = row.locator('button:has([data-testid="ExpandMoreIcon"])').first();
      if (await expandMore.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expandMore.click({ timeout: 20000 });
        await this.page.waitForTimeout(600);
      }
    }
  }

  async createSecondSectionAndAddItemRandom() {
    // Resolve the newly added section as the last ITEMS/* droppable.
    const droppables = this.page.locator('[data-rbd-droppable-id^="ITEMS/"]');
    await expect(droppables.first()).toBeVisible({ timeout: this.defaultTimeout });
    const sectionBody = droppables.last();
    await expect(sectionBody).toBeVisible({ timeout: this.defaultTimeout });

    // Expand section body if needed (header row within droppable)
    const bodyHeaderRow = sectionBody.locator('tr[role="button"]').first();
    const bodyExpandMore = bodyHeaderRow.locator('button:has([data-testid="ExpandMoreIcon"])').first();
    if (await bodyExpandMore.isVisible({ timeout: 1500 }).catch(() => false)) {
      await bodyExpandMore.click({ timeout: 20000 });
      await this.page.waitForTimeout(600);
    }

    // If there is an "Add Manually" CTA in this section, click it to render the first item row.
    const addManuallyLink = sectionBody.getByText(/add manually/i).first();
    if (await addManuallyLink.isVisible({ timeout: 1500 }).catch(() => false)) {
      await addManuallyLink.click({ timeout: 20000 });
      await this.page.waitForTimeout(800);
    }

    // Add item name in this section
    const addItemText = sectionBody.getByText(/add item name/i).first();
    await expect(addItemText).toBeVisible({ timeout: this.defaultTimeout });
    await addItemText.dblclick({ timeout: 20000 }).catch(() => addItemText.click({ clickCount: 2, delay: 120 }));

    const itemNameInput = sectionBody.locator('input').first();
    await expect(itemNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await itemNameInput.fill(this.randomLetters(4));
    await this.page.keyboard.press('Enter').catch(() => this.page.keyboard.press('Tab'));
    await this.page.waitForTimeout(700);
  }

  async addManualItemInSection(sectionIndex, item, { manualIndex = 0 } = {}) {
    // If adding a second item in the same section, click Add Manually first
    if (manualIndex > 0) {
      const addManuallyBtn = this.page.getByText('Add Manually', { exact: false }).first();
      await expect(addManuallyBtn).toBeVisible({ timeout: this.defaultTimeout });
      await addManuallyBtn.click();
      await this.page.waitForTimeout(1000);
    }

    let itemNameContainer = this.itemNameFieldForSectionRow(sectionIndex, manualIndex);
    const directVisible = await itemNameContainer.isVisible({ timeout: 3000 }).catch(() => false);
    if (!directVisible) {
      // Fallback: resolve by section droppable (second sections sometimes render different ids).
      const droppables = this.page.locator('[data-rbd-droppable-id^="ITEMS/"]');
      await expect(droppables.first()).toBeVisible({ timeout: this.defaultTimeout });
      const droppable = (await droppables.nth(sectionIndex).isVisible({ timeout: 1500 }).catch(() => false))
        ? droppables.nth(sectionIndex)
        : droppables.last();

      const byId = droppable.locator(`[id^="estimate-itemName-${sectionIndex}-"]`).nth(manualIndex);
      const anyInSection = droppable.locator('[id^="estimate-itemName-"]').nth(manualIndex);
      itemNameContainer = (await byId.count().catch(() => 0)) > 0 ? byId : anyInSection;
    }

    await expect
      .poll(async () => itemNameContainer.isVisible().catch(() => false), {
        timeout: this.defaultTimeout,
        intervals: [300, 600, 1200]
      })
      .toBeTruthy();
    const addItemText = itemNameContainer.getByText('Add Item name', { exact: false }).first();
    await expect(addItemText).toBeVisible({ timeout: this.defaultTimeout });
    await addItemText.dblclick();

    const itemNameInput = itemNameContainer.locator('input').first();
    await expect(itemNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await itemNameInput.fill(item.name);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(700);

    const row = itemNameContainer.locator('xpath=ancestor::tr[1]');

    // Description (best-effort; some builds show textarea)
    if (item.description) {
      const desc = row
        .locator('textarea[placeholder*="Description" i], input[placeholder*="Description" i], textarea[name*="description" i], input[name*="description" i]')
        .first();
      if (await desc.isVisible().catch(() => false)) {
        await desc.fill(String(item.description));
        await this.page.keyboard.press('Enter').catch(() => this.page.keyboard.press('Tab'));
      }
    }

    // Material name (best-effort; placeholder/name varies)
    if (item.material) {
      const material = row
        .locator('input[placeholder*="material" i], textarea[placeholder*="material" i], input[name*="material" i], textarea[name*="material" i]')
        .first();
      if (await material.isVisible().catch(() => false)) {
        await material.fill(String(item.material));
        await this.page.keyboard.press('Enter').catch(() => this.page.keyboard.press('Tab'));
      }
    }

    // Background requests can stay open; don't wait for full network idle here.
    await this.page.waitForTimeout(800);
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
    const addFromLibBtn = this.page.getByText('Add from library', { exact: false }).first();
    await expect(addFromLibBtn).toBeVisible({ timeout: this.defaultTimeout });
    await addFromLibBtn.click();

    await this.page.waitForTimeout(2000);

    const libraryRow = this.page.getByRole('row', { name: /Residential Plumbing Internal/i });
    const rowCheckbox = libraryRow.getByRole('checkbox');
    await expect(rowCheckbox).toBeVisible({ timeout: 15000 });
    await rowCheckbox.click();

    await this.page.waitForTimeout(500);

    // Footer "Add" on the library panel (often last matching button named "Add" when overlay is open)
    const libraryAddBtn = this.page.getByRole('button', { name: 'Add', exact: true }).last();
    await expect(libraryAddBtn).toBeEnabled({ timeout: 10000 });
    await libraryAddBtn.click();

    await this.page.waitForTimeout(1200);
  }

  async clickAddProductService() {
    const link = this.page.getByText('Add Product/Service', { exact: false }).first();
    await expect(link).toBeVisible({ timeout: this.defaultTimeout });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await this.page.waitForTimeout(600);
  }

  async checkEstimateCatalogRow(name) {
    // `.first()` avoids strict-mode failures when `name` is a broad regex/string that matches multiple rows
    // (e.g. several "Example : Shoe Rack …" rows under Vendor Products).
    const row = this.page.getByRole('row', { name }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.getByRole('checkbox').first().check();
    await this.page.waitForTimeout(350);
  }

  async confirmAddProductServicePanel() {
    const addBtn = this.page.getByRole('button', { name: 'Add', exact: true }).last();
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await expect(addBtn).toBeEnabled({ timeout: 10000 });
    await addBtn.click();
    await this.page.waitForTimeout(800);
  }

  /**
   * Multi-step catalog smoke: Add Product/Service (default + Service + Service/Vendor + Product/Vendor) then Add from library.
   * Row labels must match accessible names in the app.
   */
  async addSmokeCatalogViaProductServiceAndLibrary() {
    await this.clickAddProductService();
    await this.checkEstimateCatalogRow(/Shoe rack Fire Protection/i);
    await this.confirmAddProductServicePanel();

    await this.clickAddProductService();
    await this.page.getByRole('tab', { name: 'Service' }).click();
    await this.page.waitForTimeout(450);
    await this.checkEstimateCatalogRow(/wheeler Architectural/i);
    await this.confirmAddProductServicePanel();

    await this.clickAddProductService();
    await this.page.getByRole('tab', { name: 'Service' }).click();
    await this.page.waitForTimeout(450);
    const serviceSource = this.page.getByRole('combobox', { name: 'Service Source' });
    await expect(serviceSource).toBeVisible({ timeout: 15000 });
    await serviceSource.click();
    await this.page.getByRole('option', { name: 'Vendor Services' }).click();
    await this.page.waitForTimeout(450);
    await this.checkEstimateCatalogRow(/Check Surveying and Mapping/i);
    await this.confirmAddProductServicePanel();

    await this.clickAddProductService();
    await this.page.getByRole('tab', { name: 'Product' }).click();
    await this.page.waitForTimeout(450);
    const productSource = this.page.getByRole('combobox', { name: 'Product Source' });
    await expect(productSource).toBeVisible({ timeout: 15000 });
    await productSource.click();
    await this.page.getByRole('option', { name: 'Vendor Products' }).click();
    await this.page.waitForTimeout(450);
    await this.checkEstimateCatalogRow('Example : Shoe Rack Fire');
    await this.confirmAddProductServicePanel();

    await expect(this.addFromLibraryButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addFromLibraryButton.click();
    await this.page.waitForTimeout(1200);
    await this.page.getByRole('tab', { name: 'Library Items' }).click();
    await this.page.waitForTimeout(500);
    await this.checkEstimateCatalogRow(/Institutional Partition wall/i);
    await this.confirmAddProductServicePanel();
  }

  async addFromLibraryWithoutSelection() {
    await expect(this.addFromLibraryButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addFromLibraryButton.click();
    await expect(this.offCanvas).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.offCanvasAddButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.offCanvasAddButton.click();
  }

  async addCharge(name, value) {
    const chargeName = name && name.trim() ? name : this.randomLetters(3);
    const chargeVal = value !== undefined && String(value).trim() !== '' ? String(value) : this.randomDigits(2);

    const nameBox = this.page.getByRole('textbox', { name: 'Charge Name' }).nth(0);
    const valueBox = this.page.getByRole('textbox', { name: 'Enter Value' }).nth(0);
    await expect(nameBox).toBeVisible({ timeout: this.defaultTimeout });
    await nameBox.fill(chargeName);
    await expect(valueBox).toBeVisible({ timeout: this.defaultTimeout });
    await valueBox.fill(chargeVal);
  }

  /** First other-charges row: random 3 letters + 2 digits (no + click). */
  async fillFirstOtherChargeRandom() {
    await this.addCharge('', '');
  }

  /** Click + to add a second charge row, then random name/value on nth(1). */
  async addSecondOtherChargeRandom() {
    const addChargeIcon = this.page
      .locator('.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-colorPrimary')
      .first();
    await expect(addChargeIcon).toBeVisible({ timeout: this.defaultTimeout });
    await addChargeIcon.click();
    await this.page.waitForTimeout(400);

    const nameBox = this.page.getByRole('textbox', { name: 'Charge Name' }).nth(1);
    const valueBox = this.page.getByRole('textbox', { name: 'Enter Value' }).nth(1);
    await expect(nameBox).toBeVisible({ timeout: this.defaultTimeout });
    await nameBox.fill(this.randomLetters(3));
    await expect(valueBox).toBeVisible({ timeout: this.defaultTimeout });
    await valueBox.fill(this.randomDigits(2));
  }

  /** Toggle second row charge unit to % (single icon click). */
  async clickSecondChargePercentToggle() {
    const rows = this.page
      .locator('div.d-flex')
      .filter({ has: this.page.getByRole('textbox', { name: 'Charge Name' }) });
    const secondRow = rows.nth(1);
    const typeToggle = secondRow.locator('.MuiIconButton-sizeSmall').first();
    await expect(typeToggle).toBeVisible({ timeout: this.defaultTimeout });
    await typeToggle.click();
    await this.page.waitForTimeout(300);
  }

  firstChargeRow() {
    return this.page
      .locator('div.d-flex')
      .filter({ has: this.page.getByRole('textbox', { name: 'Charge Name' }) })
      .first();
  }

  async switchChargeType(type, value) {
    const typeToggle = this.firstChargeRow().locator('.MuiIconButton-sizeSmall').first();
    await expect(typeToggle).toBeVisible({ timeout: this.defaultTimeout });
    await typeToggle.click();
    await this.page.waitForTimeout(300);
    await typeToggle.click();
    await this.page.waitForTimeout(500);

    const firstRadio = this.page.getByRole('radio').first();
    await expect(firstRadio).toBeVisible({ timeout: 15000 });
    await firstRadio.check();

    const addButtons = this.page.getByRole('button', { name: 'Add', exact: true });
    const count = await addButtons.count();
    let clicked = false;
    for (let i = 0; i < count; i += 1) {
      const btn = addButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await this.page.keyboard.press('Enter');
    }

    const valueBox = this.page.getByRole('textbox', { name: 'Enter Value' }).nth(0);
    await expect(valueBox).toBeVisible({ timeout: this.defaultTimeout });
    await valueBox.fill(String(value));
  }

  async addDiscountFirstOption() {
    await expect(this.addDiscountButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addDiscountButton.click();
    const firstRadio = this.page.getByRole('radio').first();
    await expect(firstRadio).toBeVisible({ timeout: this.defaultTimeout });
    await firstRadio.check();
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
  }

  async addTaxFirstOption() {
    const addTax = this.page.getByText('+ Add Tax', { exact: false }).first();
    await expect(addTax).toBeVisible({ timeout: this.defaultTimeout });
    await addTax.click();
    const taxRowCb = this.page.getByRole('row', { name: /checlking/i }).getByRole('checkbox').first();
    await expect(taxRowCb).toBeVisible({ timeout: this.defaultTimeout });
    await taxRowCb.check();
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
  }

  async enableRoundOff() {
    const roundUp = this.page.getByRole('checkbox', { name: 'Round Up' }).first();
    await expect(roundUp).toBeVisible({ timeout: this.defaultTimeout });
    await roundUp.check();
  }

  async addTermsFromTemplate() {
    const chooseTemplate = this.page.getByRole('button', { name: 'Choose from Template' }).first();
    await expect(chooseTemplate).toBeVisible({ timeout: this.defaultTimeout });
    await chooseTemplate.click();
    const rowRadio = this.page.getByRole('row', { name: /labor wages Acceptance Of/i }).getByRole('radio').first();
    await expect(rowRadio).toBeVisible({ timeout: this.defaultTimeout });
    await rowRadio.check();
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
  }

  async enableDigitalSignature() {
    const sig = this.page.getByRole('checkbox', { name: /Show digital signature on/i }).first();
    await expect(sig).toBeVisible({ timeout: this.defaultTimeout });
    await sig.check();
  }

  async addCustomColumn(name, type) {
    const manage = this.page.getByRole('button', { name: 'Manage Columns' }).first();
    await expect(manage).toBeVisible({ timeout: this.defaultTimeout });
    await manage.click();

    const colName = this.page.getByRole('textbox', { name: 'New Column Name' }).first();
    await expect(colName).toBeVisible({ timeout: this.defaultTimeout });
    await colName.fill((name && name.trim()) || this.randomLetters(4));

    const typeLabel = (type && String(type).trim()) || 'Link';
    const dropdown = this.page.getByText(/^text$/i).first();
    await expect(dropdown).toBeVisible({ timeout: this.defaultTimeout });
    await dropdown.click();
    await this.page.getByRole('option', { name: new RegExp(`^${typeLabel}$`, 'i') }).click();

    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
    await this.page.getByRole('button', { name: 'Apply', exact: true }).click();
    await this.page.waitForTimeout(1000);
  }

  /** Random 4-letter column name; type dropdown opens from "Text", option "Link". */
  async addCustomColumnRandomLink() {
    await this.addCustomColumn('', 'Link');
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
    await this.page.waitForTimeout(1500);
    await this.waitForNetworkIdle();
  }

  async saveAsDraftFromActionMenu() {
    const actionBtn = this.page.getByRole('button', { name: 'Action', exact: true }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(2000);
    await actionBtn.click();
    await this.page.waitForTimeout(2000);

    await expect(this.saveAsDraftMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.saveAsDraftMenuItem.click();
    await this.page.waitForTimeout(1000);
    await this.waitForNetworkIdle().catch(() => {});
  }

  async openDraftTab() {
    await expect(this.draftTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.draftTab.click();
    await this.page.waitForTimeout(1000);
    await this.waitForNetworkIdle().catch(() => {});
  }

  async openFirstDraftOptionsAndEdit() {
    await expect(this.draftRowOptionsButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.draftRowOptionsButton.click();
    await expect(this.editMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.editMenuItem.click();
    await this.waitForNetworkIdle().catch(() => {});
    await this.waitForFormSlowHandling();
  }

  async previewEstimateAndReturnToEditPage() {
    await expect(this.editPreviewButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.editPreviewButton.click();
    await this.page.waitForTimeout(1500);
    await expect(this.backToEditBoqLink).toBeVisible({ timeout: this.defaultTimeout });
    await this.backToEditBoqLink.click();
    await this.page.waitForTimeout(800);
  }

  async previewFirstDraftAndClose() {
    const directCandidates = [
      this.page.getByRole('button', { name: /preview/i }).first(),
      this.page.locator('[aria-label*="preview" i], [title*="preview" i]').first(),
      this.page
        .locator('svg[data-testid="VisibilityIcon"], svg[data-testid="PreviewIcon"], svg[aria-label*="preview" i]')
        .first()
        .locator('xpath=ancestor::button[1]')
        .first()
    ];

    let opened = false;
    for (const c of directCandidates) {
      if (await c.isVisible().catch(() => false)) {
        await c.click();
        opened = true;
        break;
      }
    }

    if (!opened) {
      // Some builds put preview under the row "..." options menu.
      if (await this.draftRowOptionsButton.isVisible().catch(() => false)) {
        await this.draftRowOptionsButton.click();
        const previewMenu = this.page.getByRole('menuitem', { name: /preview|view/i }).first();
        if (await previewMenu.isVisible().catch(() => false)) {
          await previewMenu.click();
          opened = true;
        }
      }
    }

    if (!opened) {
      throw new Error('Could not find a Preview control in Draft tab');
    }

    await this.page.waitForTimeout(1000);
    const closeBtn = this.page.getByRole('button', { name: /close/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    } else if (await this.closePreviewButton.isVisible().catch(() => false)) {
      await this.closePreviewButton.click();
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await this.page.waitForTimeout(800);
  }

  async composeDraftEmailFromDraftTabAndSend() {
    const actionBtn = this.page.getByRole('button', { name: 'Action', exact: true }).first();
    await expect(actionBtn).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForTimeout(2000);
    await actionBtn.click();
    await this.page.waitForTimeout(2000);

    const composeMenuItem = this.page.getByRole('menuitem', { name: /compose email/i }).first();
    await expect(composeMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await composeMenuItem.click();

    const sendBtn = this.page.getByRole('button', { name: 'Send Email' }).first();
    await expect(sendBtn).toBeVisible({ timeout: this.defaultTimeout });
    await expect(sendBtn).toBeEnabled({ timeout: this.defaultTimeout });
    await sendBtn.click();
    await this.page.waitForTimeout(1500);
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
    // Some pages keep long-polling, so "networkidle" can hang. Gate readiness on a stable element first.
    await this.page.waitForLoadState('domcontentloaded', { timeout: this.defaultTimeout }).catch(() => {});
    await expect(this.estimateTitleInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async expectValidationMessageVisible() {
    await expect(this.validationMessage).toBeVisible({ timeout: this.defaultTimeout });
  }

  async isToastVisible(message) {
    const needles = String(message)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    const variants = needles.flatMap((n) => [
      n,
      n.replace(/\bestimation\b/i, 'estimate'),
      n.replace(/\bestimate\b/i, 'estimation')
    ]);

    // Toastify often animates in/out; Playwright "visible" can be flaky. Poll DOM text instead.
    await expect
      .poll(
        async () =>
          this.page.evaluate((needles) => {
            const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const body = collapse(document.body.innerText);
            const wants = needles.map((n) => n.toLowerCase());

            const candidates = document.querySelectorAll(
              '.Toastify, #react-toastify, [class*="Toastify__toast-container"], [class*="Toastify__toast-body"], .Toastify__toast'
            );
            for (const el of candidates) {
              const t = collapse(el.textContent);
              if (wants.some((w) => t.includes(w))) return true;
            }
            return wants.some((w) => body.includes(w));
          }, variants),
        { timeout: this.defaultTimeout, intervals: [200, 400, 800, 1500] }
      )
      .toBeTruthy();

    // Optional: wait until the toast text is gone (auto-dismiss), without failing the step
    await expect
      .poll(
        async () =>
          this.page.evaluate((n) => {
            const want = String(n || '').toLowerCase();
            const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const roots = document.querySelectorAll('.Toastify, #react-toastify');
            for (const el of roots) {
              if (collapse(el.textContent).includes(want)) return false;
            }
            return true;
          }, needles[0] || ''),
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
