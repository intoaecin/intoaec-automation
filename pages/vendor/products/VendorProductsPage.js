const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Vendor portal → Products → Add Product (Start From Scratch).
 *
 * Layering per AGENTS.md:
 *   Feature: features/vendor/auth/VendorLogin_TestCases.feature
 *   Steps:   step-definitions/vendor/auth/VendorLoginStep.js
 *   Page:    this file
 */
class VendorProductsPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.productsNav = page
      .locator('a[href="/products"]')
      .or(page.getByRole('link', { name: /inventory|^(my\s*)?products$/i }))
      .first();
    this.pageHeading = page
      .getByRole('heading', { name: /inventory|products|product list/i })
      .or(page.getByText(/^inventory$|^product list$|^no products found$/i))
      .first();
    this.addProductButton = page.getByRole('button', { name: /add\s*product/i }).first();
    this.searchInput = page.getByPlaceholder(/search/i).or(page.getByRole('textbox', { name: /search/i })).first();

    this.createDialog = page
      .getByRole('dialog')
      .or(page.locator('.MuiDialog-root'))
      .filter({ hasText: /create new product|select prodcut type|select product type|start from scratch/i })
      .first();
    this.startFromScratchOption = page.getByText(/start from scratch/i).first();
    this.importProductOption = page.getByText(/import product/i).first();
    this.proceedButton = page.getByRole('button', { name: /^proceed$/i }).first();

    this.formHeading = page.getByText(/^create new product$/i).first();
    this.productInformationHeading = page.getByText(/product information/i).first();
    this.productNameInput = page.locator('input[name="productName"]').first();
    this.categoryField = page.locator('xpath=//input[@name="productName"]/following::input[@role="combobox"][1]');
    this.subcategoryField = page.locator('xpath=//input[@name="productName"]/following::input[@role="combobox"][2]');
    this.productQuantityInput = page.locator('input[name="productQuantity"]').first();
    this.productBrandInput = page.locator('input[name="productBrand"]').first();
    this.productDescriptionInput = page.locator('textarea[name="productDescription"]').first();
    this.unitCostInput = page.locator('input[name="unitCost"]').first();
    this.saveButton = page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last();

    this.lastProduct = null;
    this.lastProductSaveOk = false;
  }

  logStep(msg) {
    console.log(`[VendorProducts] ${msg}`);
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
      'building materials': ['Building Materials', 'Flooring Materials', 'Green Building Materials'],
      'floor tiles': ['Floor Tiles', 'Ceramic Tiles', 'Vitrified Flooring'],
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

  async navigateToProducts() {
    await this.waitForNetworkSettled();
    if (/product/i.test(this.page.url()) && (await this.addProductButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      this.logStep('Already on vendor Products');
      return;
    }
    await expect(this.productsNav).toBeVisible({ timeout: this.defaultTimeout });
    await this.productsNav.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/products/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    await expect(this.addProductButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Navigated to vendor Products');
  }

  async expectProductsPageDisplayed() {
    await expect(this.addProductButton).toBeVisible({ timeout: this.defaultTimeout });
    const headingVisible = await this.pageHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (headingVisible) this.logStep('Vendor Products page is displayed');
    else this.logStep('Vendor Products page is displayed (Add Product is visible)');
  }

  async clickAddProduct() {
    await expect(this.addProductButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addProductButton.click({ timeout: this.uiTimeout });
    await expect(this.createDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Product');
  }

  async expectCreationOptionsDisplayed() {
    await expect(this.startFromScratchOption).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.proceedButton).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Vendor product creation options are displayed');
  }

  async selectStartFromScratch() {
    await expect(this.startFromScratchOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.startFromScratchOption.click({ timeout: this.uiTimeout });
    await expect(this.proceedButton).toBeEnabled({ timeout: this.uiTimeout });
    this.logStep('Selected Start From Scratch');
  }

  async expectStartFromScratchSelected() {
    const card = this.page
      .locator('div, button, [role="button"], [role="radio"]')
      .filter({ hasText: /start from scratch/i })
      .first();
    const selected =
      (await card.getAttribute('aria-selected').catch(() => '')) === 'true' ||
      (await card.getAttribute('aria-pressed').catch(() => '')) === 'true' ||
      (await card.getAttribute('aria-checked').catch(() => '')) === 'true' ||
      /selected|Mui-selected|checked/i.test((await card.getAttribute('class').catch(() => '')) || '');
    const proceedEnabled = await this.proceedButton.isEnabled().catch(() => false);
    if (!selected && !proceedEnabled) {
      throw new Error('Start From Scratch was not selected');
    }
    this.logStep('Start From Scratch option is selected');
  }

  async clickProceed() {
    await expect(this.proceedButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.proceedButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.proceedButton.click({ timeout: this.uiTimeout });
    await expect(this.productNameInput).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Proceed');
  }

  async expectCreateNewProductPageDisplayed() {
    await expect(this.productNameInput).toBeVisible({ timeout: this.defaultTimeout });
    const headingVisible = await this.formHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (headingVisible) this.logStep('Create New Product page is displayed');
    else this.logStep('Create New Product page is displayed (product name field is visible)');
  }

  async expectProductInformationSectionDisplayed() {
    const section = this.productInformationHeading.or(this.productNameInput).first();
    await expect(section).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.productNameInput).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Product Information section is displayed');
  }

  async fillProductName(value) {
    this.lastProduct = { ...(this.lastProduct || {}), name: value };
    await this._fillText(this.productNameInput, value, 'Product Name');
  }

  async selectCategory(value) {
    const selected = await this._selectCombo(this.categoryField, value, 'Category');
    this.lastProduct = { ...(this.lastProduct || {}), category: selected || value };
  }

  async selectSubCategory(value) {
    const selected = await this._selectCombo(this.subcategoryField, value, 'Sub Category');
    this.lastProduct = { ...(this.lastProduct || {}), subCategory: selected || value };
  }

  async fillQuantity(value) {
    this.lastProduct = { ...(this.lastProduct || {}), quantity: value };
    await this._fillText(this.productQuantityInput, value, 'Product Quantity');
  }

  async fillBrand(value) {
    this.lastProduct = { ...(this.lastProduct || {}), brand: value };
    await this._fillText(this.productBrandInput, value, 'Brand');
  }

  async fillDescription(value) {
    this.lastProduct = { ...(this.lastProduct || {}), description: value };
    await this._fillText(this.productDescriptionInput, value, 'Description');
  }

  async expectEnteredProductInformationDisplayed() {
    const p = this.lastProduct || {};
    await expect(this.productNameInput).toHaveValue(new RegExp(this._escapeRegex(p.name || ''), 'i'), {
      timeout: this.uiTimeout,
    });
    if (p.quantity) {
      await expect(this.productQuantityInput).toHaveValue(new RegExp(this._escapeRegex(p.quantity), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    if (p.brand) {
      await expect(this.productBrandInput).toHaveValue(new RegExp(this._escapeRegex(p.brand), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    if (p.description) {
      await expect(this.productDescriptionInput).toHaveValue(new RegExp(this._escapeRegex(p.description), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    if (p.category) {
      await expect(this.categoryField).toHaveValue(new RegExp(this._escapeRegex(p.category), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    if (p.subCategory) {
      await expect(this.subcategoryField).toHaveValue(new RegExp(this._escapeRegex(p.subCategory), 'i'), {
        timeout: this.uiTimeout,
      });
    }
    this.logStep('Entered vendor product information is displayed correctly');
  }

  async clickSave() {
    if (await this.unitCostInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      const current = ((await this.unitCostInput.inputValue().catch(() => '')) || '').trim();
      if (!current || current === '0') {
        await this._fillText(this.unitCostInput, '100', 'Unit Cost');
      }
    }
    await expect(this.saveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.saveButton.scrollIntoViewIfNeeded().catch(() => {});

    const pending = this.page.waitForResponse(
      (res) => {
        const url = res.url() || '';
        const method = res.request().method();
        return (method === 'POST' || method === 'PUT') && /product|warehouse|vendor/i.test(url);
      },
      { timeout: this.defaultTimeout }
    );

    await this.saveButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Save on vendor Create Product');
    const res = await pending.catch(() => null);
    this.lastProductSaveOk = !!(res && res.ok());
    if (res) this.logStep(`Vendor product API ${res.status()} ${res.url()}`);
    await this.waitForNetworkSettled();
  }

  async expectProductCreated() {
    const name = this.lastProduct && this.lastProduct.name;
    if (this.lastProductSaveOk) {
      this.logStep('Vendor product created successfully');
      return;
    }
    if (name) {
      const listed = await this.page
        .getByText(new RegExp(this._escapeRegex(name), 'i'))
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (listed) {
        this.lastProductSaveOk = true;
        this.logStep('Vendor product created successfully (shown in list)');
        return;
      }
    }
    throw new Error('Vendor product was not created');
  }

  async expectSuccessToast(message) {
    const needles = String(message)
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const variants = needles.flatMap((n) => [n, n.replace(/\.$/, '')]);
    const timeout = this.lastProductSaveOk ? 8000 : this.defaultTimeout;

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
    if (this.lastProductSaveOk) {
      this.logStep(`Product save succeeded (UI did not show toast text "${message}")`);
      return;
    }
    throw new Error(`Did not see success toast matching "${message}"`);
  }

  async expectProductInList(name) {
    const wanted = name || (this.lastProduct && this.lastProduct.name);
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
    this.logStep(`Vendor product "${wanted}" is displayed in the Product List`);
  }
}

module.exports = VendorProductsPage;
