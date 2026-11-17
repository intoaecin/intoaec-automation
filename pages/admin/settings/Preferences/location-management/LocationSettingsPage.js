const { expect } = require('@playwright/test');
const BasePage = require('../../../../BasePage');
const urls = require('../../../../../config/urls');
const PreferencesPage = require('../PreferencesPage');

/**
 * Preferences → Location Management (Location Pool + Location Stages).
 *
 * Layering:
 *   Feature: features/admin/settings/Preferences/location-management/LocationSettings_TestCases.feature
 *   Steps:   step-definitions/admin/settings/Preferences/location-management/LocationSettingsStep.js
 *   Page:    this file
 */
class LocationSettingsPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;
    this.preferences = new PreferencesPage(page);

    this.locationManagementNav = page
      .locator('a[href*="/preferences/location-management"]')
      .or(page.getByRole('link', { name: /location management/i }))
      .or(page.getByText(/^location management$/i))
      .first();

    this.pageTitle = page
      .getByRole('heading', { name: /location (pool|stages|management)/i })
      .or(page.getByText(/^location pool$/i))
      .or(page.getByText(/^location stages$/i))
      .first();

    this.addButton = page
      .getByRole('button', { name: /^add$/i })
      .or(page.getByRole('button', { name: /add location/i }))
      .first();

    this.listViewTab = page
      .getByRole('tab', { name: /list view/i })
      .or(page.getByRole('button', { name: /list view/i }))
      .first();
    this.kanbanViewTab = page
      .getByRole('tab', { name: /kanban/i })
      .or(page.getByRole('button', { name: /kanban/i }))
      .first();

    this.sidebarPool = page
      .getByRole('button', { name: /location pool/i })
      .or(page.getByRole('link', { name: /location pool/i }))
      .or(page.getByText(/^location pool$/i))
      .first();
    this.sidebarStages = page
      .getByRole('button', { name: /location stages/i })
      .or(page.getByRole('link', { name: /location stages/i }))
      .or(page.getByText(/^location stages$/i))
      .first();

    this.offCanvas = page
      .getByRole('dialog')
      .filter({ hasText: /add location|edit location/i })
      .last();
    this.locationNameInput = this.offCanvas
      .locator('input')
      .filter({ has: page.locator('xpath=ancestor::*[.//text()[contains(.,"Location name") or contains(.,"location name")]]') })
      .first()
      .or(this.offCanvas.getByPlaceholder(/eg\.|e\.g\.|enter/i).first())
      .or(this.offCanvas.locator('input[type="text"]').first());
    this.sizeInput = this.offCanvas.locator('input[type="number"]').first();
    this.contactEmailInput = this.offCanvas.locator('input[type="email"]').first();
    this.saveLocationButton = this.offCanvas
      .getByRole('button', { name: /save location|^save$|^update$/i })
      .first();
    this.cancelOffCanvasButton = this.offCanvas
      .getByRole('button', { name: /^cancel$/i })
      .first();
    this.closeOffCanvasButton = this.offCanvas
      .getByRole('button', { name: /^close$/i })
      .first();

    this.deleteDialog = page
      .getByRole('dialog')
      .filter({ hasText: /delete/i })
      .last();
    this.deleteConfirmButton = this.deleteDialog
      .getByRole('button', { name: /^delete$/i })
      .first();
    this.deleteCancelButton = this.deleteDialog
      .getByRole('button', { name: /^cancel$/i })
      .first();

    this.resultToast = page
      .locator('.Toastify__toast, [role="alert"], .MuiSnackbar-root, .MuiAlert-root')
      .filter({ hasText: /success|created|updated|deleted|error|failed|already exists|required|invalid/i })
      .first();

    this.addStageButton = page
      .getByRole('button', { name: /add stage/i })
      .first();
    this.stageNameInput = page
      .getByPlaceholder(/add new stage|stage name|enter/i)
      .or(page.locator('input').filter({ hasText: '' }))
      .first();
    this.stageSaveButton = page.getByRole('button', { name: /^save$/i }).last();
    this.stageCancelButton = page.getByRole('button', { name: /^cancel$/i }).last();
    this.loadDefaultsButton = page
      .getByRole('button', { name: /load default/i })
      .first();

    this.lastCreatedLocation = { name: '', previousName: '' };
    this.lastCreatedStage = { name: '', previousName: '' };
    this.lastResultToastMessage = '';
  }

  logStep(msg) {
    console.log(`[LocationSettings] ${msg}`);
  }

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _uniqueSuffix() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async selectLocationManagement() {
    await this.preferences._dismissSettingsMenu();

    if (urls.isLocationManagementPreferences(this.page.url())) {
      await this.waitForPoolReady();
      this.logStep(`Already on Location Management (${this.page.url()})`);
      return;
    }

    const card = this.locationManagementNav;
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      try {
        await card.click({ timeout: 5000 });
      } catch {
        await this.page.goto(urls.locationManagementPreferences, {
          waitUntil: 'domcontentloaded',
          timeout: this.defaultTimeout,
        });
      }
    } else {
      await this.page.goto(urls.locationManagementPreferences, {
        waitUntil: 'domcontentloaded',
        timeout: this.defaultTimeout,
      });
    }

    await this.page.waitForURL(/\/preferences\/location-management/i, {
      timeout: this.defaultTimeout,
    });
    await this.waitForNetworkSettled();
    await this.waitForPoolReady();
    this.logStep(`Selected Location Management (${this.page.url()})`);
  }

  async waitForPoolReady() {
    await expect
      .poll(async () => urls.isLocationManagementPreferences(this.page.url()), {
        timeout: this.defaultTimeout,
      })
      .toBeTruthy();
    const ready = this.addButton
      .or(this.page.getByText(/add location|no location|location pool/i).first())
      .or(this.listViewTab);
    await expect(ready.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectOnLocationPool() {
    await expect(this.page).toHaveURL(/\/preferences\/location-management/i, {
      timeout: this.defaultTimeout,
    });
    const tab = String(new URL(this.page.url(), urls.adminBase).searchParams.get('tab') || '');
    expect(tab === '' || tab === 'pool').toBeTruthy();
    await expect(this.addButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('On Location Pool tab with Add visible');
  }

  async openSidebarTab(tabName) {
    const isStages = /stage/i.test(tabName);
    const target = isStages ? this.sidebarStages : this.sidebarPool;
    if (await target.isVisible({ timeout: 4000 }).catch(() => false)) {
      await target.click({ timeout: this.uiTimeout });
    } else {
      await this.page.goto(
        isStages
          ? urls.locationManagementPreferencesStages
          : urls.locationManagementPreferences,
        { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout }
      );
    }
    await this.waitForNetworkSettled();
    if (isStages) {
      await expect(this.page).toHaveURL(/tab=stages/i, { timeout: this.defaultTimeout });
    } else {
      await this.expectOnLocationPool();
    }
    this.logStep(`Opened sidebar tab: ${tabName}`);
  }

  async openInvalidTabFallback() {
    await this.page.goto(
      `${urls.locationManagementPreferences}?tab=not-a-real-tab`,
      { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout }
    );
    await this.waitForNetworkSettled();
    await this.expectOnLocationPool();
    this.logStep('Invalid tab fell back to Location Pool');
  }

  async switchPoolView(viewName) {
    const isKanban = /kanban/i.test(viewName);
    const tab = isKanban ? this.kanbanViewTab : this.listViewTab;
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    await tab.click({ timeout: this.uiTimeout });
    await this.page.waitForTimeout(500).catch(() => {});
    this.logStep(`Switched pool view to ${viewName}`);
  }

  async clickAddLocation() {
    const emptyAdd = this.page.getByRole('button', { name: /add location/i }).first();
    if (await emptyAdd.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emptyAdd.click({ timeout: this.uiTimeout });
    } else {
      await expect(this.addButton).toBeVisible({ timeout: this.defaultTimeout });
      await this.addButton.click({ timeout: this.uiTimeout });
    }
    await expect(this.offCanvas).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Opened Add Location panel');
  }

  async _locationNameField() {
    const byLabel = this.offCanvas
      .locator('.MuiFormControl-root, [class*="MuiBox"]')
      .filter({ hasText: /location name/i })
      .locator('input')
      .first();
    if (await byLabel.isVisible({ timeout: 2000 }).catch(() => false)) return byLabel;
    return this.offCanvas.locator('input[type="text"]:visible').first();
  }

  async submitEmptyLocationForm() {
    await this.clickAddLocation();
    await this.saveLocationButton.click({ timeout: this.uiTimeout });
    const error = this.offCanvas.getByText(/required|please enter|location name/i).first();
    await expect(error).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Empty location form showed validation');
  }

  async fillInvalidContactAndSize() {
    await this.clickAddLocation();
    const nameInput = await this._locationNameField();
    await nameInput.fill(`Invalid Check ${this._uniqueSuffix()}`);
    if (await this.contactEmailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.contactEmailInput.fill('not-an-email');
    }
    if (await this.sizeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.sizeInput.fill('-10');
    }
    await this.saveLocationButton.click({ timeout: this.uiTimeout });
    const error = this.offCanvas
      .getByText(/invalid|email|positive|greater|required|size/i)
      .first();
    await expect(error).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Invalid email/size validation shown');
  }

  async createPoolLocation(baseName = 'Auto Loc') {
    const name = `${String(baseName).trim()} ${this._uniqueSuffix()}`;
    await this.clickAddLocation();
    const nameInput = await this._locationNameField();
    await nameInput.fill(name);

    const addressField = this.offCanvas
      .locator('.MuiFormControl-root, [class*="MuiBox"]')
      .filter({ hasText: /^address$/i })
      .locator('input, textarea')
      .first();
    if (await addressField.isVisible({ timeout: 1500 }).catch(() => false)) {
      await addressField.fill('Automation Street 1').catch(() => {});
    }

    await this.saveLocationButton.click({ timeout: this.uiTimeout });
    await this._captureToast();
    await expect(this.offCanvas).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    await this.expectLocationInList(name);
    this.lastCreatedLocation = { name, previousName: '' };
    this.logStep(`Created pool location: ${name}`);
    return name;
  }

  async cancelAddLocationWithoutSaving() {
    const before = await this._listTextSnapshot();
    await this.clickAddLocation();
    const nameInput = await this._locationNameField();
    await nameInput.fill(`Cancel Me ${this._uniqueSuffix()}`);
    if (await this.cancelOffCanvasButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.cancelOffCanvasButton.click({ timeout: this.uiTimeout });
    } else {
      await this.closeOffCanvasButton.click({ timeout: this.uiTimeout });
    }
    await expect(this.offCanvas).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    const after = await this._listTextSnapshot();
    expect(after).toBe(before);
    this.logStep('Cancel add left list unchanged');
  }

  async _listTextSnapshot() {
    const table = this.page.locator('table').first();
    if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
      return String((await table.innerText().catch(() => '')) || '');
    }
    return String((await this.page.locator('main, [role="main"]').first().innerText().catch(() => '')) || '');
  }

  locationRow(name) {
    const re = new RegExp(this._escapeRegex(name), 'i');
    return this.page.locator('tr').filter({ hasText: re }).first();
  }

  async expectLocationInList(name) {
    const row = this.locationRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Location listed: ${name}`);
  }

  async expectLocationNotInList(name) {
    const row = this.locationRow(name);
    await expect(row).toHaveCount(0, { timeout: this.uiTimeout }).catch(async () => {
      await expect(row).toBeHidden({ timeout: this.uiTimeout });
    });
    this.logStep(`Location not listed: ${name}`);
  }

  async editPoolLocation(name, nextBaseName = 'Auto Loc Edited') {
    const row = this.locationRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.getByRole('button', { name: /^edit$/i }).click({ timeout: this.uiTimeout });
    await expect(this.offCanvas).toBeVisible({ timeout: this.defaultTimeout });
    const updated = `${String(nextBaseName).trim()} ${this._uniqueSuffix()}`;
    const nameInput = await this._locationNameField();
    await nameInput.fill(updated);
    await this.saveLocationButton.click({ timeout: this.uiTimeout });
    await this._captureToast();
    await this.waitForNetworkSettled();
    await this.expectLocationInList(updated);
    this.lastCreatedLocation = {
      name: updated,
      previousName: name,
    };
    this.logStep(`Edited location ${name} → ${updated}`);
    return updated;
  }

  async changeLocationStage(name, stageLabel = 'Approved') {
    const row = this.locationRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    // Stage chip is a ButtonBase with aria-haspopup="menu" (EditableLocationStageChip).
    const chip = row
      .locator('button[aria-haspopup="menu"], [role="button"][aria-haspopup="menu"]')
      .or(row.getByRole('button', { name: /change stage|click to change stage/i }))
      .or(row.locator('button, [role="button"]').filter({ hasText: /new|approved|rejected/i }))
      .first();
    await expect(chip).toBeVisible({ timeout: this.defaultTimeout });
    await chip.click({ timeout: this.uiTimeout });

    // Click the MenuItem row — not the nested StageChip <span> (getByText hits that
    // and MuiMenu presentation intercepts the pointer).
    const menu = this.page.locator('.MuiMenu-root, [role="presentation"].MuiPopover-root').last();
    await expect(menu).toBeVisible({ timeout: this.uiTimeout });
    const stageRe = new RegExp(this._escapeRegex(stageLabel), 'i');
    const menuItem = menu
      .getByRole('menuitem')
      .filter({ hasText: stageRe })
      .first();
    await expect(menuItem).toBeVisible({ timeout: this.uiTimeout });
    await menuItem.click({ timeout: this.uiTimeout });

    await this._captureToast();
    await this.waitForNetworkSettled();
    await expect(row.getByText(stageRe).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.logStep(`Changed stage for ${name} → ${stageLabel}`);
  }

  async openDeleteForLocation(name) {
    const row = this.locationRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.getByRole('button', { name: /^delete$/i }).click({ timeout: this.uiTimeout });
    await expect(this.deleteDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Opened delete dialog for ${name}`);
  }

  async confirmDeleteLocation() {
    await this.deleteConfirmButton.click({ timeout: this.uiTimeout });
    await this._captureToast();
    await expect(this.deleteDialog).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    this.logStep('Confirmed location delete');
  }

  async cancelDeleteLocation() {
    await this.deleteCancelButton.click({ timeout: this.uiTimeout });
    await expect(this.deleteDialog).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
    this.logStep('Cancelled location delete');
  }

  async deletePoolLocation(name) {
    await this.openDeleteForLocation(name);
    await this.confirmDeleteLocation();
    await this.expectLocationNotInList(name);
  }

  async expectAllocatedRowLocked(name) {
    const row = this.locationRow(name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await expect(row.getByText(/allocated/i).first()).toBeVisible({ timeout: this.uiTimeout });
    const edit = row.getByRole('button', { name: /^edit$/i });
    const del = row.getByRole('button', { name: /^delete$/i });
    expect(await edit.count()).toBe(0);
    expect(await del.count()).toBe(0);
    this.logStep(`Allocated lock verified for ${name}`);
  }

  async reloadAndExpectLocation(name) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitForNetworkSettled();
    await this.waitForPoolReady();
    await this.expectLocationInList(name);
  }

  async _captureToast() {
    if (await this.resultToast.isVisible({ timeout: 8000 }).catch(() => false)) {
      this.lastResultToastMessage = String(
        (await this.resultToast.innerText().catch(() => '')) || ''
      ).trim();
    }
  }

  async expectToastMatching(pattern) {
    await expect(this.resultToast).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.resultToast).toContainText(pattern, { timeout: this.uiTimeout });
  }

  // --- Stages ---

  async waitForStagesReady() {
    await expect(this.page).toHaveURL(/tab=stages/i, { timeout: this.defaultTimeout });
    const ready = this.addStageButton
      .or(this.loadDefaultsButton)
      .or(this.page.getByText(/new|approved|rejected|stage/i).first());
    await expect(ready.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async ensureDefaultStagesPresent() {
    await this.openSidebarTab('stages');
    await this.waitForStagesReady();
    if (await this.loadDefaultsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.loadDefaultsButton.click({ timeout: this.uiTimeout });
      await this._captureToast();
      await this.waitForNetworkSettled();
    }
    for (const label of ['New', 'Approved', 'Rejected']) {
      const item = this.page.getByText(new RegExp(`^${label}$`, 'i')).first();
      await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    }
    this.logStep('Default stages present');
  }

  async addCustomStage(baseName = 'Auto Stage') {
    const name = `${String(baseName).trim()} ${this._uniqueSuffix()}`.slice(0, 50);
    await this.openSidebarTab('stages');
    await this.waitForStagesReady();
    await expect(this.addStageButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addStageButton.click({ timeout: this.uiTimeout });
    const input = this.page
      .getByPlaceholder(/add new stage|stage/i)
      .or(this.page.locator('input[type="text"]:visible').last());
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.fill(name);
    await this.stageSaveButton.click({ timeout: this.uiTimeout });
    await this._captureToast();
    await this.waitForNetworkSettled();
    await expect(this.page.getByText(name).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.lastCreatedStage = { name, previousName: '' };
    this.logStep(`Created stage: ${name}`);
    return name;
  }

  async selectStage(name) {
    const item = this.page.getByText(new RegExp(`^${this._escapeRegex(name)}$`, 'i')).first();
    await expect(item).toBeVisible({ timeout: this.defaultTimeout });
    await item.click({ timeout: this.uiTimeout });
    await this.page.waitForTimeout(300).catch(() => {});
  }

  async editCustomStage(name, nextBaseName = 'Auto Stage Edited') {
    await this.selectStage(name);
    const updated = `${String(nextBaseName).trim()} ${this._uniqueSuffix()}`.slice(0, 50);
    const input = this.page
      .getByPlaceholder(/add new stage|stage/i)
      .or(this.page.locator('input[type="text"]:visible').last());
    await expect(input).toBeEnabled({ timeout: this.uiTimeout });
    await input.fill(updated);
    await this.stageSaveButton.click({ timeout: this.uiTimeout });
    await this._captureToast();
    await this.waitForNetworkSettled();
    await expect(this.page.getByText(updated).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    this.lastCreatedStage = { name: updated, previousName: name };
    this.logStep(`Edited stage ${name} → ${updated}`);
    return updated;
  }

  async expectDuplicateStageValidation(name) {
    await this.addStageButton.click({ timeout: this.uiTimeout });
    const input = this.page
      .getByPlaceholder(/add new stage|stage/i)
      .or(this.page.locator('input[type="text"]:visible').last());
    await input.fill(name);
    await this.stageSaveButton.click({ timeout: this.uiTimeout });
    const error = this.page.getByText(/already exists|duplicate/i).first();
    await expect(error).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Duplicate stage validation shown');
  }

  async expectMaxLengthStageValidation() {
    await this.addStageButton.click({ timeout: this.uiTimeout });
    const input = this.page
      .getByPlaceholder(/add new stage|stage/i)
      .or(this.page.locator('input[type="text"]:visible').last());
    const longName = 'X'.repeat(60);
    await input.fill(longName);
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(50);
    this.logStep('Stage name max length enforced');
    await this.stageCancelButton.click({ timeout: this.uiTimeout }).catch(() => {});
  }

  async deleteCustomStage(name) {
    await this.selectStage(name);
    const deleteBtn = this.page.getByRole('button', { name: /^delete$/i }).first();
    await expect(deleteBtn).toBeVisible({ timeout: this.defaultTimeout });
    await deleteBtn.click({ timeout: this.uiTimeout });
    if (await this.deleteDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const confirm = this.deleteDialog
        .getByRole('button', { name: /^delete$|^confirm$|^yes$/i })
        .first();
      await confirm.click({ timeout: this.uiTimeout });
    }
    await this._captureToast();
    await this.waitForNetworkSettled();
    await expect(this.page.getByText(new RegExp(`^${this._escapeRegex(name)}$`, 'i'))).toHaveCount(
      0,
      { timeout: this.defaultTimeout }
    );
    this.logStep(`Deleted stage: ${name}`);
  }

  async expectDefaultStageProtected(label = 'New') {
    await this.selectStage(label);
    const input = this.page
      .getByPlaceholder(/add new stage|stage/i)
      .or(this.page.locator('input[type="text"]:visible').last());
    await expect(input).toBeDisabled({ timeout: this.uiTimeout });
    const deleteBtn = this.page.getByRole('button', { name: /^delete$/i }).first();
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(deleteBtn).toBeDisabled({ timeout: 2000 }).catch(() => {});
    }
    this.logStep(`Default stage protected: ${label}`);
  }
}

module.exports = LocationSettingsPage;
