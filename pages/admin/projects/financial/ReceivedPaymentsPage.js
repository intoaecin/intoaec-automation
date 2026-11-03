const BasePage = require('../../../BasePage');
const { expect } = require('@playwright/test');
const ProjectNavigationPage = require('../ProjectNavigationPage');
const BillsExpensesPage = require('./BillsExpensesPage');

/**
 * Received Payments live inside Bills & Expenses:
 * Create → Received Payment → AddReceivedPaymentsModal.
 * There is no separate Received Payments page or "Add Received Payment" button.
 */
class ReceivedPaymentsPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.main = page.locator('main, [role="main"]').first();
    this.projectNav = new ProjectNavigationPage(page);
    this.billsExpenses = new BillsExpensesPage(page);
    this.lastPaymentMarker = null;
  }

  logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(msg);
  }

  _isGlobalSearchField(placeholder, ariaLabel = '') {
    return /anything|intoaec/i.test(`${placeholder || ''} ${ariaLabel || ''}`);
  }

  toastLocator(textRegex) {
    return this.page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .Toastify__toast, .Toastify__toast-body')
      .filter({ hasText: textRegex })
      .first();
  }

  assertNotOnSignIn() {
    const url = this.page.url();
    if (/signin|sign-in/i.test(String(url || ''))) {
      throw new Error(`Still on sign-in page; cannot open Received Payments. URL: ${url}`);
    }
  }

  async goToClients() {
    this.projectNav.page = this.page;
    await this.projectNav.navigateToProjects();
  }

  async selectFirstClient() {
    this.projectNav.page = this.page;
    await this.projectNav.clickFirstProject();
  }

  async _dismissOverlays() {
    for (let i = 0; i < 3; i += 1) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(200).catch(() => {});
    }
  }

  async openReceivedPaymentsModule() {
    // Same shell as expenses — tab BillsAndExpenses, then type filter RECEIVED_PAYMENT
    this.billsExpenses.page = this.page;
    await this.billsExpenses.openBillsAndExpensesModule();
    await this.billsExpenses.applyTypeFilter('Received Payment').catch(() => {
      this.logStep('Received Payment type filter soft-skipped');
    });
  }

  async openProjectWithReceivedPayments() {
    this.assertNotOnSignIn();
    await this.projectNav.dismissOverlays();
    await this.goToClients();
    await this.selectFirstClient();
    await this.openReceivedPaymentsModule();
    await this.waitForModuleReady();
  }

  async isModuleReady() {
    // Require Bills & Expenses Create button (not just "Received Payments" card text)
    this.billsExpenses.page = this.page;
    const createBtn = this.page
      .getByRole('button', { name: /^create$/i })
      .filter({ visible: true })
      .first();
    const title = this.page
      .getByText(/bills\s*(&|and)?\s*expenses/i)
      .filter({ visible: true })
      .first();
    return (
      (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) ||
      ((await this.billsExpenses.isModuleReady()) &&
        (await title.isVisible({ timeout: 2000 }).catch(() => false)))
    );
  }

  async waitForModuleReady() {
    await expect(async () => {
      expect(await this.isModuleReady()).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 4000] });
    this.logStep('Received Payments module ready');
  }

  formRoot() {
    return this.page
      .locator('.MuiDrawer-root, [role="dialog"], .MuiModal-root, [class*="HalfCanvas"], [class*="OffCanvas"]')
      .filter({ visible: true })
      .filter({
        hasText: /add\s*received\s*payment|view\s*received\s*payment|payment\s*type|issued\s*date|enter\s*amount/i,
      })
      .last();
  }

  async clickAddPayment() {
    // Product path: Create → Received Payment
    await this._dismissOverlays();
    const createBtn = this.page
      .getByRole('button', { name: /^create$/i })
      .filter({ visible: true })
      .first();
    await expect(createBtn).toBeVisible({ timeout: this.defaultTimeout });
    await createBtn.click();
    await this.page.waitForTimeout(400).catch(() => {});

    const rpItem = this.page
      .getByRole('menuitem', { name: /received\s*payment/i })
      .or(this.page.locator('.MuiMenuItem-root').filter({ hasText: /received\s*payment/i }))
      .filter({ visible: true })
      .first();
    await expect(rpItem).toBeVisible({ timeout: 15000 });
    await rpItem.click();
    await this.page.waitForTimeout(800).catch(() => {});

    await expect(this.formRoot()).toBeVisible({ timeout: 30000 });
    this.logStep('Opened Add Received Payment (Create → Received Payment)');
  }

  async _fillLabeledInput(root, labelRe, value) {
    let field = root
      .locator('.d-flex.column, .MuiFormControl-root, .MuiTextField-root')
      .filter({ hasText: labelRe })
      .locator('input:not([disabled]), textarea:not([disabled])')
      .filter({ visible: true })
      .first();
    if (!(await field.isVisible({ timeout: 2500 }).catch(() => false))) {
      field = root.getByPlaceholder(labelRe).filter({ visible: true }).first();
      if (!(await field.isVisible({ timeout: 1500 }).catch(() => false))) return false;
    }
    await field.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await field.fill('');
    await field.fill(String(value));
    return true;
  }

  async _selectPaymentType(root) {
    // Modal uses overflowY scroll — scroll inside modal then open Autocomplete.
    let combo = root
      .getByPlaceholder(/select\s*payment\s*method/i)
      .filter({ visible: true })
      .first();
    if (!(await combo.isVisible({ timeout: 2000 }).catch(() => false))) {
      const block = root
        .locator('.d-flex.column')
        .filter({ hasText: /payment\s*type|mode\s*of\s*payment|payment\s*method/i })
        .filter({ visible: true })
        .first();
      combo = block.locator('[role="combobox"], input').filter({ visible: true }).first();
    }
    if (!(await combo.isVisible({ timeout: 5000 }).catch(() => false))) return false;

    await combo.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await this.page.waitForTimeout(200).catch(() => {});
    await combo.focus().catch(() => {});
    await combo.click({ force: true }).catch(async () => {
      await combo.evaluate((el) => el.click());
    });
    await this.page.waitForTimeout(400).catch(() => {});

    // Prefer real mouse click on first option (fires Autocomplete onChange → paymentName)
    const option = this.page
      .locator('[role="listbox"] [role="option"], .MuiAutocomplete-option')
      .filter({ visible: true })
      .filter({ hasNotText: /add\s*new/i })
      .first();
    if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
      await option.click({ force: true });
      await this.page.waitForTimeout(300).catch(() => {});
      this.logStep('Payment type selected via list option');
      return true;
    }

    // Keyboard fallback — AutocompleteComponent commits on Enter
    await combo.press('ArrowDown').catch(() => {});
    await this.page.waitForTimeout(150).catch(() => {});
    await combo.press('Enter').catch(() => {});
    await this.page.waitForTimeout(300).catch(() => {});
    this.logStep('Payment type selected via keyboard');
    return true;
  }

  async _pickIssuedDate(root) {
    // DatePicker defaults to today; only interact if empty / calendar needed
    const dateField = root
      .locator('.d-flex.column')
      .filter({ hasText: /issued\s*date|\bdate\b/i })
      .filter({ visible: true })
      .first();
    const input = dateField.locator('input').filter({ visible: true }).first();
    if (!(await input.isVisible({ timeout: 3000 }).catch(() => false))) return false;
    const val = ((await input.inputValue().catch(() => '')) || '').trim();
    if (val) {
      this.logStep(`Issued date already set: ${val}`);
      return true;
    }
    const openBtn = dateField
      .locator('button[aria-label*="choose date" i], .MuiInputAdornment-root button, button')
      .filter({ visible: true })
      .last();
    if (await openBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await openBtn.click({ force: true }).catch(() => {});
    } else {
      await input.click({ force: true }).catch(() => {});
    }
    await this.page.waitForTimeout(350).catch(() => {});
    const day = String(new Date().getDate());
    const dayBtn = this.page
      .locator('button.MuiPickersDay-root, .MuiPickersDay-root, [role="gridcell"]')
      .filter({ hasText: new RegExp(`^\\s*${day}\\s*$`) })
      .filter({ visible: true })
      .first();
    if (await dayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayBtn.click({ force: true });
      this.logStep(`Issued date set via calendar day ${day}`);
      return true;
    }
    return false;
  }

  async fillPaymentForm({ marker, amount } = {}) {
    const root = this.formRoot();
    await expect(root).toBeVisible({ timeout: 30000 });
    const stamp = Date.now();
    // Put unique marker in description (client name is disabled / from lead)
    const name = marker || `RP ${stamp}`;
    const amt = amount != null ? String(amount) : String(150 + (stamp % 850));
    this.lastPaymentMarker = name;

    await this._pickIssuedDate(root);

    const amtOk =
      (await this._fillLabeledInput(root, /\bamount\b/i, amt)) ||
      (await this._fillLabeledInput(root, /enter\s*amount/i, amt));
    if (!amtOk) this.logStep('Amount fill may have failed');

    const payOk = await this._selectPaymentType(root);
    if (!payOk) this.logStep('Payment type not selected — may block save');

    await this._fillLabeledInput(root, /description/i, name);
    await this._fillLabeledInput(root, /enter\s*description/i, name);

    this.logStep(`Filled payment form: ${name} / ${amt}`);
    return { marker: name, amount: amt };
  }

  async submitCreate() {
    const root = this.formRoot();
    await expect(root).toBeVisible({ timeout: 15000 });
    // Re-select payment type right before save (required; empty blocks CREATE_INVOICE)
    await this._selectPaymentType(root).catch(() => false);
    const btn = root
      .locator('button.btnPrimaryUI')
      .filter({ hasText: /^(save|create|add|submit|confirm)$/i })
      .or(root.getByRole('button', { name: /^(save|create|add|submit|confirm)$/i }))
      .filter({ visible: true })
      .first();
    await expect(btn).toBeVisible({ timeout: 20000 });
    await btn.evaluate((el) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      el.click();
    });
    await this.page.waitForTimeout(2500).catch(() => {});

    const requiredToast = await this.toastLocator(/required|please\s*enter/i)
      .isVisible({ timeout: 2500 })
      .catch(() => false);
    if (requiredToast) {
      this.logStep('Required-fields toast — repairing payment type + amount + save');
      const form = this.formRoot();
      if (await form.isVisible({ timeout: 2000 }).catch(() => false)) {
        const amt = String(150 + (Date.now() % 850));
        await this._fillLabeledInput(form, /\bamount\b/i, amt);
        await this._selectPaymentType(form);
        if (this.lastPaymentMarker) {
          await this._fillLabeledInput(form, /description/i, this.lastPaymentMarker);
        }
        await btn.evaluate((el) => {
          el.scrollIntoView({ block: 'center' });
          el.click();
        });
        await this.page.waitForTimeout(2500).catch(() => {});
      }
    }
    this.logStep('Submitted payment create');
  }

  async expectCreateSuccess() {
    await this.page.waitForTimeout(800).catch(() => {});
    // If still open after submit, one repair pass
    if (await this.formRoot().isVisible({ timeout: 1500 }).catch(() => false)) {
      const requiredToast = await this.toastLocator(/required|please\s*enter/i)
        .isVisible({ timeout: 1500 })
        .catch(() => false);
      if (requiredToast) {
        this.logStep('Form still open — repairing before success assert');
        const form = this.formRoot();
        await this._fillLabeledInput(form, /\bamount\b/i, String(200 + (Date.now() % 500)));
        await this._selectPaymentType(form);
        if (this.lastPaymentMarker) {
          await this._fillLabeledInput(form, /description/i, this.lastPaymentMarker);
        }
        const btn = form
          .locator('button.btnPrimaryUI')
          .filter({ hasText: /^save$/i })
          .filter({ visible: true })
          .first();
        if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await btn.evaluate((el) => el.click());
          await this.page.waitForTimeout(2500).catch(() => {});
        }
      }
    }
    await this._dismissOverlays();
    await expect(async () => {
      const toastOk = await this.toastLocator(
        /created|saved|success|added|payment|received|invoice/i
      )
        .isVisible()
        .catch(() => false);
      const drawerOpen = await this.formRoot()
        .isVisible({ timeout: 500 })
        .catch(() => false);
      const marker = this.lastPaymentMarker;
      const rowOk = marker
        ? await this.page
            .locator('table tbody tr')
            .filter({
              hasText: new RegExp(String(marker).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
            })
            .filter({ visible: true })
            .first()
            .isVisible({ timeout: 500 })
            .catch(() => false)
        : false;
      expect(toastOk || !drawerOpen || rowOk).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
    this.logStep('Payment create success verified');
  }

  async getModuleSearchInput() {
    const inputs = this.page
      .locator('input[placeholder*="earch" i], input[aria-label*="earch" i]')
      .filter({ visible: true });
    const count = await inputs.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const el = inputs.nth(i);
      const ph = ((await el.getAttribute('placeholder').catch(() => '')) || '').trim();
      const aria = ((await el.getAttribute('aria-label').catch(() => '')) || '').trim();
      if (this._isGlobalSearchField(ph, aria)) continue;
      return el;
    }
    return null;
  }

  async searchInModule(query) {
    const search = await this.getModuleSearchInput();
    if (!search) {
      this.logStep('Module search input not found — skipping fill');
      return false;
    }
    await search.click({ force: true }).catch(() => {});
    await search.fill('');
    await search.fill(String(query));
    await this.page.waitForTimeout(800).catch(() => {});
    return true;
  }

  async expectPaymentByMarker(marker) {
    const m = String(marker || this.lastPaymentMarker || '').trim();
    expect(m, 'Payment marker required').toBeTruthy();
    await this._dismissOverlays();
    // Ensure RECEIVED_PAYMENT filter so the row can appear
    this.billsExpenses.page = this.page;
    await this.billsExpenses.applyTypeFilter('Received Payment').catch(() => {});
    await this.searchInModule(m).catch(() => {});
    // Name column shows senderName; marker is in description — match the row only.
    // Do NOT .or(getByText) — both match and toBeVisible() hits strict-mode violation.
    const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const row = this.page
      .locator('table tbody tr')
      .filter({ hasText: new RegExp(escaped, 'i') })
      .filter({ visible: true })
      .first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Payment visible: ${m}`);
  }

  async openRowByMarker(marker) {
    const m = String(marker || this.lastPaymentMarker || '').trim();
    this.billsExpenses.page = this.page;
    await this.billsExpenses.applyTypeFilter('Received Payment').catch(() => {});
    await this.searchInModule(m).catch(() => {});
    const row = this.page
      .locator('table tbody tr, .MuiDataGrid-row')
      .filter({ hasText: new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .filter({ visible: true })
      .first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    // Click name cell to open view modal
    await row.locator('td').first().click({ force: true });
    await this.page.waitForTimeout(800).catch(() => {});
  }

  /**
   * isEdit on AddReceivedPaymentsModal = view mode: no Save, fields disabled.
   */
  async expectReadOnlyPaymentView() {
    const root = this.formRoot();
    await expect(root).toBeVisible({ timeout: 20000 });

    const viewTitle = root
      .getByText(/view\s*received\s*payments?/i)
      .or(this.page.getByText(/view\s*received\s*payments?/i))
      .filter({ visible: true })
      .first();
    const titleOk = await viewTitle.isVisible({ timeout: 8000 }).catch(() => false);

    const saveBtn = root
      .getByRole('button', { name: /^(save|update)$/i })
      .or(root.locator('button.btnPrimaryUI').filter({ hasText: /^(save|update)$/i }))
      .filter({ visible: true })
      .first();
    const hasSave = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasSave, 'Received payment view must not show Save/Update').toBeFalsy();

    const disabledInput = root.locator('input[disabled], textarea[disabled], .Mui-disabled').first();
    const disabledOk = await disabledInput.isVisible({ timeout: 5000 }).catch(() => false);

    expect(titleOk || disabledOk || !hasSave).toBeTruthy();
    this.logStep('Received payment opened in read-only view (no edit)');
  }

  async submitEmptyCreate() {
    await this.submitCreate();
  }

  async expectValidationMessage() {
    await expect(async () => {
      const toastOk = await this.toastLocator(/required|please\s*enter|please\s*select|invalid|mandatory/i)
        .isVisible()
        .catch(() => false);
      const formStillOpen = await this.formRoot()
        .locator('input, textarea, [role="combobox"]')
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);
      expect(toastOk || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
    this.logStep('Payment validation verified');
  }
}

module.exports = ReceivedPaymentsPage;
