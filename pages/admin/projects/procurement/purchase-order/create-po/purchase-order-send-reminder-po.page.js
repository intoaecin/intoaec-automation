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
    await this.dismissVisibleToastNotifications();
    await this.dismissOpenMenusAndPopovers();
    await expect(this.page.getByText(/po no/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    const card = this.firstPoCard();
    await card.scrollIntoViewIfNeeded();
    await this.ensurePoCardRowExpanded(card);

    const sendBtn = card
      .getByRole('button', { name: /^send$/i })
      .or(card.getByRole('button', { name: /send/i }))
      .filter({ visible: true })
      .first();
    await sendBtn.scrollIntoViewIfNeeded();
    await expect(sendBtn).toBeVisible({ timeout: 60000 });
    await sendBtn.click({ timeout: 20000 }).catch(async () => {
      await sendBtn.click({ force: true, timeout: 10000 });
    });

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
      .getByRole('menuitem', { name: /send reminder/i })
      .or(paper.locator('[role="menuitem"]').filter({ hasText: /send reminder/i }))
      .first();

    await expect(reminderItem).toBeVisible({ timeout: 20000 });
    await reminderItem.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async expectPurchaseOrderComposeEmailDialogReady() {
    await this.waitForComposeEmailModalReady();
  }

  async clickSendEmailInPurchaseOrderComposeDialog() {
    await this.waitForComposeEmailModalReady();
    const send = this.locatorComposeSendEmailButtonInVisibleDialog();
    await expect(send).toBeVisible({ timeout: this.composeModalTimeout });
    await expect(send).toBeEnabled({ timeout: this.composeModalTimeout });
    await send.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await send.click({ timeout: 30000 });
    } catch (error) {
      await send.click({ timeout: 15000, force: true });
    }

    // eslint-disable-next-line no-console
    console.log('[PO send reminder] Clicked Send email — flow complete.');
    this.poCreatedAndSentSuccessObserved = true;
  }
}

module.exports = PurchaseOrderSendReminderPoPage;
