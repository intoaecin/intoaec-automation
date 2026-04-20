const { expect } = require('@playwright/test');
const RfqSendReminderPage = require('../create-rfq/rfq-send-reminder.page');
const RFQComposePage = require('../create-rfq/rfq-compose.page');

/**
 * RFQ list flow after vendor price update: open the created RFQ card menu, convert it to WO,
 * then fill the work order title on the resulting create page.
 */
class RfqVendorToWorkOrderPage extends RfqSendReminderPage {
  buildRandomWorkOrderTitle() {
    const suffix = Math.random().toString(36).slice(2, 8);
    return `WO from RFQ ${new Date().toISOString().slice(0, 10)} ${suffix}`;
  }

  menuPaperFromOpenCard() {
    return this.page.locator('.MuiPopover-root').filter({ visible: true }).locator('.MuiPaper-root').last();
  }

  async clickConvertToWoInRfqCardMenu() {
    const p = this.page;
    const paper = this.menuPaperFromOpenCard();

    const candidates = [
      paper.getByRole('menuitem', { name: /convert to wo|convert to work order/i }).first(),
      paper.getByText(/convert to wo|convert to work order/i).first(),
      p
        .getByRole('menuitem', { name: /convert to wo|convert to work order/i })
        .filter({ visible: true })
        .first(),
      p.getByText(/convert to wo|convert to work order/i).filter({ visible: true }).first(),
    ];

    let target = null;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 4000 }).catch(() => false)) {
        target = candidate;
        break;
      }
    }

    if (!target) {
      throw new Error(
        'RFQ vendor to WO: "Convert to WO" was not visible in the RFQ card menu. Open the created RFQ card menu first.'
      );
    }

    await target.click({ timeout: 15000, force: true }).catch(async () => {
      await target.click({ timeout: 15000, force: true });
    });

    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  }

  async expectWorkOrderPageAfterConvert() {
    const p = this.page;
    const woSignals = [
      p.getByText(/work order/i).first(),
      p.getByRole('heading', { name: /work order/i }).first(),
      p.locator('main').getByText(/work order/i).first(),
      p.locator('body').getByText(/work order/i).first(),
    ];

    await expect
      .poll(
        async () => {
          const url = p.url();
          if (/work-order|workorder/i.test(url)) {
            return true;
          }

          for (const signal of woSignals) {
            // eslint-disable-next-line no-await-in-loop
            if (await signal.isVisible({ timeout: 800 }).catch(() => false)) {
              return true;
            }
          }

          return false;
        },
        { timeout: 120000, intervals: [200, 400, 800, 1200, 2000] }
      )
      .toBe(true);
  }

  async fillRandomWorkOrderTitleAfterConvert() {
    const title = this.buildRandomWorkOrderTitle();
    const p = this.page;

    const candidates = [
      p.locator('input[name="estimation name"]').first(),
      p.getByRole('textbox', { name: /work order title|title|name/i }).first(),
      p.getByLabel(/work order title|title|name/i).first(),
      p.getByPlaceholder(/work order title|title|name/i).first(),
      p.locator('input:not([type="hidden"])').filter({ visible: true }).first(),
    ];

    let field = null;
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 5000 }).catch(() => false)) {
        field = candidate;
        break;
      }
    }

    if (!field) {
      throw new Error(
        'RFQ vendor to WO: could not find a visible work order title input after conversion.'
      );
    }

    await field.scrollIntoViewIfNeeded().catch(() => {});
    await field.click({ timeout: 10000 }).catch(() => {});
    await field.fill('').catch(() => {});
    await field.fill(title);

    await expect
      .poll(async () => (await field.inputValue().catch(() => '')).trim(), {
        timeout: 15000,
        intervals: [200, 400, 800],
      })
      .toBe(title);

    // Let WO screen finish any autosave/state updates before Action clicks.
    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(400);

    return title;
  }

  async composeAndSendEmailFromConvertedWorkOrder() {
    // WO create screens use the same Procurement Action → Compose email pattern.
    const wo = new RFQComposePage(this.page);
    await wo.waitForNetworkSettled();
    await wo.dismissVisibleToastNotifications();
    await wo.dismissOpenMenusAndPopovers();
    await wo.scrollRfqPageAndMainToTop();

    // Action -> Compose email can be flaky while the page is still settling; retry it.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await wo.openActionMenuAndComposeEmail();
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        // eslint-disable-next-line no-await-in-loop
        await wo.dismissOpenMenusAndPopovers();
        // eslint-disable-next-line no-await-in-loop
        await wo.dismissVisibleToastNotifications();
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(600);
      }
    }

    await wo.waitForComposeEmailModalReady();
    await wo.sendEmailFromRfqComposeModal();
  }

  async expectConvertedWorkOrderEmailSentToast() {
    const wo = new RFQComposePage(this.page);
    await expect(wo.locatorEmailSentSuccessToast()).toBeVisible({ timeout: 90000 });
  }
}

module.exports = {
  RfqVendorToWorkOrderPage,
};
