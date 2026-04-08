const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Vendor portal: decline / reject PO, optional confirm dialog, assert declined state.
 *
 * Optional env (if UI is custom):
 * - PO_VENDOR_DECLINE_SELECTOR — CSS for the decline control
 * - PO_VENDOR_DECLINE_TEST_ID — data-testid on the decline control
 */
class PurchaseOrderVendorDeclinedPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
  }

  async settleVendorPortalPage() {
    await this.page.bringToFront();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  /**
   * @returns {import('@playwright/test').Locator[]}
   */
  declineTriggerCandidates() {
    const p = this.page;
    const customSel = String(process.env.PO_VENDOR_DECLINE_SELECTOR || '').trim();
    const customTestId = String(process.env.PO_VENDOR_DECLINE_TEST_ID || '').trim();

    /** @type {import('@playwright/test').Locator[]} */
    const list = [];

    if (customSel) {
      list.push(p.locator(customSel).first());
    }
    if (customTestId) {
      list.push(p.getByTestId(customTestId).first());
    }

    const labelRe =
      /decline|reject|deny|refuse|not\s*accept|turn\s*down|rechazar/i;

    list.push(
      p.getByRole('button', { name: labelRe }),
      p.getByRole('link', { name: labelRe }),
      p.getByRole('menuitem', { name: labelRe }),
      p.locator('button, a, [role="button"]').filter({ hasText: labelRe }).first(),
      p.locator('button[aria-label*="decline" i]'),
      p.locator('button[aria-label*="reject" i]'),
      p.locator('button[aria-label*="deny" i]'),
      p.locator('a[aria-label*="decline" i]'),
      p.locator('[aria-label*="decline" i]'),
      p.locator('[aria-label*="reject" i]'),
      p.locator('[title*="decline" i]'),
      p.locator('[title*="reject" i]'),
      p.getByText(/^decline$/i).first().locator('xpath=ancestor::button[1]'),
      p.getByText(/^reject$/i).first().locator('xpath=ancestor::button[1]')
    );

    return list;
  }

  async tryDeclineFromOverflowMenu() {
    const p = this.page;
    const openers = [
      p.locator('button:has(svg[data-testid="MoreVertIcon"])').first(),
      p.locator('button:has(svg[data-testid="MoreHorizIcon"])').first(),
      p.getByRole('button', { name: /more actions|open menu|menu|options/i }),
      p.locator('button[aria-label*="more" i]').first(),
    ];
    for (const opener of openers) {
      if (!(await opener.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      await p.waitForTimeout(500);
      const item = p
        .getByRole('menuitem', { name: /decline|reject|deny|refuse/i })
        .or(p.getByRole('menuitem').filter({ hasText: /decline|reject|deny|refuse/i }))
        .first();
      if (await item.isVisible({ timeout: 5000 }).catch(() => false)) {
        await item.click();
        return true;
      }
      await p.keyboard.press('Escape');
      await p.waitForTimeout(250);
    }
    return false;
  }

  /**
   * Clicks visible toolbar / card icon-buttons (MUI) whose tooltip or svg suggests decline.
   */
  async tryDeclineIconToolbarClick() {
    const p = this.page;
    const iconButtons = p.locator(
      'button.MuiIconButton-root, a.MuiIconButton-root, button:has(svg):not([disabled])'
    );
    const n = await iconButtons.count();
    const hints = /decline|reject|deny|refuse|thumb\s*down/i;
    for (let i = 0; i < Math.min(n, 25); i++) {
      const btn = iconButtons.nth(i);
      if (!(await btn.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      const label =
        (await btn.getAttribute('aria-label').catch(() => '')) ||
        (await btn.getAttribute('title').catch(() => '')) ||
        (await btn.innerText().catch(() => ''));
      if (label && hints.test(label)) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ timeout: 10000 });
        return true;
      }
    }
    return false;
  }

  async clickDeclineTrigger() {
    await this.settleVendorPortalPage();

    const perCandidateMs = 8000;
    for (const loc of this.declineTriggerCandidates()) {
      try {
        await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        if (await loc.isVisible({ timeout: perCandidateMs }).catch(() => false)) {
          await expect(loc).toBeEnabled({ timeout: 10000 }).catch(() => {});
          await loc.click({ timeout: 15000 });
          return;
        }
      } catch {
        /* try next */
      }
    }

    if (await this.tryDeclineFromOverflowMenu()) {
      return;
    }

    if (await this.tryDeclineIconToolbarClick()) {
      return;
    }

    const labelRe = /decline|reject|deny/i;
    const looseText = this.page.getByText(labelRe).first();
    if (await looseText.isVisible({ timeout: 5000 }).catch(() => false)) {
      await looseText.click();
      return;
    }

    throw new Error(
      'Could not find a Decline/Reject control on the vendor portal. ' +
        'Run headed, inspect the control, then set PO_VENDOR_DECLINE_SELECTOR or PO_VENDOR_DECLINE_TEST_ID.'
    );
  }

  async declinePurchaseOrder() {
    await this.clickDeclineTrigger();

    await this.page.waitForTimeout(600);

    const dialog = this.page.getByRole('dialog');
    const dialogVisible = await dialog
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (dialogVisible) {
      const confirmBtn = dialog
        .getByRole('button', {
          name: /^(delete|confirm|yes|decline|ok|proceed|remove|submit|continue)$/i,
        })
        .or(
          dialog.getByRole('button', {
            name: /delete|remove|decline|confirm|yes|submit|continue/i,
          })
        )
        .first();
      if (await confirmBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    } else {
      const loose = this.page
        .getByRole('button', { name: /delete|confirm|yes|proceed|submit/i })
        .first();
      if (await loose.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loose.click();
      }
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async expectPurchaseOrderDeclined() {
    await expect(
      this.page
        .getByText(/declined|rejected|po\s+declined|purchase\s+order\s+declined/i)
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = { PurchaseOrderVendorDeclinedPage };
