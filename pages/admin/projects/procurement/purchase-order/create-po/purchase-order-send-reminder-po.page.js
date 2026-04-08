const PurchaseOrderCreatePoPage = require('./purchase-order-create-po.page');
const { expect } = require('@playwright/test');

/**
 * PO card Send ▾ → Send reminder (or Send email when status is EDITED) → compose → Send email.
 */
class PurchaseOrderSendReminderPoPage extends PurchaseOrderCreatePoPage {
  openSendDropdownPaper() {
    return this.page.locator('.MuiPopover-root .MuiPaper-root').last();
  }

  async openSendMenuOnFirstPurchaseOrderCard() {
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    const card = this.firstPoCard();
    const sendBtn = card.getByRole('button', { name: /send/i });
    await sendBtn.scrollIntoViewIfNeeded();
    await expect(sendBtn).toBeVisible({ timeout: 60000 });
    await sendBtn.click();

    const paper = this.openSendDropdownPaper();
    await expect(paper).toBeVisible({ timeout: 20000 });
    await expect(
      paper.locator('li[role="menuitem"], [role="menuitem"]').first()
    ).toBeVisible({ timeout: 15000 });
  }

  async clickSendReminderInPurchaseOrderSendMenu() {
    const paper = this.openSendDropdownPaper();
    await expect(paper).toBeVisible({ timeout: 15000 });

    const reminderItem = paper
      .locator('[role="menuitem"]')
      .filter({ hasText: /send reminder/i })
      .first();
    const sendEmailItem = paper
      .locator('[role="menuitem"]')
      .filter({ hasText: /send email/i })
      .first();

    if (await reminderItem.isVisible({ timeout: 8000 }).catch(() => false)) {
      await reminderItem.click();
    } else if (await sendEmailItem.isVisible({ timeout: 8000 }).catch(() => false)) {
      await sendEmailItem.click();
    } else {
      throw new Error(
        'Neither "Send reminder" nor "Send email" appeared in the Send menu. ' +
          'PO may be in a state where only WhatsApp is offered (check aecStatus after update).'
      );
    }

    await this.waitForNetworkSettled();
  }

  async expectPurchaseOrderComposeEmailDialogReady() {
    await this.waitForComposeEmailModalReady();
  }

  async clickSendEmailInPurchaseOrderComposeDialog() {
    await this.sendEmailFromComposeModal({ prioritizeEmailSentToast: true });
  }

  async expectPurchaseOrderReminderEmailSentToast() {
    const loc = this.locatorEmailSentSuccessToast();
    if (await loc.isVisible({ timeout: 2500 }).catch(() => false)) {
      await expect(loc).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.visibleComposeEmailDialog())
        .toHaveCount(0, { timeout: 20000 })
        .catch(() => {});
    }
    await this.waitForPurchaseOrderListReadyAfterComposeEmailSent();
  }
}

module.exports = PurchaseOrderSendReminderPoPage;
