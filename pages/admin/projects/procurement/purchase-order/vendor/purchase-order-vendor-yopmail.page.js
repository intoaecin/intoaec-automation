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

function compileSubjectFilter(pattern) {
  const s = String(pattern || '').trim();
  if (!s) return null;
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/** Yopmail inbox + reading PO mail + opening vendor portal from “View PO”. */
class PurchaseOrderVendorYopmailPage extends BasePage {
  constructor(page) {
    super(page);
    this.inboxLogin = '';
    this.inboxTimeoutMs = parseInt(
      process.env.PO_YOPMAIL_INBOX_TIMEOUT_MS || '180000',
      10
    );
    this.initialRefreshBurstCount = parseInt(
      process.env.PO_YOPMAIL_INITIAL_REFRESH_COUNT || '4',
      10
    );
    this.refreshBurstDelayMs = parseInt(
      process.env.PO_YOPMAIL_REFRESH_BURST_MS || '500',
      10
    );
    this._refreshCounter = 0;
  }

  inboxFrame() {
    return this.page.frameLocator('iframe[name="ifinbox"]');
  }

  mailFrame() {
    return this.page.frameLocator('iframe[name="ifmail"]');
  }

  inboxUrl(login) {
    return `https://yopmail.com/en/?login=${encodeURIComponent(login)}`;
  }

  async ensureInboxIframe(timeoutMs = 30000) {
    await this.page.waitForSelector('iframe[name="ifinbox"]', {
      timeout: timeoutMs,
    });
  }

  async gotoInboxForLocalPart(localPart) {
    const login = String(localPart || '').trim();
    if (!login) {
      throw new Error('Yopmail inbox name is empty.');
    }
    this.inboxLogin = login;

    const urls = [
      this.inboxUrl(login),
      `https://yopmail.com?${encodeURIComponent(login)}`,
    ];

    let loaded = false;
    for (const url of urls) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        // eslint-disable-next-line no-await-in-loop
        await this.ensureInboxIframe(30000);
        loaded = true;
        break;
      } catch {
        /* try next URL */
      }
    }

    if (!loaded) {
      const box = this.page.locator('#login, input#login, input[name="login"]').first();
      if (await box.isVisible({ timeout: 8000 }).catch(() => false)) {
        await box.fill(login);
        await box.press('Enter');
        await this.ensureInboxIframe(30000);
        loaded = true;
      }
    }

    if (!loaded) {
      throw new Error(`Yopmail inbox did not load for "${login}".`);
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async reloadInbox() {
    if (this.inboxLogin) {
      await this.page.goto(this.inboxUrl(this.inboxLogin), {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
    } else {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await this.ensureInboxIframe(30000).catch(() => {});
  }

  async refreshInbox() {
    await this.page.bringToFront().catch(() => {});
    this._refreshCounter += 1;

    const inbox = this.inboxFrame();
    const refreshControls = [
      this.page.locator('#refresh').first(),
      this.page.locator('#frefresh').first(),
      inbox.locator('#refresh').first(),
      inbox.locator('#frefresh').first(),
      this.page.getByRole('button', { name: /refresh/i }).first(),
    ];

    for (const control of refreshControls) {
      try {
        if (await control.isVisible({ timeout: 600 }).catch(() => false)) {
          await control.click({ timeout: 5000, force: true }).catch(() => {});
          // eslint-disable-next-line no-console
          console.log('[PO Yopmail] Clicked inbox refresh.');
          return true;
        }
      } catch {
        /* next */
      }
    }

    if (this._refreshCounter % 6 !== 0) {
      await this.page.keyboard.press('F5').catch(() => {});
      // eslint-disable-next-line no-console
      console.log('[PO Yopmail] Triggered inbox refresh (F5).');
      return true;
    }

    // eslint-disable-next-line no-console
    console.log('[PO Yopmail] Reloading inbox page to fetch new mail…');
    await this.reloadInbox();
    return true;
  }

  poInboxRowLocator(inbox, hint, subjectRe) {
    let rows = inbox.locator('div.m, .lm, tr, .l').filter({ hasNotText: /^view\s*po$/i });
    if (subjectRe) {
      rows = rows.filter({ hasText: subjectRe });
    } else {
      rows = rows.filter({ hasText: hint });
    }
    return rows;
  }

  async mailBodyContainsText(reOrText) {
    const ifmail = this.mailFrame();
    const q =
      reOrText instanceof RegExp
        ? ifmail.getByText(reOrText, { exact: false }).first()
        : ifmail.getByText(String(reOrText), { exact: false }).first();
    return q.isVisible({ timeout: 1000 }).catch(() => false);
  }

  async snapshotInboxRowSignatures(inbox, maxRows = 15) {
    const rows = inbox.locator('div.m, .lm, tr, .l');
    const total = Math.min(await rows.count().catch(() => 0), maxRows);
    /** @type {Set<string>} */
    const seen = new Set();
    for (let i = 0; i < total; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const t = await rows.nth(i).textContent({ timeout: 2000 }).catch(() => '');
      const sig = String(t || '').replace(/\s+/g, ' ').trim();
      if (sig) seen.add(sig);
    }
    return seen;
  }

  async rowSignature(row) {
    const t = await row.textContent().catch(() => '');
    return String(t || '').replace(/\s+/g, ' ').trim();
  }

  async openNewestMatchingPoMailRow(inbox, hint, subjectRe, previouslySeenSignatures) {
    const rows = this.poInboxRowLocator(inbox, hint, subjectRe);
    const total = await rows.count().catch(() => 0);
    const limit = Math.min(20, total);

    for (let i = 0; i < limit; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const row = rows.nth(i);
      // eslint-disable-next-line no-await-in-loop
      if (!(await row.isVisible({ timeout: 1200 }).catch(() => false))) continue;
      // eslint-disable-next-line no-await-in-loop
      const sig = await this.rowSignature(row);
      if (previouslySeenSignatures && sig && previouslySeenSignatures.has(sig)) {
        continue;
      }
      if (previouslySeenSignatures && sig) previouslySeenSignatures.add(sig);

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await row.click(attempt === 0 ? {} : { force: true });
        } catch {
          // eslint-disable-next-line no-await-in-loop
          await row.click({ force: true }).catch(() => {});
        }
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(350);

        const viewish = await this.mailFrame()
          .locator('a,button')
          .filter({ hasText: /view\s*po|view|open/i })
          .first()
          .isVisible({ timeout: 800 })
          .catch(() => false);
        if (viewish) break;

        // eslint-disable-next-line no-await-in-loop
        await row.dblclick({ timeout: 3000 }).catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(300);
      }
      return true;
    }

    return false;
  }

  buildSubjectBodyMatchers(subjectText) {
    const full = String(subjectText || '').trim();
    /** @type {RegExp[]} */
    const matchers = [];
    if (!full) return matchers;

    const escaped = compileSubjectFilter(full);
    if (escaped) matchers.push(escaped);

    const paren = full.match(/\(([^)]+)\)/);
    if (paren?.[1]) {
      const parenRe = compileSubjectFilter(paren[1]);
      if (parenRe) matchers.push(parenRe);
    }

    const dashTail = full.split('—').pop()?.trim();
    if (dashTail && dashTail !== full) {
      const tailRe = compileSubjectFilter(dashTail);
      if (tailRe) matchers.push(tailRe);
    }

    return matchers;
  }

  async mailBodyMatchesSubject(subjectText) {
    const matchers = this.buildSubjectBodyMatchers(subjectText);
    if (matchers.length === 0) return true;

    for (const re of matchers) {
      // eslint-disable-next-line no-await-in-loop
      if (await this.mailBodyContainsText(re)) return true;
    }
    return false;
  }

  /**
   * Refresh Yopmail until a new PO email appears, open it, click View PO.
   * @param {{ subjectContains?: string }} [options]
   * @returns {import('playwright').Page} Vendor portal page (new tab or same tab).
   */
  async waitOpenPoMessageAndClickViewPo(options = {}) {
    // eslint-disable-next-line no-console
    console.log('[PO Yopmail] Refreshing inbox until new PO email arrives…');

    await this.page.bringToFront().catch(() => {});
    await this.ensureInboxIframe(20000).catch(() => {});

    const hint = getMailHintRegex();
    const subjectText = String(options.subjectContains || '').trim();
    const burstN = Math.max(3, Math.min(this.initialRefreshBurstCount || 4, 6));
    const deadline = Date.now() + this.inboxTimeoutMs;
    let refreshCount = 0;
    /** @type {Set<string>} */
    let seen = new Set();

    while (Date.now() < deadline) {
      refreshCount += 1;
      await this.refreshInbox();
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(
        refreshCount <= burstN ? this.refreshBurstDelayMs : 700
      );

      const inbox = this.inboxFrame();
      if (refreshCount === 1) {
        seen = await this.snapshotInboxRowSignatures(inbox, 15).catch(() => new Set());
      }

      if (refreshCount === 1 || refreshCount % 6 === 0) {
        // eslint-disable-next-line no-console
        console.log(`[PO Yopmail] Inbox refreshed (#${refreshCount}) — checking for new PO mail…`);
      }

      const opened = await this.openNewestMatchingPoMailRow(inbox, hint, null, seen);
      if (!opened) {
        continue;
      }

      if (subjectText) {
        const matchesBody = await this.mailBodyMatchesSubject(subjectText);
        if (!matchesBody) {
          // eslint-disable-next-line no-console
          console.log(
            '[PO Yopmail] Opened mail but body did not match this run — refreshing again.'
          );
          continue;
        }
      }

      // eslint-disable-next-line no-console
      console.log('[PO Yopmail] Opened PO email — clicking View PO.');
      return this.clickViewPoAndResolveVendorPortalPage();
    }

    const extra = subjectText ? ` with subject containing "${subjectText}"` : '';
    throw new Error(
      `No purchase-order email matched ${hint}${extra} in Yopmail within ${this.inboxTimeoutMs}ms.`
    );
  }

  async clickViewPoAndResolveVendorPortalPage() {
    const ifmail = this.mailFrame();
    const viewLabel = /view\s*po|view\s*purchase\s*order|open\s*po/i;

    const candidates = [
      ifmail.getByRole('link', { name: viewLabel }).first(),
      ifmail.getByRole('button', { name: viewLabel }).first(),
      ifmail.locator('a').filter({ hasText: viewLabel }).first(),
      ifmail.locator('a').filter({ hasText: /^view$/i }).first(),
      ifmail.locator('a[href]').filter({ hasText: /view|open/i }).first(),
    ];

    const resolveVisibleView = async () => {
      for (const c of candidates) {
        // eslint-disable-next-line no-await-in-loop
        if (await c.isVisible({ timeout: 800 }).catch(() => false)) {
          return c;
        }
      }
      return null;
    };

    const deadline = Date.now() + 60000;
    /** @type {import('@playwright/test').Locator | null} */
    let viewPo = null;
    while (Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      viewPo = await resolveVisibleView();
      if (viewPo) break;
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(300);
    }

    if (!viewPo) {
      throw new Error('Yopmail mail opened but "View PO" button/link was not found.');
    }

    await viewPo.scrollIntoViewIfNeeded().catch(() => {});

    const ctx = this.page.context();
    const popupPromise = ctx.waitForEvent('page', { timeout: 25000 }).catch(() => null);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await viewPo.click(attempt === 0 ? { timeout: 15000 } : { timeout: 15000, force: true });
        break;
      } catch {
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(450);
        if (attempt === 2) {
          await viewPo.click({ timeout: 15000, force: true }).catch(async () => {
            const clicked = await this.page
              .frame({ name: 'ifmail' })
              ?.evaluate(() => {
                const re = /view\s*po|view\s*purchase\s*order|open\s*po/i;
                const anchors = Array.from(document.querySelectorAll('a,button'));
                const el =
                  anchors.find((a) => re.test((a.textContent || '').trim())) ||
                  anchors.find((a) => /view|open/i.test((a.textContent || '').trim()));
                if (el) {
                  el.click();
                  return true;
                }
                return false;
              })
              .catch(() => false);
            if (!clicked) {
              throw new Error('Could not click View PO inside Yopmail mail iframe.');
            }
          });
        }
      }
    }

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      await popup.bringToFront().catch(() => {});
      // eslint-disable-next-line no-console
      console.log('[PO Yopmail] Vendor portal opened in new browser tab.');
      return popup;
    }

    await this.page
      .waitForURL((u) => !String(u).toLowerCase().includes('yopmail.com'), {
        timeout: 90000,
      })
      .catch(async () => {
        await viewPo.click({ timeout: 15000, force: true }).catch(() => {});
        await this.page.waitForURL(
          (u) => !String(u).toLowerCase().includes('yopmail.com'),
          { timeout: 90000 }
        );
      });

    await this.page.bringToFront().catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[PO Yopmail] Vendor portal opened in current tab.');
    return this.page;
  }
}

module.exports = { PurchaseOrderVendorYopmailPage, yopmailLocalPart };
