const { expect } = require('@playwright/test');
const RfqSendReminderPage = require('./rfq-send-reminder.page');

/**
 * RFQ list flow: after compose-send, expand the created card, open the kebab menu,
 * choose Decline, handle optional confirmation, and assert the decline success state.
 */
class RfqDeclinePage extends RfqSendReminderPage {
  menuPaperFromOpenCard() {
    return this.page.locator('.MuiPopover-root').filter({ visible: true }).locator('.MuiPaper-root').last();
  }

  declineToast() {
    return this.page
      .locator('.Toastify__toast, .Toastify__toast-body[role="alert"]')
      .filter({ hasText: /declined successfully|rejected successfully|rfq declined|request for quotation declined/i })
      .first();
  }

  async clickDeclineInRfqCardMenu() {
    await this.waitForNetworkSettled();

    const paper = this.menuPaperFromOpenCard();
    const declineInPaper = paper.getByRole('menuitem', { name: /decline|reject/i }).first();
    const declineTextInPaper = paper.getByText(/^(decline|reject)$/i).first();
    const declineGlobal = this.page
      .getByRole('menuitem', { name: /decline|reject/i })
      .filter({ visible: true })
      .first();

    let target = null;
    if (await declineInPaper.isVisible({ timeout: 5000 }).catch(() => false)) {
      target = declineInPaper;
    } else if (await declineTextInPaper.isVisible({ timeout: 3000 }).catch(() => false)) {
      target = declineTextInPaper;
    } else if (await declineGlobal.isVisible({ timeout: 3000 }).catch(() => false)) {
      target = declineGlobal;
    }

    if (!target) {
      throw new Error(
        'RFQ decline: "Decline" was not visible in the RFQ card menu. Open the three-dot menu on the created card first.'
      );
    }

    await target.click({ timeout: 15000, force: true }).catch(async () => {
      await target.click({ timeout: 15000, force: true });
    });

    await this.confirmDeclineIfDialogAppears();
    await this.waitForNetworkSettled();
  }

  async confirmDeclineIfDialogAppears() {
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    const dialogVisible = await dialog.isVisible({ timeout: 2500 }).catch(() => false);
    if (!dialogVisible) {
      return;
    }

    const confirmButtons = [
      dialog.getByRole('button', { name: /^(yes|ok|confirm|decline|reject|proceed|continue|submit)$/i }).first(),
      dialog.getByRole('button').filter({ hasText: /decline|reject|confirm|yes|ok|submit|continue/i }).first(),
      dialog.getByText(/^(decline|reject|confirm|yes|ok)$/i).first().locator('xpath=ancestor::button[1]'),
    ];

    for (const button of confirmButtons) {
      if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
        await button.click({ timeout: 10000, force: true }).catch(async () => {
          await button.click({ timeout: 10000, force: true });
        });
        return;
      }
    }
  }

  async expectRfqDeclineSuccessToast(titleText) {
    await expect(this.declineToast()).toBeVisible({ timeout: this.defaultTimeout });
    await this.waitForCreatedRfqCardOnList(titleText);
  }
}

module.exports = RfqDeclinePage;
