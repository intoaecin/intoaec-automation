const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

function mailinatorLocalPart(emailOrInbox) {
  const raw = String(emailOrInbox || '').trim();
  if (!raw) return '';
  const m = raw.match(/^([^@]+)@mailinator\.com$/i);
  return (m ? m[1] : raw.replace(/@.*$/, '')).trim().toLowerCase();
}

function escapeRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Exact flow:
 * 1) Open Mailinator
 * 2) Enter inbox id bhavani123456
 * 3) Click GO
 * 4) Find just-received PO mail and click it
 * 5) Click View PO → Accept on vendor portal → (caller switches back to Admin)
 */
class PurchaseOrderVendorMailinatorPage extends BasePage {
  constructor(page) {
    super(page);
    this.inboxTimeoutMs = parseInt(
      process.env.PO_MAILINATOR_INBOX_TIMEOUT_MS || '180000',
      10
    );
  }

  log(msg) {
    // eslint-disable-next-line no-console
    console.log(`[Mailinator] ${msg}`);
  }

  inboxInput() {
    return this.page.locator('#inbox_field').first();
  }

  goButton() {
    return this.page
      .getByRole('button', { name: /^go$/i })
      .or(this.page.locator('button').filter({ hasText: /^go$/i }))
      .first();
  }

  /** 1–3: Open Mailinator → enter inbox id → click GO */
  async gotoInboxForLocalPart(localPart) {
    const inbox = mailinatorLocalPart(localPart);
    if (!inbox) throw new Error('Mailinator inbox id is empty');

    this.log('1) Open Mailinator');
    await this.page.goto('https://www.mailinator.com/v4/public/inboxes.jsp', {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await this.enterInboxIdAndClickGo(inbox);
  }

  async enterInboxIdAndClickGo(localPart) {
    const inbox = mailinatorLocalPart(localPart);
    if (!inbox) throw new Error('Mailinator inbox id is empty');

    // Message detail hides #inbox_field — leave detail first if needed.
    const back = this.page.getByText(/back to inbox/i).filter({ visible: true }).first();
    if (await back.isVisible({ timeout: 800 }).catch(() => false)) {
      await back.click({ timeout: 10000 }).catch(() => {});
      await this.page.waitForTimeout(800);
    }

    const input = this.inboxInput();
    // Field can be present but "hidden" in some layouts — use force fill if needed.
    if (!(await input.isVisible({ timeout: 5000 }).catch(() => false))) {
      await this.page.goto(
        `https://www.mailinator.com/v4/public/inboxes.jsp?to=${encodeURIComponent(inbox)}`,
        { waitUntil: 'domcontentloaded', timeout: 90000 }
      );
    }

    this.log(`2) Enter inbox id "${inbox}"`);
    await input.waitFor({ state: 'attached', timeout: 30000 });
    await input.click({ timeout: 10000, force: true }).catch(() => {});
    await input.fill(inbox, { force: true });

    this.log('3) Click GO');
    const go = this.goButton();
    await expect(go).toBeVisible({ timeout: 20000 });
    await go.click({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  async snapshotInboxState(localPart) {
    await this.enterInboxIdAndClickGo(localPart);
    const rows = this.page.locator('table tr').filter({ has: this.page.locator('td') });
    const n = await rows.count().catch(() => 0);
    const fingerprints = [];
    for (let i = 0; i < Math.min(n, 20); i++) {
      const t = ((await rows.nth(i).innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      if (!t || t === 'from subject received') continue;
      fingerprints.push(t.slice(0, 120));
    }
    this.log(`Baseline rows=${fingerprints.length}`);
    return { count: fingerprints.length, ids: [], fingerprints };
  }

  /** 4) Find just-received / titled PO row and click it */
  async findAndClickJustReceivedPoMail(expectedPoTitle, waitMs = 45000) {
    const title = String(expectedPoTitle || '').trim();
    const titleRe = title ? new RegExp(escapeRegExp(title), 'i') : null;
    const deadline = Date.now() + waitMs;

    this.log('4) Find just-received PO mail and click it');

    while (Date.now() < deadline) {
      if (this.page.isClosed()) throw new Error('Mailinator page closed');

      const rows = this.page
        .locator('table tr')
        .filter({ has: this.page.locator('td') })
        .filter({ visible: true });
      const count = await rows.count().catch(() => 0);

      let clickTarget = null;
      let reason = '';

      for (let i = 0; i < Math.min(count, 12); i++) {
        const row = rows.nth(i);
        const text = ((await row.innerText().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!text || /^from\s+subject\s+received$/i.test(text)) continue;

        const justNow = /just\s*now|a few seconds|seconds?\s*ago|\bminute\b/i.test(text);
        const titled = titleRe ? titleRe.test(text) : false;
        const goods = /goods\s*receipt/i.test(text);
        const poLike = /\bpo\b|purchase\s*order|next steps/i.test(text);

        if (titled) {
          clickTarget = row;
          reason = 'expected-title';
          break;
        }
        if (!clickTarget && justNow && (goods || poLike || titled)) {
          clickTarget = row;
          reason = 'just-received-po';
        }
        if (!clickTarget && justNow && /ashraf@|intoaec/i.test(text)) {
          clickTarget = row;
          reason = 'just-received-from-sender';
        }
      }

      if (clickTarget) {
        const text = ((await clickTarget.innerText().catch(() => '')) || '')
          .replace(/\s+/g, ' ')
          .trim();
        this.log(`Clicking ${reason}: "${text.slice(0, 100)}"`);
        const subjectTd = clickTarget.locator('td').nth(2);
        if (await subjectTd.isVisible({ timeout: 1000 }).catch(() => false)) {
          await subjectTd.click({ timeout: 15000 });
        } else {
          await clickTarget.click({ timeout: 15000 });
        }
        await this.page.waitForTimeout(1500);
        return true;
      }

      await this.page.waitForTimeout(1000);
    }

    this.log('Just-received PO mail not found in time');
    return false;
  }

  async ensureHtmlTab() {
    const htmlTab = this.page
      .getByRole('tab', { name: /^html$/i })
      .or(this.page.locator('a, button, li, span').filter({ hasText: /^HTML$/i }))
      .filter({ visible: true })
      .first();
    if (await htmlTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await htmlTab.click({ timeout: 8000 }).catch(() => {});
      await this.page.waitForTimeout(800);
    }
    await this.page
      .waitForSelector('iframe#html_msg_body, iframe[name="html_msg_body"], iframe#msg_body', {
        timeout: 20000,
      })
      .catch(() => {});
  }

  /**
   * 5) Click View PO in the open mail body (iframe), open vendor portal.
   */
  async clickViewPoAndOpenVendorPortal() {
    this.log('5) Click View PO');
    await this.ensureHtmlTab();

    // Prefer HTML body iframe (Mailinator message pane).
    const frameSelectors = [
      'iframe#html_msg_body',
      'iframe[name="html_msg_body"]',
      'iframe#msg_body',
      'iframe.mail-iframe',
    ];

    let viewPo = null;

    for (const sel of frameSelectors) {
      const fl = this.page.frameLocator(sel);
      const candidate = fl
        .getByRole('link', { name: /view\s*po/i })
        .or(fl.getByRole('button', { name: /view\s*po/i }))
        .or(fl.locator('a').filter({ hasText: /view\s*po/i }))
        .or(fl.getByText(/view\s*po/i))
        .first();
      if (await candidate.isVisible({ timeout: 3000 }).catch(() => false)) {
        viewPo = candidate;
        this.log(`View PO found in ${sel}`);
        break;
      }
    }

    // Scan all frames.
    if (!viewPo) {
      for (const frame of this.page.frames()) {
        try {
          const link = frame.locator('a, button').filter({ hasText: /view\s*po/i }).first();
          if (await link.isVisible({ timeout: 600 }).catch(() => false)) {
            viewPo = link;
            this.log(`View PO found in frame ${frame.url().slice(0, 60)}`);
            break;
          }
        } catch {
          /* ignore */
        }
      }
    }

    // LINKS tab fallback.
    if (!viewPo) {
      const linksTab = this.page
        .getByRole('tab', { name: /^links$/i })
        .or(this.page.getByText(/^links$/i))
        .filter({ visible: true })
        .first();
      if (await linksTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await linksTab.click().catch(() => {});
        await this.page.waitForTimeout(700);
        const link = this.page
          .locator('a[href*="http"]')
          .filter({ hasText: /view\s*po|click\.mailersend|vendor|purchase/i })
          .first();
        if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
          viewPo = link;
          this.log('View PO found on LINKS tab');
        }
      }
    }

    // Last resort: any visible "View PO" text on page.
    if (!viewPo) {
      const any = this.page.getByText(/view\s*po/i).filter({ visible: true }).first();
      if (await any.isVisible({ timeout: 3000 }).catch(() => false)) {
        viewPo = any;
      }
    }

    if (!viewPo || !(await viewPo.isVisible({ timeout: 5000 }).catch(() => false))) {
      throw new Error('View PO not found in Mailinator message body');
    }

    const ctx = this.page.context();
    const popupPromise = ctx.waitForEvent('page', { timeout: 25000 }).catch(() => null);
    await viewPo.click({ timeout: 20000, force: true });
    this.log('Clicked View PO');

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      await expect(
        popup.getByText(/purchase order|\bPO\b|accept/i).first()
      ).toBeVisible({ timeout: 90000 });
      this.log(`Vendor portal ready: ${popup.url()}`);
      return popup;
    }

    // Same-tab navigation or existing tab.
    const pages = ctx.pages().filter((p) => !p.isClosed());
    for (const p of pages) {
      const u = String(p.url() || '');
      if (/mailinator\.com/i.test(u)) continue;
      if (/vendor|aecplayhouse|purchase|po/i.test(u) || u.startsWith('http')) {
        await p.bringToFront().catch(() => {});
        await expect(
          p.getByText(/purchase order|\bPO\b|accept/i).first()
        ).toBeVisible({ timeout: 90000 });
        this.log(`Vendor portal ready (tab): ${p.url()}`);
        return p;
      }
    }

    await this.page.waitForURL(
      (u) => !String(u).toLowerCase().includes('mailinator.com'),
      { timeout: 60000 }
    );
    await expect(
      this.page.getByText(/purchase order|\bPO\b|accept/i).first()
    ).toBeVisible({ timeout: 90000 });
    return this.page;
  }

  /**
   * Full Mailinator path through View PO (Accept + Admin return are separate steps).
   */
  async waitOpenPoMessageAndClickViewPo(opts = {}) {
    const localPart = mailinatorLocalPart(opts.inbox || opts.localPart || '');
    if (!localPart) throw new Error('Mailinator inbox local-part is empty');
    const expectedPoTitle = String(opts.expectedPoTitle || '').trim();
    const deadline = Date.now() + this.inboxTimeoutMs;

    // Steps 1–3
    if (!/mailinator\.com/i.test(String(this.page.url() || ''))) {
      await this.gotoInboxForLocalPart(localPart);
    } else {
      await this.enterInboxIdAndClickGo(localPart);
    }

    let attempt = 0;
    while (Date.now() < deadline) {
      attempt += 1;
      // Step 4 — wait on current list (do not spam GO)
      const opened = await this.findAndClickJustReceivedPoMail(expectedPoTitle, 25000);
      if (opened) {
        // Step 5
        try {
          return await this.clickViewPoAndOpenVendorPortal();
        } catch (err) {
          this.log(`View PO failed (${err.message}) — Back to Inbox and retry`);
          const back = this.page.getByText(/back to inbox/i).filter({ visible: true }).first();
          if (await back.isVisible({ timeout: 2000 }).catch(() => false)) {
            await back.click().catch(() => {});
            await this.page.waitForTimeout(800);
          } else {
            await this.gotoInboxForLocalPart(localPart);
          }
          continue;
        }
      }

      this.log(`Attempt ${attempt}: mail not in list yet — enter id + GO again`);
      await this.enterInboxIdAndClickGo(localPart);
    }

    throw new Error(
      `Mailinator flow failed within ${this.inboxTimeoutMs}ms` +
        ` (inbox ${localPart}` +
        `${expectedPoTitle ? `, title "${expectedPoTitle}"` : ''}).`
    );
  }
}

module.exports = {
  PurchaseOrderVendorMailinatorPage,
  mailinatorLocalPart,
};
