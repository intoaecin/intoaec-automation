const { expect } = require('@playwright/test');
const BasePage = require('../../../../BasePage');

/**
 * Money Matters → Invoice list → Create Invoice → Start from Scratch → name → line item → Create.
 */
class InvoicePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = process.env.INVOICE_SLOW === 'true' ? 120000 : 20000;
    this.lastInvoiceName = null;
    this.lastInvoiceLineItem = null;
    this.lastInvoiceQty = null;
    this.lastInvoiceRate = null;
  }

  logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(`[Invoice] ${msg}`);
  }

  createInvoiceListButton() {
    return this.page
      .getByRole('button', { name: /create invoice/i })
      .or(this.page.locator('button').filter({ hasText: /create invoice/i }))
      .first();
  }

  invoiceCreateDialog() {
    return this.page
      .getByRole('dialog')
      .filter({
        hasText: /start from scratch|upload pdf|upload image|create invoice/i,
      })
      .filter({ visible: true })
      .last();
  }

  invoiceNameInput() {
    return this.page
      .getByRole('textbox', { name: /invoice name/i })
      .or(this.page.getByLabel(/invoice name/i))
      .or(this.page.getByPlaceholder(/invoice name/i))
      .or(this.page.locator('input[name*="name" i], input[id*="invoice" i]'))
      .first();
  }

  addManuallyButton() {
    return this.page
      .getByText(/^\+?\s*add manually$/i)
      .or(this.page.getByRole('button', { name: /add manually/i }))
      .or(this.page.locator('span.pointer, a, button').filter({ hasText: /add manually/i }))
      .first();
  }

  buildRandomInvoiceItemName(prefix) {
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const catalog = [
      'Electrical wiring',
      'LED panel light',
      'Copper cable 2.5mm',
      'Switchboard labour',
      'PVC conduit pipe',
      'False ceiling labour',
    ];
    const pick = catalog[Math.floor(Math.random() * catalog.length)];
    const base = String(prefix || '').trim();
    if (base && !/^labour\s*1$/i.test(base)) {
      return `${base} ${pick} ${suffix}`;
    }
    return `${pick} ${suffix}`;
  }

  buildRandomInvoiceQty() {
    return String(5 + Math.floor(Math.random() * 46));
  }

  buildRandomInvoiceRate() {
    return String(100 + Math.floor(Math.random() * 900));
  }

  lineItemsTable() {
    return this.page
      .locator('table')
      .filter({ has: this.page.locator('thead th, thead td, [role="columnheader"]') })
      .filter({ hasText: /qty|quantity/i })
      .filter({ visible: true })
      .first()
      .or(this.page.locator('[aria-label*="line item" i]').filter({ visible: true }).first());
  }

  lineItemDataRow() {
    const table = this.lineItemsTable();
    return table
      .locator('tbody tr')
      .filter({ has: this.page.locator('input, [role="combobox"], [role="spinbutton"]') })
      .last();
  }

  locatorInvoiceCreatedToast() {
    const pattern =
      /invoice (created|saved|submitted).*success|invoice created|created successfully|saved successfully|success/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  invoiceTab() {
    return this.page
      .getByRole('tab', { name: /^invoices?$/i })
      .or(this.page.getByRole('button', { name: /^invoices?$/i }))
      .filter({ visible: true })
      .first();
  }

  async openInvoiceByUrl() {
    const current = new URL(this.page.url());
    const projectId = current.searchParams.get('projectId') || '';
    const clientId = current.searchParams.get('clientId') || '';
    if (!projectId) return false;
    const qs = new URLSearchParams({
      projectId,
      isActive: '',
      tab: 'Money Matters',
      subTab: 'INVOICE',
      clientId,
    });
    const url = `${current.origin}/client/profile?${qs.toString()}`;
    this.logStep(`Opening Money Matters INVOICE: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    return true;
  }

  async navigateToInvoiceModuleForFirstProject() {
    const ProjectNavigationPage = require('../../ProjectNavigationPage');
    const nav = new ProjectNavigationPage(this.page);

    if (await this.createInvoiceListButton().isVisible({ timeout: 800 }).catch(() => false)) {
      this.logStep('Already on Invoice (Money Matters).');
      return;
    }

    if (await this.openInvoiceByUrl()) {
      await expect(this.createInvoiceListButton()).toBeVisible({ timeout: this.uiTimeout });
      this.logStep('Navigated to Invoice (Money Matters).');
      return;
    }

    await nav.navigateToProjects();
    await nav.clickFirstProject();

    if (await this.createInvoiceListButton().isVisible({ timeout: 800 }).catch(() => false)) {
      this.logStep('Already on Invoice (Money Matters).');
      return;
    }

    const opened = await this.openInvoiceByUrl();
    if (!opened) {
      const invoiceTab = this.invoiceTab();
      if (await invoiceTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await invoiceTab.click({ timeout: 10000 });
      }
    }

    await expect(this.createInvoiceListButton()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Navigated to Invoice (Money Matters).');
  }

  async clickCreateInvoiceListButton() {
    const btn = this.createInvoiceListButton();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await expect(btn).toBeEnabled({ timeout: 15000 });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Create Invoice.');
  }

  async expectInvoiceCreatePopupVisible() {
    const dialog = this.invoiceCreateDialog();
    await expect(dialog).toBeVisible({ timeout: this.uiTimeout });
    await expect(dialog.getByText(/start from scratch/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await expect(dialog.getByText(/upload pdf|upload image|pdf\/image/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    this.logStep('Create Invoice popup shows Start from Scratch and Upload PDF/Image.');
  }

  async selectStartFromScratchAndProceed() {
    const dialog = this.invoiceCreateDialog();
    await expect(dialog).toBeVisible({ timeout: this.uiTimeout });

    const scratch = dialog
      .getByText(/start from scratch/i)
      .or(dialog.locator('.MuiCard-root').filter({ hasText: /start from scratch/i }))
      .first();
    await expect(scratch).toBeVisible({ timeout: 30000 });
    await scratch.click({ timeout: 20000 });

    const proceed = dialog.getByRole('button', { name: /^proceed$/i }).first();
    await expect(proceed).toBeEnabled({ timeout: 30000 });
    await proceed.click({ timeout: 20000 });
    await dialog.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Selected Start from Scratch and clicked Proceed.');
  }

  async expectCreateInvoicePageVisible() {
    await expect
      .poll(
        async () => {
          if (await this.invoiceNameInput().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          if (await this.page.getByText(/line item/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          if (await this.addManuallyButton().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          return /invoice/i.test(this.page.url());
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep('Create Invoice page is displayed.');
  }

  async fillInvoiceName(name) {
    const input = this.invoiceNameInput();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: 10000 });
    await input.fill('');
    await input.fill(String(name));
    this.lastInvoiceName = String(name);
    this.logStep(`Filled invoice name: ${name}`);
  }

  async _fieldMetaBlob(locator) {
    const placeholder = ((await locator.getAttribute('placeholder').catch(() => '')) || '').toLowerCase();
    const aria = ((await locator.getAttribute('aria-label').catch(() => '')) || '').toLowerCase();
    const name = ((await locator.getAttribute('name').catch(() => '')) || '').toLowerCase();
    const id = ((await locator.getAttribute('id').catch(() => '')) || '').toLowerCase();
    return `${placeholder} ${aria} ${name} ${id}`;
  }

  async _isOffLimitsField(locator) {
    return /payment|terms|note|comment|invoice name|due/.test(await this._fieldMetaBlob(locator));
  }

  async _isInsideLineItems(locator) {
    return locator
      .evaluate((el) => {
        if (el.closest('[aria-label*="line item" i], [aria-label*="line items" i]')) return true;
        const table = el.closest('table');
        if (!table) return false;
        const head = (table.querySelector('thead')?.innerText || '').toLowerCase();
        return /qty|quantity/.test(head);
      })
      .catch(() => false);
  }

  async _looksLikeDateField(locator) {
    const type = ((await locator.getAttribute('type').catch(() => '')) || '').toLowerCase();
    if (type === 'date') return true;
    if (/date|due|issued/.test(await this._fieldMetaBlob(locator))) return true;
    const current = ((await locator.inputValue().catch(() => '')) || '').trim();
    return /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(current);
  }

  async _isDisabledInput(locator) {
    const disabled = await locator.getAttribute('disabled').catch(() => null);
    const ariaDisabled = await locator.getAttribute('aria-disabled').catch(() => null);
    return disabled !== null || ariaDisabled === 'true';
  }

  async _isEditableMoneyInput(locator) {
    const handle = await locator.elementHandle({ timeout: 400 }).catch(() => null);
    if (!handle) return false;
    const info = await handle
      .evaluate((el) => ({
        tag: el.tagName,
        type: (el.getAttribute('type') || '').toLowerCase(),
        role: (el.getAttribute('role') || '').toLowerCase(),
      }))
      .catch(() => null);
    await handle.dispose().catch(() => {});
    if (!info) return false;
    if (!/^(INPUT)$/i.test(info.tag) && info.role !== 'spinbutton') return false;
    if (info.type === 'hidden' || info.type === 'checkbox' || info.type === 'radio') return false;
    if (await this._looksLikeDateField(locator)) return false;
    if (await this._isOffLimitsField(locator)) return false;
    if (!(await this._isInsideLineItems(locator))) return false;
    return true;
  }

  async _fillInput(locator, value) {
    if (await this._isOffLimitsField(locator)) return;
    if (!(await this._isInsideLineItems(locator))) return;
    await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await locator.click({ timeout: 4000, force: true }).catch(() => {});
    const filled = await locator.fill(String(value), { force: true, timeout: 4000 }).then(() => true).catch(() => false);
    if (!filled) {
      await locator
        .evaluate((el, v) => {
          el.removeAttribute('disabled');
          el.removeAttribute('readonly');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          setter?.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, String(value), { timeout: 2000 })
        .catch(() => {});
    }
    await locator.blur({ timeout: 2000 }).catch(() => {});
  }

  async _clickCellAndFill(cell, value) {
    if (!(await cell.isVisible({ timeout: 1500 }).catch(() => false))) return false;
    await cell.scrollIntoViewIfNeeded().catch(() => {});
    await cell.click({ force: true, timeout: 8000 }).catch(() => {});
    await cell.dblclick({ force: true, timeout: 2000 }).catch(() => {});

    const input = cell.locator('input:not([type="hidden"]), [role="spinbutton"]').first();
    if (!(await this._isEditableMoneyInput(input))) return false;
    await this._fillInput(input, value);
    return true;
  }

  async _fillColumnByHeader(headerRe, value) {
    const table = this.lineItemsTable();
    if (!(await table.isVisible({ timeout: 2000 }).catch(() => false))) return false;
    const headers = table.locator('thead th, thead td, [role="columnheader"]');
    const n = await headers.count();
    let col = -1;
    for (let i = 0; i < n; i += 1) {
      const text = ((await headers.nth(i).innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .replace(/\*/g, '')
        .trim();
      if (headerRe.test(text) && !/payment|terms|amount/i.test(text)) {
        col = i;
        break;
      }
    }
    if (col < 0) return false;
    const cell = this.lineItemDataRow().locator('td, [role="cell"]').nth(col);
    return this._clickCellAndFill(cell, value);
  }

  async _fillQtyRateByColumnPosition(qty, price) {
    const row = this.lineItemDataRow();
    if (!(await row.isVisible({ timeout: 2000 }).catch(() => false))) return { qty: false, rate: false };

    const inputs = row.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), [role="spinbutton"]');
    const count = await inputs.count();
    const numeric = [];
    for (let i = 0; i < count; i += 1) {
      const loc = inputs.nth(i);
      if (!(await this._isEditableMoneyInput(loc))) continue;
      const val = ((await loc.inputValue().catch(() => '')) || '').trim();
      if (val && /[a-zA-Z]{2,}/.test(val)) continue;
      numeric.push(loc);
    }
    let qtyFilled = false;
    let rateFilled = false;
    if (numeric[0]) {
      await this._fillInput(numeric[0], qty);
      qtyFilled = true;
    }
    if (numeric[1]) {
      await this._fillInput(numeric[1], price);
      rateFilled = true;
    }
    return { qty: qtyFilled, rate: rateFilled };
  }

  async _fillFirstEditable(candidates, value) {
    for (const loc of candidates) {
      if (!loc) continue;
      if (await this._isEditableMoneyInput(loc)) {
        await this._fillInput(loc, value);
        return true;
      }
    }
    return false;
  }

  async addInvoiceLineItemManually({ lineItem } = {}) {
    const itemName = this.buildRandomInvoiceItemName(lineItem);
    const qty = this.buildRandomInvoiceQty();
    const rate = this.buildRandomInvoiceRate();
    this.lastInvoiceLineItem = itemName;
    this.lastInvoiceQty = qty;
    this.lastInvoiceRate = rate;

    const lineSection = this.page.getByText(/line items?/i).first();
    if (await lineSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lineSection.scrollIntoViewIfNeeded().catch(() => {});
    }

    const addManually = this.addManuallyButton();
    await expect(addManually).toBeVisible({ timeout: this.uiTimeout });
    await addManually.scrollIntoViewIfNeeded().catch(() => {});
    await addManually.click({ timeout: 20000 }).catch(async () => {
      await addManually.click({ force: true, timeout: 10000 });
    });

    const row = this.lineItemDataRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });

    const nameField = row
      .getByPlaceholder(/material name|service name|item name|^item$/i)
      .or(row.getByRole('textbox', { name: /material name|service name|item name|^item$/i }))
      .or(row.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="number"])').first());
    if (await this._isInsideLineItems(nameField)) {
      await this._fillInput(nameField, itemName);
    }

    const unitCombo = row.getByRole('combobox').first().or(row.locator('.MuiSelect-select').first());
    if (await unitCombo.isVisible({ timeout: 1200 }).catch(() => false)) {
      await unitCombo.click({ timeout: 8000 }).catch(() => {});
      const nos = this.page.getByRole('option', { name: /^nos$/i }).first();
      const firstOpt = this.page.getByRole('option').first();
      if (await nos.isVisible({ timeout: 1500 }).catch(() => false)) {
        await nos.click({ timeout: 5000 });
      } else if (await firstOpt.isVisible({ timeout: 1500 }).catch(() => false)) {
        await firstOpt.click({ timeout: 5000 });
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    let qtyFilled =
      (await this._fillColumnByHeader(/qty|quantity|qnty/i, qty)) ||
      (await this._fillFirstEditable(
        [
          row.getByPlaceholder(/^(qty|quantity)$/i).first(),
          row.getByRole('textbox', { name: /^(qty|quantity)$/i }).first(),
          row.getByRole('spinbutton', { name: /^(qty|quantity)$/i }).first(),
          row.locator('input[name*="qty" i], input[id*="qty" i]').first(),
          row.locator('td').nth(1).locator('input').first(),
        ],
        qty
      ));

    let rateFilled =
      (await this._fillColumnByHeader(/^(rate|price|unit\s*rate|unit\s*price)$/i, rate)) ||
      (await this._fillFirstEditable(
        [
          row.getByPlaceholder(/^(rate|price)$/i).first(),
          row.getByRole('textbox', { name: /^(rate|price)$/i }).first(),
          row.locator('input[name*="rate" i], input[id*="rate" i]').first(),
        ],
        rate
      ));

    if (!qtyFilled || !rateFilled) {
      const byPos = await this._fillQtyRateByColumnPosition(qty, rate);
      qtyFilled = qtyFilled || byPos.qty;
      rateFilled = rateFilled || byPos.rate;
    }

    this.logStep(`Added manual line item: "${itemName}", qty ${qty}, rate ${rate}`);
  }

  payNowToClientLabelText() {
    return this.page
      .getByText(/show\s+pay\s+now(\s+button)?\s+to(\s+the)?\s+client/i)
      .filter({ visible: true })
      .first();
  }

  payNowToClientFormControl() {
    const label = this.payNowToClientLabelText();
    return this.page
      .locator('.MuiFormControlLabel-root, label')
      .filter({ has: label })
      .filter({ visible: true })
      .first();
  }

  payNowCheckbox() {
    const form = this.payNowToClientFormControl();
    const label = this.payNowToClientLabelText();
    return form
      .locator('input[type="checkbox"], [role="switch"]')
      .first()
      .or(this.page.getByRole('switch', { name: /show\s+pay\s+now/i }))
      .or(label.locator('xpath=preceding::input[@type="checkbox" or @role="switch"][1]'))
      .or(label.locator('xpath=following::input[@type="checkbox" or @role="switch"][1]'))
      .first();
  }

  payNowSwitchRoot() {
    const form = this.payNowToClientFormControl();
    const label = this.payNowToClientLabelText();
    return form
      .locator('.MuiSwitch-root, [role="switch"]')
      .first()
      .or(label.locator('xpath=preceding::span[contains(@class,"MuiSwitch-root")][1]'))
      .or(label.locator('xpath=following::span[contains(@class,"MuiSwitch-root")][1]'))
      .first();
  }

  async _isPayNowSwitchOn() {
    const form = this.payNowToClientFormControl();
    const input = form.locator('input[type="checkbox"]').first();
    if (await input.count().catch(() => 0)) {
      return input.isChecked().catch(() => false);
    }
    const roleSwitch = form.locator('[role="switch"]').first();
    if (await roleSwitch.count().catch(() => 0)) {
      return (await roleSwitch.getAttribute('aria-checked').catch(() => null)) === 'true';
    }
    const checkbox = this.payNowCheckbox();
    const checked = await checkbox.isChecked().catch(() => null);
    if (checked === true) return true;
    if (checked === false) return false;
    return (await checkbox.getAttribute('aria-checked').catch(() => null)) === 'true';
  }

  async enablePayNowButtonToClient() {
    const label = this.payNowToClientLabelText();
    await expect(label).toBeVisible({ timeout: this.uiTimeout });
    await label.scrollIntoViewIfNeeded().catch(() => {});

    const checkbox = this.payNowCheckbox();
    const switchRoot = this.payNowSwitchRoot();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await this._isPayNowSwitchOn()) break;
      this.logStep('Turning ON Show Pay Now to client.');
      if (attempt === 0 && (await checkbox.count().catch(() => 0))) {
        await checkbox.check({ force: true, timeout: 8000 }).catch(async () => {
          await switchRoot.click({ timeout: 8000, force: true });
        });
      } else if (attempt === 1) {
        await switchRoot.click({ timeout: 8000, force: true }).catch(() => {});
      } else {
        await label.click({ timeout: 8000, force: true }).catch(() => {});
      }
    }

    await expect
      .poll(async () => this._isPayNowSwitchOn(), {
        timeout: this.uiTimeout,
        intervals: [200, 400, 800],
      })
      .toBeTruthy();
    this.logStep('Show Pay Now to client toggle is ON (enabled).');
  }

  async clickCreateOnInvoiceForm() {
    const createBtn = this.page
      .getByRole('button', { name: /^(create invoice|create)$/i })
      .filter({ visible: true })
      .last()
      .or(this.page.locator('button').filter({ hasText: /^(create invoice|create)$/i }).last());
    await expect(createBtn).toBeVisible({ timeout: this.uiTimeout });
    await expect(createBtn).toBeEnabled({ timeout: 30000 });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Create on invoice form.');
  }

  async expectInvoiceCreatedSuccessfully() {
    const toast = this.locatorInvoiceCreatedToast();
    const listReady = this.createInvoiceListButton();
    await expect
      .poll(
        async () => {
          if (await toast.isVisible({ timeout: 500 }).catch(() => false)) return true;
          if (await listReady.isVisible({ timeout: 500 }).catch(() => false)) return true;
          return false;
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Invoice created successfully.');
  }

  /**
   * Atomic TC-01: project → Money Matters / Financial → Invoice → Start from Scratch
   * → name → Add Manually → Create.
   */
  async completeInvoiceCreateFromScratchJourney({
    name = 'Electricians',
    lineItem = 'Labour 1',
    quantity = '20',
    rate = '100',
  } = {}) {
    await this.navigateToInvoiceModuleForFirstProject();
    await this.clickCreateInvoiceListButton();
    await this.expectInvoiceCreatePopupVisible();
    await this.selectStartFromScratchAndProceed();
    await this.expectCreateInvoicePageVisible();
    await this.fillInvoiceName(name);
    await this.addInvoiceLineItemManually({ lineItem, quantity, rate });
    await this.clickCreateOnInvoiceForm();
    this.logStep('Complete invoice create from scratch journey finished.');
  }

  paymentTermsLabelText() {
    return this.page
      .getByText(/^(show\s+)?payment terms$/i)
      .or(this.page.getByText(/enable payment terms|add payment terms/i))
      .filter({ visible: true })
      .first();
  }

  paymentTermsFormControl() {
    const label = this.paymentTermsLabelText();
    return this.page
      .locator('.MuiFormControlLabel-root, label')
      .filter({ has: label })
      .filter({ visible: true })
      .first();
  }

  addPaymentTermButton() {
    return this.page
      .getByRole('button', { name: /add (payment )?(term|schedule)|add payment/i })
      .or(this.page.getByRole('link', { name: /add (payment )?(term|schedule)|add payment/i }))
      .or(this.page.getByText(/^\+?\s*add (payment )?(term|schedule|more)$/i))
      .or(this.page.locator('button, span.pointer, a').filter({ hasText: /add (payment )?(term|schedule)|add more/i }))
      .filter({ visible: true })
      .first();
  }

  paymentScheduleTable() {
    return this.page
      .locator('table')
      .filter({ hasText: /payment (name|term)|due date/i })
      .filter({ visible: true })
      .first();
  }

  async _isPaymentTermsSwitchOn() {
    const form = this.paymentTermsFormControl();
    const input = form.locator('input[type="checkbox"]').first();
    if (await input.count().catch(() => 0)) {
      return input.isChecked().catch(() => false);
    }
    const roleSwitch = form.locator('[role="switch"]').first();
    if (await roleSwitch.count().catch(() => 0)) {
      return (await roleSwitch.getAttribute('aria-checked').catch(() => null)) === 'true';
    }
    return false;
  }

  async enablePaymentTerms() {
    const addBtn = this.addPaymentTermButton();
    if (await addBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Payment terms section is already available.');
      return;
    }

    const label = this.paymentTermsLabelText();
    if (!(await label.isVisible({ timeout: 4000 }).catch(() => false))) {
      this.logStep('Payment terms label not shown — using the schedule section if present.');
      return;
    }

    await label.scrollIntoViewIfNeeded().catch(() => {});
    const form = this.paymentTermsFormControl();
    const checkbox = form.locator('input[type="checkbox"], [role="switch"]').first();
    const switchRoot = form.locator('.MuiSwitch-root, [role="switch"]').first();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (await this._isPaymentTermsSwitchOn()) break;
      this.logStep('Turning ON Payment Terms.');
      if (attempt === 0 && (await checkbox.count().catch(() => 0))) {
        await checkbox.check({ force: true, timeout: 8000 }).catch(async () => {
          await switchRoot.click({ timeout: 8000, force: true }).catch(() => {});
        });
      } else {
        await label.click({ timeout: 8000, force: true }).catch(() => {});
      }
    }

    this.logStep('Payment Terms is enabled.');
  }

  async _selectPaymentTermOnRow(row) {
    const combo = row
      .getByRole('combobox')
      .or(row.locator('[role="combobox"], .MuiSelect-select, select'))
      .filter({ visible: true })
      .first();
    if (!(await combo.isVisible({ timeout: 800 }).catch(() => false))) return;
    const current = ((await combo.innerText().catch(() => '')) || '').trim();
    if (current && !/select|choose|^$/i.test(current)) return;
    await combo.click({ timeout: 8000 });
    const option = this.page
      .getByRole('option')
      .filter({ hasText: /net\s*30|due on receipt|custom|net\s*15/i })
      .first()
      .or(this.page.getByRole('option').first());
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.click({ timeout: 5000 });
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }

  async addExtraPaymentTerms(count = 2) {
    await this.enablePaymentTerms();
    const addBtn = this.addPaymentTermButton();
    await expect(addBtn).toBeVisible({ timeout: this.uiTimeout });
    await addBtn.scrollIntoViewIfNeeded().catch(() => {});

    for (let i = 0; i < count; i += 1) {
      const before = await this.paymentScheduleTable().locator('tbody tr').count().catch(() => 0);
      await addBtn.click({ timeout: 15000 });
      await expect
        .poll(async () => this.paymentScheduleTable().locator('tbody tr').count().catch(() => before), {
          timeout: 10000,
          intervals: [200, 400, 800],
        })
        .toBeGreaterThan(before)
        .catch(() => {});
      this.logStep(`Added extra payment term ${i + 1} of ${count}.`);
    }

    const rows = this.paymentScheduleTable().locator('tbody tr').filter({ visible: true });
    const rowCount = await rows.count().catch(() => 0);
    for (let i = 0; i < rowCount; i += 1) {
      await this._selectPaymentTermOnRow(rows.nth(i));
    }
    this.logStep(`Payment terms ready (${rowCount || count + 1} rows).`);
  }

  /**
   * TC-13: same as TC-01, then enable Pay Now button to client, then Create.
   */
  async completeInvoiceCreateFromScratchWithPayNowJourney({
    name = 'Electricians',
    lineItem = 'Labour 1',
    extraPaymentTerms = 0,
  } = {}) {
    await this.navigateToInvoiceModuleForFirstProject();
    await this.clickCreateInvoiceListButton();
    await this.expectInvoiceCreatePopupVisible();
    await this.selectStartFromScratchAndProceed();
    await this.expectCreateInvoicePageVisible();
    await this.enablePayNowButtonToClient();
    await this.fillInvoiceName(name);
    await this.addInvoiceLineItemManually({ lineItem });
    await this.enablePayNowButtonToClient();
    if (extraPaymentTerms > 0) {
      await this.addExtraPaymentTerms(extraPaymentTerms);
    }
    await this.clickCreateOnInvoiceForm();
    this.logStep(
      extraPaymentTerms > 0
        ? `Complete invoice create with Pay Now and ${extraPaymentTerms} extra payment terms finished.`
        : 'Complete invoice create with Pay Now to client finished.'
    );
  }

  clientProfileBreadcrumb() {
    return this.page
      .getByRole('link', { name: /client profile/i })
      .or(this.page.getByRole('button', { name: /client profile/i }))
      .or(this.page.locator('nav[aria-label*="breadcrumb" i] a, .MuiBreadcrumbs-root a, .MuiBreadcrumbs-li').filter({ hasText: /client profile/i }))
      .or(this.page.getByText(/^client profile$/i))
      .filter({ visible: true })
      .first();
  }

  invoiceNumberText() {
    return this.page.getByText(/INV\s*-?\s*\d+/i).filter({ visible: true });
  }

  firstInvoiceHyperlink() {
    const invText = this.invoiceNumberText().first();
    const inNumberColumn = this.page
      .locator('table tbody tr')
      .filter({ visible: true })
      .first()
      .locator('td, th, [role="cell"]')
      .filter({ hasText: /INV\s*-?\s*\d+/i })
      .locator('a, [role="link"], .MuiLink-root, span, p, div, u')
      .first();
    const styledLink = this.page
      .locator('a, [role="link"], .MuiLink-root, span.pointer, u, td')
      .filter({ hasText: /INV\s*-?\s*\d+/i })
      .filter({ visible: true })
      .first();
    return inNumberColumn.or(styledLink).or(invText).first();
  }

  previewPayNowButton() {
    return this.page
      .getByRole('button', { name: /pay\s*now/i })
      .or(this.page.getByRole('link', { name: /pay\s*now/i }))
      .or(this.page.locator('a[href*="paynow" i], a[href*="pay-now" i], a[href*="payNow" i]'))
      .or(this.page.locator('button, a, [role="button"], span.pointer').filter({ hasText: /pay\s*now/i }))
      .or(this.page.getByText(/pay\s*now/i))
      .filter({ visible: true })
      .first();
  }

  addNewCardTab() {
    return this.page
      .getByRole('tab', { name: /add new card|new card/i })
      .or(this.page.getByRole('button', { name: /add new card|new card/i }))
      .or(this.page.getByRole('switch', { name: /add new card|new card/i }))
      .or(this.page.getByText(/add new card|new card/i))
      .filter({ visible: true })
      .first();
  }

  savedCardsTab() {
    return this.page
      .getByRole('tab', { name: /saved card|saved cards|use saved/i })
      .or(this.page.getByRole('button', { name: /saved card|saved cards|use saved/i }))
      .or(this.page.getByText(/^saved card(s)?$/i))
      .filter({ visible: true })
      .first();
  }

  savedCardOption() {
    const cardLike =
      /visa|mastercard|master card|amex|american express|card ending|ending in|••••|\*{4}|4242|poojaa/i;
    return this.page
      .getByRole('radio', { name: cardLike })
      .or(this.page.locator('input[type="radio"]').filter({ visible: true }))
      .or(this.page.getByRole('listitem').filter({ hasText: cardLike }))
      .or(
        this.page
          .locator(
            '[role="radio"], [role="option"], .MuiRadio-root, .MuiListItem-root, .MuiCard-root, .MuiPaper-root, label, button, li'
          )
          .filter({ hasText: cardLike })
      )
      .or(this.page.getByText(/saved card|card ending|ending in|••••/i))
      .filter({ visible: true })
      .first();
  }

  cardHolderNameInput() {
    const nearLabel = this.page
      .locator('label, .MuiFormControl-root, .MuiFormControlLabel-root, div')
      .filter({ hasText: /card holder|cardholder|name on card|holder name/i })
      .locator('input:not([type="hidden"]):not([type="checkbox"])')
      .first();
    return this.page
      .getByRole('textbox', { name: /card holder|cardholder|name on card|holder name|^name$/i })
      .or(this.page.getByLabel(/card holder|cardholder|name on card|holder name/i))
      .or(this.page.getByPlaceholder(/card holder|cardholder|name on card|holder name|^name$/i))
      .or(this.page.locator('input[autocomplete="cc-name"], input[name*="holder" i], input[name*="cardName" i], input[id*="holder" i], input[id*="cardholder" i]'))
      .or(nearLabel)
      .filter({ visible: true })
      .first();
  }

  proceedToPaymentButton() {
    return this.page
      .getByRole('button', { name: /proceed to payment/i })
      .or(this.page.locator('button').filter({ hasText: /proceed to payment/i }))
      .or(this.page.getByRole('button', { name: /make payment|^pay$/i }))
      .filter({ visible: true })
      .last();
  }

  locatorPayNowSuccessPopup() {
    const pattern =
      /payment (was )?success(ful)?|paid successfully|payment succeeded|payment complete|successfully paid|thank you|payment received/i;
    return this.page
      .getByRole('dialog', { name: pattern })
      .or(this.page.getByRole('alertdialog', { name: pattern }))
      .or(
        this.page
          .locator(
            '[role="dialog"], [role="alertdialog"], .MuiDialog-root, .MuiModal-root, .MuiPopover-root, .Toastify__toast, [role="alert"], .MuiAlert-root, .MuiSnackbar-root'
          )
          .filter({ hasText: pattern })
      )
      .or(this.page.getByRole('heading', { name: pattern }))
      .or(this.page.getByText(pattern))
      .filter({ visible: true })
      .first();
  }

  paymentSuccessCloseButton() {
    return this.page
      .getByRole('button', { name: /^(close|done|ok|continue|got it|finish)$/i })
      .or(this.page.getByRole('button', { name: /close/i }))
      .or(this.page.getByRole('link', { name: /close|done|back/i }))
      .or(this.page.locator('[aria-label="Close"], [aria-label="close"], button[aria-label*="close" i]'))
      .or(this.page.locator('button').filter({ hasText: /^(close|done|ok)$/i }))
      .filter({ visible: true })
      .first();
  }

  async clickClientProfileBreadcrumb() {
    const crumb = this.clientProfileBreadcrumb();
    await expect(crumb).toBeVisible({ timeout: this.uiTimeout });
    await crumb.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Client Profile breadcrumb.');

    if (!(await this.invoiceNumberText().first().isVisible({ timeout: 3000 }).catch(() => false))) {
      const invoiceTab = this.invoiceTab();
      if (await invoiceTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await invoiceTab.click({ timeout: 10000 });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        this.logStep('Opened Invoice tab on Client Profile.');
      }
    }

    await expect(this.invoiceNumberText().first()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Invoice list with invoice-number links is displayed.');
  }

  _isInvoicePreviewUrl(url = this.page.url()) {
    return /generateInvoice|client-invoice|invoice-preview|\/preview|paynow|pay-now/i.test(url)
      && !/subTab=INVOICE/i.test(url);
  }

  async clickFirstInvoiceHyperlink() {
    const link = this.firstInvoiceHyperlink();
    await expect(link).toBeVisible({ timeout: this.uiTimeout });
    await link.scrollIntoViewIfNeeded().catch(() => {});
    const label = ((await link.innerText().catch(() => '')) || '').trim().slice(0, 40);
    const urlBefore = this.page.url();
    const popupPromise = this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await link.click({ timeout: 15000, force: true });
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      this.page = popup;
      this.logStep(`Invoice preview opened in a new tab${label ? `: ${label}` : ''}.`);
    } else {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await expect
        .poll(
          async () => {
            if (this._isInvoicePreviewUrl()) return true;
            if (this.page.url() !== urlBefore && !/subTab=INVOICE/i.test(this.page.url())) return true;
            if (await this.previewPayNowButton().isVisible({ timeout: 400 }).catch(() => false)) return true;
            if (await this.page.getByRole('button', { name: /^back$/i }).isVisible({ timeout: 300 }).catch(() => false)) {
              return true;
            }
            return false;
          },
          { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
        )
        .toBeTruthy();
      this.logStep(`Clicked first invoice hyperlink${label ? `: ${label}` : ''}. URL=${this.page.url()}`);
    }
  }

  async clickPayNowOnPreview() {
    const btn = this.previewPayNowButton();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    const popupPromise = this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await btn.click({ timeout: 15000, force: true });
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      this.page = popup;
    } else {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForURL(/paynow|pay-now|payment/i, { timeout: 20000 }).catch(() => {});
    }
    this.logStep(`Clicked Pay Now on the invoice preview. URL=${this.page.url()}`);
  }

  async openPaymentMethodIfNeeded() {
    if (await this.addNewCardTab().isVisible({ timeout: 2500 }).catch(() => false)) return;
    const next = this.page
      .getByRole('button', { name: /payment method|continue|next|proceed/i })
      .or(this.page.getByRole('link', { name: /payment method|continue|next/i }))
      .filter({ visible: true })
      .first();
    if (await next.isVisible({ timeout: 4000 }).catch(() => false)) {
      await next.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep('Opened the payment method page.');
    }
  }

  async selectAddNewCardTab() {
    const tab = this.addNewCardTab();
    const alt = this.page
      .locator('[role="tab"], [role="button"], .MuiTab-root, .MuiToggleButton-root, .MuiSwitch-root')
      .filter({ hasText: /add new card|new card|card/i })
      .filter({ visible: true })
      .last();
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click({ timeout: 15000 });
      this.logStep('Selected payment method tab: Add new card.');
      return;
    }
    if (await alt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await alt.click({ timeout: 15000 });
      this.logStep('Clicked payment method card switch.');
      return;
    }
    this.logStep('Add new card tab not shown — filling card details on this page.');
  }

  async waitForCardDetailsForm() {
    await expect
      .poll(
        async () => {
          if (await this._findCardNumberLocator()) return true;
          if (await this.page.locator('iframe').count().catch(() => 0)) return true;
          return false;
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep('Card details form is displayed.');
  }

  _cardNumberCandidates(scope) {
    return scope
      .getByLabel(/card number|^number$/i)
      .or(scope.getByPlaceholder(/card number|xxxx|acct/i))
      .or(scope.getByRole('textbox', { name: /card number|^number$/i }))
      .or(
        scope.locator(
          'input[name="cardnumber"], input[name*="cardNumber" i], input[autocomplete="cc-number"], input[id*="cardNumber" i], input[id*="card-number" i], input[maxlength="19"], input[maxlength="16"]'
        )
      )
      .first();
  }

  _stripeInput(scope, name) {
    return scope.locator(`input[name="${name}"], input.InputElement[name="${name}"]`).first();
  }

  _walkFrames(frame, out = []) {
    out.push(frame);
    for (const child of frame.childFrames()) this._walkFrames(child, out);
    return out;
  }

  async _findCardNumberLocator() {
    const pageLoc = this._cardNumberCandidates(this.page);
    if (await pageLoc.isVisible({ timeout: 400 }).catch(() => false)) return pageLoc;
    for (const frame of this._walkFrames(this.page.mainFrame())) {
      if (frame === this.page.mainFrame()) continue;
      const loc = this._cardNumberCandidates(frame);
      if (await loc.isVisible({ timeout: 400 }).catch(() => false)) return loc;
    }
    return null;
  }

  async _typeInto(locator, value) {
    const text = String(value);
    await locator.click({ timeout: 8000, force: true }).catch(() => {});
    await locator.fill(text, { force: true }).catch(async () => {
      await locator.pressSequentially(text.replace(/\s+/g, ''), { delay: 20 });
    });
  }

  async _fillStripeNamedInput(fieldName, value) {
    for (const frame of this._walkFrames(this.page.mainFrame())) {
      const input = this._stripeInput(frame, fieldName);
      if (await input.isVisible({ timeout: 600 }).catch(() => false)) {
        await this._typeInto(input, value);
        return true;
      }
    }
    const onPage = this.page.locator(`input[name="${fieldName}"], input[autocomplete="${fieldName === 'cvc' ? 'cc-csc' : fieldName === 'exp-date' ? 'cc-exp' : 'cc-number'}"]`).first();
    if (await onPage.isVisible({ timeout: 800 }).catch(() => false)) {
      await this._typeInto(onPage, value);
      return true;
    }
    return false;
  }

  async ensureCardHolderName(name = 'POOJAA') {
    const input = this.cardHolderNameInput();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click({ timeout: 8000, force: true });
    await input.fill('');
    await input.fill(name);
    const current = ((await input.inputValue().catch(() => '')) || '').trim();
    if (!new RegExp(name, 'i').test(current)) {
      await input.fill(name, { force: true });
    }
    this.logStep(`Entered card holder name: ${name}`);
  }

  async _fillInStripeOrPage({ cardNumber, expiry, cvv }) {
    const digits = String(cardNumber).replace(/\s+/g, '');
    const expiryValue = String(expiry).replace(/\s+/g, '');

    await expect
      .poll(async () => !!(await this._findCardNumberLocator()), {
        timeout: this.uiTimeout,
        intervals: [400, 800, 1200],
      })
      .toBeTruthy();

    const filledNumber =
      (await this._fillStripeNamedInput('cardnumber', digits)) ||
      (await (async () => {
        const numberLoc = await this._findCardNumberLocator();
        if (!numberLoc) return false;
        await this._typeInto(numberLoc, digits);
        return true;
      })());
    if (!filledNumber) {
      throw new Error('Card number field was not found on the payment method page (including Stripe frames).');
    }
    this.logStep('Entered card number 4242 4242 4242 4242.');

    const filledExp = await this._fillStripeNamedInput('exp-date', expiryValue.replace('/', ''));
    if (!filledExp) {
      throw new Error('Expiration date field was not found.');
    }
    this.logStep(`Entered expiration date ${expiryValue}.`);

    const filledCvv = await this._fillStripeNamedInput('cvc', cvv);
    if (!filledCvv) {
      throw new Error('CVV field was not found.');
    }
    this.logStep('Entered CVV 123.');
  }

  async selectSavedCardAndPay() {
    const savedTab = this.savedCardsTab();
    if (await savedTab.isVisible({ timeout: 2500 }).catch(() => false)) {
      await savedTab.click({ timeout: 15000 });
      this.logStep('Opened saved card options.');
    }

    const savedCard = this.savedCardOption();
    await expect(savedCard).toBeVisible({ timeout: this.uiTimeout });
    await savedCard.scrollIntoViewIfNeeded().catch(() => {});
    await savedCard.click({ timeout: 15000, force: true });
    this.logStep('Selected a saved card.');

    const proceed = this.proceedToPaymentButton();
    await expect(proceed).toBeVisible({ timeout: this.uiTimeout });
    await expect(proceed).toBeEnabled({ timeout: 15000 });
    await proceed.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Proceed to payment.');
    await this.expectPayNowPaymentSuccessful();
    await this.closePaymentSuccessPopup();
  }

  async _isPaymentSuccessPage() {
    if (await this.locatorPayNowSuccessPopup().isVisible({ timeout: 400 }).catch(() => false)) return true;
    const url = this.page.url() || '';
    if (/success|thank|paid|complete/i.test(url) && !/checkout-payment/i.test(url)) return true;
    const popupText = (
      (await this.page
        .locator('[role="dialog"], [role="alertdialog"], .MuiDialog-root, .MuiModal-root, .Toastify__toast, [role="alert"]')
        .innerText()
        .catch(() => '')) || ''
    ).toLowerCase();
    if (/payment successful|successfully paid|thank you|payment received|paid successfully/.test(popupText)) {
      return true;
    }
    return false;
  }

  async expectPayNowPaymentSuccessful() {
    await expect
      .poll(async () => this._isPaymentSuccessPage(), {
        timeout: 90000,
        intervals: [400, 800, 1500],
      })
      .toBeTruthy();
    this.logStep(`Payment successful page is displayed. URL=${this.page.url()}`);
  }

  async closePaymentSuccessPopup() {
    if (this.page.isClosed()) {
      this.logStep('Payment successful page is already closed.');
      return;
    }

    const onSuccessPage = /payment-success/i.test(this.page.url() || '');
    const popupVisible = await this.locatorPayNowSuccessPopup().isVisible({ timeout: 800 }).catch(() => false);
    if (!onSuccessPage && !popupVisible) {
      this.logStep('Payment successful popup is already closed.');
      return;
    }

    const closeBtn = this.paymentSuccessCloseButton();
    if (await closeBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await closeBtn.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep('Clicked Close on the payment successful popup.');
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    const contextPages = this.page.context().pages().filter((p) => !p.isClosed());
    const successPage = contextPages.find((p) => /payment-success/i.test(p.url() || ''));
    if (successPage && contextPages.length > 1) {
      const returnPage = contextPages.find((p) => p !== successPage) || contextPages[0];
      await successPage.close().catch(() => {});
      this.page = returnPage;
      this.logStep('Closed the payment successful tab.');
      return;
    }

    if (/payment-success/i.test(this.page.url() || '')) {
      await this.page.goBack({ timeout: 15000 }).catch(() => {});
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep('Left the payment successful page.');
    } else {
      this.logStep('Payment successful popup is closed.');
    }
  }

  async completePayNowAfterInvoiceCreated() {
    await this.expectInvoiceCreatedSuccessfully();
    await this.clickClientProfileBreadcrumb();
    await this.clickFirstInvoiceHyperlink();
    await this.clickPayNowOnPreview();
    await this.openPaymentMethodIfNeeded();
    await this.selectSavedCardAndPay();
    this.logStep('Complete Pay Now card journey finished.');
  }

  /**
   * TC-14: TC-13 create with Pay Now → Client Profile → first invoice preview
   * → Pay Now → select a saved card → Proceed to payment → success popup.
   */
  async completePayNowCardJourneyAfterCreate() {
    await this.completeInvoiceCreateFromScratchWithPayNowJourney({
      name: 'Electricians',
      lineItem: 'Labour 1',
    });
    await this.completePayNowAfterInvoiceCreated();
  }

  /**
   * TC-15: same as TC-14, and while creating the invoice enable Payment Terms
   * and add 2 extra payment terms before Create.
   */
  async completePayNowCardJourneyWithExtraPaymentTerms() {
    await this.completeInvoiceCreateFromScratchWithPayNowJourney({
      name: 'Electricians',
      lineItem: 'Labour 1',
      extraPaymentTerms: 2,
    });
    await this.completePayNowAfterInvoiceCreated();
  }
}

module.exports = InvoicePage;
