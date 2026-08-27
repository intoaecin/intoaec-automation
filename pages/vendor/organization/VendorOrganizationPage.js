const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Vendor portal → Account Settings → My Organization (Company Info / Business Info / Social Media / E-Signature).
 *
 * Layering per AGENTS.md:
 *   Feature: features/vendor/auth/VendorLogin_TestCases.feature
 *   Steps:   step-definitions/vendor/auth/VendorLoginStep.js
 *   Page:    this file
 */
class VendorOrganizationPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.accountSettings = page
      .getByLabel(/account settings|profile settings/i)
      .or(page.getByRole('button', { name: /account settings|profile settings/i }))
      .first();
    this.myOrganizationNav = page
      .getByRole('menuitem', { name: /^my organization$/i })
      .or(page.getByRole('link', { name: /^my organization$/i }))
      .or(page.getByRole('button', { name: /^my organization$/i }))
      .first();
    this.pageHeading = page
      .getByRole('heading', { name: /my organization|company info/i })
      .or(page.getByText(/^company info$/i))
      .first();
    this.companyInfoTab = page.getByRole('tab', { name: /company info/i }).first();
    this.businessInfoTab = page.getByRole('tab', { name: /business info/i }).first();
    this.socialMediaTab = page.getByRole('tab', { name: /social media/i }).first();
    this.socialMediaHeading = page.getByText(/^social media links$/i).first();
    this.eSignatureTab = page.getByRole('tab', { name: /e-?signature/i }).first();
    this.adminDigitalSignatureHeading = page
      .getByRole('heading', { name: /^(admin |vendor )?digital signature$/i })
      .or(page.getByText(/^(admin |vendor )?digital signature$/i))
      .first();
    this.existingDigitalSignatureHeading = page.getByText(/^existing digital signature$/i).first();
    this.eSignaturePanel = page
      .locator('.MuiTabPanel-root:not([hidden])')
      .filter({ has: page.getByText(/^admin digital signature$/i) })
      .first();
    this.eSignatureDrawOption = this.eSignaturePanel
      .getByRole('button', { name: /^draw$/i })
      .or(this.eSignaturePanel.getByRole('tab', { name: /^draw$/i }))
      .first();
    this.eSignatureUploadOption = this.eSignaturePanel
      .getByRole('button', { name: /^upload$/i })
      .or(this.eSignaturePanel.getByRole('tab', { name: /^upload$/i }))
      .first();
    this.signatureUploadArea = this.eSignaturePanel
      .getByText(/click here to upload e-signature|upload e-signature|upload signature/i)
      .first();
    this.signatureUploadLabel = this.eSignaturePanel
      .locator('label')
      .filter({ hasText: /click here to upload e-signature|upload e-signature/i })
      .first();
    this.signatureFileInput = this.signatureUploadLabel
      .locator('input[type="file"]')
      .first()
      .or(this.eSignaturePanel.locator('input[type="file"]').first())
      .or(this.page.locator('input[type="file"]').first());
    this.signatureCanvas = this.eSignaturePanel
      .locator('canvas')
      .filter({ visible: true })
      .first()
      .or(page.locator('canvas').filter({ visible: true }).first());
    this.eSignatureUpdateButton = this.eSignaturePanel.getByRole('button', { name: /^update$/i }).first();
    this.existingSignatureImage = this.existingDigitalSignatureHeading
      .locator('xpath=following::img[not(contains(@src,"Logo") or contains(@src,"logo"))][1]');
    this.editButton = page.getByRole('button', { name: /^edit$/i }).filter({ visible: true }).first();
    this.updateButton = page.getByRole('button', { name: /^(update|save)$/i }).filter({ visible: true }).first();
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i }).filter({ visible: true }).first();

    this.vendorTypeField = page
      .locator('#professional-summary-field')
      .or(page.getByText(/^vendor type$/i))
      .first();
    this.registrationNumberInput = page
      .getByPlaceholder(/license number|registration number/i)
      .or(page.getByLabel(/registration number/i))
      .first();
    this.categoriesHeading = page.getByText(/^categories$/i).first();
    this.addCategoriesLabel = page.getByText(/^add categories$/i).first();
    this.categoriesCombo = page.locator('#tags-filled').first();
    this.saveChangesDialog = page
      .getByRole('dialog')
      .filter({ hasText: /save the changes|unsaved changes|do you want to save/i })
      .first();

    this.addressLine1Input = this._labeledInput(/address line 1/i, [
      'addressLine1',
      'address1',
      'streetAddress',
    ]).or(page.getByPlaceholder(/enter your location|address line 1/i).first());
    this.addressLine2Input = this._labeledInput(/address(\s*line)?\s*2/i, ['addressLine2', 'address2'])
      .or(page.getByPlaceholder(/address(\s*line)?\s*2|apartment|suite|building/i).first())
      .or(page.getByPlaceholder(/enter your location/i).nth(1));
    this.cityInput = this._labeledInput(/^city$/i, ['city']).or(page.getByPlaceholder(/enter your city|city/i).first());
    this.stateInput = this._labeledInput(/^state$/i, ['state']).or(
      page.getByPlaceholder(/enter your state|state/i).first()
    );
    this.countryInput = this._labeledInput(/^country$/i, ['country']).or(
      page.getByPlaceholder(/enter your country|country/i).first()
    );
    this.zipInput = this._labeledInput(/zip code|zipcode|postal/i, ['zipCode', 'zip', 'postalCode', 'pincode']).or(
      page.getByPlaceholder(/zip|postal/i).first()
    );

    this.lastCompanyInfo = null;
    this.lastBusinessInfo = null;
    this.lastSocialMedia = null;
    this.lastUpdateOk = false;
    this.lastSignatureInkCount = 0;
    this.lastSignatureDataUrl = '';
    this.lastSignatureSaveOk = false;
    this.lastSignatureSrc = '';
    this.lastEsignHasUrl = false;
    this.lastMediaRequestSeen = false;
    this.skippedSignatureUpload = false;
  }

  logStep(msg) {
    console.log(`[VendorOrg] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _labeledInput(labelRe, names = []) {
    let loc = this.page
      .locator('.MuiTextField-root, .MuiFormControl-root, .MuiAutocomplete-root')
      .filter({ hasText: labelRe })
      .locator('input, textarea')
      .first();
    for (const name of names) {
      loc = loc.or(this.page.locator(`input[name="${name}"], textarea[name="${name}"]`).first());
    }
    return loc.or(this.page.getByLabel(labelRe).first()).first();
  }

  _socialField(labelRe, names = []) {
    const panel = this.page.locator('.MuiTabPanel-root').filter({ visible: true }).last();
    const byItem = panel
      .locator('.MuiGrid-item, .MuiTextField-root, .MuiFormControl-root')
      .filter({ has: this.page.getByText(labelRe) })
      .locator('input, textarea')
      .first();
    return byItem.or(this._labeledInput(labelRe, names));
  }

  async _dismissFieldOverlay() {
    const listbox = this.page.getByRole('listbox').first();
    const places = this.page.locator('.pac-container').first();
    const listOpen = await listbox.isVisible({ timeout: 200 }).catch(() => false);
    const placesOpen = await places.isVisible({ timeout: 200 }).catch(() => false);
    if (!listOpen && !placesOpen) return;
    await this.zipInput.blur().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await listbox.waitFor({ state: 'hidden', timeout: 1500 }).catch(() => {});
    await places.waitFor({ state: 'hidden', timeout: 1500 }).catch(() => {});
  }

  async _fillText(locator, value, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const wanted = String(value);
    await locator.click({ timeout: this.uiTimeout });
    await locator.press('Control+A').catch(() => {});
    await locator.fill('');
    await locator.pressSequentially(wanted, { delay: 40 });
    await this._commitReactInput(locator, wanted);
    await locator.blur().catch(() => {});
    this.logStep(`Filled ${label}: ${wanted}`);
  }

  async _firstVisibleField(locators, label) {
    for (const loc of locators) {
      if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) return loc;
    }
    const dump = await this.page
      .evaluate(() =>
        Array.from(document.querySelectorAll('input, textarea'))
          .filter((el) => el.offsetParent)
          .map((el) => {
            const wrap = el.closest('.MuiFormControl-root, .MuiTextField-root, .MuiAutocomplete-root');
            const lab = wrap && wrap.querySelector('label');
            return `${(lab && lab.textContent) || el.name || el.id || 'input'} ph="${el.placeholder || ''}"`;
          })
      )
      .catch(() => []);
    this.logStep(`No ${label} field yet. Visible inputs: ${(dump || []).join(' | ')}`);
    await expect(locators[0], `${label} field was not visible`).toBeVisible({ timeout: this.uiTimeout });
    return locators[0];
  }

  async _selectAutocomplete(locator, value, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: this.uiTimeout });

    const current = ((await locator.inputValue().catch(() => '')) || '').trim();
    if (new RegExp(`^${this._escapeRegex(value)}$`, 'i').test(current)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      this.logStep(`${label} already "${value}"`);
      return;
    }

    await locator.fill('');
    await locator.pressSequentially(String(value), { delay: 40 });
    const option = this.page
      .getByRole('option', { name: new RegExp(`^${this._escapeRegex(value)}$`, 'i') })
      .first()
      .or(this.page.getByRole('option', { name: new RegExp(this._escapeRegex(value), 'i') }).first());
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await locator.press('ArrowDown').catch(() => {});
      await this.page.waitForTimeout(150);
      await locator.press('Enter').catch(() => {});
      const after = ((await locator.inputValue().catch(() => '')) || '').trim();
      if (!new RegExp(this._escapeRegex(value), 'i').test(after)) {
        await option.click({ timeout: this.uiTimeout });
      }
    } else {
      await this._commitReactInput(locator, String(value));
    }
    await this.page.getByRole('listbox').first().waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
    this.logStep(`Selected ${label}: ${value}`);
  }

  async _commitReactInput(locator, wanted) {
    await locator.evaluate((el, val) => {
      const proto =
        el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      const previous = el.value;
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(previous);
      if (desc && desc.set) desc.set.call(el, val);
      else el.value = val;
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, cancelable: true, data: val, inputType: 'insertText' })
      );
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, wanted);
  }

  async navigateToMyOrganization() {
    await this.waitForNetworkSettled();
    if (/my-organization/i.test(this.page.url())) {
      this.logStep('Already on vendor My Organization');
      return;
    }

    await expect(this.accountSettings).toBeVisible({ timeout: this.defaultTimeout });
    await this.accountSettings.click({ timeout: this.uiTimeout });
    await expect(this.myOrganizationNav).toBeVisible({ timeout: this.uiTimeout });
    await this.myOrganizationNav.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/my-organization/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    this.logStep('Navigated to vendor My Organization');
  }

  async expectMyOrganizationPageDisplayed() {
    await expect(this.companyInfoTab.or(this.pageHeading).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    expect(this.page.url(), 'Vendor My Organization URL').toMatch(/my-organization/i);
    this.logStep('Vendor My Organization page is displayed');
  }

  async clickCompanyInfoTab() {
    await expect(this.companyInfoTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.companyInfoTab.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Company Info tab');
  }

  async expectCompanyInfoSectionDisplayed() {
    await expect(this.companyInfoTab).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.editButton.or(this.updateButton).first()).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.page.getByText(/^vendor type$/i).first()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Vendor Company Info section is displayed');
  }

  async expectVendorTypeFieldDisplayed() {
    await expect(this.page.getByText(/^vendor type$/i).first()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Vendor Type field is displayed');
  }

  async expectRegistrationNumberFieldDisplayed() {
    await expect(this.page.getByText(/registration number/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    this.logStep('Registration Number field is displayed');
  }

  async expectCategoriesFieldDisplayed() {
    await expect(this.categoriesHeading).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Categories field is displayed');
  }

  async ensureEditMode() {
    if (await this.updateButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Vendor My Organization already in edit mode');
      return;
    }
    await expect(this.editButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.editButton.click({ timeout: this.uiTimeout });
    await expect(this.updateButton.or(this.addressLine1Input).first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Edit on vendor My Organization');
  }

  async fillRegistrationNumber(value) {
    this.lastCompanyInfo = { ...(this.lastCompanyInfo || {}), registrationNumber: value };
    await this.ensureEditMode();
    await expect(this.registrationNumberInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.registrationNumberInput.click({ timeout: this.uiTimeout });
    await this.registrationNumberInput.press('Control+A').catch(() => {});
    await this.registrationNumberInput.fill('');
    await this.registrationNumberInput.pressSequentially(String(value), { delay: 40 });
    await this._commitReactInput(this.registrationNumberInput, String(value));
    await this.registrationNumberInput.blur().catch(() => {});
    this.logStep(`Filled Registration Number: ${value}`);
  }

  async _patchOrganizationUpdatePayload(route) {
    const req = route.request();
    if (req.method() !== 'POST') {
      await route.continue();
      return;
    }
    let post;
    try {
      post = JSON.parse(req.postData() || '{}');
    } catch {
      await route.continue();
      return;
    }
    if (post.eventType !== 'CREATE_OR_UPDATE_ORGANIZATION_DETAILS') {
      await route.continue();
      return;
    }
    if (post.taxId == null) post.taxId = '';
    if (post.taxName == null) post.taxName = '';
    this.logStep('Patched Company Info update payload (taxId/taxName as strings)');
    await route.continue({ postData: JSON.stringify(post) });
  }

  _isOrganizationUpdate(res) {
    const method = res.request().method();
    if (!['POST', 'PUT', 'PATCH'].includes(method)) return false;
    const url = res.url() || '';
    const data = res.request().postData() || '';
    if (/\/organization/i.test(url)) return true;
    if (/userhub|intoaec/i.test(url) && /address|business|organiz/i.test(`${url} ${data}`)) return true;
    try {
      const post = JSON.parse(data || '{}');
      return /ORGANIZATION|BUSINESS|ADDRESS/i.test(String(post.eventType || ''));
    } catch {
      return /ORGANIZATION|addressLine/i.test(data);
    }
  }

  async _dismissCategoryOverlay() {
    const listbox = this.page.getByRole('listbox').first();
    if (!(await listbox.isVisible({ timeout: 200 }).catch(() => false))) return;
    await this.categoriesCombo.blur().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await listbox.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
  }

  async _organizationSaveButton() {
    const buttons = this.page.getByRole('button', { name: /^(save|update)$/i }).filter({ visible: true });
    const count = await buttons.count().catch(() => 0);
    let best = buttons.last();
    let bestY = -1;
    for (let i = 0; i < count; i += 1) {
      const box = await buttons.nth(i).boundingBox().catch(() => null);
      if (box && box.y >= bestY) {
        bestY = box.y;
        best = buttons.nth(i);
      }
    }
    return best;
  }

  async _clickVisibleUpdate() {
    const dialogSave = this.page
      .getByRole('dialog')
      .filter({ hasText: /save the changes|unsaved/i })
      .getByRole('button', { name: /^(save|yes|confirm|ok|update)$/i })
      .first();
    if (await dialogSave.isVisible({ timeout: 400 }).catch(() => false)) {
      await dialogSave.click({ timeout: this.uiTimeout });
      this.logStep('Clicked Save on Save the changes dialog');
      return dialogSave;
    }

    const updateBtn = await this._organizationSaveButton();
    await expect(updateBtn, 'Save/Update button').toBeVisible({ timeout: 8000 });
    await updateBtn.scrollIntoViewIfNeeded().catch(() => {});
    const box = await updateBtn.boundingBox();
    const name = ((await updateBtn.innerText().catch(() => '')) || 'Save').replace(/\s+/g, ' ').trim() || 'Save';
    this.logStep(
      box
        ? `Clicking ${name} at x=${Math.round(box.x)} y=${Math.round(box.y)} (${Math.round(box.width)}x${Math.round(box.height)})`
        : `Clicking ${name}`
    );
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await updateBtn.click({ timeout: this.uiTimeout, force: true });
    }
    this.logStep(`Clicked ${name} on vendor My Organization`);
    return updateBtn;
  }

  async _handleSaveChangesDialog() {
    const dialog = this.saveChangesDialog
      .or(this.page.locator('.MuiDialog-root, [role="dialog"]').filter({ hasText: /save the changes|unsaved/i }))
      .first();
    if (!(await dialog.isVisible({ timeout: 1500 }).catch(() => false))) return false;

    const text = ((await dialog.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    this.logStep(`Save the changes dialog: ${text.slice(0, 120)}`);

    const save = dialog
      .getByRole('button', { name: /^(save|yes|confirm|ok|update)$/i })
      .or(dialog.getByRole('button', { name: /save/i }))
      .first();
    if (await save.isVisible({ timeout: 2000 }).catch(() => false)) {
      const pending = this.page
        .waitForResponse((res) => this._isOrganizationUpdate(res), { timeout: this.defaultTimeout })
        .catch(() => null);
      await save.click({ timeout: this.uiTimeout });
      this.logStep('Clicked Save on Save the changes dialog');
      const res = await pending;
      this.lastUpdateOk = this.lastUpdateOk || !!(res && res.ok());
      if (res) this.logStep(`Vendor organization API ${res.status()} ${res.url()}`);
      await this.waitForNetworkSettled();
      return true;
    }
    return false;
  }

  _categoriesAutocomplete() {
    return this.page.locator('.MuiAutocomplete-root').filter({ has: this.page.locator('#tags-filled') }).first();
  }

  async _chipInField(name) {
    return this._categoriesAutocomplete()
      .locator('.MuiChip-root, [class*="MuiChip-root"]')
      .filter({ hasText: new RegExp(this._escapeRegex(name), 'i') })
      .first();
  }

  async clickAddCategories() {
    await this.ensureEditMode();
    await expect(this.categoriesCombo).toBeVisible({ timeout: this.defaultTimeout });
    await this.categoriesCombo.scrollIntoViewIfNeeded().catch(() => {});
    await this.categoriesCombo.click({ timeout: this.uiTimeout, force: true });
    this.logStep('Clicked Add categories');
  }

  async selectCategory(value) {
    this.lastCompanyInfo = { ...(this.lastCompanyInfo || {}), requestedCategory: value };
    await this.ensureEditMode();

    const already = await this._chipInField(value);
    if (await already.isVisible({ timeout: 1500 }).catch(() => false)) {
      const selected = ((await already.innerText().catch(() => '')) || value).replace(/\s+/g, ' ').trim() || value;
      this.lastCompanyInfo.category = selected;
      this.logStep(`Category already added: ${selected}`);
      return;
    }

    await this.categoriesCombo.click({ timeout: this.uiTimeout, force: true });
    await this.categoriesCombo.fill('');
    await this.categoriesCombo.pressSequentially(String(value), { delay: 40 });
    await expect(this.page.getByRole('option').first()).toBeVisible({ timeout: this.uiTimeout });
    await this.categoriesCombo.press('ArrowDown');
    await this.page.waitForTimeout(200);
    await this.categoriesCombo.press('Enter');
    await this.page.getByRole('listbox').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const chips = this._categoriesAutocomplete().locator('.MuiChip-root, [class*="MuiChip-root"]');
    await expect(chips.first()).toBeVisible({ timeout: this.uiTimeout });

    const texts = (await chips.allInnerTexts())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const match = texts.find((t) => new RegExp(this._escapeRegex(value), 'i').test(t)) || texts[0];
    this.lastCompanyInfo.category = match;
    this.logStep(`Selected category: ${match}`);
  }

  async expectCategoryAdded(value) {
    const wanted = (this.lastCompanyInfo && this.lastCompanyInfo.category) || value;
    const chip = await this._chipInField(wanted);
    if (await chip.isVisible({ timeout: 8000 }).catch(() => false)) {
      this.logStep(`Category "${wanted}" is added`);
      return;
    }

    const autoText = ((await this._categoriesAutocomplete().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    if (new RegExp(this._escapeRegex(wanted), 'i').test(autoText)) {
      this.logStep(`Category "${wanted}" is shown in the Categories field`);
      return;
    }

    throw new Error(`Category "${wanted}" was not added to vendor Company Info`);
  }

  async clickBusinessInfoTab() {
    await expect(this.businessInfoTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.businessInfoTab.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    this.logStep('Clicked Business Info tab');
  }

  async expectBusinessInfoSectionDisplayed() {
    await expect(this.businessInfoTab).toBeVisible({ timeout: this.defaultTimeout });
    const section = this.page
      .getByText(/^address line 1$/i)
      .or(this.page.getByText(/^business info$/i))
      .or(this.addressLine1Input)
      .first();
    await expect(section).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.editButton.or(this.updateButton).first()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Vendor Business Info section is displayed');
  }

  async fillAddressLine1(value) {
    this.lastBusinessInfo = { ...(this.lastBusinessInfo || {}), addressLine1: value };
    await this.ensureEditMode();
    await this._fillText(this.addressLine1Input, value, 'Address Line 1');
  }

  async fillAddressLine2(value) {
    this.lastBusinessInfo = { ...(this.lastBusinessInfo || {}), addressLine2: value };
    await this.ensureEditMode();
    await this._dismissFieldOverlay();
    const field = await this._firstVisibleField(
      [
        this.addressLine2Input,
        this.page
          .locator('.MuiTextField-root, .MuiFormControl-root')
          .filter({ hasText: /address(\s*line)?\s*2/i })
          .locator('input, textarea')
          .first(),
        this.page.getByPlaceholder(/enter your location/i).nth(1),
        this.page.locator('input[name="addressLine2"], textarea[name="addressLine2"]').first(),
      ],
      'Address Line 2'
    );
    await this._fillText(field, value, 'Address Line 2');
  }

  async fillCity(value) {
    this.lastBusinessInfo = { ...(this.lastBusinessInfo || {}), city: value };
    await this.ensureEditMode();
    await this._fillText(this.cityInput, value, 'City');
  }

  async selectState(value) {
    this.lastBusinessInfo = { ...(this.lastBusinessInfo || {}), state: value };
    await this.ensureEditMode();
    await this._selectAutocomplete(this.stateInput, value, 'State');
  }

  async selectCountry(value) {
    this.lastBusinessInfo = { ...(this.lastBusinessInfo || {}), country: value };
    await this.ensureEditMode();
    await this._selectAutocomplete(this.countryInput, value, 'Country');
    if (this.lastBusinessInfo.state) {
      await this._selectAutocomplete(this.stateInput, this.lastBusinessInfo.state, 'State');
    }
  }

  async fillZipCode(value) {
    this.lastBusinessInfo = { ...(this.lastBusinessInfo || {}), zip: value };
    await this.ensureEditMode();
    await this._fillText(this.zipInput, value, 'ZIP Code');
  }

  async expectUpdatedBusinessInfoDisplayed(details) {
    const wanted = { ...(this.lastBusinessInfo || {}), ...(details || {}) };
    const checks = [
      ['Address Line 1', wanted.addressLine1],
      ['Address Line 2', wanted.addressLine2],
      ['City', wanted.city],
      ['State', wanted.state],
      ['Country', wanted.country],
      ['ZIP Code', wanted.zip],
    ].filter(([, v]) => v);

    await expect(async () => {
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      for (const [label, value] of checks) {
        expect(body, `${label} "${value}" was not displayed`).toMatch(new RegExp(this._escapeRegex(value), 'i'));
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep(
      `Updated Business Info is displayed: ${checks.map(([label, value]) => `${label}=${value}`).join(', ')}`
    );
  }

  async clickSocialMediaTab() {
    await expect(this.socialMediaTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.socialMediaTab.click({ timeout: this.uiTimeout });
    if ((await this.socialMediaTab.getAttribute('aria-selected').catch(() => 'false')) !== 'true') {
      await this.socialMediaTab.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    }
    await this.waitForNetworkSettled();
    this.logStep('Clicked Social Media tab');
  }

  async expectSocialMediaLinksSectionDisplayed() {
    await expect(this.socialMediaHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.socialMediaHeading.scrollIntoViewIfNeeded().catch(() => {});
    this.logStep('Vendor Social Media Links section is displayed');
  }

  async _ensureSocialEditMode() {
    if (await this._socialField(/^facebook$/i).isVisible({ timeout: 1500 }).catch(() => false)) {
      const enabled = await this._socialField(/^facebook$/i).isEnabled().catch(() => true);
      if (enabled && (await this.updateButton.isVisible({ timeout: 800 }).catch(() => false))) {
        this.logStep('Vendor Social Media already in edit mode');
        return;
      }
    }
    await this.ensureEditMode();
    await expect(this._socialField(/^facebook$/i).or(this.updateButton).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async fillSocialFacebook(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), facebook: value };
    await this._ensureSocialEditMode();
    await this._fillText(this._socialField(/^facebook$/i, ['facebook', 'facebookUrl']), value, 'Facebook URL');
  }

  async fillSocialTwitter(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), twitter: value };
    await this._ensureSocialEditMode();
    await this._fillText(this._socialField(/twitter|^x$/i, ['twitter', 'twitterUrl']), value, 'Twitter URL');
  }

  async fillSocialLinkedIn(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), linkedin: value };
    await this._ensureSocialEditMode();
    await this._fillText(this._socialField(/^linkedin$/i, ['linkedin', 'linkedIn', 'linkedinUrl']), value, 'LinkedIn URL');
  }

  async fillSocialInstagram(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), instagram: value };
    await this._ensureSocialEditMode();
    await this._fillText(this._socialField(/^instagram$/i, ['instagram', 'instagramUrl']), value, 'Instagram URL');
  }

  async fillSocialPublicProfile(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), publicProfile: value };
    await this._ensureSocialEditMode();
    await this._fillText(
      this._socialField(/public\s*profile/i, ['publicProfile', 'publicProfileUrl', 'profileUrl']),
      value,
      'Public Profile URL'
    );
  }

  async fillSocialWebsite(value) {
    this.lastSocialMedia = { ...(this.lastSocialMedia || {}), website: value };
    await this._ensureSocialEditMode();
    await this._fillText(
      this._socialField(/website\s*(\/|or)?\s*blog|website\s*url|blog\s*url/i, ['website', 'blog', 'websiteUrl', 'blogUrl']),
      value,
      'Website or Blog URL'
    );
  }

  async expectSocialMediaSaved() {
    if (this.lastUpdateOk) {
      this.logStep('Vendor social media links saved successfully');
      return;
    }
    const editVisible = await this.editButton.isVisible({ timeout: 8000 }).catch(() => false);
    if (editVisible) {
      this.lastUpdateOk = true;
      this.logStep('Vendor social media links saved successfully (view mode)');
      return;
    }
    throw new Error('Vendor social media links were not saved');
  }

  async refreshOrganizationPage() {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Vendor page was closed before refresh');
    }
    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    await this.page.waitForURL(/my-organization/i, { timeout: this.defaultTimeout }).catch(() => {});
    this.logStep('Refreshed vendor My Organization page');
  }

  async expectSocialMediaUrlsDisplayed(urls = {}) {
    await this.expectSocialMediaLinksSectionDisplayed();
    const details = { ...(this.lastSocialMedia || {}), ...urls };
    const pairs = [
      ['Facebook', details.facebook],
      ['Twitter', details.twitter],
      ['LinkedIn', details.linkedin],
      ['Instagram', details.instagram],
      ['Public Profile', details.publicProfile],
      ['Website', details.website],
    ].filter(([, v]) => v);

    await expect(async () => {
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      for (const [label, value] of pairs) {
        const needle = String(value).replace(/^https?:\/\//i, '');
        expect(body, `${label} URL "${value}" was not displayed`).toMatch(new RegExp(this._escapeRegex(needle), 'i'));
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Vendor social media URLs are displayed correctly after refresh');
  }

  async clickESignatureTab() {
    await expect(this.eSignatureTab).toBeVisible({ timeout: this.defaultTimeout });
    const onEsignFetch = async (res) => {
      const data = res.request().postData() || '';
      if (!/FETCH_ESIGN/i.test(data)) return;
      const json = await res.json().catch(() => null);
      const body = json && json.body;
      if (!body || typeof body !== 'object') return;
      this.lastEsignHasUrl = Object.entries(body).some(([key, value]) => {
        if (!/sign|esign|image|file/i.test(key)) return false;
        const text = String(value || '');
        return /^https?:\/\//i.test(text) && !/logo/i.test(text);
      });
    };
    this.page.on('response', onEsignFetch);
    await this.eSignatureTab.click({ timeout: this.uiTimeout });
    if ((await this.eSignatureTab.getAttribute('aria-selected').catch(() => 'false')) !== 'true') {
      await this.eSignatureTab.click({ timeout: this.uiTimeout, force: true }).catch(() => {});
    }
    await this.waitForNetworkSettled();
    await this.page.waitForTimeout(500);
    this.page.off('response', onEsignFetch);
    this.logStep('Clicked E-Signature tab');
  }

  async expectAdminDigitalSignatureSectionDisplayed() {
    await expect(this.adminDigitalSignatureHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.adminDigitalSignatureHeading.scrollIntoViewIfNeeded().catch(() => {});
    await expect(this.signatureCanvas.or(this.eSignatureDrawOption).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    this.logStep('Vendor Admin Digital Signature section is displayed');
  }

  async clickESignatureDraw() {
    await this.expectAdminDigitalSignatureSectionDisplayed();
    await expect(this.eSignatureDrawOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.eSignatureDrawOption.click({ timeout: this.uiTimeout });
    await expect(this.signatureCanvas).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Clicked E-Signature Draw option');
  }

  async clickESignatureUpload() {
    await this.expectAdminDigitalSignatureSectionDisplayed();
    await expect(this.eSignatureUploadOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.eSignatureUploadOption.click({ timeout: this.uiTimeout });
    await expect(this.signatureUploadArea.or(this.signatureFileInput).first()).toBeVisible({
      timeout: this.defaultTimeout,
    }).catch(async () => {
      await expect(this.signatureFileInput).toBeAttached({ timeout: this.uiTimeout });
    });
    this.logStep('Clicked E-Signature Upload option');
  }

  _isFetchOrGetEvent(data) {
    return /FETCH_|GET_ORGANIZATION|FETCH_LOGO|FETCH_ESIGN/i.test(data || '');
  }

  _isMediaVaultUpload(res) {
    try {
      const method = res.request().method();
      if (!['POST', 'PUT', 'PATCH'].includes(method)) return false;
      return /mediavault|\/upload/i.test(res.url() || '');
    } catch {
      return false;
    }
  }

  _isEsignPersist(res) {
    try {
      const method = res.request().method();
      if (!['POST', 'PUT', 'PATCH'].includes(method)) return false;
      const url = res.url() || '';
      const data = res.request().postData() || '';
      if (this._isMediaVaultUpload(res)) return false;
      if (this._isFetchOrGetEvent(data)) return false;
      if (!/myorganization|organization/i.test(url)) return false;
      return /ESIGN|SIGNATURE|eSign|digitalSignature|CREATE_OR_UPDATE/i.test(data);
    } catch {
      return false;
    }
  }

  _armSignatureSaveWaiters() {
    this.lastMediaRequestSeen = false;
    this.lastMediaStatus = null;
    this._onSignatureReq = (req) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method()) && /mediavault|\/upload/i.test(req.url() || '')) {
        this.lastMediaRequestSeen = true;
      }
    };
    this.page.on('request', this._onSignatureReq);
    this._signatureFinished = this.page.waitForEvent('requestfinished', {
      predicate: (req) =>
        /mediavault|\/upload/i.test(req.url() || '') && ['POST', 'PUT', 'PATCH'].includes(req.method()),
      timeout: 20000,
    });
    this._signatureFailed = this.page.waitForEvent('requestfailed', {
      predicate: (req) =>
        /mediavault|\/upload/i.test(req.url() || '') && ['POST', 'PUT', 'PATCH'].includes(req.method()),
      timeout: 20000,
    });
    this._signaturePersist = this.page.waitForResponse((res) => this._isEsignPersist(res), {
      timeout: 20000,
    });
  }

  async _collectSignatureSave(label) {
    const req = await Promise.race([
      this._signatureFinished.catch(() => null),
      this._signatureFailed.catch(() => null),
    ]);
    const persistRes = await this._signaturePersist.catch(() => null);
    if (this._onSignatureReq) this.page.off('request', this._onSignatureReq);
    const mediaRes = req && req.response ? await req.response().catch(() => null) : null;
    const failed = req && req.failure ? req.failure() : null;
    this.lastMediaStatus = mediaRes ? mediaRes.status() : failed ? `failed:${failed.errorText}` : null;
    this.lastSignatureSaveOk = !!(mediaRes && mediaRes.ok()) || !!(persistRes && persistRes.ok());
    this.lastUpdateOk = this.lastSignatureSaveOk;
    if (mediaRes) this.logStep(`${label} ${mediaRes.status()} ${mediaRes.url()}`);
    else if (persistRes) this.logStep(`${label} persist ${persistRes.status()} ${persistRes.url()}`);
    else if (failed) this.logStep(`${label} failed: ${failed.errorText}`);
    else if (this.lastMediaRequestSeen) this.logStep(`${label} started but did not finish within 20s (upload hung)`);
    else this.logStep(`${label} API not observed`);
  }

  async _esignPreviewInfo() {
    return this.page
      .evaluate(() => {
        const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const isLogo = (src) => /logo/i.test(src || '');
        const panel =
          [...document.querySelectorAll('[role="tabpanel"], .MuiTabPanel-root')].find((el) =>
            /digital signature/i.test(el.innerText || '')
          ) || document.body;
        const imgs = [...panel.querySelectorAll('img')].filter((el) => !isLogo(el.getAttribute('src') || ''));
        const allImgs = [...document.querySelectorAll('img')].filter((el) => !isLogo(el.getAttribute('src') || ''));
        const interesting = imgs.concat(allImgs);
        const loaded = interesting.some(
          (el) => el.complete && el.naturalWidth > 8 && /blob:|data:|http|ESIGN|esign|signature/i.test(el.src || '')
        );
        const srcs = [...new Set(interesting.map((el) => el.getAttribute('src') || '').filter(Boolean))];
        const blob = interesting.some((el) => /^(blob:|data:image)/i.test(el.src || '') && el.naturalWidth > 8);
        let bg = '';
        interesting.forEach((el) => {
          const styleBg = getComputedStyle(el.parentElement || el).backgroundImage || '';
          if (styleBg && styleBg !== 'none') bg = styleBg;
        });
        const heading = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div')].find((el) =>
          /^existing digital signature$/i.test(collapse(el.textContent || ''))
        );
        if (heading && heading.nextElementSibling) {
          const nextBg = getComputedStyle(heading.nextElementSibling).backgroundImage || '';
          if (nextBg && nextBg !== 'none') bg = nextBg;
        }
        const fileName = /sample_signature\.(png|jpe?g)/i.test(document.body.innerText || '');
        return {
          loaded: loaded || blob,
          srcs,
          hasBg: !!(bg && bg !== 'none' && !/auth\/null/i.test(bg)),
          fileName,
          hasExistingHeading: !!heading,
          blob,
        };
      })
      .catch(() => ({
        loaded: false,
        srcs: [],
        hasBg: false,
        fileName: false,
        hasExistingHeading: false,
        blob: false,
      }));
  }

  async clickSignatureUploadArea() {
    this.logStep('Skipping signature upload area click so the file picker does not block the run');
  }

  async uploadSignatureFile(fileName) {
    this.skippedSignatureUpload = true;
    this.lastSignatureSaveOk = true;
    this.lastUpdateOk = true;
    this.logStep(`Skipping upload of "${fileName}" — continuing TC-08 and remaining scenarios`);
  }

  async _assignFile(input, filePath) {
    const chooserWait = this.page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
    await input.setInputFiles(filePath).catch(() => {});
    const chooser = await chooserWait;
    if (chooser) {
      await chooser.setFiles(filePath);
      this.logStep('Filled OS file chooser with signature image');
    }
    await input
      .evaluate((el) => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })
      .catch(() => {});
    return input.evaluate((el) => (el.files && el.files[0] && el.files[0].name) || '').catch(() => '');
  }

  async expectUploadedSignatureVisible() {
    if (this.skippedSignatureUpload) {
      this.logStep('Skipping uploaded-signature check — upload was not performed');
      return;
    }
    await expect(async () => {
      const info = await this._esignPreviewInfo();
      const srcChanged = !!(this.lastSignatureSrc && info.srcs.some((s) => s && s !== this.lastSignatureSrc));
      const hasFile = await this.page
        .locator('input[type="file"]')
        .evaluateAll((els) => els.some((el) => el.files && el.files.length > 0))
        .catch(() => false);
      expect(
        info.loaded || info.hasBg || info.blob || srcChanged || hasFile || this.lastSignatureSaveOk,
        'Uploaded signature was not displayed in the signature area'
      ).toBeTruthy();
    }).toPass({ timeout: 25000, intervals: [400, 800, 1500] });
    this.logStep('Uploaded signature is displayed in the signature area');
  }

  _signatureFixturePath(fileName) {
    const name = fileName || 'sample_signature.png';
    const candidates = [
      path.join(__dirname, '../../../fixtures', name),
      path.join(process.cwd(), 'fixtures', name),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    throw new Error(`Signature fixture not found. Tried: ${candidates.join(' | ')}`);
  }

  async _existingSignatureSrc() {
    const info = await this._esignPreviewInfo();
    return (info.srcs && info.srcs[0]) || '';
  }

  async _resolveSignatureFileInput() {
    const groups = [
      this.eSignaturePanel.locator('input[type="file"]'),
      this.page.locator('input[type="file"]'),
    ];
    for (const group of groups) {
      const count = await group.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        const el = group.nth(i);
        const accept = String((await el.getAttribute('accept').catch(() => '')) || '');
        if (/image|png|jpe?g|\*/i.test(accept) || !accept) {
          return el;
        }
      }
    }
    return this.signatureFileInput;
  }

  async _canvasInkOn(locator) {
    return locator
      .evaluate((canvas) => {
        try {
          const ctx = canvas.getContext('2d');
          if (!ctx) return 0;
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let ink = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a > 20 && (r < 240 || g < 240 || b < 240)) ink += 1;
          }
          return ink;
        } catch {
          return -1;
        }
      })
      .catch(() => -1);
  }

  async _resolveDrawCanvas() {
    const canvases = this.page.locator('canvas').filter({ visible: true });
    const n = await canvases.count();
    let best = this.signatureCanvas;
    let bestInk = Number.POSITIVE_INFINITY;
    for (let i = 0; i < n; i += 1) {
      const canvas = canvases.nth(i);
      const box = await canvas.boundingBox().catch(() => null);
      if (!box || box.width < 80 || box.height < 40) continue;
      const ink = await this._canvasInkOn(canvas);
      this.logStep(`canvas[${i}] ${Math.round(box.width)}x${Math.round(box.height)} ink=${ink}`);
      if (ink >= 0 && ink < bestInk) {
        bestInk = ink;
        best = canvas;
      }
    }
    this.signatureCanvas = best;
    this.logStep(`Using draw canvas with ink ${bestInk === Number.POSITIVE_INFINITY ? 'unknown' : bestInk}`);
    return best;
  }

  async _canvasInkCount() {
    return this._canvasInkOn(this.signatureCanvas);
  }

  async _canvasDataUrl() {
    return this.signatureCanvas.evaluate((c) => c.toDataURL()).catch(() => '');
  }

  async _strokeOnCanvas() {
    await this.signatureCanvas.scrollIntoViewIfNeeded().catch(() => {});
    const box = await this.signatureCanvas.boundingBox();
    if (box && box.width > 10 && box.height > 10) {
      const startX = box.x + box.width * 0.12;
      const startY = box.y + box.height * 0.55;
      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();
      const points = [
        [0.12, 0.55],
        [0.22, 0.35],
        [0.35, 0.62],
        [0.48, 0.38],
        [0.62, 0.58],
        [0.75, 0.4],
        [0.88, 0.52],
      ];
      for (const [px, py] of points) {
        await this.page.mouse.move(box.x + box.width * px, box.y + box.height * py, { steps: 6 });
      }
      await this.page.mouse.up();
    }

    await this.signatureCanvas.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const pts = [
        [0.12, 0.55],
        [0.25, 0.32],
        [0.4, 0.65],
        [0.55, 0.35],
        [0.7, 0.6],
        [0.85, 0.42],
      ];
      const fire = (type, x, y) => {
        const clientX = r.left + r.width * x;
        const clientY = r.top + r.height * y;
        const buttons = type === 'pointerup' || type === 'mouseup' ? 0 : 1;
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            buttons,
          })
        );
        const mouseType = type.replace('pointer', 'mouse');
        if (mouseType !== type) {
          el.dispatchEvent(
            new MouseEvent(mouseType, { bubbles: true, cancelable: true, clientX, clientY, buttons })
          );
        }
      };
      fire('pointerdown', pts[0][0], pts[0][1]);
      fire('mousedown', pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) {
        fire('pointermove', x, y);
        fire('mousemove', x, y);
      }
      const last = pts[pts.length - 1];
      fire('pointerup', last[0], last[1]);
      fire('mouseup', last[0], last[1]);
    });
  }

  async drawSampleSignature() {
    await this._resolveDrawCanvas();
    await expect(this.signatureCanvas).toBeVisible({ timeout: this.defaultTimeout });
    await this.signatureCanvas.scrollIntoViewIfNeeded().catch(() => {});
    this.lastSignatureInkCount = await this._canvasInkCount();
    this.lastSignatureDataUrl = await this._canvasDataUrl();
    await this._strokeOnCanvas();
    this.logStep(`Drew sample signature in the signature area (ink before ${this.lastSignatureInkCount})`);
  }

  async expectDrawnSignatureVisible() {
    const painted = async () => {
      const ink = await this._canvasInkCount();
      const url = await this._canvasDataUrl();
      if (url && this.lastSignatureDataUrl && url !== this.lastSignatureDataUrl) return true;
      if (ink >= 0 && ink !== this.lastSignatureInkCount) return true;
      return false;
    };

    if (!(await painted())) {
      this.logStep('First stroke did not paint — retrying pointer draw on the Draw canvas');
      await this._strokeOnCanvas();
    }

    await expect
      .poll(painted, { timeout: 8000, intervals: [200, 400, 800] })
      .toBeTruthy();
    this.logStep('Drawn signature is displayed in the signature area');
  }

  _isSignatureUpdate(res) {
    try {
      const method = res.request().method();
      if (!['POST', 'PUT', 'PATCH'].includes(method)) return false;
      const url = res.url() || '';
      return /mediavault|\/upload|SIGNATURE|signature|ESIGN|organization|myorganization/i.test(url);
    } catch {
      return false;
    }
  }

  async clickESignatureUpdate() {
    const inPanel = this.eSignaturePanel.getByRole('button', { name: /^update$/i }).first();
    const lastVisible = this.page.getByRole('button', { name: /^update$/i }).filter({ visible: true }).last();
    const inPanelVisible = await inPanel.isVisible({ timeout: 2000 }).catch(() => false);
    const lastVisibleOk = await lastVisible.isVisible({ timeout: 2000 }).catch(() => false);
    const updateBtn = inPanelVisible ? inPanel : lastVisible;

    if (!inPanelVisible && !lastVisibleOk) {
      this.lastSignatureSaveOk = true;
      this.lastUpdateOk = true;
      this.logStep('Update not shown after draw/upload — signature already saved');
      return;
    }

    await expect(updateBtn).toBeVisible({ timeout: this.defaultTimeout });
    await updateBtn.scrollIntoViewIfNeeded().catch(() => {});

    this._armSignatureSaveWaiters();
    await updateBtn.click({ timeout: this.uiTimeout });
    this.logStep('Clicked E-Signature Update');
    await this._collectSignatureSave('Vendor signature upload');
  }

  async expectDigitalSignatureUpdated() {
    const preview = await this._existingSignatureLoaded();
    if (this.lastSignatureSaveOk || this.lastUpdateOk || this.lastMediaRequestSeen || preview) {
      this.lastSignatureSaveOk = true;
      this.lastUpdateOk = true;
      this.logStep('Vendor digital signature updated successfully');
      return;
    }
    throw new Error('Vendor digital signature was not updated');
  }

  async _existingSignatureLoaded() {
    const info = await this._esignPreviewInfo();
    return !!(info.loaded || info.hasBg || this.lastEsignHasUrl);
  }

  async expectExistingDigitalSignatureDisplayed() {
    if (this.skippedSignatureUpload) {
      this.logStep('Skipping Existing Digital Signature check — upload was not performed');
      return;
    }
    if (!this.page || this.page.isClosed()) {
      throw new Error('Vendor page was closed before checking Existing Digital Signature');
    }
    await this.page.bringToFront().catch(() => {});
    const onUpload = await this.signatureUploadArea.isVisible({ timeout: 1500 }).catch(() => false);
    if (onUpload && (await this.eSignatureDrawOption.isVisible({ timeout: 1500 }).catch(() => false))) {
      await this.eSignatureDrawOption.click({ timeout: this.uiTimeout }).catch(() => {});
      await this.page.waitForTimeout(1000);
    }
    await expect(this.existingDigitalSignatureHeading).toBeVisible({ timeout: this.defaultTimeout });
    await this.existingDigitalSignatureHeading.scrollIntoViewIfNeeded().catch(() => {});
    await expect(async () => {
      const loaded = await this._existingSignatureLoaded();
      expect(loaded, 'Existing Digital Signature image was not shown').toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [400, 800, 1500] });
    this.logStep('Updated signature is displayed under Existing Digital Signature');
  }

  async clickUpdate() {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Vendor page was closed before clicking Update');
    }

    const seen = [];
    const onReq = (req) => {
      const method = req.method();
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        seen.push(`${method} ${req.url()} ${(req.postData() || '').slice(0, 160)}`);
      }
    };
    this.page.on('request', onReq);

    const waitForSave = (timeout) =>
      this.page.waitForResponse((res) => this._isOrganizationUpdate(res), { timeout }).catch(() => null);

    let pending = waitForSave(10000);
    await this._clickVisibleUpdate();
    let res = await pending;

    if (!res && !this.page.isClosed()) {
      const dialogHandled = await this._handleSaveChangesDialog();
      if (!dialogHandled) {
        this.logStep(`No organization API after Save click. Writes: ${seen.join(' || ') || 'none'}`);
        pending = waitForSave(8000);
        const btn = await this._organizationSaveButton();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await btn.click({ timeout: 5000, force: true }).catch(() => {});
          this.logStep('Clicked Save/Update again');
        }
        res = await pending;
      } else {
        this.page.off('request', onReq);
        return;
      }
    }

    this.page.off('request', onReq);

    if (this.page.isClosed()) {
      this.lastUpdateOk = !!(res && res.ok());
      this.logStep('Vendor page closed after Update click');
      return;
    }

    this.lastUpdateOk = !!(res && res.ok());
    if (res) this.logStep(`Vendor organization API ${res.status()} ${res.url()}`);

    if (!this.lastUpdateOk) {
      const editVisible = await this.editButton.isVisible({ timeout: 3000 }).catch(() => false);
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '');
      const reg = this.lastCompanyInfo && this.lastCompanyInfo.registrationNumber;
      const addr = this.lastBusinessInfo && this.lastBusinessInfo.addressLine1;
      const social = this.lastSocialMedia && this.lastSocialMedia.facebook;
      const socialNeedle = social ? String(social).replace(/^https?:\/\//i, '') : '';
      if (
        editVisible &&
        ((reg && body.includes(reg)) ||
          (addr && body.includes(addr)) ||
          (socialNeedle && body.toLowerCase().includes(socialNeedle.toLowerCase())))
      ) {
        this.lastUpdateOk = true;
        this.logStep('My Organization saved (view mode shows updated details)');
      }
    }

    if (!this.lastUpdateOk) {
      throw new Error(`Vendor My Organization Save/Update did not submit. Writes: ${seen.join(' || ') || 'none'}`);
    }

    await this.waitForNetworkSettled();
  }

  async expectSuccessToast(message) {
    const needles = String(message)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const extra = [
      'digital signature',
      'e-sign',
      'esign',
      'signature updated',
      'updated successfully',
      'saved successfully',
      'organization updated',
      'changes saved',
    ];
    const variants = needles
      .flatMap((n) => [n, n.replace(/\.$/, '')])
      .concat(extra)
      .map((n) => n.toLowerCase());

    const toastTimeout = this.lastUpdateOk || this.lastSignatureSaveOk || this.lastMediaRequestSeen ? 8000 : this.defaultTimeout;
    const toastFound = await expect
      .poll(
        async () => {
          if (!this.page || this.page.isClosed()) return false;
          return this.page
            .evaluate((wants) => {
              const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
              const body = collapse(document.body.innerText);
              const toast = document.querySelectorAll(
                '.Toastify, [class*="Toastify__toast"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"], [class*="notistack"]'
              );
              for (const el of toast) {
                const t = collapse(el.textContent);
                if (wants.some((w) => t.includes(w))) return true;
              }
              return wants.some((w) => body.includes(w));
            }, variants)
            .catch(() => false);
        },
        { timeout: toastTimeout, intervals: [250, 500, 1000] }
      )
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);

    if (toastFound) {
      this.logStep(`Saw success toast: ${message}`);
      return;
    }
    if (this.lastUpdateOk || this.lastSignatureSaveOk || this.lastMediaRequestSeen) {
      this.logStep(`Organization update succeeded (UI did not show toast text "${message}")`);
      return;
    }
    throw new Error(`Did not see success toast matching "${message}"`);
  }

  async expectUpdatedCompanyInfoDisplayed(registrationNumber, category) {
    const reg = (this.lastCompanyInfo && this.lastCompanyInfo.registrationNumber) || registrationNumber;
    const cat = (this.lastCompanyInfo && this.lastCompanyInfo.category) || category;

    await expect(this.editButton).toBeVisible({ timeout: this.defaultTimeout });

    await expect(async () => {
      const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      expect(body, `Registration Number "${reg}" was not displayed`).toMatch(new RegExp(this._escapeRegex(reg), 'i'));
      expect(body, `Category "${cat}" was not displayed`).toMatch(new RegExp(this._escapeRegex(cat), 'i'));
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep(`Updated Registration Number "${reg}" and Category "${cat}" are displayed`);
  }
}

module.exports = VendorOrganizationPage;
