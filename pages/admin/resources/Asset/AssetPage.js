const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');

class AssetPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;

    // Sidebar/top-level navigation into the Resources module.
    this.resourcesNav = page
      .getByRole('button', { name: /resources/i })
      .or(page.getByRole('link', { name: /resources/i }))
      .or(page.getByLabel(/resources/i))
      .first();

    // Entry point for the Manage Assets screen once Resources is open.
    this.manageAssetsEntry = page
      .getByRole('button', { name: /manage\s*assets?/i })
      .or(page.getByRole('link', { name: /manage\s*assets?/i }))
      .or(page.getByText(/manage\s*assets?/i))
      .first();

    // Primary entry point from the asset list page.
    this.addNewButton = page
      .getByRole('button', { name: /add\s*new/i })
      .or(page.getByText(/add\s*new/i))
      .first();

    // Wizard option for manual asset creation ("create from scratch").
    this.createAssetOption = page
      .getByRole('heading', { name: /create\s*asset/i })
      .or(page.getByText(/create\s*asset/i))
      .first();

    // Proceed button in the wizard after choosing the creation mode.
    this.proceedButton = page
      .getByRole('button', { name: /proceed/i })
      .or(page.getByText(/proceed/i))
      .first();

    // Used as a fallback signal that the create asset form is open.
    this.assetFormHeading = page
      .getByRole('heading', { name: /create\s*asset|add\s*asset|new\s*asset|edit\s*asset|update\s*asset/i })
      .or(page.getByText(/create\s*asset|add\s*asset|new\s*asset|edit\s*asset|update\s*asset/i))
      .first();

    // Flexible locators let the test survive label or placeholder variations across environments.
    this.assetNameInput = page
      .getByLabel(/asset\s*name/i)
      .or(page.getByPlaceholder(/asset\s*name/i))
      .or(page.locator('input[name*="assetName" i], input[id*="assetName" i]'))
      .first();

    this.assetCategoryInput = page
      .getByLabel(/asset\s*category|category/i)
      .or(page.getByPlaceholder(/enter\s*asset\s*category|asset\s*category|category/i))
      .or(page.locator('input[name*="category" i], input[id*="category" i]'))
      .first();

    this.descriptionInput = page
      .getByLabel(/description/i)
      .or(page.getByPlaceholder(/enter\s*description|description/i))
      .or(page.locator('textarea[name*="description" i], textarea[id*="description" i], textarea'))
      .first();

    this.unitCostInput = page
      .getByLabel(/unit\s*cost|cost/i)
      .or(page.getByPlaceholder(/unit\s*cost|cost/i))
      .or(page.locator('input[name*="cost" i], input[id*="cost" i], input[type="number"]'))
      .first();

    this.inceptionDateInput = page
      .locator(
        'input[name*="inception" i], input[id*="inception" i], input[name*="date" i], input[id*="date" i], input[placeholder*="date" i]'
      )
      .first();

    this.inceptionDateButton = page
      .getByRole('button', { name: /choose\s*date|open\s*calendar|date/i })
      .or(page.locator('button[aria-label*="date" i], button[title*="date" i]'))
      .first();

    this.notesInput = page
      .getByLabel(/notes?/i)
      .or(page.getByPlaceholder(/enter\s*notes?|notes?/i))
      .or(page.locator('textarea[name*="note" i], textarea[id*="note" i], textarea[placeholder*="note" i]'))
      .first();

    this.attachmentTrigger = page
      .getByRole('button', { name: /attach|attachment|upload|browse|choose\s*file/i })
      .or(page.getByText(/attach|attachment|upload|browse|choose\s*file/i))
      .or(page.locator('input[type="file"]'))
      .first();

    this.searchInput = page
      .getByPlaceholder(/search\s+for\s+assets/i)
      .or(page.getByLabel(/search/i))
      .or(page.locator('input[placeholder*="search" i]'))
      .first();

    this.updateButton = page
      .locator('button')
      .filter({ hasText: /^update$/i })
      .last();

    this.actionMenu = page.locator('[role="menu"]').first();
    this.editMenuItem = page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^edit$/i }))
      .first();
    this.deleteMenuItem = page
      .getByRole('menuitem', { name: /^delete$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^delete$/i }))
      .first();

    this.confirmDialog = page.getByRole('dialog').first();
    this.deleteReasonInput = page
      .getByLabel(/reason/i)
      .or(page.getByPlaceholder(/reason/i))
      .or(page.locator('textarea[name*="reason" i], textarea[id*="reason" i], textarea'))
      .first();
    this.confirmYesButton = page
      .getByRole('button', { name: /^(yes|delete|confirm|ok|proceed|continue)$/i })
      .or(page.locator('button').filter({ hasText: /^(yes|delete|confirm|ok|proceed|continue)$/i }))
      .first();

    this.submitCreateButton = page
      .locator('button')
      .filter({ hasText: /^create$/i })
      .last();

    this.successToast = page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
      .filter({ hasText: /asset|created|success/i })
      .first();
  }

  buildRandomSuffix() {
    // Keeps generated asset data unique across repeated executions.
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  buildCreateAssetData() {
    const suffix = this.buildRandomSuffix();
    return {
      name: `Asset ${suffix}`,
      category: `Category ${suffix}`,
      description: `Asset description ${suffix}`,
      unitCost: String(1000 + Math.floor(Math.random() * 4000)),
      notes: `Asset note ${suffix}`,
      inceptionDate: this.buildAllowedInceptionDateStrings(1),
    };
  }

  buildEditAssetData() {
    const suffix = this.buildRandomSuffix();
    return {
      name: `Edited Asset ${suffix}`,
      category: `Edited Category ${suffix}`,
      description: `Edited asset description ${suffix}`,
      unitCost: String(5000 + Math.floor(Math.random() * 4000)),
      notes: `Edited asset note ${suffix}`,
      inceptionDate: this.buildAllowedInceptionDateStrings(0),
    };
  }

  buildAllowedInceptionDateStrings(daysBack = 0) {
    // Inception date only allows today or a past date, so never generate a future date.
    const date = new Date();
    date.setDate(date.getDate() - Math.max(0, daysBack));
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return {
      inputDate: `${yyyy}-${mm}-${dd}`,
      textDate: `${mm}/${dd}/${yyyy}`,
      day: String(date.getDate()),
    };
  }

  async openResources() {
    await expect(this.resourcesNav).toBeVisible({ timeout: this.defaultTimeout });
    await this.resourcesNav.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async openManageAssets() {
    await expect(this.manageAssetsEntry).toBeVisible({ timeout: this.defaultTimeout });
    await this.manageAssetsEntry.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async navigateToManageAssets() {
    // Encapsulates the full sidebar/menu navigation so steps stay readable.
    console.log('[AssetPage] Navigating to Resources > Manage Assets');
    await this.openResources();
    await this.openManageAssets();
  }

  async startCreateFlow() {
    // The real flow is Add New -> Create Asset (from scratch) -> Proceed.
    console.log('[AssetPage] Starting create asset flow');
    await expect(this.addNewButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addNewButton.click();

    await expect(this.createAssetOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.createAssetOption.click();

    await expect(this.proceedButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.proceedButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.proceedButton.click();

    // Wait on concrete single elements to avoid Playwright strict-mode conflicts
    // when both the form heading and first field are visible at the same time.
    await expect(this.assetFormHeading).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.assetNameInput).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async scrollUntilVisible(locator, label) {
    for (let i = 0; i < 8; i += 1) {
      if (await locator.isVisible().catch(() => false)) {
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        return;
      }
      await this.page.mouse.wheel(0, 500).catch(() => {});
      await this.page.waitForTimeout(250);
    }
    throw new Error(`Could not find visible field for ${label} on the Add Asset form.`);
  }

  async pickInceptionDate(targetDate) {
    await this.scrollUntilVisible(this.inceptionDateButton.or(this.inceptionDateInput).first(), 'inception date');

    if (await this.inceptionDateButton.isVisible().catch(() => false)) {
      await this.inceptionDateButton.click().catch(() => {});
      await this.page.waitForTimeout(300);

      const dayButton = this.page
        .getByRole('gridcell', { name: new RegExp(`^${targetDate.day}$`) })
        .or(this.page.getByRole('button', { name: new RegExp(`^${targetDate.day}$`) }))
        .first();

      if (await dayButton.isVisible().catch(() => false)) {
        await dayButton.click().catch(() => {});
        return;
      }

      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await expect(this.inceptionDateInput).toBeVisible({ timeout: this.defaultTimeout });
    const inputType = ((await this.inceptionDateInput.getAttribute('type').catch(() => '')) || '').toLowerCase();
    const dateValue = inputType === 'date' ? targetDate.inputDate : targetDate.textDate;
    await this.inceptionDateInput.click().catch(() => {});
    await this.inceptionDateInput.press('Control+A').catch(() => {});
    await this.inceptionDateInput.fill(dateValue);
    await this.inceptionDateInput.press('Tab').catch(() => {});
  }

  async fillAssetFields(assetData) {
    await expect(this.assetFormHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.assetNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.assetNameInput.click().catch(() => {});
    await this.assetNameInput.press('Control+A').catch(() => {});
    await this.assetNameInput.fill(assetData.name);

    await expect(this.assetCategoryInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.assetCategoryInput.click().catch(() => {});
    await this.assetCategoryInput.press('Control+A').catch(() => {});
    await this.assetCategoryInput.fill(assetData.category);

    // The first viewport shows the description area before the cost/date fields below.
    await expect(this.descriptionInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.descriptionInput.click().catch(() => {});
    await this.descriptionInput.press('Control+A').catch(() => {});
    await this.descriptionInput.fill(assetData.description);

    await this.scrollUntilVisible(this.unitCostInput, 'unit cost');
    await expect(this.unitCostInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.unitCostInput.click();
    await this.unitCostInput.press('Control+A').catch(() => {});
    await this.unitCostInput.fill(assetData.unitCost);

    // Prefer the calendar picker when available; fall back to typing into a real input.
    await this.pickInceptionDate(assetData.inceptionDate);

    await this.scrollUntilVisible(this.notesInput, 'notes');
    await expect(this.notesInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.notesInput.click().catch(() => {});
    await this.notesInput.press('Control+A').catch(() => {});
    await this.notesInput.fill(assetData.notes);
  }

  async fillAssetForm() {
    // Store generated data so the verification step can assert against the created record.
    this.assetData = this.buildCreateAssetData();

    console.log(`[AssetPage] Filling asset form for ${this.assetData.name}`);
    await this.fillAssetFields(this.assetData);
  }

  async attachDocumentManuallyAndWait() {
    // This flow intentionally pauses so the user can complete a manual attachment upload.
    console.log('[AssetPage] Opening attachment control for manual upload');

    await this.scrollUntilVisible(this.attachmentTrigger, 'attachment control');

    if (await this.attachmentTrigger.isVisible().catch(() => false)) {
      const tagName = await this.attachmentTrigger.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'input') {
        await this.attachmentTrigger.scrollIntoViewIfNeeded().catch(() => {});
      } else {
        await this.attachmentTrigger.click().catch(() => {});
      }
    }

    console.log('[AssetPage] Waiting for manual upload. Upload the attachment in the browser, then press ENTER in the terminal to continue.');
    await this.waitForEnterInTerminal(
      'Waiting for manual upload. After the attachment finishes uploading, press ENTER here to proceed.'
    );
  }

  async submitCreateForm() {
    console.log('[AssetPage] Submitting asset create form');
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })).catch(() => {});
    await expect(this.submitCreateButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.submitCreateButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.submitCreateButton.click();
  }

  async verifyAssetCreatedSuccessfully() {
    // Accept multiple success signals because different builds may show either a toast,
    // a generic success message, or the new row in the list.
    await expect(async () => {
      const toastVisible = await this.successToast.isVisible().catch(() => false);
      const createdTextVisible = this.assetData?.name
        ? await this.page.getByText(this.assetData.name, { exact: false }).first().isVisible().catch(() => false)
        : false;
      const genericSuccessVisible = await this.page
        .getByText(/asset\s*(created|added)|created\s*successfully|success/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(toastVisible || createdTextVisible || genericSuccessVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }

  async searchForAsset(name) {
    if (await this.searchInput.isVisible().catch(() => false)) {
      await this.searchInput.click().catch(() => {});
      await this.searchInput.press('Control+A').catch(() => {});
      await this.searchInput.fill(name);
      await this.searchInput.press('Tab').catch(() => {});
      await this.page.waitForTimeout(1000);
    }
  }

  async waitForAssetListReady() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    if (await this.searchInput.isVisible().catch(() => false)) {
      await expect(this.searchInput).toBeVisible({ timeout: this.defaultTimeout });
      return;
    }

    const firstRow = this.page.locator('tbody tr, .MuiDataGrid-row, [role="row"]').first();
    await expect(firstRow).toBeVisible({ timeout: this.defaultTimeout });
  }

  getAssetRow(name) {
    const tableRow = this.page.locator('tbody tr, .MuiDataGrid-row').filter({ hasText: name }).first();
    const roleRow = this.page.locator('[role="row"]').filter({ hasText: name }).first();
    return tableRow.or(roleRow).first();
  }
}

module.exports = AssetPage;
