const path = require('path');
const fs = require('fs');
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

    // MUI DatePicker: unlabeled textbox + "Choose date" adornment (no name/id="inception")
    this.inceptionDateInput = page
      .getByLabel(/inception\s*date/i)
      .or(page.locator('.MuiDatePicker-root input, .MuiPickersTextField-root input, [class*="DatePicker"] input'))
      .or(page.getByPlaceholder(/mm\/dd\/yyyy|dd\/mm\/yyyy|enter\s*date|date/i))
      .or(
        page.locator(
          'input[name*="inception" i], input[id*="inception" i], input[name*="date" i], input[id*="date" i], input[placeholder*="date" i]'
        )
      )
      .first();

    this.inceptionDateButton = page
      .getByRole('button', { name: /^choose\s*date$/i })
      .or(page.getByLabel(/^choose\s*date$/i))
      .or(page.locator('button[aria-label*="Choose date" i], button[aria-label*="date" i]'))
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

    // Page ExpandableSearch only — NEVER the header global "Search Anything in IntoAEC"
    this.listSearchRegion = page
      .getByRole('search', { name: /search\s*for\s*assets?/i })
      .or(page.locator('[role="search"]').filter({ has: page.getByPlaceholder(/search\s*for\s*assets?/i) }))
      .first();
    this.listSearchToggle = page
      .getByRole('button', { name: /search\s*for\s*assets?/i })
      .or(this.listSearchRegion.getByRole('button', { name: /search/i }))
      .or(
        page
          .locator('main, [role="main"], #app-content-scroll')
          .getByRole('button', { name: /^search$/i })
      )
      .first();
    this.searchInput = page
      .getByRole('textbox', { name: /search\s*for\s*assets?/i })
      .or(page.getByPlaceholder(/search\s*for\s*assets?/i))
      .or(this.listSearchRegion.getByRole('textbox'))
      .or(this.listSearchRegion.locator('input:not([type="hidden"])'))
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

    // Asset type / ownership / bulk / rented fields
    this.individualTypeRadio = page
      .getByRole('radio', { name: /individual/i })
      .or(page.locator('input[type="radio"][value="INDIVIDUAL"]'))
      .first();
    this.bulkTypeRadio = page
      .getByRole('radio', { name: /bulk/i })
      .or(page.locator('input[type="radio"][value="BULK"]'))
      .first();
    this.ownedOwnershipRadio = page
      .getByRole('radio', { name: /owned/i })
      .or(page.locator('input[type="radio"][value="OWNED"]'))
      .first();
    this.rentedOwnershipRadio = page
      .getByRole('radio', { name: /rented/i })
      .or(page.locator('input[type="radio"][value="RENTED"]'))
      .first();
    this.initialQuantityInput = page
      .getByPlaceholder(/enter\s*quantity|quantity/i)
      .or(page.getByLabel(/initial\s*quantity|quantity/i))
      .or(page.locator('input[name*="availableQuantity" i], input[name*="quantity" i]'))
      .first();
    this.contractorInput = page
      .getByLabel(/contractor/i)
      .or(page.getByPlaceholder(/contractor/i))
      .or(page.locator('input[name*="contractor" i]'))
      .first();

    // Tabs / filters / logs / bulk upload / QR
    this.allAssetsTab = page
      .getByRole('tab', { name: /all\s*assets?/i })
      .or(page.getByRole('button', { name: /all\s*assets?/i }))
      .first();
    this.assetRequestsTab = page
      .getByRole('tab', { name: /asset\s*requests?/i })
      .or(page.getByRole('button', { name: /asset\s*requests?/i }))
      .first();
    this.filterButton = page
      .getByRole('button', { name: /filter/i })
      .or(page.locator('[data-testid="FilterListIcon"], button:has([data-testid="FilterListIcon"])'))
      .first();
    this.filterApplyButton = page
      .getByRole('button', { name: /^apply$/i })
      .or(page.locator('button').filter({ hasText: /^apply$/i }))
      .first();
    this.filterClearButton = page
      .getByRole('button', { name: /clear/i })
      .or(page.locator('button').filter({ hasText: /^clear$/i }))
      .first();
    this.uploadAssetsOption = page
      .getByRole('heading', { name: /upload\s*assets?/i })
      .or(page.getByText(/upload\s*assets?/i))
      .first();
    this.downloadTemplateLink = page
      .getByRole('link', { name: /download\s*template|template/i })
      .or(page.locator('a[href*="bulkAssets"], a[download*="bulk"]'))
      .first();
    this.bulkFileInput = page.locator('input[type="file"][accept*="xlsx"], input[type="file"]').last();
    this.assetLogModal = page
      .getByRole('dialog')
      .filter({ hasText: /log|activity|history/i })
      .or(page.locator('.MuiDialog-root, .MuiDrawer-root, .MuiModal-root').filter({ hasText: /log|activity|history/i }))
      .first();
    this.downloadQrMenuItem = page
      .getByRole('menuitem', { name: /download\s*qr|qr/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /download\s*qr|qr/i }))
      .first();
    this.fileInput = page.locator('input[type="file"]');
  }

  buildRandomSuffix() {
    // Keeps generated asset data unique across repeated executions.
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  buildCreateAssetData(overrides = {}) {
    const suffix = this.buildRandomSuffix();
    return {
      name: `Asset ${suffix}`,
      category: `Category ${suffix}`,
      description: `Asset description ${suffix}`,
      unitCost: String(1000 + Math.floor(Math.random() * 4000)),
      notes: `Asset note ${suffix}`,
      inceptionDate: this.buildAllowedInceptionDateStrings(1),
      assetType: 'INDIVIDUAL',
      ownershipType: 'OWNED',
      availableQuantity: '10',
      contractorName: `Contractor ${suffix}`,
      ...overrides,
    };
  }

  buildEditAssetData(overrides = {}) {
    const suffix = this.buildRandomSuffix();
    return {
      name: `Edited Asset ${suffix}`,
      category: `Edited Category ${suffix}`,
      description: `Edited asset description ${suffix}`,
      unitCost: String(5000 + Math.floor(Math.random() * 4000)),
      notes: `Edited asset note ${suffix}`,
      inceptionDate: this.buildAllowedInceptionDateStrings(0),
      assetType: 'INDIVIDUAL',
      ownershipType: 'OWNED',
      ...overrides,
    };
  }

  defaultAttachmentFixturePath() {
    return path.join(__dirname, '../../../../fixtures/asset-attachment.png');
  }

  isAttachmentAutomationMode() {
    return (
      /^1|true$/i.test(String(process.env.ASSET_ATTACHMENT_AUTO || '')) ||
      /^1|true$/i.test(String(process.env.NOTE_ATTACHMENT_AUTO || ''))
    );
  }

  resolveAttachmentFilePathForAutomation() {
    const envPath = process.env.ASSET_ATTACHMENT_FILE_PATH || process.env.NOTE_ATTACHMENT_FILE_PATH;
    if (envPath) {
      const resolved = path.resolve(envPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`Attachment file path does not exist: ${resolved}`);
      }
      return resolved;
    }
    const fallback = this.defaultAttachmentFixturePath();
    if (fs.existsSync(fallback)) {
      return fallback;
    }
    const pdfFallback = path.join(__dirname, '../../../../fixtures/sample-po-import.pdf');
    if (fs.existsSync(pdfFallback)) {
      return pdfFallback;
    }
    return null;
  }

  shouldSkipAttachment() {
    return /^1|true$/i.test(String(process.env.ASSET_SKIP_ATTACHMENT || ''));
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
    const isManageAssetsVisible = await this.manageAssetsEntry.isVisible().catch(() => false);
    if (!isManageAssetsVisible) {
      await expect(this.resourcesNav).toBeVisible({ timeout: this.defaultTimeout });
      await this.resourcesNav.click();
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }
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

  getAssetFormScope() {
    return this.page
      .locator('.MuiDrawer-root, .MuiDialog-root, [role="dialog"], form')
      .filter({ hasText: /create\s*asset|edit\s*asset|update\s*asset|asset\s*name|inception/i })
      .first()
      .or(this.page.locator('body'));
  }

  async pickInceptionDate(targetDate) {
    console.log('[AssetPage] Setting inception date');
    const scope = this.getAssetFormScope();

    // Prefer Choose date near the Inception Date label (MUI DatePicker)
    const inceptionLabel = scope.getByText(/inception\s*date/i).first();
    let chooseBtn = scope.getByRole('button', { name: /^choose\s*date$/i }).first();

    if (await inceptionLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inceptionLabel.scrollIntoViewIfNeeded().catch(() => {});
      const nearChoose = inceptionLabel
        .locator('xpath=ancestor::*[.//button[@aria-label="Choose date" or contains(@aria-label,"Choose date")]][1]//button[@aria-label="Choose date" or contains(@aria-label,"Choose date")]')
        .first();
      if (await nearChoose.isVisible({ timeout: 2000 }).catch(() => false)) {
        chooseBtn = nearChoose;
      }
    }

    if (await chooseBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chooseBtn.scrollIntoViewIfNeeded().catch(() => {});
      await chooseBtn.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(400);

      const dayButton = this.page
        .getByRole('gridcell', { name: new RegExp(`^${targetDate.day}$`) })
        .filter({ visible: true })
        .first()
        .or(
          this.page
            .locator('.MuiPickersDay-root, button.MuiPickersDay-root')
            .filter({ hasText: new RegExp(`^${targetDate.day}$`) })
            .filter({ visible: true })
            .first()
        );

      if (await dayButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dayButton.click({ force: true }).catch(() => {});
        console.log(`[AssetPage] Picked inception day ${targetDate.day} from calendar`);
        await this.page.keyboard.press('Escape').catch(() => {});
        return;
      }

      await this.page.keyboard.press('Escape').catch(() => {});
    }

    // Fallback: type into MUI DatePicker input
    const dateInput = scope
      .locator('.MuiDatePicker-root input, .MuiPickersTextField-root input, [class*="DatePicker"] input')
      .first()
      .or(this.inceptionDateInput);

    if (await dateInput.isVisible({ timeout: 8000 }).catch(() => false)) {
      await dateInput.scrollIntoViewIfNeeded().catch(() => {});
      const inputType = ((await dateInput.getAttribute('type').catch(() => '')) || '').toLowerCase();
      const dateValue = inputType === 'date' ? targetDate.inputDate : targetDate.textDate;
      const readonly = (await dateInput.getAttribute('readonly').catch(() => null)) != null;
      if (!readonly) {
        await dateInput.click({ force: true }).catch(() => {});
        await dateInput.press('Control+A').catch(() => {});
        await dateInput.fill(dateValue).catch(async () => {
          await dateInput.pressSequentially(dateValue, { delay: 30 }).catch(() => {});
        });
        await dateInput.press('Tab').catch(() => {});
        console.log(`[AssetPage] Filled inception date input: ${dateValue}`);
        return;
      }
    }

    // Inception date is optional in the UI — do not fail the whole form fill
    console.log('[AssetPage] Inception date control not interactable; skipping (optional field)');
  }

  async selectAssetType(assetType = 'INDIVIDUAL') {
    const isBulk = String(assetType).toUpperCase() === 'BULK';
    const radio = isBulk ? this.bulkTypeRadio : this.individualTypeRadio;
    if (await radio.isVisible({ timeout: 5000 }).catch(() => false)) {
      await radio.check({ force: true }).catch(async () => {
        await radio.click({ force: true });
      });
      console.log(`[AssetPage] Selected asset type: ${isBulk ? 'BULK' : 'INDIVIDUAL'}`);
    }
  }

  async selectOwnershipType(ownershipType = 'OWNED') {
    const isRented = String(ownershipType).toUpperCase() === 'RENTED';
    const radio = isRented ? this.rentedOwnershipRadio : this.ownedOwnershipRadio;
    if (await radio.isVisible({ timeout: 5000 }).catch(() => false)) {
      await radio.check({ force: true }).catch(async () => {
        await radio.click({ force: true });
      });
      console.log(`[AssetPage] Selected ownership: ${isRented ? 'RENTED' : 'OWNED'}`);
    }
  }

  async fillAssetFields(assetData) {
    await expect(this.assetFormHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.assetNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.assetNameInput.click().catch(() => {});
    await this.assetNameInput.press('Control+A').catch(() => {});
    await this.assetNameInput.fill(assetData.name || '');

    await expect(this.assetCategoryInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.assetCategoryInput.click().catch(() => {});
    await this.assetCategoryInput.press('Control+A').catch(() => {});
    await this.assetCategoryInput.fill(assetData.category || '');

    if (assetData.description !== undefined) {
      await expect(this.descriptionInput).toBeVisible({ timeout: this.defaultTimeout });
      await this.descriptionInput.click().catch(() => {});
      await this.descriptionInput.press('Control+A').catch(() => {});
      await this.descriptionInput.fill(assetData.description);
    }

    if (assetData.assetType) {
      await this.selectAssetType(assetData.assetType);
    }

    if (String(assetData.assetType || '').toUpperCase() === 'BULK' && assetData.availableQuantity != null) {
      await this.scrollUntilVisible(this.initialQuantityInput, 'initial quantity');
      await this.initialQuantityInput.click().catch(() => {});
      await this.initialQuantityInput.press('Control+A').catch(() => {});
      await this.initialQuantityInput.fill(String(assetData.availableQuantity));
    }

    if (assetData.ownershipType) {
      await this.selectOwnershipType(assetData.ownershipType);
    }

    if (assetData.unitCost != null && assetData.unitCost !== '') {
      await this.scrollUntilVisible(this.unitCostInput, 'unit cost');
      await expect(this.unitCostInput).toBeVisible({ timeout: this.defaultTimeout });
      await this.unitCostInput.click();
      await this.unitCostInput.press('Control+A').catch(() => {});
      await this.unitCostInput.fill(String(assetData.unitCost));
    }

    if (String(assetData.ownershipType || '').toUpperCase() === 'RENTED' && assetData.contractorName) {
      await this.scrollUntilVisible(this.contractorInput, 'contractor');
      await this.contractorInput.click().catch(() => {});
      await this.contractorInput.press('Control+A').catch(() => {});
      await this.contractorInput.fill(assetData.contractorName);
    }

    if (assetData.inceptionDate) {
      await this.pickInceptionDate(assetData.inceptionDate);
    }

    if (assetData.notes !== undefined) {
      await this.scrollUntilVisible(this.notesInput, 'notes');
      await expect(this.notesInput).toBeVisible({ timeout: this.defaultTimeout });
      await this.notesInput.click().catch(() => {});
      await this.notesInput.press('Control+A').catch(() => {});
      await this.notesInput.fill(assetData.notes);
    }
  }

  async fillAssetForm(overrides = {}) {
    this.assetData = this.buildCreateAssetData(overrides);
    console.log(`[AssetPage] Filling asset form for ${this.assetData.name}`);
    await this.fillAssetFields(this.assetData);
  }

  async fillBulkAssetForm() {
    await this.fillAssetForm({
      assetType: 'BULK',
      ownershipType: 'OWNED',
      availableQuantity: String(5 + Math.floor(Math.random() * 20)),
    });
  }

  async fillRentedAssetForm() {
    await this.fillAssetForm({
      assetType: 'INDIVIDUAL',
      ownershipType: 'RENTED',
      unitCost: String(100 + Math.floor(Math.random() * 400)),
      contractorName: `Contractor ${this.buildRandomSuffix()}`,
    });
  }

  async attachDocumentManuallyAndWait() {
    if (this.shouldSkipAttachment()) {
      console.log('[AssetPage] Skipping attachment (ASSET_SKIP_ATTACHMENT=1)');
      return;
    }

    console.log('[AssetPage] Opening attachment control');
    await this.scrollUntilVisible(this.attachmentTrigger, 'attachment control').catch(() => {});

    const auto = this.isAttachmentAutomationMode();
    const uploadPath = auto ? this.resolveAttachmentFilePathForAutomation() : null;

    if (auto && uploadPath) {
      const directFile = this.page.locator('input[type="file"]').last();
      if ((await directFile.count()) > 0) {
        await directFile.setInputFiles(uploadPath);
        console.log(`[AssetPage] Auto-attached file: ${path.basename(uploadPath)}`);
        await this.page.waitForTimeout(1000);
        return;
      }

      if (await this.attachmentTrigger.isVisible().catch(() => false)) {
        const tagName = await this.attachmentTrigger.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
        if (tagName === 'input') {
          await this.attachmentTrigger.setInputFiles(uploadPath);
        } else {
          const [fileChooser] = await Promise.all([
            this.page.waitForEvent('filechooser', { timeout: 25000 }),
            this.attachmentTrigger.click({ timeout: 20000, force: true }),
          ]);
          await fileChooser.setFiles(uploadPath);
        }
        console.log(`[AssetPage] Auto-attached file via chooser: ${path.basename(uploadPath)}`);
        await this.page.waitForTimeout(1000);
        return;
      }
    }

    if (auto && !uploadPath) {
      throw new Error(
        'ASSET_ATTACHMENT_AUTO=1 requires ASSET_ATTACHMENT_FILE_PATH or fixtures/asset-attachment.png.'
      );
    }

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

  async createAssetQuick(overrides = {}) {
    await this.navigateToManageAssets();
    await this.startCreateFlow();
    await this.fillAssetForm(overrides);
    if (!this.shouldSkipAttachment() && this.isAttachmentAutomationMode()) {
      await this.attachDocumentManuallyAndWait();
    }
    await this.submitCreateForm();
    await this.verifyAssetCreatedSuccessfully();
    return this.assetData;
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

  isGlobalSearchLocator(locator) {
    return (async () => {
      const ph = ((await locator.getAttribute('placeholder').catch(() => '')) || '').trim();
      const aria = ((await locator.getAttribute('aria-label').catch(() => '')) || '').trim();
      return /anything|intoaec/i.test(`${ph} ${aria}`);
    })();
  }

  async openListSearchInput() {
    // ExpandableSearch on the asset list (near Filter) — never header global search
    if (await this.searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (!(await this.isGlobalSearchLocator(this.searchInput))) {
        return this.searchInput;
      }
    }

    console.log('[AssetPage] Opening page-level asset list search (not global search)');
    const toggle = this.listSearchToggle;
    if (await toggle.isVisible({ timeout: 8000 }).catch(() => false)) {
      await toggle.click({ force: true });
      await this.page.waitForTimeout(300).catch(() => {});
    } else {
      // Collapsed ExpandableSearch often renders as role=search with a clickable box
      const region = this.listSearchRegion;
      if (await region.isVisible({ timeout: 5000 }).catch(() => false)) {
        await region.click({ force: true }).catch(() => {});
        await this.page.waitForTimeout(300).catch(() => {});
      }
    }

    await expect(this.searchInput).toBeVisible({ timeout: 15000 });
    if (await this.isGlobalSearchLocator(this.searchInput)) {
      throw new Error(
        '[AssetPage] Resolved global header search instead of asset list search. Refusing to type into global search.'
      );
    }
    return this.searchInput;
  }

  async searchForAsset(name) {
    console.log(`[AssetPage] Searching asset list for ${name} (page ExpandableSearch only)`);

    const onListPage =
      (await this.addNewButton.isVisible().catch(() => false)) ||
      (await this.assetRequestsTab.isVisible({ timeout: 2000 }).catch(() => false));
    if (!onListPage) {
      console.log('[AssetPage] Not on Manage Assets list page, navigating there');
      await this.navigateToManageAssets();
    }

    const input = await this.openListSearchInput();
    await input.click({ force: true }).catch(() => {});
    await input.press('Control+A').catch(() => {});
    await input.fill(String(name));
    await input.press('Enter').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(500).catch(() => {});
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

  getRowActionButton(row) {
    return row
      .locator('button:has([data-testid="MoreVertIcon"])')
      .or(row.getByRole('button', { name: /more|action|options|menu|edit|delete/i }))
      .or(
        row.locator(
          'button[aria-label*="more" i], button[aria-label*="action" i], button[aria-label*="menu" i], button'
        ).last()
      )
      .first();
  }

  async openRowMenuForAsset(name) {
    await this.searchForAsset(name);
    const row = this.getAssetRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});
    const actionButton = this.getRowActionButton(row);
    await expect(actionButton).toBeVisible({ timeout: this.defaultTimeout });
    await actionButton.click();
    await expect(this.actionMenu).toBeVisible({ timeout: this.defaultTimeout });
    return row;
  }

  async clearAssetSearch() {
    console.log('[AssetPage] Clearing page-level asset list search');
    const input = await this.openListSearchInput().catch(() => null);
    if (!input) {
      return;
    }
    await input.click({ force: true }).catch(() => {});
    await input.press('Control+A').catch(() => {});
    await input.fill('');
    // Prefer clear (X) on ExpandableSearch when present
    const clearBtn = this.listSearchRegion
      .getByRole('button', { name: /clear/i })
      .or(this.page.getByRole('button', { name: /clear/i }).filter({ visible: true }))
      .first();
    if (await clearBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await clearBtn.click({ force: true }).catch(() => {});
    }
    await input.press('Enter').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async verifyAssetVisibleInList(name) {
    await this.searchForAsset(name);
    await expect(this.getAssetRow(name)).toBeVisible({ timeout: this.defaultTimeout });
  }

  async openFilterMenu() {
    console.log('[AssetPage] Opening filter menu');
    await expect(this.filterButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.filterButton.click();
    await this.page.waitForTimeout(500);
  }

  async applyAssetListFilters({ status, assetType, ownershipType } = {}) {
    await this.openFilterMenu();

    if (status) {
      const statusControl = this.page
        .getByLabel(/status/i)
        .or(this.page.getByRole('combobox').filter({ hasText: /status|available|in.?use/i }))
        .or(this.page.locator('[id*="status" i], [name*="status" i]'))
        .first();
      if (await statusControl.isVisible({ timeout: 5000 }).catch(() => false)) {
        await statusControl.click();
        await this.page.getByRole('option', { name: new RegExp(status, 'i') }).first().click().catch(async () => {
          await this.page.getByText(new RegExp(`^${status}$`, 'i')).first().click();
        });
      }
    }

    if (assetType) {
      const typeOption = this.page.getByText(new RegExp(`^${assetType}$`, 'i')).first();
      if (await typeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeOption.click();
      }
    }

    if (ownershipType) {
      const ownershipOption = this.page.getByText(new RegExp(`^${ownershipType}$`, 'i')).first();
      if (await ownershipOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await ownershipOption.click();
      }
    }

    if (await this.filterApplyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.filterApplyButton.click();
    }
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async clearAssetListFilters() {
    await this.openFilterMenu().catch(() => {});
    if (await this.filterClearButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.filterClearButton.click();
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    }
  }

  async openAssetLogForAsset(name) {
    console.log(`[AssetPage] Opening asset log for ${name}`);
    await this.searchForAsset(name);
    const row = this.getAssetRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    // Prefer clicking the row body (not the action menu button)
    const clickable = row.locator('td').first().or(row);
    await clickable.click({ position: { x: 20, y: 10 } }).catch(async () => {
      await row.click();
    });
    await expect(this.assetLogModal).toBeVisible({ timeout: this.defaultTimeout });
  }

  async verifyAssetLogModalVisible() {
    await expect(this.assetLogModal).toBeVisible({ timeout: this.defaultTimeout });
  }

  async verifyCreateButtonDisabled() {
    await expect(this.submitCreateButton).toBeVisible({ timeout: this.defaultTimeout });
    const disabled = await this.submitCreateButton.isDisabled().catch(() => false);
    const ariaDisabled = (await this.submitCreateButton.getAttribute('disabled').catch(() => null)) != null
      || (await this.submitCreateButton.getAttribute('aria-disabled').catch(() => '')) === 'true';
    expect(disabled || ariaDisabled).toBeTruthy();
  }

  async attemptCreateWithMissingRequiredFields() {
    console.log('[AssetPage] Attempting create with empty name/category');
    await this.startCreateFlow();
    await this.assetNameInput.fill('');
    await this.assetCategoryInput.fill('');
    await this.verifyCreateButtonDisabled();
  }

  async openUploadAssetsChooser() {
    console.log('[AssetPage] Opening Upload Assets chooser');
    await expect(this.addNewButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addNewButton.click();
    await expect(this.uploadAssetsOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.uploadAssetsOption.click();
  }

  async downloadBulkAssetsTemplate() {
    console.log('[AssetPage] Downloading bulk assets template');
    await this.openUploadAssetsChooser();
    const downloadPromise = this.page.waitForEvent('download', { timeout: this.defaultTimeout }).catch(() => null);
    await expect(this.downloadTemplateLink).toBeVisible({ timeout: this.defaultTimeout });
    await this.downloadTemplateLink.click();
    const download = await downloadPromise;
    if (download) {
      this.lastDownloadSuggestedName = download.suggestedFilename();
      console.log(`[AssetPage] Template download started: ${this.lastDownloadSuggestedName}`);
    }
    return download;
  }

  async uploadBulkAssetsFile(filePath) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`[AssetPage] Bulk upload file not found: ${resolved}`);
    }
    console.log(`[AssetPage] Uploading bulk assets file: ${resolved}`);
    await this.openUploadAssetsChooser();

    const fileInput = this.page.locator('input[type="file"]').last();
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(resolved);
    } else {
      const uploadTrigger = this.page
        .getByText(/upload|browse|choose\s*file|drop/i)
        .or(this.page.locator('input[type="file"]'))
        .first();
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 25000 }),
        uploadTrigger.click({ force: true }),
      ]);
      await fileChooser.setFiles(resolved);
    }

    if (await this.proceedButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(this.proceedButton).toBeEnabled({ timeout: this.defaultTimeout });
      await this.proceedButton.click();
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }

  async verifyBulkUploadResultsPage() {
    await expect(async () => {
      const onUploadRoute = /asset-management\/upload/i.test(this.page.url());
      const resultsVisible = await this.page
        .getByText(/success|failed|uploaded|upload\s*result|invalid|error/i)
        .first()
        .isVisible()
        .catch(() => false);
      expect(onUploadRoute || resultsVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }

  async downloadQrForCreatedAsset() {
    const name = this.assetData?.name;
    if (!name) {
      throw new Error('[AssetPage] No created asset name available for QR download');
    }
    console.log(`[AssetPage] Downloading QR for ${name}`);
    await this.openRowMenuForAsset(name);
    const downloadPromise = this.page.waitForEvent('download', { timeout: this.defaultTimeout }).catch(() => null);
    await expect(this.downloadQrMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.downloadQrMenuItem.click();
    const download = await downloadPromise;
    if (download) {
      this.lastDownloadSuggestedName = download.suggestedFilename();
      console.log(`[AssetPage] QR download started: ${this.lastDownloadSuggestedName}`);
    }
    return download;
  }

  async verifyQrDownloadStarted() {
    await expect(async () => {
      expect(Boolean(this.lastDownloadSuggestedName)).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async verifyDeleteMenuAbsentForAsset(name) {
    await this.openRowMenuForAsset(name);
    const deleteVisible = await this.deleteMenuItem.isVisible({ timeout: 3000 }).catch(() => false);
    expect(deleteVisible).toBeFalsy();
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  getBulkTemplateFixturePath() {
    return path.join(__dirname, '../../../../fixtures/bulkAssets.xlsx');
  }

  getInvalidBulkFixturePath() {
    return path.join(__dirname, '../../../../fixtures/bulkAssets-invalid.xlsx');
  }
}

module.exports = AssetPage;
