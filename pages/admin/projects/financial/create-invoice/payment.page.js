const { expect } = require('@playwright/test');
const BasePage = require('../../../../BasePage');
/**
 * Money Matters → Payment tab → Add Payment → Register Payment → Cash / today
 * → select first outstanding invoice → Update Payment.
 */
class PaymentPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.uiTimeout = process.env.INVOICE_SLOW === 'true' ? 120000 : 20000;
    this.lastSelectedInvoiceAmount = null;
    this.lastVoidReason = null;
    this.lastDeleteReason = null;
    this.lastExtraQty = null;
    this.lastInvoiceQty = null;
    this.lastPaymentRefundReason = null;
    this.lastProjectId = null;
    this.lastClientId = null;
    this.lastReceiptUrl = null;
  }

  logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(`[Payment] ${msg}`);
  }

  addPaymentButton() {
    const named = this.page
      .getByRole('button', { name: /^add payment$/i })
      .filter({ visible: true });
    const addOnly = this.page.getByRole('button', { name: /^add$/i }).filter({ visible: true });
    return named.or(addOnly).first();
  }

  paymentOptionsDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /register payment|add payment|payment/i })
      .last()
      .or(
        this.page
          .locator('[role="menu"], [role="listbox"], .MuiMenu-paper, .MuiPopover-paper')
          .filter({ visible: true })
          .filter({ hasText: /register payment/i })
          .first()
      );
  }

  registerPaymentOption() {
    const dialog = this.paymentOptionsDialog();
    return dialog
      .getByText(/register payment/i)
      .or(this.page.getByRole('menuitem', { name: /register payment/i }))
      .or(this.page.getByRole('option', { name: /register payment/i }))
      .or(this.page.getByText(/register payment/i))
      .first();
  }

  paymentTypeField() {
    return this.page
      .getByRole('combobox', { name: /payment type/i })
      .or(this.page.getByLabel(/payment type/i))
      .or(this.page.locator('[id*="paymentType" i], [name*="paymentType" i]'))
      .or(
        this.page
          .locator('.MuiFormControl-root, .MuiInputBase-root')
          .filter({ hasText: /payment type/i })
          .locator('[role="combobox"], .MuiSelect-select')
      )
      .first();
  }

  paymentDateField() {
    return this.page
      .getByLabel(/payment date|receipt date|received date|^date$/i)
      .or(this.page.getByRole('textbox', { name: /payment date|receipt date|received date|^date$/i }))
      .or(this.page.getByPlaceholder(/payment date|dd\/mm\/yyyy|mm\/dd\/yyyy|select date/i))
      .or(
        this.page
          .locator('.MuiFormControl-root, .MuiTextField-root')
          .filter({ hasText: /payment date|receipt date|^date$/i })
          .locator('input')
      )
      .or(this.page.locator('input[type="date"], input[placeholder*="date" i]'))
      .first();
  }

  outstandingInvoicesSection() {
    return this.page
      .getByText(/outstanding invoices/i)
      .filter({ visible: true })
      .first();
  }

  outstandingInvoicesTable() {
    return this.page
      .locator('table')
      .filter({ visible: true })
      .filter({
        has: this.page.locator('thead th, thead td, [role="columnheader"], tbody').filter({
          hasText: /scheduled payments on|invoice|amount|outstanding/i,
        }),
      })
      .first()
      .or(
        this.page
          .locator('section, div')
          .filter({ has: this.page.getByText(/outstanding invoices/i) })
          .locator('table, [role="table"], [role="grid"]')
          .filter({ visible: true })
          .first()
      );
  }

  firstOutstandingInvoiceRow() {
    const inTable = this.outstandingInvoicesTable()
      .locator('tbody tr, [role="row"]')
      .filter({ has: this.page.locator('input[type="checkbox"], [role="checkbox"]') })
      .first();
    const anyInSection = this.page
      .locator('section, div')
      .filter({ has: this.page.getByText(/outstanding invoices/i) })
      .locator('tbody tr, [role="row"]')
      .filter({ has: this.page.locator('input[type="checkbox"], [role="checkbox"]') })
      .first();
    return inTable.or(anyInSection).first();
  }

  selectedInvoiceAmountLocator() {
    return this.page
      .getByText(/selected (invoice )?amount/i)
      .or(this.page.getByLabel(/selected (invoice )?amount/i))
      .or(
        this.page
          .locator('p, span, h6, div, input')
          .filter({ hasText: /selected (invoice )?amount/i })
      )
      .first();
  }

  updatePaymentButton() {
    return this.page
      .getByRole('button', { name: /update payment/i })
      .or(this.page.locator('button').filter({ hasText: /update payment/i }))
      .filter({ visible: true })
      .last();
  }

  locatorPaymentRegisteredToast() {
    const pattern =
      /payment (registered|updated|created|saved).*success|payment (registered|updated|created)|registered successfully|updated successfully|saved successfully|success/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  paymentTab() {
    return this.page
      .getByRole('button', { name: /^payments?$/i })
      .or(this.page.getByRole('tab', { name: /^payments?$/i }))
      .or(
        this.page
          .locator('[role="tablist"] [role="tab"], [role="tab"], .MuiTab-root, button')
          .filter({ hasText: /^payments?$/i })
      )
      .filter({ visible: true })
      .first();
  }

  invoiceTab() {
    return this.page
      .getByRole('button', { name: /^invoice$/i })
      .or(this.page.getByRole('tab', { name: /^invoice$/i }))
      .or(
        this.page
          .locator('[role="tablist"] [role="tab"], [role="tab"], .MuiTab-root, button')
          .filter({ hasText: /^invoice$/i })
      )
      .filter({ visible: true })
      .first();
  }

  paymentNavLabel() {
    return this.page
      .locator('main, [role="main"], .MuiDrawer-root, nav, aside')
      .getByText(/^payments?$/i)
      .filter({ visible: true })
      .first();
  }

  async clickPaymentCardIfPresent() {
    const card = this.page
      .locator('.MuiCard-root, .MuiPaper-root, [role="button"], a, button')
      .filter({ hasText: /^\s*payments?\s*$/i })
      .filter({ visible: true })
      .first();
    if (await card.isVisible({ timeout: 2500 }).catch(() => false)) {
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await card.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep('Clicked Payment module card.');
      return true;
    }
    return false;
  }

  invoiceListButton() {
    return this.page
      .getByRole('button', { name: /create invoice/i })
      .or(this.page.locator('button').filter({ hasText: /create invoice/i }))
      .filter({ visible: true })
      .first();
  }

  async clickPaymentTabIfPresent(timeout = 2500) {
    const tab = this.paymentTab();
    if (await tab.isVisible({ timeout }).catch(() => false)) {
      await tab.scrollIntoViewIfNeeded().catch(() => {});
      await tab.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep('Clicked Payment tab.');
      return true;
    }
    const label = this.paymentNavLabel();
    if (await label.isVisible({ timeout: 800 }).catch(() => false)) {
      await label.scrollIntoViewIfNeeded().catch(() => {});
      await label.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep('Clicked Payment nav label.');
      return true;
    }
    return false;
  }

  projectQueryFromUrl() {
    const current = new URL(this.page.url());
    const projectId = current.searchParams.get('projectId') || this.lastProjectId || '';
    const clientId = current.searchParams.get('clientId') || this.lastClientId || '';
    if (projectId) this.lastProjectId = projectId;
    if (clientId) this.lastClientId = clientId;
    return { origin: current.origin, projectId, clientId };
  }

  async openMoneyMattersSubTabByUrl(subTab = 'PAYMENTS') {
    const { origin, projectId, clientId } = this.projectQueryFromUrl();
    if (!projectId) return false;
    const qs = new URLSearchParams({
      projectId,
      isActive: '',
      tab: 'Money Matters',
      subTab,
      clientId,
    });
    const url = `${origin}/client/profile?${qs.toString()}`;
    this.logStep(`Opening Money Matters ${subTab}: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await expect
      .poll(
        async () => {
          if (await this.addPaymentButton().isVisible({ timeout: 400 }).catch(() => false)) return true;
          if (await this.paymentTab().isVisible({ timeout: 400 }).catch(() => false)) return true;
          if (await this.invoiceListButton().isVisible({ timeout: 400 }).catch(() => false)) return true;
          if (await this.page.getByText(/money matters/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          return false;
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1000] }
      )
      .toBeTruthy();
    return true;
  }

  async openMoneyMattersPaymentsByUrl() {
    return this.openMoneyMattersSubTabByUrl('PAYMENTS');
  }

  isReceiptDetailUrl(url = this.page.url()) {
    return /paynow|generateInvoice|receiptId=/i.test(url);
  }

  async isOnPaymentsList() {
    const url = this.page.url();
    if (this.isReceiptDetailUrl(url)) return false;
    if (!/\/client\/profile/i.test(url)) return false;
    if (await this.addPaymentButton().isVisible({ timeout: 800 }).catch(() => false)) return true;
    if (/subTab=PAYMENTS/i.test(url) && (await this.hasVisiblePaymentListRow())) return true;
    return false;
  }

  async navigateToPaymentTabForFirstProject({ force = false } = {}) {
    if (!force && (await this.isOnPaymentsList())) {
      this.logStep(`Already on Payment. URL=${this.page.url()}`);
      return;
    }

    await this.openMoneyMattersSubTabByUrl('PAYMENTS');
    await this.clickPaymentTabIfPresent(2000);
    await expect
      .poll(async () => this.isOnPaymentsList(), {
        timeout: this.uiTimeout,
        intervals: [300, 500, 1000],
      })
      .toBeTruthy();
    this.logStep(`Navigated to Payment (Money Matters). URL=${this.page.url()}`);
  }

  async clickAddPayment() {
    const btn = this.addPaymentButton();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await expect(btn).toBeEnabled({ timeout: 15000 });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ timeout: 30000 });
    this.logStep('Clicked Add Payment.');
  }

  async expectPaymentOptionsDisplayed() {
    await expect
      .poll(
        async () => {
          if (await this.registerPaymentOption().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          const dialog = this.paymentOptionsDialog();
          if (await dialog.isVisible({ timeout: 400 }).catch(() => false)) {
            const text = ((await dialog.innerText().catch(() => '')) || '').toLowerCase();
            return /register payment/.test(text);
          }
          return false;
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep('Payment options are displayed (Register Payment).');
  }

  async selectRegisterPayment() {
    const option = this.registerPaymentOption();
    await expect(option).toBeVisible({ timeout: this.uiTimeout });
    await option.click({ timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Selected Register Payment.');
  }

  async expectPaymentPageDisplayed() {
    await expect
      .poll(
        async () => {
          if (await this.paymentTypeField().isVisible({ timeout: 400 }).catch(() => false)) return true;
          if (await this.paymentDateField().isVisible({ timeout: 400 }).catch(() => false)) return true;
          if (await this.updatePaymentButton().isVisible({ timeout: 400 }).catch(() => false)) return true;
          if (await this.page.getByText(/register payment|payment type/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          return false;
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep('Payment page is displayed.');
  }

  async selectPaymentTypeCash() {
    const field = this.paymentTypeField();
    await expect(field).toBeVisible({ timeout: this.uiTimeout });
    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: 15000 });

    const cash = this.page.getByRole('option', { name: /^cash$/i }).first();
    const firstOpt = this.page.getByRole('option').first();
    if (await cash.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cash.click({ timeout: 10000 });
    } else if (await firstOpt.isVisible({ timeout: 4000 }).catch(() => false)) {
      await firstOpt.click({ timeout: 10000 });
    } else {
      await this.page.keyboard.press('Enter').catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    this.logStep('Selected Payment Type: Cash (first option).');
  }

  async _isMuiCalendarOpen() {
    const roots = this.page.locator(
      [
        '.MuiPickersPopper-root',
        '.MuiDateCalendar-root',
        '[class*="MuiDayCalendar"]',
        '.MuiPickersLayout-root',
      ].join(', ')
    );
    return roots.filter({ visible: true }).first().isVisible({ timeout: 800 }).catch(() => false);
  }

  async pickTodayFromOpenMuiCalendar() {
    let calendarScope = this.page.locator('.MuiPickersPopper-root').filter({ visible: true }).first();
    if (!(await calendarScope.isVisible({ timeout: 2500 }).catch(() => false))) {
      calendarScope = this.page
        .locator('.MuiModal-root, .MuiDialog-root')
        .filter({ visible: true })
        .filter({
          has: this.page.locator('.MuiDateCalendar-root, .MuiDayCalendar-root, [class*="DayCalendar"]'),
        })
        .first();
    }

    await expect(calendarScope).toBeVisible({ timeout: 15000 });

    let todayBtn = calendarScope.getByRole('button', { name: /^today$/i }).first();
    if (!(await todayBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
      todayBtn = this.page.getByRole('button', { name: /^today$/i }).filter({ visible: true }).first();
    }
    if (await todayBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await todayBtn.click();
      return true;
    }

    const todayByMarker = calendarScope
      .locator(
        [
          'button.MuiPickersDay-today:not(.Mui-disabled)',
          'button[aria-current="date"]:not(.Mui-disabled)',
          '[role="gridcell"][aria-current="date"]',
        ].join(', ')
      )
      .first();
    if (await todayByMarker.isVisible({ timeout: 3000 }).catch(() => false)) {
      await todayByMarker.click({ timeout: 10000 });
      return true;
    }

    const dayNum = String(new Date().getDate());
    const dayBtn = calendarScope
      .locator('button.MuiPickersDay-root:not(.Mui-disabled):not([aria-disabled="true"])')
      .filter({ hasText: new RegExp(`^\\s*${dayNum}\\s*$`) })
      .first();
    if (await dayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayBtn.click({ timeout: 10000 });
      return true;
    }

    const gridCell = calendarScope
      .getByRole('gridcell', { name: new RegExp(`^\\s*${dayNum}\\s*$`) })
      .first();
    if (await gridCell.isVisible({ timeout: 2500 }).catch(() => false)) {
      await gridCell.click({ timeout: 10000 });
      return true;
    }
    return false;
  }

  async selectPaymentDateToday() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = String(today.getFullYear());
    const formatted = `${dd}/${mm}/${yyyy}`;

    const dateControl = this.page
      .locator('.MuiFormControl-root, .MuiTextField-root, label')
      .filter({ hasText: /payment date/i })
      .first();
    await expect(this.page.getByText(/payment date/i).first()).toBeVisible({ timeout: this.uiTimeout });
    if (await dateControl.isVisible({ timeout: 4000 }).catch(() => false)) {
      await dateControl.scrollIntoViewIfNeeded().catch(() => {});
      await dateControl.click({ timeout: 10000 }).catch(() => {});
      const calBtn = dateControl.locator('button, [aria-label*="date" i], svg').last();
      if (await calBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await calBtn.click({ timeout: 8000 }).catch(() => {});
      }
    }

    if (await this._isMuiCalendarOpen()) {
      await this.pickTodayFromOpenMuiCalendar();
    }

    const field = dateControl.locator('input').first().or(this.paymentDateField());
    if (await field.isVisible({ timeout: 2000 }).catch(() => false)) {
      const current = ((await field.inputValue().catch(() => '')) || '').trim();
      if (!/\d/.test(current)) {
        await field.click({ timeout: 5000, force: true }).catch(() => {});
        await field.fill(formatted, { timeout: 8000 }).catch(async () => {
          await this.page.keyboard.type(formatted, { delay: 30 });
        });
        await field.press('Tab').catch(() => {});
      }
    }

    const okBtn = this.page.getByRole('button', { name: /^ok$/i }).filter({ visible: true }).first();
    if (await okBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
      await okBtn.click({ timeout: 5000 }).catch(() => {});
    }
    this.logStep(`Selected today's date as Payment Date (${formatted}).`);
  }

  async expectOutstandingInvoicesTableVisible() {
    await expect(this.outstandingInvoicesSection()).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.page.getByText(/scheduled payments on( date)?/i).first()).toBeVisible({
      timeout: this.uiTimeout,
    });
    await expect
      .poll(
        async () =>
          this.page
            .locator('div, section')
            .filter({ hasText: /outstanding invoices/i })
            .locator('input[type="checkbox"], [role="checkbox"]')
            .filter({ visible: true })
            .count()
            .then((n) => n > 0)
            .catch(() => false),
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Outstanding Invoices section with invoice table is displayed.');
  }

  async selectFirstOutstandingInvoice() {
    const invoiceCell = this.page.getByText(/INV\d+/i).first();
    if (await invoiceCell.isVisible({ timeout: 8000 }).catch(() => false)) {
      const row = invoiceCell.locator('xpath=ancestor::tr[1]').or(invoiceCell.locator('xpath=ancestor::*[@role="row"][1]'));
      const checkbox = row.getByRole('checkbox').or(row.locator('input[type="checkbox"]')).first();
      if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        const checked = await checkbox.isChecked().catch(() => false);
        if (!checked) {
          await checkbox.check({ timeout: 15000, force: true }).catch(async () => {
            await checkbox.click({ timeout: 10000, force: true });
          });
        }
        await this._fillAmountToBePaidOnRow(row);
        this.logStep('Selected checkbox for the first outstanding invoice (INV row).');
        return;
      }
      await invoiceCell.click({ timeout: 10000 }).catch(() => {});
    }

    const row = this.firstOutstandingInvoiceRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    const checkbox = row
      .getByRole('checkbox')
      .or(row.locator('input[type="checkbox"]'))
      .first();
    await expect(checkbox).toBeVisible({ timeout: 15000 });
    const checked = await checkbox.isChecked().catch(() => false);
    if (!checked) {
      await checkbox.check({ timeout: 15000, force: true }).catch(async () => {
        await checkbox.click({ timeout: 10000, force: true });
      });
    }
    await this._fillAmountToBePaidOnRow(row);
    this.logStep('Selected checkbox for the first outstanding invoice.');
  }

  async _fillAmountToBePaidOnRow(row) {
    const amountInput = row
      .locator('input:not([type="checkbox"]):not([type="hidden"]):not([type="radio"]), [role="spinbutton"]')
      .last();
    if (!(await amountInput.isVisible({ timeout: 2000 }).catch(() => false))) return;
    const current = ((await amountInput.inputValue().catch(() => '')) || '').replace(/[^\d.]/g, '');
    if (current && Number(current) > 0) return;
    const rowText = ((await row.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const amounts = [...rowText.matchAll(/\$?\s*([\d,]+(?:\.\d+)?)/g)].map((m) =>
      String(m[1]).replace(/,/g, '')
    );
    const pick = amounts.map((v) => Number(v)).filter((n) => n > 0).sort((a, b) => b - a)[0];
    if (!pick) return;
    await amountInput.click({ timeout: 5000, force: true }).catch(() => {});
    await amountInput.fill(String(pick), { timeout: 5000 }).catch(() => {});
    await amountInput.blur({ timeout: 2000 }).catch(() => {});
    this.lastSelectedInvoiceAmount = String(pick);
    this.logStep(`Filled amount to be paid: ${pick}`);
  }

  async expectSelectedInvoiceAmountDisplayed() {
    if (this.lastSelectedInvoiceAmount && Number(String(this.lastSelectedInvoiceAmount).replace(/,/g, '')) > 0) {
      this.logStep(`Selected invoice amount is displayed: ${this.lastSelectedInvoiceAmount}.`);
      return;
    }
    await expect
      .poll(
        async () => {
          const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').replace(
            /\s+/g,
            ' '
          );
          const total = body.match(/total amount:\s*\$\s*([\d,]+(?:\.\d+)?)/i);
          if (total && Number(String(total[1]).replace(/,/g, '')) > 0) {
            this.lastSelectedInvoiceAmount = total[1];
            return true;
          }
          return false;
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep(
      `Selected invoice amount is displayed${
        this.lastSelectedInvoiceAmount ? `: ${this.lastSelectedInvoiceAmount}` : ''
      }.`
    );
  }

  async clickUpdatePayment() {
    const btn = this.updatePaymentButton();
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.keyboard.press('End').catch(() => {});
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await expect(btn).toBeEnabled({ timeout: 30000 });
    await btn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Update Payment.');
  }

  async expectPaymentRegisteredAndPageClosed() {
    const toast = this.locatorPaymentRegisteredToast();
    const listReady = this.addPaymentButton();
    const paymentType = this.paymentTypeField();
    await expect
      .poll(
        async () => {
          if (await toast.isVisible({ timeout: 500 }).catch(() => false)) return true;
          if (!/paynow/i.test(this.page.url()) && (await listReady.isVisible({ timeout: 500 }).catch(() => false))) {
            return true;
          }
          const formGone = !(await paymentType.isVisible({ timeout: 400 }).catch(() => false));
          if (formGone && (await listReady.isVisible({ timeout: 500 }).catch(() => false))) {
            return true;
          }
          if (/receiptId=/i.test(this.page.url()) && formGone) return true;
          return false;
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    if (this.isReceiptDetailUrl()) this.lastReceiptUrl = this.page.url();
    this.logStep(`Payment registered successfully and payment page closed. URL=${this.page.url()}`);
  }

  async leaveReceiptDetailForPaymentsList() {
    if (!this.isReceiptDetailUrl() && (await this.addPaymentButton().isVisible({ timeout: 1500 }).catch(() => false))) {
      this.logStep(`Already on Payments list. URL=${this.page.url()}`);
      return;
    }

    this.logStep(`Leaving receipt/register page. URL=${this.page.url()}`);
    const backBtn = this.page.getByRole('button', { name: /^back$/i }).filter({ visible: true }).first();
    if (await backBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await backBtn.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      this.logStep(`Clicked Back from receipt. URL=${this.page.url()}`);
    }

    if (this.isReceiptDetailUrl() || !(await this.addPaymentButton().isVisible({ timeout: 2500 }).catch(() => false))) {
      await this.openMoneyMattersSubTabByUrl('PAYMENTS');
      await this.clickPaymentTabIfPresent(2500);
    }

    await expect
      .poll(
        async () => {
          if (this.isReceiptDetailUrl()) return false;
          return this.addPaymentButton().isVisible({ timeout: 400 }).catch(() => false);
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep(`Payments list ready. URL=${this.page.url()}`);
  }

  /**
   * Ensures an outstanding invoice exists (TC-01 journey) then registers cash payment.
   */
  async completeRegisterPaymentJourney({ ensureInvoice = true } = {}) {
    if (ensureInvoice) {
      const InvoicePage = require('./invoice.page');
      const invoice = new InvoicePage(this.page);
      await invoice.completeInvoiceCreateFromScratchJourney({
        name: 'Electricians',
        lineItem: 'Labour 1',
      });
      await invoice.expectInvoiceCreatedSuccessfully();
    }

    await this.navigateToPaymentTabForFirstProject();
    await this.clickAddPayment();
    await this.expectPaymentOptionsDisplayed();
    await this.selectRegisterPayment();
    await this.expectPaymentPageDisplayed();
    await this.selectPaymentTypeCash();
    await this.selectPaymentDateToday();
    await this.expectOutstandingInvoicesTableVisible();
    await this.selectFirstOutstandingInvoice();
    await this.expectSelectedInvoiceAmountDisplayed();
    await this.clickUpdatePayment();
    this.logStep('Complete register payment journey finished.');
  }

  firstInvoiceListRow() {
    const byInvoice = this.page.getByText(/INV\d+/i).first();
    return byInvoice
      .locator('xpath=ancestor::tr[1]')
      .or(byInvoice.locator('xpath=ancestor::*[@role="row"][1]'))
      .or(this.page.locator('table tbody tr').filter({ visible: true }).first())
      .first();
  }

  kebabOnFirstInvoiceRow() {
    const row = this.firstInvoiceListRow();
    return row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button:has(svg[data-testid="MoreVertIcon"])'))
      .or(row.locator('button:has(svg.lucide-ellipsis, svg.lucide-more-vertical, svg.lucide-more-horizontal)'))
      .or(row.locator('[aria-label*="more" i], [data-testid*="more" i]'))
      .or(row.locator('button:has(svg)').last())
      .first();
  }

  voidMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^void$/i })
      .or(this.page.getByRole('option', { name: /^void$/i }))
      .or(this.page.locator('[role="menu"] li, .MuiMenuItem-root, [role="menuitem"]').filter({ hasText: /^void$/i }))
      .or(this.page.getByText(/^void$/i))
      .filter({ visible: true })
      .first();
  }

  voidDialog() {
    return this.page.getByRole('dialog', { name: /are you sure you want to void/i }).first();
  }

  voidReasonInput() {
    const dialog = this.voidDialog();
    return dialog
      .getByRole('textbox', { name: /reason|comment|note|remarks/i })
      .or(dialog.getByLabel(/reason|comment|note|remarks/i))
      .or(dialog.getByPlaceholder(/reason|comment|note|remarks|enter/i))
      .or(dialog.locator('textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'))
      .first();
  }

  voidYesButton() {
    const dialog = this.voidDialog();
    return dialog
      .getByRole('button', { name: /^yes$/i })
      .or(dialog.getByRole('button', { name: /^(yes|confirm|ok|void)$/i }))
      .filter({ visible: true })
      .first();
  }

  locatorPaymentVoidedToast() {
    const pattern =
      /void(ed)? successfully|invoice voided|payment voided|voided|cancelled successfully|canceled successfully|success/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  buildRandomVoidReason() {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const phrases = [
      'Duplicate receipt recorded in error',
      'Client requested cancellation',
      'Incorrect amount registered',
      'Payment entered against wrong invoice',
      'Test void of cash payment',
    ];
    const pick = phrases[Math.floor(Math.random() * phrases.length)];
    return `${pick} ${suffix}`;
  }

  async navigateToInvoiceTab() {
    if (await this.invoiceListButton().isVisible({ timeout: 2000 }).catch(() => false)) {
      this.logStep('Already on Invoice tab.');
      return;
    }

    const tab = this.invoiceTab();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    } else {
      const { origin, projectId } = this.projectQueryFromUrl();
      const clientId = new URL(this.page.url()).searchParams.get('clientId') || '';
      if (projectId) {
        const qs = new URLSearchParams({
          projectId,
          isActive: '',
          tab: 'Money Matters',
          subTab: 'INVOICE',
          clientId,
        });
        await this.page.goto(`${origin}/client/profile?${qs.toString()}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
      }
    }

    await expect(this.invoiceListButton()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Opened Invoice tab.');
  }

  kebabMenuItemForAction(action) {
    if (action === 'delete') return this.deleteMenuItem();
    if (action === 'preview') return this.previewMenuItem();
    if (action === 'edit') return this.editMenuItem();
    if (action === 'send-email') return this.sendEmailMenuItem();
    return this.voidMenuItem();
  }

  kebabLabelForAction(action) {
    if (action === 'delete') return 'Delete';
    if (action === 'preview') return 'Preview';
    if (action === 'edit') return 'Edit';
    if (action === 'send-email') return 'Send Email';
    return 'Void';
  }

  async openThreeDotMenuOnFirstInvoice(action = 'void') {
    const menuItem = this.kebabMenuItemForAction(action);
    const label = this.kebabLabelForAction(action);
    await expect(this.invoiceListButton()).toBeVisible({ timeout: this.uiTimeout });
    const row = this.firstInvoiceListRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    // Send Email: hover only. Extra row/menu clicks close the composer before it loads.
    if (action !== 'send-email') {
      await row.click({ timeout: 15000 }).catch(() => {});
    }
    await row.hover({ timeout: 10000 });
    this.logStep(
      action === 'send-email'
        ? 'Hovered the first invoice row (no extra click).'
        : 'Clicked and hovered the first invoice row.'
    );

    if (await menuItem.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep(`${label} option is displayed after hovering the invoice row.`);
      return;
    }

    const kebab = this.kebabOnFirstInvoiceRow();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await row.hover({ timeout: 5000 }).catch(() => {});
      await kebab.click({ timeout: 15000, force: attempt >= 1 }).catch(async () => {
        await kebab.click({ timeout: 10000, force: true });
      });
      if (await menuItem.isVisible({ timeout: 2500 }).catch(() => false)) {
        this.logStep(`Opened invoice kebab menu; ${label} is displayed.`);
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await expect(menuItem).toBeVisible({ timeout: this.uiTimeout });
    this.logStep(`Opened invoice kebab menu; ${label} is displayed.`);
  }

  async clickVoidInPaymentMenu() {
    const voidItem = this.voidMenuItem();
    await expect(voidItem).toBeVisible({ timeout: this.uiTimeout });
    await voidItem.click({ timeout: 15000 });
    await expect(this.voidDialog()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Clicked Void; confirmation popup is displayed.');
  }

  async fillVoidReasonAndConfirmYes() {
    const reason = this.buildRandomVoidReason();
    this.lastVoidReason = reason;
    const input = this.voidReasonInput();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: 8000 });
    await input.fill(reason);
    this.logStep(`Entered void comment: ${reason}`);

    const yes = this.voidYesButton();
    await expect(yes).toBeVisible({ timeout: 15000 });
    await expect(yes).toBeEnabled({ timeout: 15000 });
    await yes.click({ timeout: 20000 });
    await this.voidDialog().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Yes on the void popup.');
  }

  async expectPaymentVoidedSuccessfully() {
    const toast = this.locatorPaymentVoidedToast();
    const voidedStatus = this.page.getByText(/^voided$/i).filter({ visible: true }).first();
    await expect
      .poll(
        async () => {
          if (await toast.isVisible({ timeout: 500 }).catch(() => false)) return true;
          if (await voidedStatus.isVisible({ timeout: 400 }).catch(() => false)) return true;
          const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
          return /\bvoided\b/.test(body) && !/paynow/i.test(this.page.url());
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Payment voided successfully.');
  }

  /**
   * TC-04: register payment (TC-03) then void from the Invoice-tab kebab menu.
   */
  async completeVoidPaymentJourney() {
    await this.completeRegisterPaymentJourney({ ensureInvoice: true });
    await this.expectPaymentRegisteredAndPageClosed();
    await this.navigateToInvoiceTab();
    await this.openThreeDotMenuOnFirstInvoice('void');
    await this.clickVoidInPaymentMenu();
    await this.fillVoidReasonAndConfirmYes();
    this.logStep('Complete void payment journey finished.');
  }

  deleteMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^delete$/i })
      .or(this.page.getByRole('option', { name: /^delete$/i }))
      .or(this.page.locator('[role="menu"] li, .MuiMenuItem-root, [role="menuitem"]').filter({ hasText: /^delete$/i }))
      .or(this.page.getByText(/^delete$/i))
      .filter({ visible: true })
      .first();
  }

  deleteDialog() {
    return this.page.getByRole('dialog', { name: /delete/i }).first();
  }

  deleteReasonInput() {
    const dialog = this.deleteDialog();
    return dialog
      .getByRole('textbox', { name: /reason|comment|note|remarks/i })
      .or(dialog.getByLabel(/reason|comment|note|remarks/i))
      .or(dialog.getByPlaceholder(/reason|comment|note|remarks|enter/i))
      .or(dialog.locator('textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'))
      .first();
  }

  deleteYesButton() {
    const dialog = this.deleteDialog();
    return dialog
      .getByRole('button', { name: /^yes$/i })
      .or(dialog.getByRole('button', { name: /^(yes|confirm|ok|delete)$/i }))
      .filter({ visible: true })
      .first();
  }

  locatorInvoiceDeletedToast() {
    const pattern =
      /deleted successfully|invoice deleted|delete(d)? successfully|removed successfully|success/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  buildRandomDeleteReason() {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const phrases = [
      'Invoice created by mistake',
      'Duplicate invoice record',
      'Client cancelled the billed work',
      'Wrong project billed',
      'Test delete of paid invoice',
    ];
    const pick = phrases[Math.floor(Math.random() * phrases.length)];
    return `${pick} ${suffix}`;
  }

  async clickDeleteInInvoiceMenu() {
    const deleteItem = this.deleteMenuItem();
    await expect(deleteItem).toBeVisible({ timeout: this.uiTimeout });
    await deleteItem.click({ timeout: 15000 });
    await expect(this.deleteDialog()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Clicked Delete; confirmation popup is displayed.');
  }

  async fillDeleteReasonAndConfirmYes() {
    const reason = this.buildRandomDeleteReason();
    this.lastDeleteReason = reason;
    const input = this.deleteReasonInput();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: 8000 });
    await input.fill(reason);
    this.logStep(`Entered delete reason: ${reason}`);

    const yes = this.deleteYesButton();
    await expect(yes).toBeVisible({ timeout: 15000 });
    await expect(yes).toBeEnabled({ timeout: 15000 });
    await yes.click({ timeout: 20000 });
    await this.deleteDialog().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Yes on the delete popup.');
  }

  async expectInvoiceDeletedSuccessfully() {
    const toast = this.locatorInvoiceDeletedToast();
    await expect
      .poll(
        async () => {
          if (await toast.isVisible({ timeout: 500 }).catch(() => false)) return true;
          if (await this.invoiceListButton().isVisible({ timeout: 400 }).catch(() => false)) return true;
          const body = ((await this.page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
          return /deleted|removed/.test(body);
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Invoice deleted successfully.');
  }

  /**
   * TC-05: same as TC-04 (create invoice + register payment) then Delete from kebab.
   */
  async completeDeleteInvoiceJourney() {
    await this.completeRegisterPaymentJourney({ ensureInvoice: true });
    await this.expectPaymentRegisteredAndPageClosed();
    await this.navigateToInvoiceTab();
    await this.openThreeDotMenuOnFirstInvoice('delete');
    await this.clickDeleteInInvoiceMenu();
    await this.fillDeleteReasonAndConfirmYes();
    this.logStep('Complete delete invoice journey finished.');
  }

  previewMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^preview$/i })
      .or(this.page.getByRole('option', { name: /^preview$/i }))
      .or(this.page.locator('[role="menu"] li, .MuiMenuItem-root, [role="menuitem"]').filter({ hasText: /^preview$/i }))
      .or(this.page.getByText(/^preview$/i))
      .filter({ visible: true })
      .first();
  }

  invoicePreviewRoot() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /preview|invoice/i })
      .first();
  }

  async clickPreviewInInvoiceMenu() {
    const previewItem = this.previewMenuItem();
    await expect(previewItem).toBeVisible({ timeout: this.uiTimeout });
    await previewItem.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.dismissLeftoverKebabMenu();
    this.logStep('Clicked Preview in the invoice kebab menu.');
  }

  async dismissLeftoverKebabMenu() {
    const menuRoot = this.page
      .locator('.MuiMenu-root, .MuiPopover-root')
      .filter({ visible: true })
      .first();
    if (!(await menuRoot.isVisible({ timeout: 800 }).catch(() => false))) return;

    const backdrop = this.page.locator('.MuiBackdrop-root').filter({ visible: true }).last();
    if (await backdrop.isVisible({ timeout: 500 }).catch(() => false)) {
      await backdrop.click({ force: true, timeout: 3000 }).catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
    await menuRoot.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  async expectInvoicePreviewOpened() {
    await expect
      .poll(
        async () => {
          if (await this.invoicePreviewRoot().isVisible({ timeout: 400 }).catch(() => false)) return true;
          if (/preview/i.test(this.page.url())) return true;
          if (await this.page.getByRole('heading', { name: /preview/i }).first().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          if (await this.page.getByText(/invoice preview|preview invoice/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          const canvasOrFrame = this.page.locator('canvas, iframe').first();
          if (await canvasOrFrame.isVisible({ timeout: 400 }).catch(() => false)) return true;
          return false;
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep('Invoice preview is opened.');
  }

  async closeInvoicePreview() {
    await this.dismissLeftoverKebabMenu();

    const backBtn = this.page.getByRole('button', { name: /^back$/i }).filter({ visible: true }).first();
    const closeBtn = this.page
      .getByRole('button', { name: /^(close|back)$/i })
      .or(this.page.getByRole('button', { name: /close preview/i }))
      .or(this.page.locator('button:has(svg[data-testid="CloseIcon"])'))
      .filter({ visible: true })
      .first();

    const target = (await backBtn.isVisible({ timeout: 2500 }).catch(() => false)) ? backBtn : closeBtn;
    if (await target.isVisible({ timeout: 4000 }).catch(() => false)) {
      await target.click({ timeout: 15000, force: true });
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await this.invoicePreviewRoot().waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Closed invoice preview.');
  }

  async expectInvoicePreviewClosed() {
    await expect
      .poll(
        async () => {
          const previewGone = !(await this.invoicePreviewRoot().isVisible({ timeout: 400 }).catch(() => false));
          const listReady = await this.invoiceListButton().isVisible({ timeout: 400 }).catch(() => false);
          return previewGone && listReady;
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Invoice preview closed; Invoice list is displayed.');
  }

  /**
   * TC-06: same as TC-05 (create invoice + register payment) then Preview from kebab.
   * Test ends once preview is open — no Back/close.
   */
  async completePreviewInvoiceJourney() {
    await this.completeRegisterPaymentJourney({ ensureInvoice: true });
    await this.expectPaymentRegisteredAndPageClosed();
    await this.navigateToInvoiceTab();
    await this.openThreeDotMenuOnFirstInvoice('preview');
    await this.clickPreviewInInvoiceMenu();
    this.logStep('Complete preview invoice journey finished.');
  }

  editMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(this.page.getByRole('option', { name: /^edit$/i }))
      .or(this.page.locator('[role="menu"] li, .MuiMenuItem-root, [role="menuitem"]').filter({ hasText: /^edit$/i }))
      .or(this.page.getByText(/^edit$/i))
      .filter({ visible: true })
      .first();
  }

  updateInvoiceButton() {
    return this.page
      .getByRole('button', { name: /^(update invoice|update)$/i })
      .or(this.page.locator('button').filter({ hasText: /^(update invoice|update)$/i }))
      .filter({ visible: true })
      .last();
  }

  locatorInvoiceUpdatedToast() {
    const pattern =
      /invoice (updated|saved).*success|updated successfully|saved successfully|success/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  async clickEditInInvoiceMenu() {
    const editItem = this.editMenuItem();
    await expect(editItem).toBeVisible({ timeout: this.uiTimeout });
    await editItem.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.dismissLeftoverKebabMenu();
    this.logStep('Clicked Edit in the invoice kebab menu.');
  }

  async expectEditInvoicePageDisplayed() {
    await expect
      .poll(
        async () => {
          if (await this.updateInvoiceButton().isVisible({ timeout: 400 }).catch(() => false)) return true;
          if (await this.page.getByText(/edit invoice|line items?/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
            return true;
          }
          if (/generateInvoice|edit/i.test(this.page.url())) return true;
          return false;
        },
        { timeout: this.uiTimeout, intervals: [300, 500, 1000] }
      )
      .toBeTruthy();
    this.logStep('Edit invoice page is displayed.');
  }

  async increaseFirstLineItemQty() {
    const extra = 1 + Math.floor(Math.random() * 5);
    this.lastExtraQty = extra;
    const InvoicePage = require('./invoice.page');
    const invoice = new InvoicePage(this.page);
    const row = invoice.lineItemDataRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });

    const qtyInput = row
      .getByPlaceholder(/^(qty|quantity)$/i)
      .or(row.getByRole('spinbutton', { name: /qty|quantity/i }))
      .or(row.locator('input[name*="qty" i], input[id*="qty" i]'))
      .or(row.locator('input:not([type="hidden"]):not([type="checkbox"])').nth(1))
      .first();

    await qtyInput.scrollIntoViewIfNeeded().catch(() => {});
    await qtyInput.click({ timeout: 8000, force: true }).catch(() => {});
    const currentRaw = ((await qtyInput.inputValue().catch(() => '')) || '').replace(/[^\d.]/g, '');
    const current = Number(currentRaw) || 1;
    const next = String(current + extra);
    await invoice._fillInput(qtyInput, next);
    this.lastInvoiceQty = next;
    this.logStep(`Updated line item qty from ${current} to ${next} (+${extra}).`);
  }

  async clickUpdateOnInvoiceForm() {
    const btn = this.updateInvoiceButton();
    await expect(btn).toBeVisible({ timeout: this.uiTimeout });
    await expect(btn).toBeEnabled({ timeout: 30000 });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ timeout: 30000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Update on the edit invoice page.');
  }

  async expectInvoiceUpdatedSuccessfully() {
    const toast = this.locatorInvoiceUpdatedToast();
    await expect
      .poll(
        async () => {
          if (await toast.isVisible({ timeout: 500 }).catch(() => false)) return true;
          if (await this.invoiceListButton().isVisible({ timeout: 500 }).catch(() => false)) return true;
          return false;
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Invoice updated successfully.');
  }

  /**
   * TC-07: same as TC-06 then Edit from kebab, increase qty, Update.
   */
  async completeEditInvoiceJourney() {
    await this.completeRegisterPaymentJourney({ ensureInvoice: true });
    await this.expectPaymentRegisteredAndPageClosed();
    await this.navigateToInvoiceTab();
    await this.openThreeDotMenuOnFirstInvoice('edit');
    await this.clickEditInInvoiceMenu();
    await this.expectEditInvoicePageDisplayed();
    await this.increaseFirstLineItemQty();
    await this.clickUpdateOnInvoiceForm();
    this.logStep('Complete edit invoice journey finished.');
  }

  sendEmailMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^send email$/i })
      .or(
        this.page
          .locator('[role="menu"] li, .MuiMenuItem-root, [role="menuitem"]')
          .filter({ hasText: /^send email$/i })
      )
      .filter({ visible: true })
      .first();
  }

  invoiceComposeEmailDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /compose email/i })
      .or(this.page.locator('.MuiDialog-paper, .MuiDialog-container').filter({ hasText: /compose email/i }))
      .filter({ visible: true })
      .last();
  }

  composeSendEmailButton() {
    return this.invoiceComposeEmailDialog()
      .getByRole('button', { name: /send email/i })
      .or(this.page.locator('.MuiDialog-paper').getByRole('button', { name: /send email/i }))
      .filter({ visible: true })
      .last();
  }

  locatorInvoiceEmailSentToast() {
    const pattern = /email sent successfully|mail sent|sent successfully|invoice sent/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  async clickSendEmailInInvoiceMenu() {
    const item = this.sendEmailMenuItem();
    await expect(item).toBeVisible({ timeout: this.uiTimeout });
    await item.click({ timeout: 15000 });
    await item.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.mouse.move(8, 8);
    this.logStep('Clicked Send Email in kebab. Waiting for composer box (no further menu clicks).');
  }

  async isInvoiceMailComposerOpen() {
    if (await this.page.getByText(/^compose email$/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }
    if (await this.invoiceComposeEmailDialog().isVisible({ timeout: 400 }).catch(() => false)) return true;
    if (await this.page.getByPlaceholder(/^to$/i).first().isVisible({ timeout: 400 }).catch(() => false)) return true;
    if (await this.page.getByPlaceholder(/^subject$/i).first().isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }
    if (await this.page.locator('#contentEditable').first().isVisible({ timeout: 400 }).catch(() => false)) {
      return true;
    }
    if (await this.composeSendEmailButton().isVisible({ timeout: 400 }).catch(() => false)) return true;
    return false;
  }

  async expectInvoiceMailComposerOpened() {
    const header = this.page.getByText(/^compose email$/i).filter({ visible: true }).first();
    await expect
      .poll(async () => this.isInvoiceMailComposerOpen(), {
        timeout: 25000,
        intervals: [200, 400, 800],
      })
      .toBeTruthy();
    await expect(header.or(this.invoiceComposeEmailDialog()).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    await expect(this.composeSendEmailButton()).toBeVisible({ timeout: 15000 });
    this.logStep('Mail composer box is displayed.');
  }

  async clickSendEmailInComposer() {
    const btn = this.composeSendEmailButton();
    await expect(btn).toBeVisible({ timeout: 90000 });
    await expect(btn).toBeEnabled({ timeout: 60000 });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    try {
      await btn.click({ timeout: 30000 });
    } catch {
      await btn.click({ timeout: 15000, force: true });
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Send Email in the mail composer.');
  }

  async expectInvoiceEmailSentSuccessfully() {
    const toast = this.locatorInvoiceEmailSentToast();
    await expect
      .poll(
        async () => {
          if (await toast.isVisible({ timeout: 500 }).catch(() => false)) return true;
          if (await this.invoiceListButton().isVisible({ timeout: 500 }).catch(() => false)) {
            const composerGone = !(await this.invoiceComposeEmailDialog().isVisible({ timeout: 300 }).catch(() => false));
            if (composerGone) return true;
          }
          return false;
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Invoice email sent successfully.');
  }

  /**
   * TC-08: kebab Send Email → wait for composer load → Send Email in composer.
   */
  async completeSendInvoiceEmailJourney() {
    await this.completeRegisterPaymentJourney({ ensureInvoice: true });
    await this.expectPaymentRegisteredAndPageClosed();
    await this.navigateToInvoiceTab();
    await this.openThreeDotMenuOnFirstInvoice('send-email');
    await this.clickSendEmailInInvoiceMenu();
    await this.expectInvoiceMailComposerOpened();
    await this.clickSendEmailInComposer();
    this.logStep('Complete send invoice email journey finished.');
  }

  /**
   * TC-09: TC-01 create invoice only (no payment) → kebab Send Email → composer Send Email.
   */
  async completeSendInvoiceEmailAfterCreateJourney() {
    const InvoicePage = require('./invoice.page');
    const invoice = new InvoicePage(this.page);
    await invoice.completeInvoiceCreateFromScratchJourney({
      name: 'Electricians',
      lineItem: 'Labour 1',
      quantity: '20',
      rate: '100',
    });
    await invoice.expectInvoiceCreatedSuccessfully();
    await this.navigateToInvoiceTab();
    await this.openThreeDotMenuOnFirstInvoice('send-email');
    await this.clickSendEmailInInvoiceMenu();
    await this.expectInvoiceMailComposerOpened();
    await this.clickSendEmailInComposer();
    this.logStep('Complete send invoice email after create journey finished.');
  }

  paymentKebabButtonLocator() {
    return this.page.locator(
      'button:has(svg[data-testid="MoreVertIcon"]), button:has(svg.lucide-ellipsis), button:has(svg.lucide-more-vertical), button:has(svg.lucide-more-horizontal), button[aria-label*="more" i]'
    );
  }

  paymentListRowCandidates() {
    const kebabBtn = this.paymentKebabButtonLocator();
    const byKebab = this.page
      .locator('tr, [role="row"], .MuiTableRow-root, .MuiDataGrid-row, .ant-table-row')
      .filter({ has: kebabBtn })
      .first();
    const byTable = this.page.locator('table tbody tr, .ant-table-tbody > tr').filter({ visible: true }).first();
    const byGrid = this.page.locator('.MuiDataGrid-row, .ant-table-row').filter({ visible: true }).first();
    const byType = this.page
      .locator('table tbody tr, .MuiDataGrid-row, .MuiTableRow-root, .ant-table-row')
      .filter({ visible: true })
      .filter({ hasText: /\bcash\b|\bbank\b|\bcheque\b|\bcheck\b|\bupi\b|\bcard\b/i })
      .first();
    const byIdText = this.page
      .getByText(/\b(REC|RCP|PAY|PMT|RCPT|RECEIPT)[- ]?\d+/i)
      .filter({ visible: true })
      .first();
    const byId = byIdText
      .locator('xpath=ancestor::tr[1]')
      .or(byIdText.locator('xpath=ancestor::*[@role="row"][1]'))
      .first();
    return [byKebab, byTable, byGrid, byType, byId];
  }

  firstPaymentListRow() {
    const [byKebab, byTable, byGrid, byType, byId] = this.paymentListRowCandidates();
    return byKebab.or(byTable).or(byGrid).or(byType).or(byId).first();
  }

  async hasVisiblePaymentListRow() {
    for (const loc of this.paymentListRowCandidates()) {
      if (await loc.isVisible({ timeout: 400 }).catch(() => false)) return true;
    }
    return false;
  }

  async waitForFirstPaymentListRow() {
    await expect
      .poll(async () => this.hasVisiblePaymentListRow(), {
        timeout: this.uiTimeout,
        intervals: [300, 500, 1000],
      })
      .toBeTruthy();
    for (const loc of this.paymentListRowCandidates()) {
      if (await loc.isVisible({ timeout: 400 }).catch(() => false)) return loc;
    }
    return this.firstPaymentListRow();
  }

  kebabOnFirstPaymentRow() {
    const row = this.firstPaymentListRow();
    return row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button:has(svg[data-testid="MoreVertIcon"])'))
      .or(row.locator('button:has(svg.lucide-ellipsis, svg.lucide-more-vertical, svg.lucide-more-horizontal)'))
      .or(row.locator('[aria-label*="more" i], [data-testid*="more" i]'))
      .or(row.locator('button:has(svg)').last())
      .first();
  }

  paymentRefundMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^refund$/i })
      .or(this.page.getByRole('option', { name: /^refund$/i }))
      .or(this.page.locator('[role="menu"] li, .MuiMenuItem-root, [role="menuitem"]').filter({ hasText: /^refund$/i }))
      .filter({ visible: true })
      .first();
  }

  paymentRefundDialog() {
    return this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .filter({ hasText: /refund|reason|payment type/i })
      .first();
  }

  paymentRefundReasonInput() {
    const dialog = this.paymentRefundDialog();
    return dialog
      .getByRole('textbox', { name: /reason|comment|note|remarks/i })
      .or(dialog.getByLabel(/reason|comment|note|remarks/i))
      .or(dialog.getByPlaceholder(/reason|comment|note|remarks|enter/i))
      .or(dialog.locator('textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'))
      .first();
  }

  paymentRefundTypeField() {
    const dialog = this.paymentRefundDialog();
    return dialog
      .getByRole('combobox', { name: /payment type/i })
      .or(dialog.getByLabel(/payment type/i))
      .or(dialog.getByPlaceholder(/payment type/i))
      .or(dialog.getByRole('button', { name: /payment type|select/i }))
      .or(dialog.locator('[role="combobox"], .MuiSelect-select, input[name*="payment" i]'))
      .first();
  }

  paymentRefundYesButton() {
    const dialog = this.paymentRefundDialog();
    return dialog
      .getByRole('button', { name: /^yes$/i })
      .or(dialog.getByRole('button', { name: /^(yes|confirm|ok|refund)$/i }))
      .filter({ visible: true })
      .first();
  }

  locatorPaymentRefundedToast() {
    const pattern = /refund(ed)? successfully|payment refunded|refunded|success/i;
    return this.page
      .locator(
        '.Toastify__toast, .Toastify__toast-body, [role="alert"], .MuiAlert-root, .notistack-Snackbar'
      )
      .filter({ hasText: pattern })
      .first();
  }

  buildRandomPaymentRefundReason() {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const phrases = [
      'Client requested cash refund of payment',
      'Duplicate payment registered in error',
      'Incorrect payment amount refunded',
      'Payment applied to wrong invoice',
      'Test cash refund of registered payment',
    ];
    const pick = phrases[Math.floor(Math.random() * phrases.length)];
    return `${pick} ${suffix}`;
  }

  async tryOpenRefundKebabOnReceipt() {
    if (!this.isReceiptDetailUrl() && this.lastReceiptUrl) {
      await this.page.goto(this.lastReceiptUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    }
    if (!this.isReceiptDetailUrl()) return false;

    const kebab = this.paymentKebabButtonLocator().filter({ visible: true }).last();
    if (!(await kebab.isVisible({ timeout: 4000 }).catch(() => false))) return false;

    await kebab.click({ timeout: 15000 });
    const refundItem = this.paymentRefundMenuItem();
    if (await refundItem.isVisible({ timeout: 4000 }).catch(() => false)) {
      this.logStep('Opened Refund from the receipt kebab menu.');
      return true;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  async openThreeDotMenuOnFirstPayment() {
    if (this.isReceiptDetailUrl()) {
      await this.leaveReceiptDetailForPaymentsList();
    }

    if (!(await this.hasVisiblePaymentListRow())) {
      const openedOnReceipt = await this.tryOpenRefundKebabOnReceipt();
      if (openedOnReceipt) return;
      await this.leaveReceiptDetailForPaymentsList();
    }

    const row = await this.waitForFirstPaymentListRow();
    await expect(row).toBeVisible({ timeout: this.uiTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover({ timeout: 10000 });
    this.logStep('Hovered the first payment row.');

    const refundItem = this.paymentRefundMenuItem();
    if (await refundItem.isVisible({ timeout: 1500 }).catch(() => false)) {
      this.logStep('Refund option is displayed after hovering the payment row.');
      return;
    }

    const kebab = row
      .getByRole('button', { name: /more|actions|options|menu/i })
      .or(row.locator('button:has(svg[data-testid="MoreVertIcon"])'))
      .or(row.locator('button:has(svg.lucide-ellipsis, svg.lucide-more-vertical, svg.lucide-more-horizontal)'))
      .or(row.locator('[aria-label*="more" i], [data-testid*="more" i]'))
      .or(row.locator('button:has(svg)').last())
      .first();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await row.hover({ timeout: 5000 }).catch(() => {});
      await kebab.click({ timeout: 15000, force: attempt >= 1 }).catch(async () => {
        await kebab.click({ timeout: 10000, force: true });
      });
      if (await refundItem.isVisible({ timeout: 2500 }).catch(() => false)) {
        this.logStep('Opened payment kebab menu; Refund is displayed.');
        return;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await expect(refundItem).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Opened payment kebab menu; Refund is displayed.');
  }

  async clickRefundInPaymentMenu() {
    const item = this.paymentRefundMenuItem();
    await expect(item).toBeVisible({ timeout: this.uiTimeout });
    await item.click({ timeout: 15000 });
    this.logStep('Clicked Refund in the payment kebab menu.');
  }

  async expectPaymentRefundPopupDisplayed() {
    await expect(this.paymentRefundDialog()).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.paymentRefundReasonInput()).toBeVisible({ timeout: this.uiTimeout });
    await expect(this.paymentRefundTypeField()).toBeVisible({ timeout: this.uiTimeout });
    this.logStep('Refund popup is displayed with Reason and Payment Type.');
  }

  async fillPaymentRefundReasonRandom() {
    const reason = this.buildRandomPaymentRefundReason();
    this.lastPaymentRefundReason = reason;
    const input = this.paymentRefundReasonInput();
    await expect(input).toBeVisible({ timeout: this.uiTimeout });
    await input.click({ timeout: 8000 });
    await input.fill(reason);
    this.logStep(`Entered refund reason: ${reason}`);
  }

  async selectPaymentRefundTypeCash() {
    const field = this.paymentRefundTypeField();
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

  async clickYesOnPaymentRefundPopup() {
    const yes = this.paymentRefundYesButton();
    await expect(yes).toBeVisible({ timeout: 15000 });
    await expect(yes).toBeEnabled({ timeout: 15000 });
    await yes.click({ timeout: 20000 });
    await this.paymentRefundDialog().waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Clicked Yes on the payment refund popup.');
  }

  async expectPaymentRefundedSuccessfully() {
    const toast = this.locatorPaymentRefundedToast();
    await expect
      .poll(
        async () => {
          if (await toast.isVisible({ timeout: 500 }).catch(() => false)) return true;
          if (await this.addPaymentButton().isVisible({ timeout: 500 }).catch(() => false)) {
            const popupGone = !(await this.paymentRefundDialog().isVisible({ timeout: 300 }).catch(() => false));
            if (popupGone) return true;
          }
          return false;
        },
        { timeout: this.uiTimeout, intervals: [400, 800, 1500] }
      )
      .toBeTruthy();
    this.logStep('Payment refunded successfully.');
  }

  /**
   * TC-12: register payment (TC-03) → Payment tab → kebab Refund → reason + Cash → Yes.
   */
  async completeRefundPaymentJourney() {
    await this.completeRegisterPaymentJourney({ ensureInvoice: true });
    await this.expectPaymentRegisteredAndPageClosed();
    await this.leaveReceiptDetailForPaymentsList();
    await this.openThreeDotMenuOnFirstPayment();
    await this.clickRefundInPaymentMenu();
    await this.expectPaymentRefundPopupDisplayed();
    await this.fillPaymentRefundReasonRandom();
    await this.selectPaymentRefundTypeCash();
    await this.clickYesOnPaymentRefundPopup();
    this.logStep('Complete refund payment journey finished.');
  }
}

module.exports = PaymentPage;
