const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/**
 * PO create: Terms & Conditions via Choose from Template (first row + Add).
 * Same navigation as purchase-order-terms-and-conditions-po; no manual T&C typing.
 *
 * Headed runs: pauses between T&C steps so clicks are visible. Env:
 *   PO_TERMS_TEMPLATE_DEMO_DELAY_MS — ms between beats (default 550). Set 0 for CI / max speed.
 */
class PurchaseOrderDefaultTermsTemplatePoPage extends PurchaseOrderCreatePoPage {
  termsTemplateDemoDelayMs() {
    const raw = process.env.PO_TERMS_TEMPLATE_DEMO_DELAY_MS;
    if (raw === undefined || raw === '') {
      return 550;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      return 550;
    }
    return Math.max(0, Math.min(8000, n));
  }

  async pauseTermsTemplateDemo() {
    const ms = this.termsTemplateDemoDelayMs();
    if (ms > 0) {
      await this.page.waitForTimeout(ms);
    }
  }

  termsHeading() {
    return this.page
      .getByText(/terms\s*(and|&)\s*conditions?/i)
      .filter({ visible: true })
      .first();
  }

  /**
   * No text is typed into the T&C editor — only Choose from template → first row → Add.
   */
  async addPurchaseOrderTermsFromFirstTemplate() {
    await expect(this.page).toHaveURL(/purchase-order\/(create|edit)/);
    await this.waitForNetworkSettled();

    const heading = this.termsHeading();
    await this.scrollPurchaseOrderPageToRevealTermsSection(heading);
    await expect(heading).toBeVisible({ timeout: 90000 });
    await heading.scrollIntoViewIfNeeded();
    await this.pauseTermsTemplateDemo();

    await this.page.keyboard.press('Escape').catch(() => {});

    const termsBlock = this.page
      .locator('div')
      .filter({
        has: this.page.getByText(/terms\s*(and|&)\s*conditions?/i),
      })
      .filter({
        has: this.page.getByRole('button', { name: /choose from template/i }),
      })
      .first();

    let chooseTemplate = termsBlock
      .getByRole('button', { name: /choose from template/i })
      .first();
    if (!(await chooseTemplate.isVisible({ timeout: 5000 }).catch(() => false))) {
      chooseTemplate = this.page
        .getByRole('button', { name: /choose from template/i })
        .first();
    }

    await expect(chooseTemplate).toBeVisible({ timeout: 60000 });
    await chooseTemplate.scrollIntoViewIfNeeded();
    await this.pauseTermsTemplateDemo();
    await chooseTemplate.click({ timeout: 20000, force: true });

    let modal = this.page.getByRole('dialog').filter({ visible: true }).last();
    if (!(await modal.isVisible({ timeout: 5000 }).catch(() => false))) {
      modal = this.page.locator('.MuiModal-root').filter({ visible: true }).last();
    }
    await expect(modal).toBeVisible({ timeout: 45000 });
    await this.pauseTermsTemplateDemo();

    const skeleton = modal.locator('.MuiSkeleton-root').first();
    if (await skeleton.isVisible({ timeout: 2500 }).catch(() => false)) {
      await skeleton.waitFor({ state: 'hidden', timeout: 90000 });
    }

    const noData = modal.getByText(/no data found|no templates/i);
    if (await noData.isVisible({ timeout: 4000 }).catch(() => false)) {
      throw new Error(
        'Terms template modal has no rows. Add a terms template in admin templates first.'
      );
    }

    let firstRadio = modal.getByRole('radio').first();
    if (!(await firstRadio.isVisible({ timeout: 5000 }).catch(() => false))) {
      firstRadio = modal.locator('table tbody input[type="radio"]').first();
    }
    await firstRadio.waitFor({ state: 'visible', timeout: 60000 });
    await firstRadio.scrollIntoViewIfNeeded();
    await this.pauseTermsTemplateDemo();
    try {
      await firstRadio.check({ timeout: 15000 });
    } catch {
      await firstRadio.click({ force: true });
    }
    await expect(firstRadio).toBeChecked({ timeout: 15000 });
    await this.pauseTermsTemplateDemo();

    const addBtn = modal.getByRole('button', { name: /^add$/i }).first();
    await expect(addBtn).toBeEnabled({ timeout: 20000 });
    await this.pauseTermsTemplateDemo();
    await addBtn.click();

    await expect(modal).toBeHidden({ timeout: 45000 }).catch(() => {});
    await this.waitForNetworkSettled();
  }
}

module.exports = PurchaseOrderDefaultTermsTemplatePoPage;
