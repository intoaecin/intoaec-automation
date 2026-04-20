const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * RFQ vendor portal: decline / reject RFQ, optional confirm dialog, assert declined state.
 *
 * Optional env (if UI is custom):
 * - RFQ_VENDOR_DECLINE_SELECTOR - CSS for the decline control
 * - RFQ_VENDOR_DECLINE_TEST_ID - data-testid on the decline control
 */
class RfqVendorPortalDeclinePage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
  }

  async settleVendorPortalPage() {
    await this.page.bringToFront();
    await this.page.waitForLoadState('domcontentloaded', { timeout: this.defaultTimeout });
    await this.page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  }

  declineTriggerCandidates() {
    const p = this.page;
    const customSel = String(process.env.RFQ_VENDOR_DECLINE_SELECTOR || '').trim();
    const customTestId = String(process.env.RFQ_VENDOR_DECLINE_TEST_ID || '').trim();

    /** @type {import('@playwright/test').Locator[]} */
    const list = [];

    if (customSel) {
      list.push(p.locator(customSel).first());
    }
    if (customTestId) {
      list.push(p.getByTestId(customTestId).first());
    }

    const labelRe = /decline|reject|deny|refuse|not\s*accept|turn\s*down/i;

    list.push(
      p.getByRole('button', { name: labelRe }).first(),
      p.getByRole('link', { name: labelRe }).first(),
      p.getByRole('menuitem', { name: labelRe }).first(),
      p.locator('button, a, [role="button"]').filter({ hasText: labelRe }).first(),
      p.locator('button[aria-label*="decline" i]').first(),
      p.locator('button[aria-label*="reject" i]').first(),
      p.locator('[aria-label*="decline" i]').first(),
      p.locator('[aria-label*="reject" i]').first(),
      p.locator('[title*="decline" i]').first(),
      p.locator('[title*="reject" i]').first()
    );

    return list;
  }

  async tryDeclineFromOverflowMenu() {
    const p = this.page;
    const openers = [
      p.locator('button:has(svg[data-testid="MoreVertIcon"])').first(),
      p.locator('button:has(svg[data-testid="MoreHorizIcon"])').first(),
      p.getByRole('button', { name: /more actions|open menu|menu|options/i }).first(),
      p.locator('button[aria-label*="more" i]').first(),
    ];

    for (const opener of openers) {
      if (!(await opener.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }

      await opener.scrollIntoViewIfNeeded().catch(() => {});
      await opener.click({ timeout: 10000 }).catch(async () => {
        await opener.click({ timeout: 10000, force: true });
      });

      const item = p
        .getByRole('menuitem', { name: /decline|reject|deny|refuse/i })
        .or(p.getByRole('menuitem').filter({ hasText: /decline|reject|deny|refuse/i }))
        .first();

      if (await item.isVisible({ timeout: 5000 }).catch(() => false)) {
        await item.click({ timeout: 10000 });
        return true;
      }

      await p.keyboard.press('Escape').catch(() => {});
    }

    return false;
  }

  async tryDeclineIconToolbarClick() {
    const p = this.page;
    const iconButtons = p.locator(
      'button.MuiIconButton-root, a.MuiIconButton-root, button:has(svg):not([disabled])'
    );
    const hints = /decline|reject|deny|refuse|thumb\s*down/i;
    const count = await iconButtons.count();

    for (let i = 0; i < Math.min(count, 25); i++) {
      const btn = iconButtons.nth(i);
      if (!(await btn.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }

      const label =
        (await btn.getAttribute('aria-label').catch(() => '')) ||
        (await btn.getAttribute('title').catch(() => '')) ||
        (await btn.innerText().catch(() => ''));

      if (!label || !hints.test(label)) {
        continue;
      }

      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 10000 }).catch(async () => {
        await btn.click({ timeout: 10000, force: true });
      });
      return true;
    }

    return false;
  }

  async clickDeclineTrigger() {
    await this.settleVendorPortalPage();

    for (const loc of this.declineTriggerCandidates()) {
      try {
        await loc.scrollIntoViewIfNeeded().catch(() => {});
        if (await loc.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(loc).toBeVisible({ timeout: 10000 });
          await loc.click({ timeout: 15000 }).catch(async () => {
            await loc.click({ timeout: 15000, force: true });
          });
          return;
        }
      } catch {
        // Try the next candidate.
      }
    }

    if (await this.tryDeclineFromOverflowMenu()) {
      return;
    }

    if (await this.tryDeclineIconToolbarClick()) {
      return;
    }

    throw new Error(
      'Could not find a Decline/Reject control on the RFQ vendor portal. ' +
        'Run headed, inspect the control, then set RFQ_VENDOR_DECLINE_SELECTOR or RFQ_VENDOR_DECLINE_TEST_ID.'
    );
  }

  async confirmDeclineIfPrompted() {
    const p = this.page;
    const dialog = p.getByRole('dialog').last();

    if (await dialog.isVisible({ timeout: 8000 }).catch(() => false)) {
      const confirmBtn = dialog
        .getByRole('button', {
          name: /^(confirm|yes|decline|reject|ok|proceed|submit|continue|delete)$/i,
        })
        .or(
          dialog.getByRole('button', {
            name: /confirm|yes|decline|reject|proceed|submit|continue|delete/i,
          })
        )
        .first();

      if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmBtn.click({ timeout: 10000 });
      }
    }
  }

  async declineRfq() {
    await this.clickDeclineTrigger();
    await this.confirmDeclineIfPrompted();

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }

  async expectRfqDeclined() {
    const p = this.page;
    const successState = p
      .locator('.Toastify__toast, .Toastify__toast-body[role="alert"], [role="alert"], main, body')
      .filter({ hasText: /declined|rejected|rfq\s+declined|quotation\s+declined/i })
      .first();

    await expect(successState).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = { RfqVendorPortalDeclinePage };
