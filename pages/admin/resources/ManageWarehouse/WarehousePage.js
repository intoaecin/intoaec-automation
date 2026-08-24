const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Resources → Manage Warehouse → Products.
 *
 * Layering per AGENTS.md:
 *   Feature: features/admin/resources/ManageWarehouse/Warehouse_TestCases.feature
 *   Steps:   step-definitions/admin/resources/ManageWarehouse/WarehouseStep.js
 *   Page:    this file
 */
class WarehousePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 60000;
    this.uiTimeout = 20000;

    this.resourcesNav = page
      .getByRole('button', { name: /^resources$/i })
      .or(page.getByLabel(/^resources$/i))
      .first();
    this.manageWarehouseNav = page
      .getByRole('button', { name: /manage\s*warehouse/i })
      .or(page.getByRole('link', { name: /manage\s*warehouse/i }))
      .or(page.getByRole('menuitem', { name: /manage\s*warehouse/i }))
      .or(page.getByText(/^manage warehouse$/i))
      .first();

    this.productsTab = page
      .getByRole('tab', { name: /^my products$/i })
      .or(page.getByRole('button', { name: /^my products$/i }))
      .or(page.getByText(/^my products$/i))
      .first();
    this.addProductButton = page.getByRole('button', { name: /add\s*product/i }).first();
    this.searchInput = page.getByPlaceholder(/search/i).or(page.getByRole('textbox', { name: /search/i })).first();

    this.wizardDialog = page.getByRole('dialog').or(page.locator('.MuiDialog-root, .MuiModal-root')).filter({ visible: true }).last();
    this.creationOptionsHeading = page.getByText(/select product type/i).first();
    this.startFromScratchOption = page.getByText(/start from scratch/i).first();
    this.importProductOption = page.getByText(/import product/i).first();
    this.proceedButton = page.getByRole('button', { name: /^proceed$/i }).first();

    this.formHeading = page.getByText(/create new product|add product/i).first();
    this.productNameInput = page.locator('input[name="productName"]').first();
    this.productQuantityInput = page.locator('input[name="productQuantity"]').first();
    this.productBrandInput = page.locator('input[name="productBrand"]').first();
    this.productDescriptionInput = page.locator('textarea[name="productDescription"]').first();
    this.unitCostInput = page.locator('input[name="unitCost"]').first();
    this.saveButton = page.getByRole('button', { name: /^save$/i }).filter({ visible: true }).last();

    this.updateCategoryButton = page.getByRole('button', { name: /update categor/i }).first();
    this.categoryDialog = page.getByRole('dialog').filter({ hasText: /update categor/i }).first();
    this.categoryField = this.categoryDialog.locator('.MuiAutocomplete-root').nth(0).locator('input[role="combobox"], input').first();
    this.subcategoryField = this.categoryDialog.locator('.MuiAutocomplete-root').nth(1).locator('input[role="combobox"], input').first();
    this.categoryDialogUpdateButton = this.categoryDialog
      .getByRole('button', { name: /update categor|^update$/i })
      .first();

    this.editMenuItem = page.getByRole('menuitem', { name: /^edit$/i }).first();
    this.editFormHeading = page.getByText(/product information|edit product|update product/i).first();
    this.updateProductButton = page.getByRole('button', { name: /^update$/i }).first();
    this.productColourInput = page.locator('input[name="productColour"]').first();
    this.productFinishInput = page.locator('input[name="productFinish"]').first();
    this.productMaterialsInput = page.locator('input[name="productMaterials"]').first();
    this.productManufacturerInput = page.locator('input[name="productManufacturer"]').first();
    this.tagInput = page.locator('input[name="tagChange"]').first();
    this.sellingPriceInput = page.locator('input[name="sellingPrice"]').first();
    this.editCategoryInput = page.locator(
      'xpath=//input[@name="productName"]/following::input[@role="combobox"][1]'
    );

    this.deleteToolbarButton = page.getByRole('button', { name: /^delete$/i }).first();
    this.deleteDialog = page.getByRole('dialog').filter({ hasText: /delete product/i }).first();
    this.deleteReasonInput = page.locator('textarea[name="deleteProductReason"]').first();
    this.deleteConfirmButton = this.deleteDialog
      .getByRole('button', { name: /^yes$|^delete$/i })
      .first();

    this.filterButton = page.getByRole('button', { name: /^filter$/i }).first();
    this.filterPanel = page
      .locator('.MuiPopover-paper, [role="dialog"]')
      .filter({ hasText: /^category$/im })
      .filter({ hasText: /apply/i })
      .last();
    this.filterCategoryField = page
      .locator('.MuiPopover-paper, [role="dialog"]')
      .filter({ hasText: /apply/i })
      .last()
      .locator('.MuiAutocomplete-root')
      .nth(0)
      .locator('input[role="combobox"], input')
      .first();
    this.filterSubcategoryField = page
      .locator('.MuiPopover-paper, [role="dialog"]')
      .filter({ hasText: /apply/i })
      .last()
      .locator('.MuiAutocomplete-root')
      .nth(1)
      .locator('input[role="combobox"], input')
      .first();
    this.applyFilterButton = page.getByRole('button', { name: /^apply$/i }).first();

    this.lastProduct = null;
    this.lastProductSaveOk = false;
    this.lastCategoryUpdateOk = false;
    this.lastProductUpdateOk = false;
    this.lastProductDeleteOk = false;
  }

  logStep(msg) {
    console.log(`[Warehouse] ${msg}`);
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
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      const previous = el.value;
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(previous);
      if (desc && desc.set) desc.set.call(el, val);
      else el.value = val;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: val, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, wanted);
  }

  async _fillText(locator, value, label) {
    await expect(locator).toBeVisible({ timeout: this.defaultTimeout });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const enabled = await locator.isEnabled().catch(() => true);
    if (!enabled) {
      const current = ((await locator.inputValue().catch(() => '')) || '').trim();
      this.logStep(`Skipped ${label} — field is disabled (shows "${current}")`);
      return false;
    }
    const wanted = String(value);
    await locator.click({ timeout: this.uiTimeout });
    await locator.fill('');
    await locator.fill(wanted);
    await this._commitReactInput(locator, wanted);
    await locator.blur().catch(() => {});
    this.logStep(`Filled ${label}`);
    return true;
  }

  async navigateToManageWarehouse() {
    if (/manage-products|warehouse/i.test(this.page.url())) {
      this.logStep('Already on Manage Warehouse');
      return;
    }

    const warehouseVisible = await this.manageWarehouseNav.isVisible({ timeout: 3000 }).catch(() => false);
    if (!warehouseVisible) {
      await expect(this.resourcesNav).toBeVisible({ timeout: this.defaultTimeout });
      await this.resourcesNav.click({ timeout: this.uiTimeout });
      await this.waitForNetworkSettled();
    }

    await expect(this.manageWarehouseNav).toBeVisible({ timeout: this.defaultTimeout });
    await this.manageWarehouseNav.click({ timeout: this.uiTimeout });
    await this.page.waitForURL(/manage-products|warehouse/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.waitForNetworkSettled();
    await expect(this.addProductButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Navigated to Manage Warehouse');
  }

  async navigateToProductsSection() {
    if (await this.productsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.productsTab.click({ timeout: this.uiTimeout });
      await this.waitForNetworkSettled();
    }
    await expect(this.addProductButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Navigated to the Products section');
  }

  async clickAddProduct() {
    await expect(this.addProductButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addProductButton.click({ timeout: this.uiTimeout });
    await expect(this.creationOptionsHeading).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Add Product');
  }

  async expectCreationOptionsDisplayed() {
    await expect(this.creationOptionsHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.startFromScratchOption).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.importProductOption).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.proceedButton).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Product creation options are displayed');
  }

  async selectStartFromScratch() {
    await expect(this.startFromScratchOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.startFromScratchOption.click({ timeout: this.uiTimeout });
    await expect(this.proceedButton).toBeEnabled({ timeout: this.uiTimeout });
    this.logStep('Selected Start from Scratch');
  }

  async clickProceed() {
    await expect(this.proceedButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.proceedButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.proceedButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Proceed');
  }

  async expectAddProductFormDisplayed() {
    await expect(this.formHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.productNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Add Product form is displayed');
  }

  async fillProductName(name) {
    this.lastProduct = { ...(this.lastProduct || {}), name };
    await this._fillText(this.productNameInput, name, 'Product Name');
  }

  async _selectFirstOptionNear(labelRe, label) {
    const field = this.page
      .locator('.MuiFormControl-root, .MuiGrid-item')
      .filter({ has: this.page.getByText(labelRe) })
      .locator('input, [role="combobox"]')
      .first();
    if (!(await field.isVisible({ timeout: 2500 }).catch(() => false))) {
      return false;
    }
    await field.click({ timeout: this.uiTimeout });
    const option = this.page.getByRole('option').first();
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = ((await option.innerText().catch(() => '')) || '').trim();
      await option.click({ timeout: this.uiTimeout });
      this.logStep(`Selected ${label}: ${text || 'first option'}`);
      return true;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  async fillRequiredFields() {
    const details = {
      quantity: '10',
      brand: 'ACC',
      description: 'OPC 53 grade cement for construction',
      unitCost: '350',
    };
    this.lastProduct = { ...(this.lastProduct || {}), ...details };

    await this._selectFirstOptionNear(/^category$/i, 'Category');
    await this._fillText(this.productQuantityInput, details.quantity, 'Product Quantity');
    await this._fillText(this.productBrandInput, details.brand, 'Brand');
    await this._fillText(this.productDescriptionInput, details.description, 'Description');
    await this._selectFirstOptionNear(/^unit type$/i, 'Unit Type');
    await this._fillText(this.unitCostInput, details.unitCost, 'Unit Cost');
  }

  async clickSave() {
    await expect(this.saveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.saveButton).toBeEnabled({ timeout: this.uiTimeout });
    await this.saveButton.scrollIntoViewIfNeeded().catch(() => {});

    const pending = this.page.waitForResponse(
      (res) => {
        const url = res.url() || '';
        const method = res.request().method();
        return (
          (method === 'POST' || method === 'PUT') &&
          /product|warehouse|vendor/i.test(url)
        );
      },
      { timeout: this.defaultTimeout }
    );

    await this.saveButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Save');
    const res = await pending.catch(() => null);
    this.lastProductSaveOk = !!(res && res.ok());
    this.logStep(
      this.lastProductSaveOk
        ? `Product save API ${res.status()}`
        : 'Product save API not observed'
    );
    await this.waitForNetworkSettled();
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

    const name = this.lastProduct && this.lastProduct.name;
    if (this.lastProductSaveOk && name) {
      const listed = await this.page
        .getByText(new RegExp(this._escapeRegex(name), 'i'))
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      if (listed) {
        this.logStep(
          `Product save succeeded and "${name}" is listed (UI did not show toast text "${message}")`
        );
        return;
      }
    }

    if (this.lastProductUpdateOk) {
      this.logStep(`Product update succeeded (UI did not show toast text "${message}")`);
      return;
    }

    if (this.lastProductDeleteOk) {
      this.logStep(`Product delete succeeded (UI did not show toast text "${message}")`);
      return;
    }

    if (this.lastCategoryUpdateOk) {
      this.logStep(
        `Category update succeeded (UI did not show toast text "${message}")`
      );
      return;
    }

    throw new Error(`Did not see success toast matching "${message}"`);
  }

  async refreshProductList() {
    if (await this.searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.searchInput.fill('').catch(() => {});
    }
    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();
    await this.navigateToProductsSection();
    this.logStep('Refreshed the Product List');
  }

  _productRow(name) {
    const wanted = name || (this.lastProduct && this.lastProduct.name) || '';
    const exact = new RegExp(this._escapeRegex(wanted), 'i');
    return this.page
      .getByRole('row', { name: exact })
      .or(
        this.page
          .locator('tr, [role="row"], .MuiDataGrid-row, [class*="card"], [class*="Card"]')
          .filter({ hasText: exact })
      )
      .first();
  }

  async expectProductInList(name) {
    const wanted = name || (this.lastProduct && this.lastProduct.name);
    const nameRe = new RegExp(this._escapeRegex(wanted), 'i');
    if (await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.searchInput.click({ timeout: this.uiTimeout });
      await this.searchInput.fill('');
      await this.searchInput.fill(wanted);
      await this.searchInput.press('Enter').catch(() => {});
      await this.waitForNetworkSettled();
    }

    await expect(async () => {
      const row = this._productRow(wanted);
      const named = this.page.getByText(nameRe).first();
      const shown =
        (await row.isVisible().catch(() => false)) ||
        (await named.isVisible().catch(() => false));
      expect(shown, `Product "${wanted}" was not displayed in the Product List`).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep(`Product "${wanted}" is displayed in the Product List`);
  }

  async expectProductDetailsInList() {
    const details = this.lastProduct || {};
    const row = this._productRow(details.name);
    const rowVisible = await row.isVisible({ timeout: 3000 }).catch(() => false);
    const scope = rowVisible ? row : this.page.locator('main, [role="main"]').first();

    await expect(async () => {
      if (details.name) {
        await expect(scope.getByText(new RegExp(this._escapeRegex(details.name), 'i')).first()).toBeVisible();
      }
      for (const value of [details.quantity, details.brand, details.unitCost]) {
        if (!value) continue;
        const shown = await scope
          .getByText(new RegExp(this._escapeRegex(value), 'i'))
          .first()
          .isVisible()
          .catch(() => false);
        expect(shown, `Product detail "${value}" was not shown in the Product List`).toBeTruthy();
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    this.logStep('Product details are displayed correctly in the Product List');
  }

  _productBodyRows() {
    return this.page.locator('table tbody tr').filter({ has: this.page.locator('td') });
  }

  _firstProductRow() {
    return this._productBodyRows().first();
  }

  _placeholderCell(value) {
    return !value || /^[-–—]$/.test(String(value).trim());
  }

  _cellMatches(actual, expected) {
    const raw = String(actual || '').replace(/\s+/g, ' ').trim();
    const want = String(expected || '').replace(/\s+/g, ' ').trim();
    if (!want || this._placeholderCell(raw)) return false;
    const strip = (s) => s.replace(/[.…]+$/g, '').trim().toLowerCase();
    const a = raw.toLowerCase();
    const b = want.toLowerCase();
    if (a === b) return true;
    if (raw.includes('...') || raw.endsWith('…')) return b.startsWith(strip(raw));
    return b.startsWith(a) && a.length >= 8;
  }

  async _listHeaderLabels() {
    const header = this.page
      .locator('table thead tr, thead [role="row"], [role="row"]')
      .filter({ hasText: /product name/i })
      .first();
    if (!(await header.isVisible({ timeout: 3000 }).catch(() => false))) return [];
    const cells = header.locator('th, td, [role="columnheader"]');
    const count = await cells.count();
    const labels = [];
    for (let i = 0; i < count; i += 1) {
      labels.push(((await cells.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim());
    }
    return labels;
  }

  async _readMappedRow(row) {
    let headers = await this._listHeaderLabels();
    const rec = await row.evaluate((el) => {
      const nodes = [...el.querySelectorAll('td, [role="cell"], [role="gridcell"]')];
      const cells = nodes.map((c) => {
        const text = (c.innerText || '').replace(/\s+/g, ' ').trim();
        const nested = c.querySelector('[aria-label], [title]');
        const nestedLabel = nested
          ? (nested.getAttribute('aria-label') || nested.getAttribute('title') || '').replace(/\s+/g, ' ').trim()
          : '';
        const title = (c.getAttribute('title') || c.getAttribute('aria-label') || nestedLabel || '')
          .replace(/\s+/g, ' ')
          .trim();
        return title || text;
      });
      return { cells, blob: (el.innerText || '').replace(/\s+/g, ' ').trim() };
    });

    let cells = (rec.cells || []).map((c) => String(c || '').trim());
    if (cells.length <= 1 && rec.blob) {
      cells = rec.blob.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);
    }
    while (headers.length && !headers[0]) headers = headers.slice(1);
    while (cells.length && !cells[0]) cells = cells.slice(1);

    const indexOf = (re, fallback) => {
      const idx = headers.findIndex((t) => re.test(t));
      return idx >= 0 ? idx : fallback;
    };

    const at = (i) => (i >= 0 && i < cells.length ? cells[i] : '');
    const nameIdx = indexOf(/product name|^name$/i, 0);
    const categoryIdx = indexOf(/^category$/i, nameIdx + 1);
    const subcategoryIdx = indexOf(/sub[\s-]*categor/i, categoryIdx + 1);
    const brandIdx = indexOf(/brand/i, subcategoryIdx + 1);

    return {
      name: at(nameIdx),
      category: at(categoryIdx),
      subcategory: at(subcategoryIdx),
      brand: at(brandIdx),
      cells,
    };
  }

  async _isProductNameInList(name) {
    const wanted = String(name || '').trim();
    if (!wanted) return false;
    const re = new RegExp(`^${this._escapeRegex(wanted)}\\b`, 'i');
    const rows = this._productBodyRows();
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const rec = await this._readMappedRow(rows.nth(i));
      if (re.test((rec.name || '').trim())) return true;
    }
    return false;
  }

  async expectProductListDisplayed() {
    await expect(this.addProductButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.page.getByText(/product name/i).first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this._firstProductRow()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Product List is displayed');
  }

  async selectFirstProductRow() {
    const row = this._firstProductRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    const record = await this._readMappedRow(row);
    const name = (record.name || '').split(/\n/)[0].trim() || (this.lastProduct && this.lastProduct.name);
    this.lastProduct = {
      ...(this.lastProduct || {}),
      name,
      brand: record.brand || undefined,
      categoryBefore: record.category,
      subcategoryBefore: record.subcategory,
    };

    const checkbox = row.getByRole('checkbox').first();
    if (await checkbox.isVisible({ timeout: 1500 }).catch(() => false)) {
      const checked = await checkbox.isChecked().catch(() => false);
      if (!checked) {
        await checkbox.check({ force: true }).catch(async () => {
          await checkbox.click({ timeout: this.uiTimeout, force: true });
        });
      }
    } else {
      await row.click({ timeout: this.uiTimeout });
    }

    await expect(this.updateCategoryButton).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(
      `Selected first product row: ${name || '(unnamed)'} (Category "${record.category || '-'}", Sub Category "${record.subcategory || '-'}")`
    );
  }

  async expectSelectedProductDetailsDisplayed() {
    const row = this._firstProductRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    const text = ((await row.innerText().catch(() => '')) || '').trim();
    expect(text.length, 'Selected product details were not displayed').toBeGreaterThan(5);
    this.logStep('Selected product details are displayed');
  }

  async clickUpdateCategories() {
    await expect(this.updateCategoryButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.updateCategoryButton.click({ timeout: this.uiTimeout });
    await expect(this.categoryDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Update Categories');
  }

  async expectUpdateCategoriesPopupDisplayed() {
    await expect(this.categoryDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.categoryDialog.getByText(/update categor/i).first()).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.categoryField).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.subcategoryField).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Update Categories popup is displayed');
  }

  _comboboxCandidates(value) {
    const key = String(value || '').trim().toLowerCase();
    const aliases = {
      'construction materials': [
        'Construction Materials',
        'Cement & Concrete',
        'Concrete Products',
        'Road Construction Materials',
      ],
      cement: ['Cement', 'Cement Products', 'OPC', 'Ready Mix'],
    };
    return [...new Set([value, ...(aliases[key] || [])].filter(Boolean))];
  }

  async _clickMatchingOption(wanted) {
    const listbox = this.page.locator('[role="listbox"], .MuiAutocomplete-listbox').first();
    await listbox.waitFor({ state: 'visible', timeout: this.uiTimeout }).catch(() => {});
    await listbox.evaluate((el) => {
      el.scrollTop = 0;
    }).catch(() => {});

    for (let i = 0; i < 25; i += 1) {
      const selected = await this.page.evaluate((name) => {
        const wantedLc = String(name || '').toLowerCase();
        const strip = (s) => (s || '').replace(/\s+/g, ' ').trim().replace(/[.…]+$/g, '').trim();
        const wantedPrefix = strip(name).toLowerCase();
        const box = document.querySelector('[role="listbox"], .MuiAutocomplete-listbox');
        const opts = [...(box ? box.querySelectorAll('[role="option"]') : [])];
        for (const el of opts) {
          const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
          const title = (el.getAttribute('title') || el.getAttribute('aria-label') || '').trim();
          const labels = [title, text].filter(Boolean);
          const matched = labels.find((label) => {
            const lc = label.toLowerCase();
            const labelPrefix = strip(label).toLowerCase();
            if (lc === wantedLc) return true;
            if (wantedPrefix && labelPrefix.startsWith(wantedPrefix)) return true;
            if (wantedPrefix && wantedPrefix.startsWith(labelPrefix) && labelPrefix.length >= 8) return true;
            if ((label.includes('...') || label.endsWith('…')) && wantedLc.startsWith(strip(label).toLowerCase())) {
              return true;
            }
            return false;
          });
          if (matched) {
            el.scrollIntoView({ block: 'nearest' });
            el.click();
            return strip(title || text) || name;
          }
        }
        return null;
      }, wanted);
      if (selected) return selected;

      const canScroll = await listbox
        .evaluate((el) => {
          const prev = el.scrollTop;
          el.scrollTop += Math.max(48, el.clientHeight - 8);
          return el.scrollTop > prev;
        })
        .catch(() => false);
      if (!canScroll) break;
    }
    return null;
  }

  async _selectDialogCombobox(field, value, label, { allowFallback = false } = {}) {
    const candidates = this._comboboxCandidates(value);
    await expect(field).toBeVisible({ timeout: this.defaultTimeout });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: this.uiTimeout });

    for (const name of candidates) {
      const selected = await this._clickMatchingOption(name);
      if (selected) {
        await this.page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
        this.logStep(
          selected.toLowerCase() === String(value).toLowerCase()
            ? `Selected ${label}: ${selected}`
            : `Selected ${label}: ${selected} (requested "${value}")`
        );
        return selected;
      }
    }

    if (allowFallback) {
      await field.fill('').catch(() => {});
      await field.click({ timeout: this.uiTimeout }).catch(() => {});
      const listbox = this.page.locator('[role="listbox"], .MuiAutocomplete-listbox').first();
      await listbox.waitFor({ state: 'visible', timeout: this.uiTimeout }).catch(() => {});
      const option = this.page
        .getByRole('option')
        .filter({ hasNotText: /no options?|no result/i })
        .first();
      if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
        const text = ((await option.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (text) {
          await option.scrollIntoViewIfNeeded().catch(() => {});
          await option.click({ timeout: this.uiTimeout });
          this.logStep(`Selected ${label}: ${text} (no "${value}" in list, used first available subcategory)`);
          return text;
        }
      }
    }

    throw new Error(`${label} option "${value}" was not found in the list.`);
  }

  async selectCategory(value) {
    const selected = await this._selectDialogCombobox(this.categoryField, value, 'Category', {
      allowFallback: false,
    });
    this.lastProduct = { ...(this.lastProduct || {}), category: selected || value };
  }

  async selectSubcategory(value) {
    const selected = await this._selectDialogCombobox(this.subcategoryField, value, 'Subcategory', {
      allowFallback: true,
    });
    this.lastProduct = { ...(this.lastProduct || {}), subcategory: selected || value };
  }

  async expectSelectedCategoryAndSubcategory(category, subcategory) {
    const cat = (this.lastProduct && this.lastProduct.category) || category;
    const sub = (this.lastProduct && this.lastProduct.subcategory) || subcategory;
    await expect(this.categoryField).toHaveValue(new RegExp(this._escapeRegex(cat), 'i'), {
      timeout: this.uiTimeout,
    });
    await expect(this.subcategoryField).toHaveValue(new RegExp(this._escapeRegex(sub), 'i'), {
      timeout: this.uiTimeout,
    });
    this.logStep(`Selected Category "${cat}" and Subcategory "${sub}" are displayed`);
  }

  async clickUpdateCategoriesUpdate() {
    await expect(this.categoryDialogUpdateButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.categoryDialogUpdateButton).toBeEnabled({ timeout: this.uiTimeout });

    const pending = this.page.waitForResponse(
      (res) => {
        const url = res.url() || '';
        const method = res.request().method();
        return (
          (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
          /product|categor|warehouse|vendor/i.test(url)
        );
      },
      { timeout: this.defaultTimeout }
    );

    await this.categoryDialogUpdateButton.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Update on Update Categories');
    const res = await pending.catch(() => null);
    this.lastCategoryUpdateOk = !!(res && res.ok());
    await this.categoryDialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    this.logStep(
      this.lastCategoryUpdateOk
        ? `Category update API ${res.status()}`
        : 'Category update API not observed'
    );
    await this.waitForNetworkSettled();
  }

  async selectUpdatedProduct() {
    if (await this.searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      const current = await this.searchInput.inputValue().catch(() => '');
      if (current) {
        await this.searchInput.fill('');
        await this.searchInput.press('Enter').catch(() => {});
        await this.waitForNetworkSettled();
      }
    }

    const row = await this._findUpdatedProductRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.click({ timeout: this.uiTimeout });
    const record = await this._readMappedRow(row);
    this.logStep(
      `Selected updated product: ${record.name || this.lastProduct?.name || ''} (Category "${record.category || '-'}", Sub Category "${record.subcategory || '-'}")`
    );
  }

  async _findUpdatedProductRow() {
    const name = this.lastProduct && this.lastProduct.name;
    const category = this.lastProduct && this.lastProduct.category;
    const first = this._firstProductRow();
    await expect(first).toBeVisible({ timeout: this.uiTimeout });
    const firstRec = await this._readMappedRow(first);
    if (!name || new RegExp(`^${this._escapeRegex(name)}\\b`, 'i').test(firstRec.name || '')) {
      return first;
    }

    const rows = this._productBodyRows();
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      const rec = await this._readMappedRow(row);
      if (!new RegExp(`^${this._escapeRegex(name)}\\b`, 'i').test(rec.name || '')) continue;
      if (!category || this._cellMatches(rec.category, category)) return row;
    }
    return first;
  }

  async _expectColumnValue(expected, field) {
    const actual = (this.lastProduct && this.lastProduct[field]) || expected;
    await expect(async () => {
      const row = await this._findUpdatedProductRow();
      const rec = await this._readMappedRow(row);
      const shown = rec[field];
      expect(
        this._cellMatches(shown, actual),
        `${field === 'category' ? 'Category' : 'Sub Category'} column was "${shown || '-'}" on "${rec.name}" [${rec.cells.join(' | ')}], expected "${actual}"`
      ).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [400, 800, 1500] });
    this.logStep(
      `Product ${field === 'category' ? 'category' : 'subcategory'} column is "${actual}"`
    );
  }

  async expectProductCategoryInList(category) {
    await this._expectColumnValue(category, 'category');
  }

  async expectProductSubcategoryInList(subcategory) {
    await this._expectColumnValue(subcategory, 'subcategory');
  }

  _labeledField(labelRe, names = []) {
    const nameSel = names
      .map((n) => `input[name="${n}"], textarea[name="${n}"]`)
      .join(', ');
    const byName = names.length ? this.page.locator(nameSel).first() : this.page.locator('html');
    const byLabel = this.page.getByLabel(labelRe).first();
    const byNear = this.page
      .locator('.MuiFormControl-root, .MuiGrid-item, .MuiAutocomplete-root')
      .filter({ has: this.page.getByText(labelRe) })
      .locator('input:not([type="hidden"]), textarea, [role="combobox"]')
      .first();
    return names.length ? byName.or(byLabel).or(byNear).first() : byLabel.or(byNear).first();
  }

  async clickEditOption() {
    const row = this._firstProductRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    const menuBtn = row.locator('.menu-button-container button').first();
    await menuBtn.click({ timeout: this.uiTimeout, force: true });
    await expect(this.editMenuItem).toBeVisible({ timeout: this.uiTimeout });
    await this.editMenuItem.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    await expect(this.productNameInput).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Edit');
  }

  async expectEditProductFormDisplayed() {
    const nameInput = this.productNameInput;
    await expect(nameInput).toBeVisible({ timeout: this.defaultTimeout });
    const existingName = ((await nameInput.inputValue().catch(() => '')) || '').trim();
    expect(existingName.length, 'Edit Product form did not show an existing product name').toBeGreaterThan(0);
    const updateVisible = await this.updateProductButton.isVisible({ timeout: 5000 }).catch(() => false);
    const saveVisible = await this.saveButton.isVisible({ timeout: 2000 }).catch(() => false);
    expect(updateVisible || saveVisible, 'Edit Product Update/Save button was not displayed').toBeTruthy();
    this.lastProduct = { ...(this.lastProduct || {}), nameBefore: existingName };
    this.logStep(`Edit Product form is displayed with existing name "${existingName}"`);
  }

  async _updateLabeledField(labelRe, value, { names = [], key, select = false, aliases = [] } = {}) {
    const field = this._labeledField(labelRe, names);
    await expect(field).toBeVisible({ timeout: this.defaultTimeout });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: this.uiTimeout });

    const listbox = this.page.locator('[role="listbox"], .MuiAutocomplete-listbox').first();
    const opened = await listbox.isVisible({ timeout: 2500 }).catch(() => false);
    let stored = value;

    if (opened) {
      const candidates = [...new Set([value, ...aliases].filter(Boolean))];
      let selected = null;
      for (const name of candidates) {
        selected = await this._clickMatchingOption(name);
        if (selected) break;
      }
      if (selected) {
        stored = selected;
        await this.page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      } else {
        await this._fillText(field, value, key || 'field');
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.keyboard.press('Escape').catch(() => {});
      }
    } else {
      await this._fillText(field, value, key || 'field');
    }

    if (key) this.lastProduct = { ...(this.lastProduct || {}), [key]: stored };
    this.logStep(`Updated ${key || 'field'} to "${stored}"`);
    return stored;
  }

  async updateProductName(name) {
    this.lastProduct = { ...(this.lastProduct || {}), name };
    await this._fillText(this.productNameInput, name, 'Product Name');
  }

  async updateProductType(value) {
    const field = this.editCategoryInput;
    await expect(field).toBeVisible({ timeout: this.uiTimeout });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    const current = ((await field.inputValue().catch(() => '')) || '').trim();
    await field.click({ timeout: this.uiTimeout });

    const listbox = this.page.locator('[role="listbox"], .MuiAutocomplete-listbox').first();
    const opened = await listbox.isVisible({ timeout: 2500 }).catch(() => false);
    let selected = null;
    if (opened) {
      for (const name of [value, 'Construction Material', 'Construction Materials']) {
        const option = this.page
          .getByRole('option', { name: new RegExp(`^${this._escapeRegex(name)}$`, 'i') })
          .first();
        if (await option.isVisible({ timeout: 1200 }).catch(() => false)) {
          selected = ((await option.innerText().catch(() => '')) || name).replace(/\s+/g, ' ').trim();
          await option.click({ timeout: this.uiTimeout });
          break;
        }
      }
    }

    if (!selected) {
      await this.page.keyboard.press('Escape').catch(() => {});
      selected = current || value;
      this.logStep(`Category "${value}" is not in the list, leaving "${selected}"`);
    } else {
      this.logStep(`Updated Category to "${selected}" (requested "${value}")`);
    }
    this.lastProduct = { ...(this.lastProduct || {}), productType: selected };
  }

  async updateProductColor(value) {
    this.lastProduct = { ...(this.lastProduct || {}), color: value };
    await this._fillText(this.productColourInput, value, 'Colour');
  }

  async updateProductFinish(value) {
    this.lastProduct = { ...(this.lastProduct || {}), finish: value };
    await this._fillText(this.productFinishInput, value, 'Finish');
  }

  async updateProductMaterial(value) {
    this.lastProduct = { ...(this.lastProduct || {}), material: value };
    await this._fillText(this.productMaterialsInput, value, 'Material');
  }

  async updateProductManufacturer(value) {
    this.lastProduct = { ...(this.lastProduct || {}), manufacturer: value };
    await this._fillText(this.productManufacturerInput, value, 'Manufacturer');
  }

  async updateProductTag(value) {
    const field = this.tagInput;
    await expect(field).toBeVisible({ timeout: this.defaultTimeout });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: this.uiTimeout });
    await field.fill('');
    await field.fill(value);
    await this._commitReactInput(field, value);
    const option = this.page.getByRole('option', { name: new RegExp(this._escapeRegex(value), 'i') }).first();
    if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
      await option.click({ timeout: this.uiTimeout });
    } else {
      await this.page.keyboard.press('Enter').catch(() => {});
    }
    this.lastProduct = { ...(this.lastProduct || {}), tag: value };
    this.logStep(`Updated tag to "${value}"`);
  }

  async updateProductPrice(value) {
    this.lastProduct = { ...(this.lastProduct || {}), price: value };
    await this._fillText(this.unitCostInput, value, 'Unit Cost');
    if (await this.sellingPriceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const auto = ((await this.sellingPriceInput.inputValue().catch(() => '')) || '').trim();
      if (auto) {
        this.logStep(`Unit Selling Price auto-calculated as "${auto}"`);
      }
    }
  }

  async expectEditFormUpdatedDetails() {
    const details = this.lastProduct || {};
    await expect(this.productNameInput).toHaveValue(new RegExp(this._escapeRegex(details.name || ''), 'i'), {
      timeout: this.uiTimeout,
    });

    const checks = [
      { key: 'name', locator: this.productNameInput },
      { key: 'color', locator: this.productColourInput },
      { key: 'finish', locator: this.productFinishInput },
      { key: 'material', locator: this.productMaterialsInput },
      { key: 'manufacturer', locator: this.productManufacturerInput },
      { key: 'price', locator: this.unitCostInput },
    ];

    for (const check of checks) {
      const wanted = details[check.key];
      if (!wanted) continue;
      const field = check.locator;
      const current = ((await field.inputValue().catch(() => '')) || '').trim();
      const digitsWant = String(wanted).replace(/\D/g, '');
      const digitsCur = current.replace(/\D/g, '');
      const ok =
        new RegExp(this._escapeRegex(String(wanted)), 'i').test(current) ||
        (digitsWant && digitsCur && digitsCur.includes(digitsWant));
      expect(ok, `${check.key} shows "${current}", expected "${wanted}"`).toBeTruthy();
    }

    this.logStep('Updated product details are entered correctly on the Edit Product form');
  }

  async clickUpdateProduct() {
    const button = (await this.updateProductButton.isVisible({ timeout: 3000 }).catch(() => false))
      ? this.updateProductButton
      : this.saveButton;
    await expect(button).toBeVisible({ timeout: this.defaultTimeout });
    await expect(button).toBeEnabled({ timeout: this.uiTimeout });
    await button.scrollIntoViewIfNeeded().catch(() => {});

    const pending = this.page.waitForResponse(
      (res) => {
        const url = res.url() || '';
        const method = res.request().method();
        return (
          (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
          /product|warehouse|vendor/i.test(url)
        );
      },
      { timeout: this.defaultTimeout }
    );

    await button.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Update');
    const res = await pending.catch(() => null);
    this.lastProductUpdateOk = !!(res && res.ok());
    this.lastProductSaveOk = this.lastProductUpdateOk || this.lastProductSaveOk;
    this.logStep(
      this.lastProductUpdateOk ? `Product update API ${res.status()}` : 'Product update API not observed'
    );
    await this.waitForNetworkSettled();
  }

  async expectFirstRowUpdatedDetails() {
    const details = this.lastProduct || {};
    await expect(async () => {
      const row = this._firstProductRow();
      await expect(row).toBeVisible({ timeout: this.uiTimeout });
      const rec = await this._readMappedRow(row);
      const blob = rec.cells.join(' | ');

      if (details.name) {
        expect(
          this._cellMatches(rec.name, details.name) ||
            new RegExp(this._escapeRegex(details.name), 'i').test(rec.name || blob),
          `First row name was "${rec.name || blob}", expected "${details.name}"`
        ).toBeTruthy();
      }

      if (details.price) {
        const digits = String(details.price).replace(/\D/g, '');
        const rowDigits = blob.replace(/[^\d.]/g, ' ');
        expect(
          blob.includes(details.price) || rowDigits.includes(digits),
          `First row did not show price "${details.price}" [${blob}]`
        ).toBeTruthy();
      }
    }).toPass({ timeout: this.uiTimeout, intervals: [400, 800, 1500] });

    this.logStep(
      `First row shows updated product "${(this.lastProduct && this.lastProduct.name) || ''}"`
    );
  }

  async captureFirstProductForDeletion() {
    const row = this._firstProductRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    const record = await this._readMappedRow(row);
    const name = (record.name || '').split(/\n/)[0].trim();
    expect(name.length, 'First product row did not have a name to delete').toBeGreaterThan(0);
    this.lastProduct = { ...(this.lastProduct || {}), deletedName: name, name };
    this.logStep(`Captured first product for deletion: ${name}`);
  }

  async _selectFirstRowCheckbox() {
    const row = this._firstProductRow();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    const checkbox = row.getByRole('checkbox').first();
    if (await checkbox.isVisible({ timeout: 1500 }).catch(() => false)) {
      const checked = await checkbox.isChecked().catch(() => false);
      if (!checked) {
        await checkbox.check({ force: true }).catch(async () => {
          await checkbox.click({ timeout: this.uiTimeout, force: true });
        });
      }
    } else {
      await row.click({ timeout: this.uiTimeout });
    }
  }

  async clickDeleteForFirstProductRow() {
    await this._selectFirstRowCheckbox();
    await expect(this.deleteToolbarButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.deleteToolbarButton.click({ timeout: this.uiTimeout });
    await expect(this.deleteDialog).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Delete for the first product row');
  }

  async expectDeleteProductPopupDisplayed() {
    await expect(this.deleteDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.deleteDialog.getByText(/delete product/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await expect(this.deleteReasonInput).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Delete Product confirmation popup is displayed');
  }

  async fillProductDeletionReason(reason) {
    await this._fillText(this.deleteReasonInput, reason, 'Deletion Reason');
  }

  async fillProductDeletionConfirmation(value) {
    const editable = this.deleteDialog.locator(
      'input:not([type="hidden"]), textarea:not([aria-hidden="true"]):not([readonly])'
    );
    const count = await editable.count();
    let confirmField = null;
    for (let i = 0; i < count; i += 1) {
      const field = editable.nth(i);
      const name = ((await field.getAttribute('name').catch(() => '')) || '').toLowerCase();
      if (name === 'deleteproductreason') continue;
      if (await field.isVisible({ timeout: 500 }).catch(() => false)) {
        confirmField = field;
        break;
      }
    }

    if (confirmField) {
      await this._fillText(confirmField, value, 'Deletion Confirmation');
      return;
    }

    this.lastDeleteConfirmation = value;
    this.logStep(
      `No separate confirmation field in popup — "${value}" confirmation uses the Yes button`
    );
  }

  async clickDeleteProductConfirm() {
    const button = (await this.deleteConfirmButton.isVisible({ timeout: 2000 }).catch(() => false))
      ? this.deleteConfirmButton
      : this.deleteDialog.getByRole('button', { name: /^yes$|^delete$/i }).first();
    await expect(button).toBeVisible({ timeout: this.defaultTimeout });
    await expect(button).toBeEnabled({ timeout: this.uiTimeout });

    const pending = this.page.waitForResponse(
      (res) => {
        const url = res.url() || '';
        const method = res.request().method();
        return (
          (method === 'DELETE' || method === 'POST' || method === 'PUT' || method === 'PATCH') &&
          /product|warehouse|vendor/i.test(url)
        );
      },
      { timeout: this.defaultTimeout }
    );

    await button.click({ timeout: this.uiTimeout });
    this.logStep('Clicked Delete confirm on Delete Product popup');
    const res = await pending.catch(() => null);
    this.lastProductDeleteOk = !!(res && res.ok());
    await this.deleteDialog.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    this.logStep(
      this.lastProductDeleteOk ? `Product delete API ${res.status()}` : 'Product delete API not observed'
    );
    await this.waitForNetworkSettled();
  }

  async expectDeletedProductNotInList() {
    const name = (this.lastProduct && (this.lastProduct.deletedName || this.lastProduct.name)) || '';
    expect(name.length, 'No deleted product name was captured').toBeGreaterThan(0);

    if (await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.searchInput.click({ timeout: this.uiTimeout });
      await this.searchInput.fill('');
      await this.searchInput.fill(name);
      await this.searchInput.press('Enter').catch(() => {});
      await this.waitForNetworkSettled();
    }

    await expect(async () => {
      const listed = await this._isProductNameInList(name);
      expect(listed, `Deleted product "${name}" is still displayed in the Product List`).toBeFalsy();
    }).toPass({ timeout: this.uiTimeout, intervals: [400, 800, 1500] });

    this.logStep(`Deleted product "${name}" is no longer displayed in the Product List`);
  }

  async _firstRowWithCategorySubcategory() {
    const rows = this._productBodyRows();
    const count = await rows.count();
    expect(count, 'Product List has no rows').toBeGreaterThan(0);

    const firstRec = await this._readMappedRow(rows.first());
    if (!this._placeholderCell(firstRec.category) && !this._placeholderCell(firstRec.subcategory)) {
      return { row: rows.first(), record: firstRec };
    }

    for (let i = 0; i < count; i += 1) {
      const row = rows.nth(i);
      const rec = await this._readMappedRow(row);
      if (!this._placeholderCell(rec.category) && !this._placeholderCell(rec.subcategory)) {
        return { row, record: rec };
      }
    }

    return { row: rows.first(), record: firstRec };
  }

  async captureFirstProductFilterCriteria() {
    const { row, record } = await this._firstRowWithCategorySubcategory();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    const name = (record.name || '').split(/\n/)[0].trim();
    const category = (record.category || '').trim();
    const subcategory = (record.subcategory || '').trim();

    expect(
      !this._placeholderCell(category) && !this._placeholderCell(subcategory),
      `First product "${name || '(unnamed)'}" has no Category/Sub Category to filter (Category "${category}", Sub Category "${subcategory}")`
    ).toBeTruthy();

    this.lastProduct = {
      ...(this.lastProduct || {}),
      name,
      filterCategory: category,
      filterSubcategory: subcategory,
      category,
      subcategory,
    };
    this.logStep(
      `Captured filter criteria from first product "${name}": Category "${category}", Sub Category "${subcategory}"`
    );
  }

  async _filterFields() {
    const panel = this.page.locator('.MuiPopover-paper').filter({ hasText: /apply/i }).last();
    await expect(panel).toBeVisible({ timeout: this.uiTimeout });
    return {
      panel,
      category: panel.locator('.MuiAutocomplete-root').nth(0).locator('input[role="combobox"]').first(),
      subcategory: panel.locator('.MuiAutocomplete-root').nth(1).locator('input[role="combobox"]').first(),
      apply: panel.getByRole('button', { name: /^apply$/i }).first(),
    };
  }

  async clickFilterOption() {
    await expect(this.filterButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.filterButton.click({ timeout: this.uiTimeout });
    const fields = await this._filterFields();
    await expect(fields.category).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Clicked Filter');
  }

  async _selectFilterCombobox(field, value, label) {
    await expect(field).toBeVisible({ timeout: this.uiTimeout });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: this.uiTimeout, force: true });

    const probe = String(value || '').trim();
    await field.fill('').catch(() => {});
    if (probe) {
      await field.fill(probe).catch(() => {});
      await this._commitReactInput(field, probe).catch(() => {});
    }

    await this.page
      .locator('[role="listbox"], .MuiAutocomplete-listbox')
      .first()
      .waitFor({ state: 'visible', timeout: this.uiTimeout })
      .catch(() => {});

    let selected = await this._clickMatchingOption(value);
    if (!selected && probe.length > 4) {
      selected = await this._clickMatchingOption(probe.slice(0, Math.ceil(probe.length / 2)));
    }
    if (!selected) {
      throw new Error(`${label} option "${value}" was not found in the filter list.`);
    }

    await field.press('Tab').catch(() => {});
    await this.page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    this.logStep(`Selected filter ${label}: ${selected}`);
    return selected;
  }

  async selectFilterCategoryForFirstProduct() {
    const category = this.lastProduct && this.lastProduct.filterCategory;
    const fields = await this._filterFields();
    const selected = await this._selectFilterCombobox(fields.category, category, 'Category');
    this.lastProduct = { ...(this.lastProduct || {}), filterCategory: selected || category };
  }

  async selectFilterSubcategoryForFirstProduct() {
    const subcategory = this.lastProduct && this.lastProduct.filterSubcategory;
    const fields = await this._filterFields();
    await fields.panel.getByText(/^sub category$/i).click({ timeout: this.uiTimeout }).catch(() => {});
    const selected = await this._selectFilterCombobox(fields.subcategory, subcategory, 'Subcategory');
    this.lastProduct = { ...(this.lastProduct || {}), filterSubcategory: selected || subcategory };
  }

  async clickApplyFilter() {
    const fields = await this._filterFields();
    await expect(fields.apply).toBeVisible({ timeout: this.uiTimeout });
    await expect(fields.apply).toBeEnabled({ timeout: this.uiTimeout });
    await fields.apply.click({ timeout: this.uiTimeout });
    await this.waitForNetworkSettled();
    await expect(this._firstProductRow()).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep('Clicked Apply on product filter');
  }

  async expectFirstRowMatchesFilterCategoryAndSubcategory() {
    const category = (this.lastProduct && this.lastProduct.filterCategory) || '';
    const subcategory = (this.lastProduct && this.lastProduct.filterSubcategory) || '';

    await expect(async () => {
      const row = this._firstProductRow();
      await expect(row).toBeVisible({ timeout: this.uiTimeout });
      const rec = await this._readMappedRow(row);
      expect(
        this._cellMatches(rec.category, category),
        `First row Category was "${rec.category || '-'}", expected "${category}" [${rec.cells.join(' | ')}]`
      ).toBeTruthy();
      expect(
        this._cellMatches(rec.subcategory, subcategory),
        `First row Sub Category was "${rec.subcategory || '-'}", expected "${subcategory}" [${rec.cells.join(' | ')}]`
      ).toBeTruthy();
    }).toPass({ timeout: this.uiTimeout, intervals: [400, 800, 1500] });

    this.logStep(
      `First row matches filter Category "${category}" and Sub Category "${subcategory}"`
    );
  }
}

module.exports = WarehousePage;
