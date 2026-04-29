const { expect } = require('@playwright/test');
const RfqSendReminderPage = require('../create-rfq/rfq-send-reminder.page');

/**
 * RFQ list flow after vendor price update: open the created RFQ card menu and launch compare vendor price.
 */
class RfqCompareVendorPricePage extends RfqSendReminderPage {
  menuPaperFromOpenCard() {
    return this.page.locator('.MuiPopover-root').filter({ visible: true }).locator('.MuiPaper-root').last();
  }

  async clickCompareVendorPriceInRfqCardMenu() {
    const p = this.page;
    const paper = this.menuPaperFromOpenCard();

    const candidates = [
      paper
        .getByRole('menuitem', { name: /compare vendor price|compare price|vendor price comparison/i })
        .first(),
      paper.getByText(/compare vendor price|compare price|vendor price comparison/i).first(),
      p
        .getByRole('menuitem', { name: /compare vendor price|compare price|vendor price comparison/i })
        .filter({ visible: true })
        .first(),
      p
        .getByText(/compare vendor price|compare price|vendor price comparison/i)
        .filter({ visible: true })
        .first(),
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
        'RFQ compare vendor price: "Compare vendor price" was not visible in the RFQ card menu. Open the created RFQ card menu first.'
      );
    }

    await target.click({ timeout: 15000, force: true }).catch(async () => {
      await target.click({ timeout: 15000, force: true });
    });

    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  }

  async clickCompareVendorPriceButtonOnCreatedRfqCard(titleText) {
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    const card = await this.resolveCreatedRfqCardForReminder(titleText);
    await expect(card).toBeVisible({ timeout: 60000 });
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await card.hover({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(350);

    const p = this.page;
    const compareButton = card
      .getByRole('button', { name: /compare vendor price|compare price/i })
      .filter({ visible: true })
      .first()
      .or(
        card
          .locator('button, a[role="button"], a')
          .filter({ hasText: /compare vendor price|compare price/i })
          .filter({ visible: true })
          .first()
      )
      .or(
        card
          .locator(
            'button.MuiButton-containedPrimary, button.MuiButton-contained, button[class*="primary"], button[class*="blue"]'
          )
          .filter({ visible: true })
          .first()
      );

    let target = null;
    if (await compareButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      target = compareButton;
    }

    if (!target) {
      throw new Error(
        'RFQ compare vendor price: could not find the blue "Compare Vendor Price" button on the created RFQ card.'
      );
    }

    await expect(target).toBeVisible({ timeout: 45000 });

    const beforeUrl = p.url();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await target.click({ timeout: 15000, force: attempt > 0 }).catch(async () => {
        await target.click({ timeout: 15000, force: true });
      });
      // eslint-disable-next-line no-await-in-loop
      await p.waitForTimeout(450);

      // eslint-disable-next-line no-await-in-loop
      // eslint-disable-next-line no-await-in-loop
      const urlChanged = p.url() !== beforeUrl;
      if (urlChanged) break;
    }

    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    await p.waitForTimeout(1200);
  }

  async closeCompareVendorPricePage(titleText) {
    const p = this.page;
    const closeCandidates = [
      p.getByRole('button', { name: /^close$/i }).filter({ visible: true }).first(),
      p.getByRole('button', { name: /back/i }).filter({ visible: true }).first(),
      p.getByRole('link', { name: /back/i }).filter({ visible: true }).first(),
      p.locator('button:has(svg[data-testid="CloseIcon"])').filter({ visible: true }).first(),
      p.locator('button:has(svg[data-testid="ArrowBackIcon"])').filter({ visible: true }).first(),
      p.locator('button:has(svg[data-testid="ChevronLeftIcon"])').filter({ visible: true }).first(),
      p.locator('button[aria-label*="close" i], button[aria-label*="back" i]').filter({ visible: true }).first(),
      p.locator('a[aria-label*="back" i]').filter({ visible: true }).first(),
    ];

    for (const candidate of closeCandidates) {
      if (await candidate.isVisible({ timeout: 1200 }).catch(() => false)) {
        await candidate.click({ timeout: 10000, force: true }).catch(async () => {
          await candidate.click({ timeout: 10000, force: true });
        });
        await p.waitForLoadState('domcontentloaded').catch(() => {});
        await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        break;
      }
    }

    const card = await this.resolveCreatedRfqCardForReminder(titleText);
    const cardVisible = await card.isVisible({ timeout: 1500 }).catch(() => false);
    if (!cardVisible) {
      await p.goBack({ timeout: 60000 }).catch(() => {});
      await p.waitForLoadState('domcontentloaded').catch(() => {});
      await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    }

    await expect(card).toBeVisible({ timeout: 60000 });
  }
}

module.exports = {
  RfqCompareVendorPricePage,
};
