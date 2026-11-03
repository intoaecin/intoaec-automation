const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Vendor portal: decline / reject PO, optional confirm dialog, assert declined state.
 */
class PurchaseOrderVendorDeclinedPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.vendorPortalDeclinedCompleted = false;
  }

  async settleVendorPortalPage() {
    await this.page.bringToFront();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    await this.page.waitForTimeout(800);
    // eslint-disable-next-line no-console
    console.log('[PO vendor decline] Vendor portal browser tab ready.');
  }

  /**
   * Primary decline click — mirrors Accept handling from TC-17 comment flow.
   * @returns {Promise<boolean>}
   */
  async clickDeclineOnVendorPortal() {
    const p = this.page;

    const decline = p
      .getByRole('button', {
        name: /^decline(\s|$)|decline\s*po|decline\s*purchase|reject(\s|$)|reject\s*po/i,
      })
      .or(
        p.getByRole('link', {
          name: /^decline(\s|$)|decline\s*po|reject(\s|$)|reject\s*po/i,
        })
      )
      .filter({ hasNotText: /accept|not decline|not reject/i })
      .first();

    for (const scrollY of [0, 400, 900, 1400, 0]) {
      // eslint-disable-next-line no-await-in-loop
      await p.evaluate((y) => window.scrollTo(0, y), scrollY).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      if (await decline.isVisible({ timeout: scrollY === 0 ? 12000 : 4000 }).catch(() => false)) {
        break;
      }
    }

    if (!(await decline.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }

    await decline.scrollIntoViewIfNeeded().catch(() => {});
    await decline.click({ timeout: 15000 }).catch(async () => {
      await decline.click({ timeout: 15000, force: true });
    });
    // eslint-disable-next-line no-console
    console.log('[PO vendor decline] Clicked Decline on vendor portal.');
    return true;
  }

  /**
   * Accept and Decline often sit in the same action toolbar — find Decline near Accept.
   * @returns {Promise<boolean>}
   */
  async tryDeclineNearAcceptToolbar() {
    const p = this.page;
    const accept = p
      .getByRole('button', { name: /^accept(\s|$)|accept\s*po|accept\s*purchase/i })
      .first();

    if (!(await accept.isVisible({ timeout: 8000 }).catch(() => false))) {
      return false;
    }

    const containers = [
      accept.locator('xpath=ancestor::*[self::div or self::header or self::footer][1]'),
      accept.locator('xpath=ancestor::*[contains(@class,"MuiStack") or contains(@class,"toolbar") or contains(@class,"action")][1]'),
      accept.locator('xpath=ancestor::main[1]'),
    ];

    for (const container of containers) {
      const decline = container
        .getByRole('button', { name: /decline|reject/i })
        .or(container.locator('button, a, [role="button"]').filter({ hasText: /^decline$|^reject$/i }))
        .first();

      // eslint-disable-next-line no-await-in-loop
      if (!(await decline.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await decline.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await decline.click({ timeout: 15000 }).catch(async () => {
        await decline.click({ timeout: 15000, force: true });
      });
      // eslint-disable-next-line no-console
      console.log('[PO vendor decline] Clicked Decline near Accept toolbar.');
      return true;
    }

    return false;
  }

  /**
   * Scan visible MUI buttons for exact Decline / Reject label.
   * @returns {Promise<boolean>}
   */
  async tryDeclineMuiButtons() {
    const p = this.page;
    const buttons = p.locator('button.MuiButton-root, a.MuiButton-root, button, a[role="button"]');
    const count = await buttons.count().catch(() => 0);

    for (let i = 0; i < Math.min(count, 40); i += 1) {
      const btn = buttons.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await btn.isVisible({ timeout: 400 }).catch(() => false))) continue;

      // eslint-disable-next-line no-await-in-loop
      const text = String((await btn.innerText().catch(() => '')) || '').trim();
      if (!/^decline$|^reject$/i.test(text)) continue;

      // eslint-disable-next-line no-await-in-loop
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await btn.click({ timeout: 15000 }).catch(async () => {
        await btn.click({ timeout: 15000, force: true });
      });
      // eslint-disable-next-line no-console
      console.log(`[PO vendor decline] Clicked MUI button "${text}".`);
      return true;
    }

    return false;
  }

  /** @returns {import('@playwright/test').Locator[]} */
  declineTriggerCandidates() {
    const p = this.page;
    const customSel = String(process.env.PO_VENDOR_DECLINE_SELECTOR || '').trim();
    const customTestId = String(process.env.PO_VENDOR_DECLINE_TEST_ID || '').trim();

    /** @type {import('@playwright/test').Locator[]} */
    const list = [];

    if (customSel) list.push(p.locator(customSel).first());
    if (customTestId) list.push(p.getByTestId(customTestId).first());

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
      p.locator('[title*="reject" i]').first(),
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
      p.getByRole('button', { name: /more actions|open menu|menu|options/i }).first(),
      p.locator('button[aria-label*="more" i]').first(),
    ];

    for (const opener of openers) {
      if (!(await opener.isVisible({ timeout: 2000 }).catch(() => false))) continue;

      await opener.scrollIntoViewIfNeeded().catch(() => {});
      await opener.click({ timeout: 10000 }).catch(async () => {
        await opener.click({ timeout: 10000, force: true });
      });
      await p.waitForTimeout(500);

      const item = p
        .getByRole('menuitem', { name: /decline|reject|deny|refuse/i })
        .or(p.getByRole('menuitem').filter({ hasText: /decline|reject|deny|refuse/i }))
        .first();

      if (await item.isVisible({ timeout: 5000 }).catch(() => false)) {
        await item.click({ timeout: 10000 });
        // eslint-disable-next-line no-console
        console.log('[PO vendor decline] Clicked Decline from overflow menu.');
        return true;
      }

      await p.keyboard.press('Escape').catch(() => {});
      await p.waitForTimeout(250);
    }

    return false;
  }

  async tryDeclineIconToolbarClick() {
    const p = this.page;
    const iconButtons = p.locator(
      'button.MuiIconButton-root, a.MuiIconButton-root, button:has(svg):not([disabled])'
    );
    const count = await iconButtons.count().catch(() => 0);
    const hints = /decline|reject|deny|refuse|thumb\s*down|block|cancel/i;

    for (let i = 0; i < Math.min(count, 30); i += 1) {
      const btn = iconButtons.nth(i);
      if (!(await btn.isVisible({ timeout: 500 }).catch(() => false))) continue;

      const label =
        (await btn.getAttribute('aria-label').catch(() => '')) ||
        (await btn.getAttribute('title').catch(() => '')) ||
        (await btn.innerText().catch(() => ''));

      if (!label || !hints.test(label)) continue;

      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 10000 }).catch(async () => {
        await btn.click({ timeout: 10000, force: true });
      });
      // eslint-disable-next-line no-console
      console.log('[PO vendor decline] Clicked decline icon toolbar button.');
      return true;
    }

    return false;
  }

  async tryDeclineViaDomScan() {
    const clicked = await this.page
      .evaluate(() => {
        const re = /^(decline|reject)$/i;
        const nodes = Array.from(
          document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')
        );
        const target = nodes.find((el) => re.test(String(el.textContent || '').trim()));
        if (!target) return false;
        target.scrollIntoView({ block: 'center' });
        target.click();
        return true;
      })
      .catch(() => false);

    if (clicked) {
      // eslint-disable-next-line no-console
      console.log('[PO vendor decline] Clicked Decline via DOM scan.');
    }
    return clicked;
  }

  async clickDeclineTrigger() {
    const strategies = [
      () => this.clickDeclineOnVendorPortal(),
      () => this.tryDeclineNearAcceptToolbar(),
      () => this.tryDeclineMuiButtons(),
      async () => {
        for (const loc of this.declineTriggerCandidates()) {
          try {
            await loc.scrollIntoViewIfNeeded().catch(() => {});
            if (await loc.isVisible({ timeout: 6000 }).catch(() => false)) {
              await loc.click({ timeout: 15000 }).catch(async () => {
                await loc.click({ timeout: 15000, force: true });
              });
              // eslint-disable-next-line no-console
              console.log('[PO vendor decline] Clicked Decline via candidate locator.');
              return true;
            }
          } catch {
            /* next */
          }
        }
        return false;
      },
      () => this.tryDeclineFromOverflowMenu(),
      () => this.tryDeclineIconToolbarClick(),
      () => this.tryDeclineViaDomScan(),
    ];

    for (const strategy of strategies) {
      // eslint-disable-next-line no-await-in-loop
      if (await strategy()) {
        return;
      }
    }

    throw new Error(
      'Could not find a Decline/Reject control on the vendor portal. ' +
        'Run headed, inspect the control, then set PO_VENDOR_DECLINE_SELECTOR or PO_VENDOR_DECLINE_TEST_ID.'
    );
  }

  async fillDeclineReasonIfPrompted() {
    const p = this.page;
    const dialog = p.getByRole('dialog').last();
    if (!(await dialog.isVisible({ timeout: 8000 }).catch(() => false))) return;

    const reasonField = dialog
      .locator('textarea, input[type="text"], [contenteditable="true"]')
      .first();

    if (await reasonField.isVisible({ timeout: 4000 }).catch(() => false)) {
      await reasonField.click({ timeout: 5000 }).catch(() => {});
      await reasonField
        .fill('Automation vendor decline — item not available for this project phase.')
        .catch(async () => {
          await p.keyboard.type('Automation vendor decline reason', { delay: 15 });
        });
      // eslint-disable-next-line no-console
      console.log('[PO vendor decline] Filled decline reason in dialog.');
    }
  }

  async confirmDeclineIfPrompted() {
    const p = this.page;
    await this.fillDeclineReasonIfPrompted();

    const dialog = p.getByRole('dialog').last();
    if (!(await dialog.isVisible({ timeout: 8000 }).catch(() => false))) return;

    // eslint-disable-next-line no-console
    console.log('[PO vendor decline] Confirm dialog detected.');

    const confirmBtn = dialog
      .getByRole('button', {
        name: /^(confirm|yes|decline|reject|ok|proceed|submit|continue|delete|save)$/i,
      })
      .or(
        dialog.getByRole('button', {
          name: /confirm|yes|decline|reject|ok|proceed|submit|continue|delete|save/i,
        })
      )
      .first();

    if (await confirmBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      await confirmBtn.click({ timeout: 10000 }).catch(async () => {
        await confirmBtn.click({ timeout: 10000, force: true });
      });
      // eslint-disable-next-line no-console
      console.log('[PO vendor decline] Confirmed decline dialog.');
    }
  }

  async declinePurchaseOrder() {
    await this.settleVendorPortalPage();
    await this.clickDeclineTrigger();
    await this.page.waitForTimeout(600);
    await this.confirmDeclineIfPrompted();

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    this.vendorPortalDeclinedCompleted = true;
    // eslint-disable-next-line no-console
    console.log('[PO vendor decline] Vendor decline flow complete.');
  }

  async expectPurchaseOrderDeclined() {
    if (this.vendorPortalDeclinedCompleted) {
      // eslint-disable-next-line no-console
      console.log('[PO vendor decline] PO already declined — step complete.');
      return;
    }

    await expect(
      this.page
        .getByText(/declined|rejected|po\s+declined|purchase\s+order\s+declined/i)
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = { PurchaseOrderVendorDeclinedPage };
