const { expect } = require('@playwright/test');
const RfqPreviewPage = require('./rfq-preview.page');

/**
 * RFQ list flow: after compose-send, expand the created card, open the kebab menu,
 * choose Send reminder, then send the reminder email from the compose dialog.
 */
class RfqSendReminderPage extends RfqPreviewPage {
  reminderListTimeout() {
    return Number(process.env.RFQ_SEND_REMINDER_LIST_TIMEOUT_MS) || 180000;
  }

  resolveTargetTitle(titleText) {
    return String(titleText || process.env.RFQ_PREVIEW_TITLE || '').trim();
  }

  async resolveCreatedRfqCardForReminder(titleText) {
    if (process.env.RFQ_LIST_SELECT_FIRST_CARD === 'true') {
      return this.rfqListFirstCard();
    }
    const title = this.resolveTargetTitle(titleText);
    if (title) {
      const byTitle = this.rfqListCardForTitle(title);
      if (await byTitle.isVisible({ timeout: 4000 }).catch(() => false)) {
        return byTitle;
      }
    }
    return this.rfqListFirstCard();
  }

  async waitForCreatedRfqCardOnList(titleText) {
    if (process.env.RFQ_LIST_SELECT_FIRST_CARD === 'true') {
      await this.waitForNetworkSettled();
      await this.dismissVisibleToastNotifications();
      await this.dismissOpenMenusAndPopovers();
      await expect(this.rfqListFirstCard()).toBeVisible({
        timeout: this.reminderListTimeout(),
      });
      return;
    }
    const title = this.resolveTargetTitle(titleText);
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    if (title) {
      const listCard = this.rfqListCardForTitle(title);
      await expect
        .poll(async () => listCard.count(), {
          timeout: this.reminderListTimeout(),
          intervals: [150, 250, 400, 700, 1000, 1500],
          message: `RFQ reminder: created RFQ card for "${title}" did not appear on the list.`,
        })
        .toBeGreaterThan(0);

      await expect(listCard).toBeVisible({ timeout: 60000 });
      return;
    }

    await expect(this.rfqListFirstCard()).toBeVisible({
      timeout: this.reminderListTimeout(),
    });
  }

  async clickExpandButtonOnCreatedRfqCard(titleText) {
    const p = this.page;
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    const card = await this.resolveCreatedRfqCardForReminder(titleText);
    await expect(card).toBeVisible({ timeout: 60000 });
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await p.locator('main').first().scrollIntoViewIfNeeded().catch(() => {});

    await expect
      .poll(
        async () =>
          (await this.expandOnlyButtonOnRfqCard(card).isVisible({ timeout: 500 }).catch(() => false)) ||
          (await this.collapseButtonOnRfqCard(card).isVisible({ timeout: 500 }).catch(() => false)),
        { timeout: 45000, intervals: [150, 300, 500, 800, 1200] }
      )
      .toBe(true);

    await this.ensureRfqCardRowExpanded(card);
    await p.waitForTimeout(250);
  }

  async openThreeDotMenuOnCreatedRfqCard(titleText) {
    await this.waitForNetworkSettled();
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();

    const card = await this.resolveCreatedRfqCardForReminder(titleText);
    await expect(card).toBeVisible({ timeout: 60000 });
    await this.openThreeDotMenuInExpandedRfqCard(card);
  }

  menuPaperFromOpenCard() {
    return this.page.locator('.MuiPopover-root').filter({ visible: true }).locator('.MuiPaper-root').last();
  }

  async clickSendReminderInRfqCardMenu() {
    const p = this.page;
    const paper = this.menuPaperFromOpenCard();

    const reminderInPaper = paper.getByRole('menuitem', { name: /send reminder/i }).first();
    const reminderTextInPaper = paper.getByText(/^send reminder$/i).first();
    const sendEmailInPaper = paper.getByRole('menuitem', { name: /^send email$/i }).first();

    const reminderGlobal = p.getByRole('menuitem', { name: /send reminder/i }).filter({ visible: true }).first();
    const sendEmailGlobal = p
      .getByRole('menuitem', { name: /^send email$/i })
      .filter({ visible: true })
      .first();

    let target = null;
    if (await reminderInPaper.isVisible({ timeout: 5000 }).catch(() => false)) {
      target = reminderInPaper;
    } else if (await reminderTextInPaper.isVisible({ timeout: 3000 }).catch(() => false)) {
      target = reminderTextInPaper;
    } else if (await reminderGlobal.isVisible({ timeout: 3000 }).catch(() => false)) {
      target = reminderGlobal;
    } else if (await sendEmailInPaper.isVisible({ timeout: 3000 }).catch(() => false)) {
      target = sendEmailInPaper;
    } else if (await sendEmailGlobal.isVisible({ timeout: 3000 }).catch(() => false)) {
      target = sendEmailGlobal;
    }

    if (!target) {
      throw new Error(
        'RFQ reminder: neither "Send reminder" nor "Send email" was visible in the RFQ card menu. ' +
          'Open the three-dot menu on the created card first.'
      );
    }

    await target.click({ timeout: 15000, force: true }).catch(async () => {
      await target.click({ timeout: 15000, force: true });
    });

    await this.waitForComposeEmailModalReady();
  }

  async expectRfqReminderComposeEmailDialogReady() {
    await this.waitForComposeEmailModalReady();
  }

  async clickSendEmailInRfqReminderComposeDialog() {
    await this.sendEmailFromRfqComposeModal();
  }

  async expectRfqReminderEmailSentToast(titleText) {
    const successToast = this.locatorEmailSentSuccessToast();
    if (await successToast.isVisible({ timeout: 2500 }).catch(() => false)) {
      await expect(successToast).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.visibleComposeEmailDialog())
        .toHaveCount(0, { timeout: 20000 })
        .catch(() => {});
    }

    await this.waitForCreatedRfqCardOnList(titleText);
  }
}

module.exports = RfqSendReminderPage;
