const { expect } = require('@playwright/test');
const WorkOrderActionCreatePage = require('./work-order-action-create.page');

/** Work Order create: check Ship to address, then Action → Create. */
class WorkOrderShipToPage extends WorkOrderActionCreatePage {
  /**
   * Clicks or checks the Ship to address control (checkbox, label, or link) on the WO form.
   */
  async checkShipToAddressOnWorkOrderForm() {
    await expect(this.page).toHaveURL(/work[-_]?order\/(create|edit)/i);
    await this.waitForWoUiSettled();
    await this.dismissVisibleToastNotifications().catch(() => {});

    let target = this.page
      .getByText(/ship\s*to\s*address/i)
      .filter({ visible: true })
      .first();

    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page.getByRole('checkbox', { name: /ship\s*to/i }).first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page.getByRole('button', { name: /ship\s*to/i }).first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page.getByRole('link', { name: /ship\s*to/i }).first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      target = this.page
        .locator('span.pointer, a, button')
        .filter({ hasText: /ship\s*to/i })
        .first();
    }
    if (!(await target.isVisible({ timeout: 3000 }).catch(() => false))) {
      const label = this.page.getByText(/^ship\s*to$/i).filter({ visible: true }).first();
      if (await label.isVisible({ timeout: 3000 }).catch(() => false)) {
        target = label
          .locator(
            'xpath=ancestor-or-self::*[self::label or self::div or self::span][1]'
          )
          .locator('xpath=.//input[@type="checkbox"][1]')
          .first();
      }
    }
    if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
      const shipText = this.page.getByText(/ship\s*to/i).filter({ visible: true }).first();
      if (await shipText.isVisible({ timeout: 3000 }).catch(() => false)) {
        target = shipText
          .locator('xpath=./following::input[@type="checkbox"][1]')
          .first();
      }
    }
    if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
      target = this.page.getByRole('checkbox', { name: /ship\s*to/i }).first();
    }

    await expect(target).toBeVisible({ timeout: this.woUiTimeout });
    await target.scrollIntoViewIfNeeded();

    const tagName = await target.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    const inputType = await target.getAttribute('type').catch(() => null);

    if (tagName === 'input' && inputType === 'checkbox') {
      if (!(await target.isChecked().catch(() => false))) {
        try {
          await target.check({ timeout: 10000 });
        } catch {
          await target.click({ force: true });
        }
      }
    } else {
      await target.click({ timeout: 15000 });
    }

    await this.waitForWoUiSettled();
    // eslint-disable-next-line no-console
    console.log('[WO ship-to] Checked Ship to address on work order form.');
  }

  /**
   * Login → WO create → manual line item → vendor → ship to address → Action → Create.
   */
  async completeWorkOrderActionCreateWithShipToJourney(title = 'electrician') {
    await this.navigateToWorkOrderModuleForFirstProject();
    await this.prepareWorkOrderListForCreateClick();
    await this.clickCreateWorkOrderButton({ skipListPrep: true });
    await this.completeWorkOrderCreateEntryIfNeeded();
    await this.fillWorkOrderTitle(title);
    await this.addWorkOrderLineItemManuallyWithRandomDetails();
    await this.addWorkOrderVendorFromModal();
    await this.checkShipToAddressOnWorkOrderForm();
    await this.openActionMenuAndChooseCreate();
    // eslint-disable-next-line no-console
    console.log('[WO] Complete create → ship to → Action → Create flow finished.');
  }
}

module.exports = WorkOrderShipToPage;
