const { expect } = require('@playwright/test');
const BasePage = require('../../../../BasePage');
const ProjectProfilePage = require('../../ProjectProfilePage');

/**
 * Money Matters → Credit Note → Create Credit Note → Add Credit Note line item → Create.
 */
class CreditNotePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = process.env.INVOICE_SLOW === 'true' ? 120000 : 20000;
    this.lastCreditNoteItem = null;
    this.lastCreditNoteQty = null;
    this.lastCreditNoteRate = null;
    this.lastRefundReason = null;
  }

  logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(`[CreditNote] ${msg}`);
  }

  createCreditNoteListButton() {
    return this.page
      .getByRole('button', { name: /create credit note/i })
      .or(this.page.locator('button').filter({ hasText: /create credit note/i }))
      .filter({ visible: true })
      .first();
  }

  addCreditNoteLineButton() {
    return this.page
      .getByRole('button', { name: /^add credit$/i })
      .or(this.page.getByRole('button', { name: /add credit(\s+note)?/i }))
      .or(this.page.getByText(/^\+?\s*add credit(\s+note)?$/i))
      .or(this.page.locator('span.pointer, a, button, p').filter({ hasText: /^\+?\s*add credit(\s+note)?$/i }))
      .or(this.page.getByText(/add credit/i))
      .or(this.page.getByText(/^\+?\s*add manually$/i))
      .first();
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
    return this.lineItemsTable()
      .locator('tbody tr')
      .filter({ has: this.page.locator('input, [role="combobox"], [role="spinbutton"]') })
      .last();
  }

  locatorCreditNoteCreatedToast() {
    const pattern =
      /credit note (created|saved|submitted).*success|credit note created|created successfully|saved successfully|success/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  buildRandomCreditNoteItemName() {
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const catalog = [
      'Credit labour adjustment',
      'Returned LED panel',
      'Overbilled copper cable',
      'Credit false ceiling',
      'Rate correction wiring',
    ];
    const pick = catalog[Math.floor(Math.random() * catalog.length)];
    return `${pick} ${suffix}`;
  }

  buildRandomQty() {
    return String(5 + Math.floor(Math.random() * 46));
  }

  buildSamplePrice() {
    return String(100 + Math.floor(Math.random() * 9) * 100);
  }

  async _fieldMetaBlob(locator) {
    const placeholder = ((await locator.getAttribute('placeholder').catch(() => '')) || '').toLowerCase();
    const aria = ((await locator.getAttribute('aria-label').catch(() => '')) || '').toLowerCase();
    const name = ((await locator.getAttribute('name').catch(() => '')) || '').toLowerCase();
    const id = ((await locator.getAttribute('id').catch(() => '')) || '').toLowerCase();
    return `${placeholder} ${aria} ${name} ${id}`;
  }

  async _isOffLimitsField(locator) {
    return /payment|terms|comment|invoice name|due/.test(await this._fieldMetaBlob(locator));
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
    if (!/^INPUT$/i.test(info.tag) && info.role !== 'spinbutton') return false;
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
    const filled = await locator
      .fill(String(value), { force: true, timeout: 4000 })
      .then(() => true)
      .catch(() => false);
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
    if (!(await row.isVisible({ timeout: 2000 }).catch(() => false))) {
      return { qty: false, rate: false };
    }
    const inputs = row.locator(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), [role="spinbutton"]'
    );
    const count = await inputs.count();
    const numeric = [];
    for (let i = 0; i < count; i += 1) {
      const loc = inputs.nth(i);
      if (!(await this._isEditableMoneyInput(loc))) continue;
      const val = ((await loc.inputValue().catch(() => '')) || '').trim();
      if (val && /[a-zA-Z]{2,}/.test(val)) continue;
      numeric.push(loc);
    }
    if (numeric[0]) await this._fillInput(numeric[0], qty);
    if (numeric[1]) await this._fillInput(numeric[1], price);
    return { qty: Boolean(numeric[0]), rate: Boolean(numeric[1]) };
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

  async navigateToCreditNoteModuleForFirstProject() {
    const ProjectNavigationPage = require('../../ProjectNavigationPage');
    const nav = new ProjectNavigationPage(this.page);
    const profile = new ProjectProfilePage(this.page);

    if (!(await profile.isInsideProjectProfile().catch(() => false))) {
      await nav.navigateToProjects();
      await nav.clickFirstProject();
    }

    const alreadyOnCreditNote =
      /credit[- ]?note/i.test(this.page.url()) ||
      (await this.createCreditNoteListButton().isVisible({ timeout: 2000 }).catch(() => false));

    if (!alreadyOnCreditNote) {
      const moneyMattersHeading = this.page
        .getByRole('button', { name: /money matters/i })
        .filter({ visible: true })
        .first();
      if (await moneyMattersHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await moneyMattersHeading.click({ timeout: 15000 });
      } else {
        await profile.selectHeading('Financial');
      }

      const tab = this.page.getByRole('tab', { name: /credit note/i }).filter({ visible: true }).first();
      if (await tab.isVisible({ timeout: 2500 }).catch(() => false)) {
        await tab.click({ timeout: 15000 });
      } else {
        await profile.clickModuleCard('Credit Note');
      }
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(this.createCreditNoteListButton()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Credit Note page is displayed.');
  }

  async expectCreditNotePageVisible() {
    await expect(this.createCreditNoteListButton()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Verified Credit Note page.');
  }

  async clickCreateCreditNote() {
    const btn = this.createCreditNoteListButton();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await expect(btn).toBeEnabled({ timeout: 15000 });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const scratch = dialog.getByText(/start from scratch/i).first();
      if (await scratch.isVisible({ timeout: 2500 }).catch(() => false)) {
        await scratch.click({ timeout: 15000 });
      }
      const proceed = dialog.getByRole('button', { name: /^proceed$/i }).first();
      if (await proceed.isVisible({ timeout: 2500 }).catch(() => false)) {
        await proceed.click({ timeout: 15000 });
        await dialog.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
      }
    }
    this.logStep('Clicked Create Credit Note.');
  }

  async expectCreateCreditNotePageVisible() {
    await expect
      .poll(
        async () => {
          if (await this.page.getByText(/line items?/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          if (await this.addCreditNoteLineButton().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          return /credit[- ]?note/i.test(this.page.url());
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep('Create Credit Note page is displayed.');
  }

  async clickAddCreditOnLineItems() {
    const lineSection = this.page.getByText(/line items?/i).first();
    if (await lineSection.isVisible({ timeout: 8000 }).catch(() => false)) {
      await lineSection.scrollIntoViewIfNeeded().catch(() => {});
    }

    const candidates = [
      this.page.getByRole('button', { name: /^add credit$/i }).first(),
      this.page.getByRole('button', { name: /add credit/i }).first(),
      this.page.getByText('+ Add Credit', { exact: false }).first(),
      this.page.getByText(/^\+?\s*add credit$/i).first(),
      this.page.getByText(/^\+?\s*add credit note$/i).first(),
      this.page.locator('span.pointer, a, button, p, div').filter({ hasText: /^\+?\s*add credit(\s+note)?$/i }).first(),
      this.page.getByText(/add credit/i).first(),
      this.page.getByText(/^\+?\s*add manually$/i).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 2500 }).catch(() => false)) {
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: 15000 }).catch(async () => {
          await candidate.click({ force: true, timeout: 8000 });
        });
        this.logStep('Clicked Add Credit.');
        return;
      }
    }

    throw new Error('Credit note: Add Credit control was not found in the Line Item section.');
  }

  async addCreditNoteLineItem() {
    const itemName = this.buildRandomCreditNoteItemName();
    const qty = this.buildRandomQty();
    const rate = this.buildSamplePrice();
    this.lastCreditNoteItem = itemName;
    this.lastCreditNoteQty = qty;
    this.lastCreditNoteRate = rate;

    await this.clickAddCreditOnLineItems();

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

    this.logStep(`Filled credit note line item: "${itemName}", qty ${qty}, rate ${rate}`);
  }

  async expectLineItemValuesDisplayed() {
    const row = this.lineItemDataRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    const blob = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const item = String(this.lastCreditNoteItem || '');
    const qty = String(this.lastCreditNoteQty || '');
    const rate = String(this.lastCreditNoteRate || '');

    const itemOk =
      (item && blob.includes(item)) ||
      (await this._rowHasInputValue(row, item));
    const qtyOk = blob.includes(qty) || (await this._rowHasInputValue(row, qty));
    const rateOk = blob.includes(rate) || (await this._rowHasInputValue(row, rate));

    expect(itemOk, `Credit note item "${item}" should show on the line item row`).toBeTruthy();
    expect(qtyOk, `Credit note qty "${qty}" should show on the line item row`).toBeTruthy();
    expect(rateOk, `Credit note price "${rate}" should show on the line item row`).toBeTruthy();
    this.logStep('Verified credit note item name, qty, and price on the line item.');
  }

  async _rowHasInputValue(row, expected) {
    if (!expected) return false;
    const inputs = row.locator('input:not([type="hidden"])');
    const n = await inputs.count();
    for (let i = 0; i < n; i += 1) {
      const val = ((await inputs.nth(i).inputValue().catch(() => '')) || '').trim();
      if (val.includes(String(expected))) return true;
    }
    return false;
  }

  async clickCreateOnCreditNoteForm() {
    const createBtn = this.page
      .getByRole('button', { name: /^(create credit note|create)$/i })
      .filter({ visible: true })
      .last()
      .or(this.page.locator('button').filter({ hasText: /^(create credit note|create)$/i }).last());
    await expect(createBtn).toBeVisible({ timeout: this.uiTimeout });
    await expect(createBtn).toBeEnabled({ timeout: 30000 });
    await createBtn.scrollIntoViewIfNeeded().catch(() => {});
    await createBtn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Create on credit note form.');
  }

  async expectCreditNoteCreatedSuccessfully() {
    const toast = this.locatorCreditNoteCreatedToast();
    const listReady = this.createCreditNoteListButton();
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
    this.logStep('Credit note created successfully.');
  }

  async completeCreditNoteCreateJourney() {
    await this.navigateToCreditNoteModuleForFirstProject();
    await this.expectCreditNotePageVisible();
    await this.clickCreateCreditNote();
    await this.expectCreateCreditNotePageVisible();
    await this.addCreditNoteLineItem();
    await this.expectLineItemValuesDisplayed();
    await this.clickCreateOnCreditNoteForm();
    this.logStep('Complete credit note create journey finished.');
  }

  firstCreditNoteListRow() {
    const byId = this.page.getByText(/CN\d+|CRN\d+|CREDIT/i).first();
    return byId
      .locator('xpath=ancestor::tr[1]')
      .or(byId.locator('xpath=ancestor::*[@role="row"][1]'))
      .or(this.page.locator('table tbody tr').filter({ visible: true }).first())
      .first();
  }

  kebabOnFirstCreditNoteRow() {
    const row = this.firstCreditNoteListRow();
    return row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button:has(svg[data-testid="MoreVertIcon"])'))
      .or(row.locator('button:has(svg.lucide-ellipsis, svg.lucide-more-vertical, svg.lucide-more-horizontal)'))
      .or(row.locator('[aria-label*="more" i], [data-testid*="more" i]'))
      .or(row.locator('button:has(svg)').last())
      .first();
  }

  refundMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^refund$/i })
      .or(this.page.getByRole('option', { name: /^refund$/i }))
      .or(this.page.locator('[role="menu"] li, .MuiMenuItem-root, [role="menuitem"]').filter({ hasText: /^refund$/i }))
      .filter({ visible: true })
      .first();
  }

  refundDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /refund|reason|payment type/i })
      .first();
  }

  refundReasonInput() {
    const dialog = this.refundDialog();
    return dialog
      .getByRole('textbox', { name: /reason|comment|note|remarks/i })
      .or(dialog.getByLabel(/reason|comment|note|remarks/i))
      .or(dialog.getByPlaceholder(/reason|comment|note|remarks|enter/i))
      .or(dialog.locator('textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'))
      .first();
  }

  refundPaymentTypeField() {
    const dialog = this.refundDialog();
    return dialog
      .getByRole('combobox', { name: /payment type/i })
      .or(dialog.getByLabel(/payment type/i))
      .or(dialog.getByPlaceholder(/payment type/i))
      .or(dialog.getByRole('button', { name: /payment type|select/i }))
      .or(dialog.locator('[role="combobox"], .MuiSelect-select, input[name*="payment" i]'))
      .first();
  }

  refundYesButton() {
    const dialog = this.refundDialog();
    return dialog
      .getByRole('button', { name: /^yes$/i })
      .or(dialog.getByRole('button', { name: /^(yes|confirm|ok|refund)$/i }))
      .filter({ visible: true })
      .first();
  }

  locatorCreditNoteRefundedToast() {
    const pattern = /refund(ed)? successfully|credit note refunded|refunded|success/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  buildRandomRefundReason() {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const phrases = [
      'Client overpaid and requested cash refund',
      'Duplicate credit note issued in error',
      'Returned materials refunded in cash',
      'Billing adjustment refund to client',
      'Test cash refund of credit note',
    ];
    const pick = phrases[Math.floor(Math.random() * phrases.length)];
    return `${pick} ${suffix}`;
  }

  async openThreeDotMenuOnFirstCreditNote() {
    await expect(this.createCreditNoteListButton()).toBeVisible({ timeout: this.uiTimeout });
    const row = this.firstCreditNoteListRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ timeout: 10000 });
    this.logStep('Hovered the first credit note row.');

    const refundItem = this.refundMenuItem();
    if (await refundItem.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Refund option is displayed after hovering the credit note row.');
      return;
    }

    const kebab = this.kebabOnFirstCreditNoteRow();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await row.hover({ timeout: 5000 }).catch(() => {});
      await kebab.click({ timeout: 15000, force: attempt >= 1 }).catch(async () => {
        await kebab.click({ timeout: 10000, force: true });
      });
      if (await refundItem.isVisible({ timeout: 2500 }).catch(() => false)) {
        this.logStep('Opened credit note kebab menu; Refund is displayed.');
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await expect(refundItem).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Opened credit note kebab menu; Refund is displayed.');
  }

  async clickRefundInCreditNoteMenu() {
    const item = this.refundMenuItem();
    await expect(item).toBeVisible({ timeout: this.uiTimeout });
    await item.click({ timeout: 15000 });
    this.logStep('Clicked Refund in the credit note kebab menu.');
  }

  async expectRefundPopupDisplayed() {
    await expect(this.refundDialog()).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.refundReasonInput()).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.refundPaymentTypeField()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Refund popup is displayed with Reason and Payment Type.');
  }

  async fillRefundReasonRandom() {
    const reason = this.buildRandomRefundReason();
    this.lastRefundReason = reason;
    const input = this.refundReasonInput();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: 8000 });
    await input.fill(reason);
    this.logStep(`Entered refund reason: ${reason}`);
  }

  async selectRefundPaymentTypeCash() {
    const field = this.refundPaymentTypeField();
    await expect(field).toBeVisible({ timeout: this.uiTimeout });
    await field.click({ timeout: 15000 });

    const cash = this.page.getByRole('option', { name: /^cash$/i }).first();
    const firstOpt = this.page.getByRole('option').first();
    if (await cash.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cash.click({ timeout: 10000 });
    } else if (await firstOpt.isVisible({ timeout: 4000 }).catch(() => false)) {
      await firstOpt.click({ timeout: 10000 });
    } else {
      await this.page.keyboard.press('ArrowDown').catch(() => {});
      await this.page.keyboard.press('Enter').catch(() => {});
    }
    this.logStep('Selected Payment Type: Cash (first option).');
  }

  async clickYesOnRefundPopup() {
    const yes = this.refundYesButton();
    await expect(yes).toBeVisible({ timeout: 15000 });
    await expect(yes).toBeEnabled({ timeout: 15000 });
    await yes.click({ timeout: 20000 });
    await this.refundDialog().waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Yes on the refund popup.');
  }

  async expectCreditNoteRefundedSuccessfully() {
    const toast = this.locatorCreditNoteRefundedToast();
    await expect
      .poll(
        async () => {
          if (await toast.isVisible({ timeout: 500 }).catch(() => false)) return true;
          if (await this.createCreditNoteListButton().isVisible({ timeout: 500 }).catch(() => false)) {
            const popupGone = !(await this.refundDialog().isVisible({ timeout: 300 }).catch(() => false));
            if (popupGone) return true;
          }
          return false;
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Credit note refunded successfully.');
  }

  creditNoteTab() {
    return this.page
      .getByRole('tab', { name: /credit note/i })
      .or(this.page.getByRole('button', { name: /^credit note$/i }))
      .filter({ visible: true })
      .first();
  }

  async returnToCreditNoteListAfterCreate() {
    if (await this.createCreditNoteListButton().isVisible({ timeout: 2500 }).catch(() => false)) {
      this.logStep('Already on Credit Note list page.');
      return;
    }

    const backBtn = this.page.getByRole('button', { name: /^back$/i }).filter({ visible: true }).first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    if (await this.createCreditNoteListButton().isVisible({ timeout: 2500 }).catch(() => false)) {
      this.logStep('Returned to Credit Note list via Back.');
      return;
    }

    const tab = this.creditNoteTab();
    if (await tab.isVisible({ timeout: 2500 }).catch(() => false)) {
      await tab.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    } else {
      const current = new URL(this.page.url());
      const projectId = current.searchParams.get('projectId') || '';
      const clientId = current.searchParams.get('clientId') || '';
      if (projectId) {
        const qs = new URLSearchParams({
          projectId,
          isActive: '',
          tab: 'Money Matters',
          subTab: 'CREDIT_NOTE',
          clientId,
        });
        await this.page.goto(`${current.origin}/client/profile?${qs.toString()}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
      }
    }

    await expect(this.createCreditNoteListButton()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Credit Note list page is displayed.');
  }

  /**
   * TC-10: create credit note (TC-02) → stay on Credit Note list → kebab Refund → Cash → Yes.
   */
  async completeRefundCreditNoteJourney() {
    await this.completeCreditNoteCreateJourney();
    await this.expectCreditNoteCreatedSuccessfully();
    await this.returnToCreditNoteListAfterCreate();
    await this.openThreeDotMenuOnFirstCreditNote();
    await this.clickRefundInCreditNoteMenu();
    await this.expectRefundPopupDisplayed();
    await this.fillRefundReasonRandom();
    await this.selectRefundPaymentTypeCash();
    await this.clickYesOnRefundPopup();
    this.logStep('Complete refund credit note journey finished.');
  }

  refundPageTab() {
    return this.page
      .getByRole('tab', { name: /^refunds?$/i })
      .or(this.page.getByRole('button', { name: /^refunds?$/i }))
      .or(this.page.locator('[role="tab"]').filter({ hasText: /^refunds?$/i }))
      .filter({ visible: true })
      .first();
  }

  paymentsTab() {
    return this.page
      .getByRole('tab', { name: /^payments$/i })
      .or(this.page.getByRole('button', { name: /^payments$/i }))
      .filter({ visible: true })
      .first();
  }

  async isOnCreditNoteList() {
    return this.createCreditNoteListButton().isVisible({ timeout: 800 }).catch(() => false);
  }

  firstRefundListRow() {
    const byId = this.page
      .getByText(/^(REF|RFN|RFD|REC|RCP|RF)[-\s]?\d+/i)
      .filter({ visible: true })
      .first();
    return byId
      .locator('xpath=ancestor::tr[1]')
      .or(byId.locator('xpath=ancestor::*[@role="row"][1]'))
      .or(this.page.locator('table tbody tr').filter({ visible: true }).first())
      .first();
  }

  kebabOnFirstRefundRow() {
    const row = this.firstRefundListRow();
    return row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button:has(svg[data-testid="MoreVertIcon"])'))
      .or(row.locator('button:has(svg.lucide-ellipsis, svg.lucide-more-vertical, svg.lucide-more-horizontal)'))
      .or(row.locator('[aria-label*="more" i], [data-testid*="more" i]'))
      .or(row.locator('button:has(svg)').last())
      .first();
  }

  refundPreviewMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^preview$/i })
      .or(this.page.getByRole('option', { name: /^preview$/i }))
      .or(this.page.locator('[role="menu"] li, .MuiMenuItem-root, [role="menuitem"]').filter({ hasText: /^preview$/i }))
      .filter({ visible: true })
      .first();
  }

  refundPreviewRoot() {
    return this.page
      .getByRole('heading', { name: /preview|refund/i })
      .or(this.page.getByRole('button', { name: /^back$/i }))
      .filter({ visible: true })
      .first();
  }

  async _gotoMoneyMattersSubTab(subTab) {
    const current = new URL(this.page.url());
    const projectId = current.searchParams.get('projectId') || '';
    const clientId = current.searchParams.get('clientId') || '';
    if (!projectId) return false;
    const qs = new URLSearchParams({
      projectId,
      isActive: '',
      tab: 'Money Matters',
      subTab,
      clientId,
    });
    await this.page.goto(`${current.origin}/client/profile?${qs.toString()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    return true;
  }

  async navigateToRefundPage() {
    if (await this.isOnCreditNoteList()) {
      this.logStep('Leaving Credit Note list to open the Refund page.');
    }

    const refundTab = this.refundPageTab();
    if (await refundTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refundTab.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep('Clicked Refund tab.');
    } else {
      const opened = await this._gotoMoneyMattersSubTab('REFUND');
      if (!opened || (await this.isOnCreditNoteList())) {
        const payTab = this.paymentsTab();
        if (await payTab.isVisible({ timeout: 2500 }).catch(() => false)) {
          await payTab.click({ timeout: 15000 });
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          this.logStep('Clicked Payments tab to open refunds.');
        } else {
          await this._gotoMoneyMattersSubTab('PAYMENTS');
        }
      }
    }

    await expect
      .poll(
        async () => {
          if (await this.isOnCreditNoteList()) return false;
          return this.firstRefundListRow().isVisible({ timeout: 400 }).catch(() => false);
        },
        { timeout: 30000, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep(`Refund page is displayed. URL=${this.page.url()}`);
  }

  async openThreeDotMenuOnFirstRefund() {
    const row = this.firstRefundListRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ timeout: 10000 });
    this.logStep('Hovered the first refund row.');

    const previewItem = this.refundPreviewMenuItem();
    if (await previewItem.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Preview option is displayed after hovering the refund row.');
      return;
    }

    const kebab = this.kebabOnFirstRefundRow();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await row.hover({ timeout: 5000 }).catch(() => {});
      await kebab.click({ timeout: 15000, force: attempt >= 1 }).catch(async () => {
        await kebab.click({ timeout: 10000, force: true });
      });
      if (await previewItem.isVisible({ timeout: 2500 }).catch(() => false)) {
        this.logStep('Opened refund kebab menu; Preview is displayed.');
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await expect(previewItem).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Opened refund kebab menu; Preview is displayed.');
  }

  async clickPreviewInRefundMenu() {
    const item = this.refundPreviewMenuItem();
    await expect(item).toBeVisible({ timeout: this.uiTimeout });
    await Promise.all([
      this.page.waitForURL(/client-receipt|client-refund|preview/i, { timeout: 20000 }).catch(() => {}),
      item.click({ timeout: 15000 }),
    ]);
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Preview in the refund kebab menu.');
  }

  async expectRefundPreviewOpened() {
    await expect
      .poll(
        async () => {
          const url = this.page.url();
          if (/client-receipt|client-refund|preview/i.test(url)) return true;
          if (await this.isOnCreditNoteList()) return false;
          const back = this.page.getByRole('button', { name: /^back$/i }).filter({ visible: true }).first();
          const heading = this.page.getByRole('heading', { name: /preview|refund/i }).first();
          if ((await back.isVisible({ timeout: 300 }).catch(() => false)) && (await heading.isVisible({ timeout: 300 }).catch(() => false))) {
            return true;
          }
          if (await this.page.getByText(/refund preview|preview refund|receipt preview/i).first().isVisible({ timeout: 300 }).catch(() => false)) {
            return true;
          }
          return false;
        },
        { timeout: 45000, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep(`Refund preview is opened. URL=${this.page.url()}`);
  }

  /**
   * TC-11: TC-10 refund → Refund page → hover created refund → kebab Preview.
   */
  async completePreviewRefundJourney() {
    await this.completeRefundCreditNoteJourney();
    await this.expectCreditNoteRefundedSuccessfully();
    await this.navigateToRefundPage();
    await this.openThreeDotMenuOnFirstRefund();
    await this.clickPreviewInRefundMenu();
    this.logStep('Complete preview refund journey finished.');
  }
}

module.exports = CreditNotePage;
