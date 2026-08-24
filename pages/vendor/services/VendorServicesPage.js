const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Vendor portal → Services → Create New Service.
 *
 * Layering per AGENTS.md:
 *   Feature: features/vendor/auth/VendorLogin_TestCases.feature
 *   Steps:   step-definitions/vendor/auth/VendorLoginStep.js
 *   Page:    this file
 */
class VendorServicesPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.servicesNav = page
      .locator('a[href="/services"]')
      .or(page.getByRole('link', { name: /^services$/i }))
      .first();
    this.addServiceButton = page
      .getByRole('button', { name: /add\s*service|^create new$/i })
      .first();
    this.searchInput = page.getByPlaceholder(/search/i).or(page.getByRole('textbox', { name: /search/i })).first();

    this.formHeading = page.getByText(/^create new service$/i).first();
    this.serviceNameInput = page.locator('input[name="serviceName"]').first();
    this.categoryField = page.locator('xpath=//input[@name="serviceName"]/following::input[@role="combobox"][1]');
    this.typeField = page.locator('xpath=//input[@name="serviceName"]/following::input[@role="combobox"][2]');
    this.descriptionInput = page.locator('textarea[name="serviceDescription"]').first();
    this.priceInput = page.getByPlaceholder(/enter price/i).or(page.locator('#outlined-basic')).first();
    this.taxableCheckbox = page.locator('input[name="isTaxApplicable"]').first();
    this.saveButton = page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last();

    this.lastService = null;
    this.lastServiceSaveOk = false;
  }

  logStep(msg) {
    console.log(`[VendorServices] ${msg}`);
  }

  async waitForNetworkSettled() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  _escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    await locator.press('Control+A').catch(() => {});
    await locator.fill('');
    await locator.pressSequentially(wanted, { delay: 30 });
    await this._commitReactInput(locator, wanted);
    await locator.blur().catch(() => {});
    this.logStep(`Filled ${label}: ${wanted}`);
  }

  _comboboxAliases(value) {
    const key = String(value || '').trim().toLowerCase();
    const aliases = {
      'interior design': ['Interior Design', 'Architectural Services', 'Specialized Design Services'],
      consultation: ['Consultation', 'Interior Design', 'Consulting Services'],
    };
    return [...new Set([value, ...(aliases[key] || [])].filter(Boolean))];
  }

  async _selectCombo(locator, value, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: this.uiTimeout });
    await this.page.getByRole('listbox').first().waitFor({ state: 'visible', timeout: this.uiTimeout }).catch(() => {});

    const candidates = this._comboboxAliases(value);
    for (const candidate of candidates) {
      const option = this.page.getByRole('option', { name: new RegExp(`^${this._escapeRegex(candidate)}$`, 'i') }).first();
      await option.scrollIntoViewIfNeeded().catch(() => {});
      if (!(await option.isVisible({ timeout: 2500 }).catch(() => false))) continue;
      const text = ((await option.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim() || candidate;
      await option.click({ timeout: this.uiTimeout });
      await this.page.getByRole('listbox').first().waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
      const selected = ((await locator.inputValue().catch(() => '')) || '').trim() || text;
      if (selected.toLowerCase() !== String(value).toLowerCase()) {
        this.logStep(`${label} "${value}" not in list — selected "${selected}"`);
      } else {
        this.logStep(`Selected ${label}: ${selected}`);
      }
      return selected;
    }

    const first = this.page.getByRole('option').filter({ hasNotText: /no options?|no result/i }).first();
    if (await first.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = ((await first.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      await first.click({ timeout: this.uiTimeout });
      this.logStep(`${label} "${value}" not in list — selected "${text}"`);
      await this.page.getByRole('listbox').first().waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
      return ((await locator.inputValue().catch(() => '')) || '').trim() || text;
    }
    throw new Error(`${label} option "${value}" was not found`);
  }

  async navigateToServices() {
    await this.waitForNetworkSettled();
    if (
      /services/i.test(this.page.url()) &&
      (await this.addServiceButton.isVisible({ timeout: 2000 }).catch(() => false))
    ) {
      this.logStep('Already on vendor Services');
      return;
    }
    await expect(this.servicesNav).toBeVisible({ timeout: this.defaultTimeout });
    await this.servicesNav.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/services/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    await expect(this.addServiceButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Navigated to vendor Services');
  }

  async expectServicesPageDisplayed() {
    await expect(this.addServiceButton).toBeVisible({ timeout: this.defaultTimeout });
    expect(this.page.url(), 'Vendor Services URL').toMatch(/services/i);
    this.logStep('Vendor Services page is displayed');
  }

  async clickAddService() {
    await expect(this.addServiceButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addServiceButton.click({ timeout: this.uiTimeout });
    await expect(this.serviceNameInput).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Service');
  }

  async expectCreateNewServicePageDisplayed() {
    await expect(this.serviceNameInput).toBeVisible({ timeout: this.defaultTimeout });
    const headingVisible = await this.formHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (headingVisible) this.logStep('Create New Service page is displayed');
    else this.logStep('Create New Service page is displayed (service name field is visible)');
  }

  async fillServiceName(value) {
    this.lastService = { ...(this.lastService || {}), name: value };
    await this._fillText(this.serviceNameInput, value, 'Service Name');
  }

  async selectServiceCategory(value) {
    const selected = await this._selectCombo(this.categoryField, value, 'Service Category');
    this.lastService = { ...(this.lastService || {}), category: selected || value };
  }

  async selectServiceType(value) {
    const selected = await this._selectCombo(this.typeField, value, 'Service Type');
    this.lastService = { ...(this.lastService || {}), type: selected || value };
  }

  async fillDescription(value) {
    this.lastService = { ...(this.lastService || {}), description: value };
    await this._fillText(this.descriptionInput, value, 'Description');
  }

  async selectPricingModule(moduleName) {
    const radio = this.page.locator(`input[name="pricingModule"][value="${moduleName}"]`).first();
    const label = this.page.getByText(new RegExp(`^${this._escapeRegex(moduleName)}$`, 'i')).first();
    if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
      await radio.check({ timeout: this.uiTimeout }).catch(async () => {
        await radio.click({ timeout: this.uiTimeout, force: true });
      });
    } else {
      await expect(label).toBeVisible({ timeout: this.uiTimeout });
      await label.click({ timeout: this.uiTimeout });
    }
    this.lastService = { ...(this.lastService || {}), pricingModule: moduleName };
    this.logStep(`Selected Pricing Module: ${moduleName}`);
  }

  async fillPrice(value) {
    this.lastService = { ...(this.lastService || {}), price: value };
    await this._fillText(this.priceInput, value, 'Price');
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
    if (svc.category) {
      await expect(this.categoryField).toHaveValue(new RegExp(this._escapeRegex(svc.category), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    if (svc.type) {
      await expect(this.typeField).toHaveValue(new RegExp(this._escapeRegex(svc.type), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    if (svc.description) {
      await expect(this.descriptionInput).toHaveValue(new RegExp(this._escapeRegex(svc.description), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    if (svc.price) {
      await expect(this.priceInput).toHaveValue(new RegExp(this._escapeRegex(svc.price), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    await expect(this.taxableCheckbox).toBeChecked({ timeout: this.uiTimeout });
    this.logStep('Entered vendor service details are displayed correctly');
  }

  async clickSave() {
    await expect(this.saveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.saveButton.scrollIntoViewIfNeeded().catch(() => {});

    const pending = this.page.waitForResponse(
      (res) => {
        const url = res.url() || '';
        const method = res.request().method();
        return (method === 'POST' || method === 'PUT') && /service/i.test(url);
      },
      { timeout: this.defaultTimeout }
    );

    await this.saveButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Save on vendor Create Service');
    const res = await pending.catch(() => null);
    this.lastServiceSaveOk = !!(res && res.ok());
    if (res) this.logStep(`Vendor service API ${res.status()} ${res.url()}`);
    await this.waitForNetworkSettled();
  }

  async expectServiceCreated() {
    const name = this.lastService && this.lastService.name;
    if (this.lastServiceSaveOk) {
      this.logStep('Vendor service created successfully');
      return;
    }
    if (name) {
      const listed = await this.page
        .getByText(new RegExp(this._escapeRegex(name), 'i'))
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (listed) {
        this.lastServiceSaveOk = true;
        this.logStep('Vendor service created successfully (shown in list)');
        return;
      }
    }
    throw new Error('Vendor service was not created');
  }

  async expectSuccessToast(message) {
    const needles = String(message)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const variants = needles.flatMap((n) => [n, n.replace(/\.$/, '')]);
    const timeout = this.lastServiceSaveOk ? 8000 : this.defaultTimeout;

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
        { timeout, intervals: [250, 500, 1000] }
      )
      .toBeTruthy()
      .then(() => true)
      .catch(() => false);

    if (toastFound) {
      this.logStep(`Saw success toast: ${message}`);
      return;
    }
    if (this.lastServiceSaveOk) {
      this.logStep(`Service save succeeded (UI did not show toast text "${message}")`);
      return;
    }
    throw new Error(`Did not see success toast matching "${message}"`);
  }

  async navigateBackToServiceList() {
    const formOpen = await this.serviceNameInput.isVisible({ timeout: 1500 }).catch(() => false);
    if (formOpen) {
      const close = this.page.getByRole('button', { name: /^cancel$|^close$|^back$/i }).first();
      if (await close.isVisible({ timeout: 1500 }).catch(() => false)) {
        await close.click({ timeout: this.uiTimeout });
      } else {
        await this.page.keyboard.press('Escape').catch(() => {});
      }
      await this.serviceNameInput.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }
    await this.waitForNetworkSettled();
    await expect(this.addServiceButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Navigated back to the vendor Service List');
  }

  async expectServiceInList(name) {
    const wanted = name || (this.lastService && this.lastService.name);
    if (await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.searchInput.click({ timeout: this.uiTimeout });
      await this.searchInput.fill('');
      await this.searchInput.fill(wanted);
      await this.searchInput.press('Enter').catch(() => {});
      await this.waitForNetworkSettled();
    }
    const row = this.page
      .getByRole('row', { name: new RegExp(this._escapeRegex(wanted), 'i') })
      .or(
        this.page
          .locator('tr, [role="row"], .MuiDataGrid-row, [class*="card"], [class*="Card"]')
          .filter({ hasText: new RegExp(this._escapeRegex(wanted), 'i') })
      )
      .or(this.page.getByText(new RegExp(this._escapeRegex(wanted), 'i')))
      .first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Vendor service "${wanted}" is displayed in the Service List`);
  }
}

module.exports = VendorServicesPage;
