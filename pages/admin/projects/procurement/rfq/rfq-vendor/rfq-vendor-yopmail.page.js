const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

function yopmailLocalPart(email) {
  const m = String(email || '').trim().match(/^([^@]+)@yopmail\.com$/i);
  return m ? m[1] : null;
}

function getMailHintRegex() {
  const raw = process.env.RFQ_YOPMAIL_MAIL_HINT_REGEX;
  if (raw) {
    try {
      return new RegExp(raw, 'i');
    } catch {
      /* fall through */
    }
  }
  return /rfq|request\s*for\s*quotation/i;
}

function compileSubjectFilter(pattern) {
  const s = String(pattern || '').trim();
  if (!s) return null;
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/** Yopmail inbox + reading RFQ mail + opening vendor portal from “View RFQ”. */
class RfqVendorYopmailPage extends BasePage {
  constructor(page) {
    super(page);
    this.inboxTimeoutMs = parseInt(
      process.env.RFQ_YOPMAIL_INBOX_TIMEOUT_MS || '180000',
      10
    );
    this.initialRefreshBurstCount = parseInt(
      process.env.RFQ_YOPMAIL_INITIAL_REFRESH_COUNT || '9',
      10
    );
    this.refreshBurstDelayMs = parseInt(
      process.env.RFQ_YOPMAIL_REFRESH_BURST_MS || '1200',
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
    if (!login) throw new Error('Yopmail inbox name is empty.');

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

  async refreshInboxBurst(count, delayBetweenMs) {
    const n = Math.max(0, Math.min(count, 20));
    for (let i = 0; i < n; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.refreshInbox();
      if (delayBetweenMs > 0 && i < n - 1) {
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(delayBetweenMs);
      }
    }
    if (n > 0) {
      await this.page.waitForTimeout(600);
    }
  }

  resolveSubjectFilter(explicitContains) {
    return (
      compileSubjectFilter(explicitContains) ||
      compileSubjectFilter(process.env.RFQ_YOPMAIL_SUBJECT_CONTAINS)
    );
  }

  rfqInboxRowLocator(inbox, hint, subjectRe) {
    // Prefer the unique RFQ title (subjectRe) when provided; it prevents opening older RFQ mails.
    let rows = inbox.locator('div.m, .lm, tr, .l');
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
    return q.isVisible({ timeout: 1500 }).catch(() => false);
  }

  async snapshotInboxRowSignatures(inbox, maxRows = 8) {
    const rows = inbox.locator('div.m, .lm, tr, .l');
    const n = Math.min(Math.max(0, maxRows), 20);
    /** @type {Set<string>} */
    const seen = new Set();
    for (let i = 0; i < n; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const t = await rows.nth(i).textContent().catch(() => '');
      const sig = String(t || '').replace(/\s+/g, ' ').trim();
      if (sig) seen.add(sig);
    }
    return seen;
  }

  async snapshotMatchingRowSignatures(inbox, hint, subjectRe, maxRows = 50) {
    const rows = this.rfqInboxRowLocator(inbox, hint, subjectRe);
    const total = await rows.count().catch(() => 0);
    const n = Math.min(Math.max(0, maxRows), Math.max(0, total));
    /** @type {Set<string>} */
    const seen = new Set();
    for (let i = 0; i < n; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const sig = await this.rowSignature(rows.nth(i));
      if (sig) seen.add(sig);
    }
    return seen;
  }

  async rowSignature(row) {
    const t = await row.textContent().catch(() => '');
    return String(t || '').replace(/\s+/g, ' ').trim();
  }

  async openNewestMatchingRfqMailRow(inbox, hint, subjectRe, previouslySeenSignatures) {
    // Find the first *unseen* matching row after refresh (prevents older mail selection).
    const rows = this.rfqInboxRowLocator(inbox, hint, subjectRe);
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

      // eslint-disable-next-line no-await-in-loop
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await row.click(attempt === 0 ? {} : { force: true });
        } catch {
          // eslint-disable-next-line no-await-in-loop
          await row.click({ force: true }).catch(() => {});
        }
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(700);

        // Ensure the mail iframe is rendering something (prevents “row click did nothing”).
        const viewish = await this.mailFrame()
          .locator('a,button')
          .filter({ hasText: /view|open/i })
          .first()
          .isVisible({ timeout: 800 })
          .catch(() => false);
        if (viewish) break;

        // eslint-disable-next-line no-await-in-loop
        await row.dblclick({ timeout: 5000 }).catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(600);
      }
      return true;
    }

    return false;
  }

  /**
   * Poll inbox: refresh + open the first matching row, then click View RFQ.
   * @param {{ subjectContains?: string }} [options]
   * @returns {import('playwright').Page} Vendor portal page (new tab or same tab).
   */
  async waitOpenRfqMessageAndClickViewRfq(options = {}) {
    const hint = getMailHintRegex();
    const subjectRe = this.resolveSubjectFilter(options.subjectContains);
    const inbox = this.inboxFrame();

    // IMPORTANT:
    // Yopmail's inbox list doesn't always show the full subject/title consistently.
    // So: refresh (8-9 initial), open the newest unseen RFQ mail, then validate the mail BODY contains the RFQ title.
    // Only then click View RFQ. This prevents opening older mail and avoids depending on inbox-row subject text.

    /** @type {Set<string>} */
    const seen = await this.snapshotInboxRowSignatures(inbox, 20).catch(() => new Set());

    const subjectText = String(options.subjectContains || '').trim();
    const subjectTextRe = subjectText ? new RegExp(subjectText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const burstN = Math.max(8, Math.min(this.initialRefreshBurstCount || 9, 9));
    const deadline = Date.now() + this.inboxTimeoutMs;

    let refreshCount = 0;
    while (Date.now() < deadline) {
      // Refresh cadence: do a tighter burst first, then keep refreshing every ~1.4s
      await this.refreshInbox();
      refreshCount += 1;
      await this.page.waitForTimeout(refreshCount <= burstN ? this.refreshBurstDelayMs : 1400);

      // If the inbox row includes the title, great—use it. Otherwise use the RFQ hint and validate via mail body.
      const opened = await this.openNewestMatchingRfqMailRow(
        inbox,
        hint,
        // do not require subjectRe in the row list; use hint-based rows if subject isn't visible in list
        null,
        seen
      );
      if (!opened) {
        continue;
      }

      if (subjectTextRe) {
        const matchesBody = await this.mailBodyContainsText(subjectTextRe);
        if (!matchesBody) {
          // Not the new RFQ mail for this run; continue refreshing.
          continue;
        }
      }

      return this.clickViewRfqAndResolveVendorPortalPage();
    }

    const extraMsg = subjectRe ? ` and subject containing ${subjectRe}` : subjectText ? ` and subject containing "${subjectText}"` : '';
    throw new Error(
      `No RFQ email matched ${hint}${extraMsg} in Yopmail within ${this.inboxTimeoutMs}ms.`
    );
  }

  async clickViewRfqAndResolveVendorPortalPage() {
    const ifmail = this.mailFrame();
    const viewLabel =
      /view\s*(rfq|request\s*for\s*quotation|quotation)|open\s*(rfq|quotation)/i;

    // Yopmail mail HTML varies; collect several candidates and click the first visible.
    const candidates = [
      ifmail.getByRole('link', { name: viewLabel }).first(),
      ifmail.getByRole('button', { name: viewLabel }).first(),
      ifmail.locator('a').filter({ hasText: viewLabel }).first(),
      ifmail.locator('a').filter({ hasText: /^view$/i }).first(),
      ifmail.locator('a').filter({ hasText: /^open$/i }).first(),
      // last resort: any anchor with href that doesn't look like yopmail chrome
      ifmail
        .locator('a[href]')
        .filter({ hasText: /view|open/i })
        .first(),
    ];

    const resolveVisibleView = async () => {
      for (const c of candidates) {
        // eslint-disable-next-line no-await-in-loop
        if (await c.isVisible({ timeout: 600 }).catch(() => false)) {
          return c;
        }
      }
      return null;
    };

    // Wait for the mail iframe content to render and a View/Open control to appear.
    // NOTE: `expect.poll` does not return the polled value; we must resolve it ourselves.
    const deadline = Date.now() + 120000;
    /** @type {import('@playwright/test').Locator | null} */
    let view = null;
    while (Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop
      view = await resolveVisibleView();
      if (view) break;
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(600);
    }
    if (!view) {
      throw new Error('Yopmail mail opened but "View RFQ" button/link was not found.');
    }

    await view.scrollIntoViewIfNeeded().catch(() => {});

    const ctx = this.page.context();
    const popupPromise = ctx.waitForEvent('page', { timeout: 20000 }).catch(() => null);

    // Click is occasionally swallowed by iframe overlays; retry with force.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await view.click(attempt === 0 ? { timeout: 15000 } : { timeout: 15000, force: true });
        break;
      } catch {
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(450);
        if (attempt === 2) {
          // eslint-disable-next-line no-await-in-loop
          await view.click({ timeout: 15000, force: true }).catch(async () => {
            // Absolute last resort: DOM click inside the iframe
            const clicked = await this.page
              .frame({ name: 'ifmail' })
              ?.evaluate(() => {
                const re = /view\s*(rfq|request\s*for\s*quotation|quotation)|open\s*(rfq|quotation)/i;
                const anchors = Array.from(document.querySelectorAll('a,button'));
                const el =
                  anchors.find((a) => re.test((a.textContent || '').trim())) ||
                  anchors.find((a) => /(view|open)/i.test((a.textContent || '').trim()));
                if (el) {
                  (el).click();
                  return true;
                }
                return false;
              })
              .catch(() => false);
            if (!clicked) throw new Error('Could not click View RFQ inside Yopmail mail iframe.');
          });
        }
      }
    }

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      return popup;
    }

    await this.page
      .waitForURL((u) => !String(u).toLowerCase().includes('yopmail.com'), {
        timeout: 180000,
      })
      .catch(async () => {
        await view.click({ timeout: 15000, force: true }).catch(() => {});
        await this.page.waitForURL(
          (u) => !String(u).toLowerCase().includes('yopmail.com'),
          { timeout: 180000 }
        );
      });

    return this.page;
  }
}

module.exports = { RfqVendorYopmailPage, yopmailLocalPart };

