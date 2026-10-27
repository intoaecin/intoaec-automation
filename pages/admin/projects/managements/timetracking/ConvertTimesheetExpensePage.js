const { expect } = require('@playwright/test');
const TimeTrackingPage = require('./TimeTrackingPage');

class ConvertTimesheetExpensePage extends TimeTrackingPage {
  constructor(page) {
    super(page);

    this.convertToExpenseMenuItem = page
      .getByRole('menuitem', { name: /convert\s*(to|as)?\s*expense/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /convert\s*(to|as)?\s*expense/i }))
      .first();
    this.convertToExpenseButton = page
      .getByRole('button', { name: /convert\s*(to|as)?\s*expense/i })
      .or(page.locator('button').filter({ hasText: /convert\s*(to|as)?\s*expense/i }))
      .first();
    this.convertConfirmButton = page
      .getByRole('dialog')
      .getByRole('button', { name: /convert|confirm|yes|ok|proceed|continue|submit|create/i })
      .or(page.getByRole('button', { name: /convert|confirm|yes|ok|proceed|continue|submit|create/i }))
      .first();
    this.convertDialog = page.getByRole('dialog').first();
    this.expenseTypeDropdown = this.convertDialog
      .getByRole('combobox')
      .or(this.convertDialog.locator('div[role="combobox"][aria-haspopup="listbox"]'))
      .or(this.convertDialog.locator('label:has-text("Select payment type")').locator('xpath=following::div[@role="combobox"][1]'))
      .or(this.convertDialog.getByText('Select payment type').locator('xpath=following::div[@role="combobox"][1]'))
      .first();
    this.expenseTypeOptions = page.locator('[role="listbox"] [role="option"]');
    this.toastifyMessage = page.locator('.Toastify__toast, .Toastify__toast-body, .MuiAlert-root, .MuiSnackbar-root, [role="alert"]');

    this.billsExpensesLink = page
      .locator('p.MuiTypography-body1:has-text("Bills & Expenses"), p.MuiTypography-body1:has-text("Bills Expenses"), p:has-text("Bills & Expenses"), p:has-text("Bills Expenses")')
      .first();
    this.financialLink = page
      .locator('p.MuiTypography-body1:has-text("Financial"), p:has-text("Financial")')
      .first();
    this.lastSelectedExpenseType = null;
    this.lastToastMessage = null;
    this.lastExpectedExpenseDate = null;
  }

  async fillMandatoryFieldsWithCost() {
    const pastDays = Number(process.env.TIMESHEET_PAST_DAYS || 0);
    this.lastExpectedExpenseDate = this.formatDateWithinAllowedRange(pastDays, 'MM/DD/YYYY');
    await this.fillMandatoryFields();
    await this.updateCostWithRandomValue();
  }

  async openTimesheetActionsMenu() {
    const row = this.timesheetTableRows.first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    await expect(this.rowActionButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.rowActionButton.click();
    await expect(this.actionMenu).toBeVisible({ timeout: this.defaultTimeout });
  }

  async convertCreatedTimesheetToExpense() {
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(1000);

    try {
      await this.openTimesheetActionsMenu();
      if (await this.convertToExpenseMenuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.convertToExpenseMenuItem.click();
      } else {
        throw new Error('Convert to expense menu item not visible in row actions.');
      }
    } catch {
      if (await this.convertToExpenseButton.isVisible({ timeout: 8000 }).catch(() => false)) {
        await this.convertToExpenseButton.click();
      } else {
        throw new Error('Could not find a Convert to Expense action for the created timesheet.');
      }
    }
  }

  async confirmTimesheetExpenseConversion() {
    await this.page.waitForTimeout(800);
    await this.selectExpenseTypeOption();
    if (await this.convertConfirmButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.convertConfirmButton.click();
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Confirmed Convert to Expense.');
    } else {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] No convert confirmation button — continuing.');
    }
    await this.captureConversionToastMessage();
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
  }

  async selectExpenseTypeOption() {
    if (!(await this.expenseTypeDropdown.isVisible({ timeout: 10000 }).catch(() => false))) {
      // eslint-disable-next-line no-console
      console.log('[Time Tracking] Expense type dropdown not shown — skipping.');
      return;
    }

    await this.expenseTypeDropdown.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await this.expenseTypeDropdown.click({ timeout: 10000 });
    } catch {
      await this.expenseTypeDropdown.click({ force: true });
    }

    await expect(async () => {
      expect(await this.expenseTypeOptions.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 15000, intervals: [300, 700, 1200] });

    const options = await this.expenseTypeOptions.count();
    const index = Math.floor(Math.random() * options);
    const option = this.expenseTypeOptions.nth(index);
    this.lastSelectedExpenseType = ((await option.textContent().catch(() => '')) || '').trim();
    await option.click();
    await this.page.waitForTimeout(500);
    // eslint-disable-next-line no-console
    console.log(`[Time Tracking] Selected expense type: ${this.lastSelectedExpenseType}`);
  }

  async openBillsAndExpenses() {
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
    if (await this.billsExpensesLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.billsExpensesLink.click();
      return;
    }

    if (await this.financialLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.financialLink.click();
      await this.page.waitForTimeout(1000);
      if (await this.billsExpensesLink.isVisible({ timeout: 8000 }).catch(() => false)) {
        await this.billsExpensesLink.click();
        return;
      }
    }

    throw new Error('Could not navigate to Bills & Expenses.');
  }

  async captureConversionToastMessage() {
    const toast = this.toastifyMessage
      .filter({ hasText: /expense|converted|successfully|created/i })
      .first();

    if (await toast.isVisible({ timeout: 15000 }).catch(() => false)) {
      this.lastToastMessage = ((await toast.textContent().catch(() => '')) || '').trim();
    }
  }

  buildAmountRegex(value) {
    if (!value) return null;
    const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:Rs\\.?\\s*|INR\\s*|\\$\\s*)?${escaped}(?:\\.00)?`, 'i');
  }

  buildDateRegex(value) {
    if (!value) return null;
    const [mm, dd, yyyy] = String(value).split('/');
    if (!mm || !dd || !yyyy) return new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`${mm}[/-]${dd}[/-]${yyyy}|${dd}[/-]${mm}[/-]${yyyy}`, 'i');
  }

  async verifyTimesheetConvertedToExpenseSuccessfully() {
    // Live toast may have already dismissed — re-check + use captured message.
    const liveToast = this.toastifyMessage
      .filter({ hasText: /expense|converted|successfully|created/i })
      .first();
    if (!this.lastToastMessage && (await liveToast.isVisible({ timeout: 5000 }).catch(() => false))) {
      this.lastToastMessage = ((await liveToast.textContent().catch(() => '')) || '').trim();
    }

    await expect(async () => {
      const toastOk =
        (Boolean(this.lastToastMessage) &&
          /expense|converted|successfully|created/i.test(this.lastToastMessage)) ||
        (await liveToast.isVisible().catch(() => false));

      const selectedExpenseTypeVisible = this.lastSelectedExpenseType
        ? await this.page
            .getByText(new RegExp(this.lastSelectedExpenseType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
            .first()
            .isVisible()
            .catch(() => false)
        : false;

      // Optional deeper checks only when this run created the timesheet with known data.
      const descriptionVisible = this.lastCreatedDescription
        ? await this.page.getByText(this.lastCreatedDescription, { exact: false }).first().isVisible().catch(() => false)
        : null;

      const amountRegex = this.buildAmountRegex(this.lastRandomCost);
      const amountVisible = amountRegex
        ? await this.page.getByText(amountRegex).first().isVisible().catch(() => false)
        : null;

      const dateRegex = this.buildDateRegex(this.lastExpectedExpenseDate);
      const dateVisible = dateRegex
        ? await this.page.getByText(dateRegex).first().isVisible().catch(() => false)
        : null;

      expect(toastOk || selectedExpenseTypeVisible).toBeTruthy();
      if (descriptionVisible !== null) expect(descriptionVisible || selectedExpenseTypeVisible).toBeTruthy();
      if (amountVisible !== null) expect(amountVisible).toBeTruthy();
      if (dateVisible !== null) expect(dateVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });

    // eslint-disable-next-line no-console
    console.log(
      `[Time Tracking] Converted to expense successfully` +
        (this.lastSelectedExpenseType ? ` (type: ${this.lastSelectedExpenseType})` : '') +
        (this.lastToastMessage ? ` — ${this.lastToastMessage}` : '')
    );
  }
}

module.exports = ConvertTimesheetExpensePage;
