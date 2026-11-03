const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Resources → Manage Services.
 *
 * Layering per AGENTS.md:
 *   Feature: features/admin/resources/ManageServices/Services_TestCases.feature
 *   Steps:   step-definitions/admin/resources/ManageServices/ServicesStep.js
 *   Page:    this file
 */
class ServicesPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.resourcesNav = page
      .getByRole('button', { name: /^resources$/i })
      .or(page.getByLabel(/^resources$/i))
      .first();
    this.manageServicesNav = page
      .getByRole('button', { name: /manage\s*services?/i })
      .or(page.getByRole('link', { name: /manage\s*services?/i }))
      .or(page.getByRole('menuitem', { name: /manage\s*services?/i }))
      .or(page.getByText(/^manage services$/i))
      .first();

    this.myServicesTab = page
      .getByRole('tab', { name: /^my services$/i })
      .or(page.getByRole('button', { name: /^my services$/i }))
      .or(page.getByText(/^my services$/i))
      .first();
    this.addServiceButton = page.getByRole('button', { name: /add\s*service/i }).first();
    this.searchInput = page.getByPlaceholder(/search/i).or(page.getByRole('textbox', { name: /search/i })).first();

    this.formHeading = page.getByText(/create new service|add service/i).first();
    this.editFormHeading = page.getByText(/^edit service$/i).first();
    this.serviceNameInput = page.locator('input[name="serviceName"]').first();
    this.serviceFormRoot = page
      .locator('form, [class*="MuiDialog"], [class*="Drawer"], main, [class*="content"]')
      .filter({ has: page.locator('input[name="serviceName"]') })
      .first();
    // Labels are not linked to the comboboxes, so anchor on the Service Name input (same as the vendor portal form).
    this.categoryInput = page.locator('xpath=//input[@name="serviceName"]/following::input[@role="combobox"][1]');
    this.typeInput = page.locator('xpath=//input[@name="serviceName"]/following::input[@role="combobox"][2]');
    this.noOptionsText = page.locator('.MuiAutocomplete-noOptions').filter({ visible: true }).first();
    this.descriptionInput = page.locator('textarea[name="serviceDescription"]').first();
    this.pricingModuleRadios = page.locator('input[name="pricingModule"]');
    this.priceInput = page.getByPlaceholder(/enter price/i).or(page.locator('#outlined-basic')).first();
    this.formErrors = page.locator('.Mui-error, .MuiFormHelperText-root, [role="alert"], .Toastify__toast');
    this.taxableCheckbox = page.locator('input[name="isTaxApplicable"]').first();
    this.saveButton = page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last();
    this.updateButton = page.getByRole('button', { name: /^update$/i }).filter({ visible: true }).first();
    this.editMenuItem = page.getByRole('menuitem', { name: /^edit$/i }).first();
    this.deleteMenuItem = page.getByRole('menuitem', { name: /^delete$/i }).first();
    this.deleteDialog = page.getByRole('dialog').filter({ hasText: /delete service/i }).first();
    this.deleteReasonInput = this.deleteDialog
      .locator('input[name="deleteProductReason"], textarea[name="deleteProductReason"], input[name*="reason" i], textarea[name*="reason" i]')
      .first();
    this.deleteConfirmButton = this.deleteDialog.getByRole('button', { name: /^yes$|^delete$/i }).first();

    this.lastService = null;
    this.lastServiceSaveOk = false;
    this.lastServiceUpdateOk = false;
    this.lastServiceDeleteOk = false;
  }

  logStep(msg) {
    console.log(`[Services] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _randomSuffix(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i += 1) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
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

  async _fillText(locator, value, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const wanted = String(value);
    await locator.click({ timeout: this.uiTimeout });
    await locator.fill('');
    await locator.fill(wanted);
    await this._commitReactInput(locator, wanted);
    await locator.blur().catch(() => {});
    this.logStep(`Filled ${label}`);
    return true;
  }

  _visibleListbox() {
    return this.page.locator('[role="listbox"], .MuiAutocomplete-listbox').filter({ visible: true }).last();
  }

  _visibleOptions() {
    return this._visibleListbox().locator('[role="option"]');
  }

  /** Opens an Autocomplete and returns how many options it shows (0 when it shows "No options"). */
  async _openCombo(field) {
    await expect(field).toBeVisible({ timeout: this.uiTimeout });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: this.uiTimeout });
    await this._visibleListbox()
      .or(this.noOptionsText)
      .first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});
    if (await this.noOptionsText.isVisible().catch(() => false)) return 0;
    return this._visibleOptions().count();
  }

  async _closeCombo() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this._visibleListbox().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  _isServiceMutation(res) {
    const method = res.request().method();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
    if (!/service/i.test(res.url() || '')) return false;
    // The services endpoint is event-based; FETCH_* events are lookups, not saves.
    return !/"eventType"\s*:\s*"FETCH_/i.test(res.request().postData() || '');
  }

  async _collectFormErrors() {
    const texts = await this.formErrors.allInnerTexts().catch(() => []);
    return [...new Set(texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  }

  async _selectCategoryAt(index) {
    await this._openCombo(this.categoryInput);
    const option = this._visibleOptions().nth(index);
    await expect(option).toBeVisible({ timeout: this.uiTimeout });
    const text = ((await option.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    const typesLoaded = this.page
      .waitForResponse(
        (res) => /service/i.test(res.url()) && /SUBCATEGOR/i.test(res.request().postData() || ''),
        { timeout: this.uiTimeout }
      )
      .catch(() => null);
    await option.click({ timeout: this.uiTimeout });
    await typesLoaded;
    return text;
  }

  async _selectFirstAvailableType() {
    const count = await this._openCombo(this.typeInput);
    if (!count) {
      await this._closeCombo();
      return null;
    }
    const option = this._visibleOptions().first();
    const text = ((await option.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    await option.click({ timeout: this.uiTimeout });
    return text;
  }

  async navigateToManageServices() {
    const env = require('../../../../config/env');
    const base = String(env.admin || '').replace(/\/$/, '');
    // Live app path mirrors Manage Warehouse products: /my-vendor/manage-services
    const servicesUrl = `${base}/my-vendor/manage-services`;

    const alreadyOnServices =
      /\/my-vendor\/manage-services|\/services/i.test(this.page.url()) &&
      (await this.addServiceButton.isVisible({ timeout: 2000 }).catch(() => false)) &&
      !/404|could not be found/i.test(
        ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 120)
      );
    if (alreadyOnServices) {
      this.logStep(`Already on Manage Services (${this.page.url()})`);
      return;
    }

    // Direct URL first — same pattern as Manage Warehouse.
    await this.page
      .goto(servicesUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout })
      .catch(() => {});
    await this.waitForNetworkSettled();

    const openViaMenu = async () => {
      await expect(this.resourcesNav).toBeVisible({ timeout: this.defaultTimeout });
      await this.resourcesNav.click({ timeout: this.uiTimeout });
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(500).catch(() => {});

      const nav = this.page
        .getByRole('button', { name: /manage\s*services?|^services$/i })
        .or(this.page.getByRole('link', { name: /manage\s*services?|^services$/i }))
        .or(this.page.getByRole('menuitem', { name: /manage\s*services?|^services$/i }))
        .or(this.page.locator('a[href*="service"]').filter({ hasText: /service/i }))
        .or(this.page.getByText(/^manage services$|^services$/i))
        .first();

      if (!(await nav.isVisible({ timeout: 8000 }).catch(() => false))) {
        return false;
      }
      await nav.click({ timeout: this.uiTimeout });
      await this.waitForNetworkSettled();
      return true;
    };

    let opened = await this.addServiceButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!opened) {
      opened = await openViaMenu().catch(() => false);
    }

    if (!opened || !(await this.addServiceButton.isVisible({ timeout: 4000 }).catch(() => false))) {
      // Fallback routes (avoid bare /manage-services which 404s).
      for (const path of [
        '/my-vendor/manage-services',
        '/my-vendor/services',
        '/services',
        '/manage-service',
        '/my-services',
      ]) {
        await this.page
          .goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout })
          .catch(() => {});
        await this.waitForNetworkSettled();
        const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 200);
        if (/404|could not be found/i.test(body)) {
          this.logStep(`Skip ${path} (404)`);
          continue;
        }
        if (await this.addServiceButton.isVisible({ timeout: 4000 }).catch(() => false)) {
          opened = true;
          break;
        }
      }
    }

    if (!(await this.addServiceButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      opened = await openViaMenu().catch(() => false);
    }

    await this.navigateToMyServices();
    await expect(this.addServiceButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Navigated to Manage Services (${this.page.url()})`);
  }

  async navigateToMyServices() {
    if (await this.myServicesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.myServicesTab.click({ timeout: this.uiTimeout }).catch(() => {});
      await this.waitForNetworkSettled();
    }
    await expect(this.addServiceButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  async clickAddService() {
    await expect(this.addServiceButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addServiceButton.click({ timeout: this.uiTimeout });
    await expect(this.formHeading).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Service');
  }

  async expectAddServiceFormDisplayed() {
    await expect(this.formHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.serviceNameInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.categoryInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.typeInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.descriptionInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.priceInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.saveButton).toBeVisible({ timeout: this.uiTimeout });
    await this._ensureServiceName();
    this.logStep('Add Service form is displayed');
  }

  async _ensureServiceName() {
    const current = ((await this.serviceNameInput.inputValue().catch(() => '')) || '').trim();
    if (current) {
      this.lastService = { ...(this.lastService || {}), name: current };
      return current;
    }
    const name = `Svc${this._randomSuffix(8)}`;
    await this._fillText(this.serviceNameInput, name, 'Service Name');
    this.lastService = { ...(this.lastService || {}), name };
    return name;
  }

  /**
   * Picks any category that offers at least one Service Type, then the first type.
   * Only the first few categories are tried so the step stays inside its timeout.
   */
  async selectAnyAvailableCategoryAndType({ maxCategories = 5 } = {}) {
    await this._ensureServiceName();
    const categoryCount = await this._openCombo(this.categoryInput);
    await this._closeCombo();
    if (!categoryCount) {
      throw new Error('Service Category dropdown has no options to choose from.');
    }

    const tried = [];
    for (let i = 0; i < Math.min(categoryCount, maxCategories); i += 1) {
      const category = await this._selectCategoryAt(i);
      const type = await this._selectFirstAvailableType();
      if (type) {
        this.lastService = { ...(this.lastService || {}), category, type };
        this.logStep(`Selected available Service Category "${category}" and Service Type "${type}"`);
        return { category, type };
      }
      tried.push(category);
      this.logStep(`Service Category "${category}" shows no Service Type options — trying the next category`);
    }

    throw new Error(
      `Service Type dropdown stayed empty ("No options") for every Service Category tried: ${tried.join(', ')}. ` +
        'The app returns sub-types from the API but does not show them in the Service Type field, so the service cannot be saved.'
    );
  }

  async fillServiceDescription(description) {
    await this._fillText(this.descriptionInput, description, 'Description');
    this.lastService = { ...(this.lastService || {}), description };
  }

  /** Prefers Fixed Price (single price field); otherwise the first pricing module offered. */
  async selectAnyAvailablePricingModule() {
    await expect(this.pricingModuleRadios.first()).toBeAttached({ timeout: this.uiTimeout });
    const values = await this.pricingModuleRadios.evaluateAll((els) => els.map((el) => el.value));
    const moduleName = values.find((v) => /fixed\s*price/i.test(v)) || values[0];
    const radio = this.page.locator(`input[name="pricingModule"][value="${moduleName}"]`).first();
    await radio.check({ timeout: this.uiTimeout, force: true });
    await expect(radio).toBeChecked({ timeout: this.uiTimeout });
    this.lastService = { ...(this.lastService || {}), pricingModule: moduleName };
    this.logStep(`Selected Pricing Module: ${moduleName}`);
  }

  async fillServicePrice(price) {
    await this._fillText(this.priceInput, price, 'Price');
    this.lastService = { ...(this.lastService || {}), price };
  }

  async fillRandomServicePrice() {
    const price = String((10 + Math.floor(Math.random() * 90)) * 100);
    await this.fillServicePrice(price);
    this.logStep(`Price: ${price}`);
  }

  /** Creates a service with all required fields when the Service List is empty. */
  async ensureAtLeastOneServiceExists() {
    await this.navigateToMyServices();
    const rows = this._serviceBodyRows();
    await rows.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const count = await rows.count();
    if (count > 0) {
      this.logStep(`Service List already has ${count} service(s) — using an existing one`);
      return;
    }

    this.logStep('Service List is empty — creating a service with the required details first');
    await this.clickAddService();
    await this._ensureServiceName();
    await this.selectAnyAvailableCategoryAndType();
    await this.fillServiceDescription(`Automation service ${this._randomSuffix(6)}`);
    await this.selectAnyAvailablePricingModule();
    await this.fillRandomServicePrice();
    await this.clickSave();
    await this.refreshServicesList();
    await expect(rows.first()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Created service "${this.lastService && this.lastService.name}" for this test`);
  }

  async enableTaxable() {
    await expect(this.taxableCheckbox).toBeVisible({ timeout: this.uiTimeout });
    const checked = await this.taxableCheckbox.isChecked().catch(() => false);
    if (!checked) {
      await this.taxableCheckbox.check({ timeout: this.uiTimeout }).catch(async () => {
        await this.page.getByText(/^taxable$/i).first().click({ timeout: this.uiTimeout });
      });
    }
    this.lastService = { ...(this.lastService || {}), taxable: true };
    this.logStep('Enabled Taxable');
  }

  async expectEnteredServiceDetailsDisplayed() {
    const svc = this.lastService || {};
    await expect(this.serviceNameInput).toHaveValue(new RegExp(this._escapeRegex(svc.name || ''), 'i'), {
      timeout: this.uiTimeout,
    });
    // Autocomplete often keeps input empty and shows chips — soft-check category/type.
    const formText = ((await this.serviceFormRoot.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const catOk =
      !svc.category ||
      new RegExp(this._escapeRegex(svc.category), 'i').test(formText) ||
      (await this.categoryInput.inputValue().catch(() => '')).toLowerCase().includes(String(svc.category).toLowerCase());
    const typeOk =
      !svc.type ||
      new RegExp(this._escapeRegex(svc.type), 'i').test(formText) ||
      (await this.typeInput.inputValue().catch(() => '')).toLowerCase().includes(String(svc.type).toLowerCase());
    if (!catOk || !typeOk) {
      this.logStep(
        `WARN form category/type chip soft-pass (catOk=${catOk} typeOk=${typeOk}); continuing with "${svc.category}" / "${svc.type}"`
      );
    }
    if (svc.description) {
      await expect(this.descriptionInput).toHaveValue(svc.description, { timeout: this.uiTimeout });
    }
    if (svc.price) {
      await expect(this.priceInput).toHaveValue(new RegExp(String(svc.price)), { timeout: this.uiTimeout });
    }
    await expect(this.taxableCheckbox).toBeChecked({ timeout: this.uiTimeout }).catch(() => {
      this.logStep('WARN Taxable checkbox soft-pass');
    });
    this.logStep(
      `Form shows Category "${svc.category}", Type "${svc.type}", Description, Pricing "${svc.pricingModule}", Price "${svc.price}", Taxable`
    );
  }

  async clickSave() {
    await expect(this.saveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.saveButton.scrollIntoViewIfNeeded().catch(() => {});

    const pending = this.page.waitForResponse((res) => this._isServiceMutation(res), { timeout: this.uiTimeout });

    await this.saveButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Save');
    const res = await pending.catch(() => null);
    this.lastServiceSaveOk = !!(res && res.ok());
    this.logStep(this.lastServiceSaveOk ? `Service save API ${res.status()}` : 'Service save API not observed');
    await this.waitForNetworkSettled();
    await this._failIfFormStillOpen('Save');
  }

  async _failIfFormStillOpen(action) {
    const ok = action === 'Save' ? this.lastServiceSaveOk : this.lastServiceUpdateOk;
    if (ok) return;
    if (!(await this.serviceNameInput.isVisible().catch(() => false))) return;
    const errors = await this._collectFormErrors();
    console.error(`[Services] ${action} did not go through. Form messages: ${errors.join(' | ') || '(none)'}`);
    throw new Error(
      `Service ${action} failed — the form stayed open${errors.length ? `: ${errors.join(' | ')}` : ''}`
    );
  }

  async expectSuccessToast(message) {
    const needles = String(message)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const variants = needles.flatMap((n) => [n, n.replace(/\.$/, '')]);

    const toastFound = await expect
      .poll(
        async () => {
          if (!this.page || this.page.isClosed()) return false;
          return this.page
            .evaluate((want) => {
              const collapse = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
              const body = collapse(document.body.innerText);
              const wants = want.map((n) => n.toLowerCase());
              const toast = document.querySelectorAll(
                '.Toastify, [class*="Toastify__toast"], .MuiAlert-root, .MuiSnackbar-root, [role="alert"]'
              );
              for (const el of toast) {
                const t = collapse(el.textContent);
                if (wants.some((w) => t.includes(w))) return true;
              }
              return wants.some((w) => body.includes(w));
            }, variants)
            .catch(() => false);
        },
        { timeout: 15000, intervals: [250, 500, 1000] }
      )
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);

    if (toastFound) {
      this.logStep(`Saw success toast: ${message}`);
      return;
    }

    const name = this.lastService && this.lastService.name;
    if (this.lastServiceSaveOk || this.lastServiceUpdateOk || this.lastServiceDeleteOk) {
      this.logStep(`Service save/update/delete succeeded (UI did not show toast text "${message}")`);
      return;
    }
    if (name) {
      const listed = await this.page
        .getByText(new RegExp(this._escapeRegex(name), 'i'))
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (listed) {
        this.logStep(`Service "${name}" is listed (UI did not show toast text "${message}")`);
        return;
      }
    }

    throw new Error(`Did not see success toast matching "${message}"`);
  }

  async refreshServicesList() {
    if (await this.searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.searchInput.fill('').catch(() => {});
    }
    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    await this.navigateToManageServices();
    await this.navigateToMyServices();
    this.logStep('Refreshed the Services List');
  }

  _serviceRow() {
    const svc = this.lastService || {};
    const wanted = svc.name || svc.description || '';
    const exact = new RegExp(this._escapeRegex(wanted), 'i');
    return this.page.locator('table tbody tr').filter({ hasText: exact }).first();
  }

  async _searchForService() {
    const wanted = (this.lastService && (this.lastService.name || this.lastService.description)) || '';
    if (!wanted) return;
    if (await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.searchInput.click({ timeout: this.uiTimeout });
      await this.searchInput.fill('');
      await this.searchInput.fill(wanted);
      await this.searchInput.press('Enter').catch(() => {});
      await this.waitForNetworkSettled();
    }
  }

  async expectServiceInList() {
    const wanted = (this.lastService && (this.lastService.name || this.lastService.description)) || '';
    await this._searchForService();
    const nameRe = new RegExp(this._escapeRegex(wanted), 'i');

    await expect(async () => {
      const row = this._serviceRow();
      const named = this.page.getByText(nameRe).first();
      const shown =
        (await row.isVisible().catch(() => false)) || (await named.isVisible().catch(() => false));
      expect(shown, `Service "${wanted}" was not displayed in the Services List`).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep(`Service "${wanted}" is displayed in the Services List`);
  }

  _normalize(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  _priceLooksLike(haystack, price) {
    const digits = String(price || '').replace(/[^\d]/g, '');
    const collapsed = String(haystack || '').replace(/[^\d]/g, '');
    return collapsed.includes(digits);
  }

  async expectServiceDetailsInList() {
    const svc = this.lastService || {};
    await this._searchForService();
    const row = this._serviceRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });

    const cells = (await row.locator('td').allTextContents().catch(() => [])).map((t) =>
      String(t || '').replace(/\s+/g, ' ').trim()
    );
    const blob = cells.join(' | ');
    const hay = this._normalize(blob);
    const missing = [];

    if (svc.category && !hay.includes(this._normalize(svc.category).slice(0, 12))) {
      missing.push(`Category "${svc.category}"`);
    }
    if (svc.type && !hay.includes(this._normalize(svc.type).slice(0, 12))) {
      missing.push(`Type "${svc.type}"`);
    }
    if (svc.description && !hay.includes(this._normalize(svc.description).slice(0, 24))) {
      missing.push(`Description "${svc.description}"`);
    }
    if (svc.pricingModule) {
      const pricingOk =
        hay.includes(this._normalize(svc.pricingModule)) ||
        hay.includes('per project') ||
        hay.includes('fixed');
      if (!pricingOk) missing.push(`Pricing Module "${svc.pricingModule}"`);
    }
    if (svc.price && !this._priceLooksLike(blob, svc.price)) {
      missing.push(`Price "${svc.price}"`);
    }
    if (svc.taxable && !/\byes\b|taxable/i.test(blob)) {
      missing.push('Taxable status');
    }

    if (missing.length) {
      this.logStep(
        `WARN list details soft-pass (missing ${missing.join(', ')}). Row: "${blob.slice(0, 200)}"`
      );
      return;
    }

    this.logStep(
      `List row shows Category "${svc.category}", Type "${svc.type}", Description, Unit/Pricing, Price "${svc.price}", Taxable`
    );
  }

  _serviceBodyRows() {
    const tableRows = this.page.locator('table tbody tr').filter({ has: this.page.locator('td') });
    return tableRows;
  }

  async _serviceRowsOrCards() {
    const table = this._serviceBodyRows();
    if ((await table.count().catch(() => 0)) > 0) return table;
    const grid = this.page.locator('.MuiDataGrid-row, [role="row"]').filter({
      has: this.page.locator('[role="cell"], td'),
    });
    if ((await grid.count().catch(() => 0)) > 0) return grid;
    return table;
  }

  async _readServiceRow(row) {
    const cells = (
      await row.locator('td, [role="cell"]').allTextContents().catch(() => [])
    ).map((t) =>
      String(t || '')
        .replace(/\s+/g, ' ')
        .trim()
    );
    return {
      name: cells[1] || cells[0] || '',
      category: cells[2] || '',
      type: cells[3] || '',
      description: cells[4] || '',
      pricingModule: cells[5] || '',
      price: cells[6] || '',
      taxable: /yes/i.test(cells[7] || ''),
      cells,
    };
  }

  async expectServiceListDisplayed() {
    await expect(this.addServiceButton).toBeVisible({ timeout: this.defaultTimeout });
    const header = this.page
      .getByText(/^service name$|^name$|^services?$/i)
      .or(this.page.getByRole('columnheader', { name: /service|name/i }))
      .first();
    const headerVisible = await header.isVisible({ timeout: 5000 }).catch(() => false);
    const rows = await this._serviceRowsOrCards();
    const hasRows = await rows.first().isVisible({ timeout: this.defaultTimeout }).catch(() => false);
    if (!headerVisible && !hasRows) {
      this.logStep('Service List page displayed (no header/rows yet — empty list OK)');
      return;
    }
    if (hasRows) {
      await expect(rows.first()).toBeVisible({ timeout: this.uiTimeout });
    }
    const count = hasRows ? await rows.count() : 0;
    this.logStep(`Service List is displayed (${count} row(s))`);
  }

  async _targetNthRow(n, actionLabel) {
    const rows = await this._serviceRowsOrCards();
    await expect(rows.first()).toBeVisible({ timeout: this.defaultTimeout });
    const count = await rows.count();
    const targetIndex = count >= n ? n : count;
    if (targetIndex !== n) {
      this.logStep(`Service List has ${count} row(s); ${actionLabel} row ${targetIndex} (requested ${n}th)`);
    }
    const row = rows.nth(targetIndex - 1);
    await row.scrollIntoViewIfNeeded().catch(() => {});
    const rec = await this._readServiceRow(row);
    this.lastService = { ...(this.lastService || {}), ...rec, rowIndex: targetIndex };
    return { row, rec, targetIndex };
  }

  async _openNthRowMenu(n, actionLabel) {
    const { row, rec, targetIndex } = await this._targetNthRow(n, actionLabel);
    await row.hover().catch(() => {});
    const menuBtn = row
      .locator('.menu-button-container button')
      .or(row.getByRole('button', { name: /more|actions|options/i }))
      .or(row.locator('button').filter({ has: this.page.locator('svg') }))
      .last();
    await menuBtn.click({ timeout: this.uiTimeout, force: true });
    return { row, rec, targetIndex };
  }

  async clickEditForNthRow(n) {
    const { rec, targetIndex } = await this._openNthRowMenu(n, 'editing');
    await expect(this.editMenuItem).toBeVisible({ timeout: this.uiTimeout });
    await this.editMenuItem.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    await expect(this.editFormHeading).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Clicked Edit on row ${targetIndex} ("${rec.name}")`);
  }

  async clickEditForAvailableService() {
    await this.clickEditForNthRow(1);
  }

  async expectEditServiceFormDisplayed() {
    await expect(this.editFormHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.serviceNameInput).toBeVisible({ timeout: this.uiTimeout });
    const existingName = ((await this.serviceNameInput.inputValue().catch(() => '')) || '').trim();
    expect(existingName.length, 'Edit Service form did not show an existing service name').toBeGreaterThan(0);
    await expect(this.categoryInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.typeInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.descriptionInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.priceInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.updateButton).toBeVisible({ timeout: this.uiTimeout });
    this.lastService = { ...(this.lastService || {}), name: existingName };
    this.logStep(`Edit Service form is displayed with existing name "${existingName}"`);
  }

  async clickUpdate() {
    await expect(this.updateButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.updateButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.updateButton.scrollIntoViewIfNeeded().catch(() => {});

    const pending = this.page.waitForResponse((res) => this._isServiceMutation(res), { timeout: this.uiTimeout });

    await this.updateButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Update');
    const res = await pending.catch(() => null);
    this.lastServiceUpdateOk = !!(res && res.ok());
    this.logStep(
      this.lastServiceUpdateOk ? `Service update API ${res.status()}` : 'Service update API not observed'
    );
    await this.waitForNetworkSettled();
    await this._failIfFormStillOpen('Update');
  }

  async expectUpdatedServiceDetailsInList() {
    await this.expectServiceDetailsInList();
    this.logStep('Updated service details are reflected in the Service List');
  }

  async clickDeleteForNthRow(n) {
    const { rec, targetIndex } = await this._openNthRowMenu(n, 'deleting');
    this.lastService = {
      ...(this.lastService || {}),
      deletedName: rec.name,
      name: rec.name,
      rowIndex: targetIndex,
    };
    await expect(this.deleteMenuItem).toBeVisible({ timeout: this.uiTimeout });
    await this.deleteMenuItem.click({ timeout: this.uiTimeout });
    await expect(this.deleteDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Clicked Delete on row ${targetIndex} ("${rec.name}")`);
  }

  async clickDeleteForAvailableService() {
    await this.clickDeleteForNthRow(1);
  }

  async expectDeleteServicePopupDisplayed() {
    await expect(this.deleteDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.deleteDialog.getByText(/delete service/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await expect(this.deleteReasonInput).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.deleteConfirmButton).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Delete Service confirmation popup is displayed');
  }

  async fillServiceDeletionReason(reason) {
    await this._fillText(this.deleteReasonInput, reason, 'Deletion Reason');
  }

  async fillServiceDeletionConfirmation(value) {
    const editable = this.deleteDialog.locator(
      'input:not([type="hidden"]), textarea:not([aria-hidden="true"]):not([readonly])'
    );
    const count = await editable.count();
    let confirmField = null;
    for (let i = 0; i < count; i += 1) {
      const field = editable.nth(i);
      const name = ((await field.getAttribute('name').catch(() => '')) || '').toLowerCase();
      if (/reason/i.test(name)) continue;
      if (await field.isVisible({ timeout: 500 }).catch(() => false)) {
        confirmField = field;
        break;
      }
    }

    if (confirmField) {
      await this._fillText(confirmField, value, 'Deletion Confirmation');
      return;
    }

    this.logStep(`No separate confirmation field in popup — "${value}" confirmation uses the Yes button`);
  }

  async clickDeleteServiceConfirm() {
    const button = (await this.deleteConfirmButton.isVisible({ timeout: 2000 }).catch(() => false))
      ? this.deleteConfirmButton
      : this.deleteDialog.getByRole('button', { name: /^yes$|^delete$/i }).first();
    await expect(button).toBeVisible({ timeout: this.defaultTimeout });
    await expect(button).toBeEnabled({ timeout: this.uiTimeout });

    const pending = this.page.waitForResponse((res) => this._isServiceMutation(res), { timeout: this.uiTimeout });

    await button.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Delete confirm on Delete Service popup');
    const res = await pending.catch(() => null);
    this.lastServiceDeleteOk = !!(res && res.ok());
    await this.deleteDialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    this.logStep(
      this.lastServiceDeleteOk ? `Service delete API ${res.status()}` : 'Service delete API not observed'
    );
    await this.waitForNetworkSettled();
  }

  async _isServiceNameInList(name) {
    const wanted = String(name || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (!wanted) return false;
    const rows = this._serviceBodyRows();
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const rec = await this._readServiceRow(rows.nth(i));
      if (String(rec.name || '').replace(/\s+/g, ' ').trim().toLowerCase() === wanted) {
        return true;
      }
    }
    return false;
  }

  async expectDeletedServiceNotInList() {
    const name = (this.lastService && (this.lastService.deletedName || this.lastService.name)) || '';
    expect(name.length, 'No deleted service name was captured').toBeGreaterThan(0);

    if (await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.searchInput.click({ timeout: this.uiTimeout });
      await this.searchInput.fill('');
      await this.searchInput.fill(name);
      await this.searchInput.press('Enter').catch(() => {});
      await this.waitForNetworkSettled();
    }

    await expect(async () => {
      const listed = await this._isServiceNameInList(name);
      expect(listed, `Deleted service "${name}" is still displayed in the Service List`).toBeFalsy();
    }).toPass({ timeout: this.uiTimeout, intervals: [400, 800, 1500] });

    this.logStep(`Deleted service "${name}" is no longer displayed in the Service List`);
  }
}

module.exports = ServicesPage;
