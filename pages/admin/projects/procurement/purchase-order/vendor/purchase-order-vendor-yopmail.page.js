const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

function yopmailLocalPart(email) {
  const m = String(email || '').trim().match(/^([^@]+)@yopmail\.com$/i);
  return m ? m[1] : null;
}

function getMailHintRegex() {
  const raw = process.env.PO_YOPMAIL_MAIL_HINT_REGEX;
  if (raw) {
    try {
      return new RegExp(raw, 'i');
    } catch {
      /* fall through */
    }
  }
  return /purchase order|\bPO\b|p\.?\s*o\.?\s*(no\.?|#)?/i;
}

/** Yopmail inbox + reading PO mail + opening vendor portal from “View PO”. */
class PurchaseOrderVendorYopmailPage extends BasePage {
  constructor(page) {
    super(page);
    this.inboxTimeoutMs = parseInt(
      process.env.PO_YOPMAIL_INBOX_TIMEOUT_MS || '180000',
      10
    );
  }

  inboxFrame() {
    return this.page.frameLocator('iframe[name="ifinbox"]');
  }

  mailFrame() {
    return this.page.frameLocator('iframe[name="ifmail"]');
  }

  async gotoInboxForLocalPart(localPart) {
    const login = String(localPart || '').trim();
    if (!login) {
      throw new Error('Yopmail inbox name is empty.');
    }
    await this.page.goto(`https://yopmail.com?${encodeURIComponent(login)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await this.page
      .waitForSelector('iframe[name="ifinbox"]', { timeout: 45000 })
      .catch(async () => {
        const box = this.page.locator('#login, input#login, input[name="login"]').first();
        if (await box.isVisible({ timeout: 8000 }).catch(() => false)) {
          await box.fill(login);
          await box.press('Enter');
          await this.page.waitForSelector('iframe[name="ifinbox"]', {
            timeout: 45000,
          });
        }
      });
  }

  async refreshInbox() {
    const refresh = this.page.locator('#refresh').first();
    if (await refresh.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refresh.click();
      return;
    }
    const byTitle = this.page.locator('[title*="efresh" i], [title*="Refresh" i]').first();
    if (await byTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await byTitle.click();
    }
  }

  /**
   * Poll inbox: refresh, find a row matching PO subject hint, open it, click View PO.
   * @returns {import('playwright').Page} Vendor portal page (new tab or same tab).
   */
  async waitOpenPoMessageAndClickViewPo() {
    const hint = getMailHintRegex();
    const deadline = Date.now() + this.inboxTimeoutMs;
    const inbox = this.inboxFrame();

    while (Date.now() < deadline) {
      await this.refreshInbox();
      await this.page.waitForTimeout(1400);

      const row = inbox
        .locator('div.m, .lm, tr, .l')
        .filter({ hasText: hint })
        .filter({ hasNotText: /^view\s*po$/i })
        .first();

      if (await row.isVisible({ timeout: 2500 }).catch(() => false)) {
        await row.click();
        await this.page.waitForTimeout(600);
        return this.clickViewPoAndResolveVendorPortalPage();
      }

      const fallback = inbox.getByText(hint, { exact: false }).first();
      if (await fallback.isVisible({ timeout: 800 }).catch(() => false)) {
        await fallback.click();
        await this.page.waitForTimeout(600);
        return this.clickViewPoAndResolveVendorPortalPage();
      }
    }

    throw new Error(
      `No purchase-order email matched ${hint} in Yopmail within ${this.inboxTimeoutMs}ms.`
    );
  }

  async clickViewPoAndResolveVendorPortalPage() {
    const ifmail = this.mailFrame();
    const viewPo = ifmail
      .getByRole('link', { name: /view\s*po/i })
      .or(ifmail.getByRole('button', { name: /view\s*po/i }))
      .or(ifmail.locator('a').filter({ hasText: /view\s*po/i }))
      .first();

    await expect(viewPo).toBeVisible({ timeout: 90000 });

    const ctx = this.page.context();
    const popupPromise = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await viewPo.click();
    const popup = await popupPromise;

    if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      return popup;
    }

    await this.page.waitForURL(
      (u) => !String(u).toLowerCase().includes('yopmail.com'),
      { timeout: 120000 }
    );
    return this.page;
  }
}

module.exports = { PurchaseOrderVendorYopmailPage, yopmailLocalPart };
