const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');

/**
 * Project → Financial → Bills & Expenses (verify wage-converted expenses).
 */
class BillsExpensesPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
  }

  logStep(msg) {
    // eslint-disable-next-line no-console
    console.log(`[BillsExpensesPage] ${msg}`);
  }

  async openBillsAndExpensesFromProject() {
    const financial = this.page
      .getByText(/^financial$|bills\s*(&|and)\s*expenses?/i)
      .or(this.page.getByRole('button', { name: /bills|expenses|financial/i }))
      .filter({ visible: true })
      .first();

    if (await financial.isVisible({ timeout: 8000 }).catch(() => false)) {
      await financial.click({ timeout: 20000 });
    }

    const bills = this.page
      .getByText(/bills\s*(&|and)\s*expenses?/i)
      .or(this.page.getByRole('tab', { name: /bills|expenses/i }))
      .filter({ visible: true })
      .first();
    if (await bills.isVisible({ timeout: 8000 }).catch(() => false)) {
      await bills.click({ timeout: 20000 });
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    this.logStep('Opened Bills and Expenses');
  }

  async expectExpenseVisibleByName(name) {
    const escaped = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escaped) {
      await expect(
        this.page.locator('tr, [role="row"]').filter({ visible: true }).first()
      ).toBeVisible({ timeout: this.defaultTimeout });
      this.logStep('Bills/Expenses list has rows');
      return;
    }
    await expect(
      this.page.getByText(new RegExp(escaped, 'i')).filter({ visible: true }).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    this.logStep(`Expense visible: ${name}`);
  }
}

module.exports = BillsExpensesPage;
