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

function escapeRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip relative times so the same mail does not look "new" on every refresh
 * ("5 min ago" → "6 min ago" was causing old PO mails to be opened).
 */
function normalizeInboxFingerprint(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(
      /\b\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?)\b/gi,
      ''
    )
    .replace(/\b\d+\s*[smhd]\b/gi, '')
    .replace(/\b(ago|just now|today|yesterday|now)\b/gi, '')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, 140);
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
    // Let inbox paint before snapshotting baseline.
    await this.page.waitForTimeout(1200);
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

  inboxRowLocator() {
    return this.inboxFrame().locator(
      'div.m[id], div.m, button.lm, a.lm, div.lm'
    );
  }

  /**
   * Snapshot inbox state before Send so we can detect a newly arrived mail.
   * Uses DOM ids when present + time-normalized text fingerprints.
   * @returns {Promise<{ count: number, ids: string[], fingerprints: string[] }>}
   */
  async snapshotInboxState() {
    await this.refreshInbox().catch(() => {});
    await this.page.waitForTimeout(800);
    const rows = this.inboxRowLocator();
    const count = await rows.count().catch(() => 0);
    const ids = [];
    const fingerprints = [];
    for (let i = 0; i < Math.min(count, 30); i++) {
      const row = rows.nth(i);
      const id = String((await row.getAttribute('id').catch(() => '')) || '').trim();
      const text = (await row.innerText().catch(() => '')) || '';
      const fp = normalizeInboxFingerprint(text);
      if (id) ids.push(id);
      if (fp) fingerprints.push(fp);
    }
    return { count, ids, fingerprints };
  }

  /** @deprecated use snapshotInboxState().fingerprints */
  async snapshotInboxFingerprints() {
    const state = await this.snapshotInboxState();
    return state.fingerprints;
  }

  async readOpenMailBodyText() {
    const ifmail = this.mailFrame();
    const body = ifmail.locator('body');
    if (await body.isVisible({ timeout: 5000 }).catch(() => false)) {
      return ((await body.innerText().catch(() => '')) || '').trim();
    }
    return ((await ifmail.locator(':root').innerText().catch(() => '')) || '').trim();
  }

  async openMailBodyMatchesExpected(expectedTitle) {
    const title = String(expectedTitle || '').trim();
    if (!title) return true;
    const body = await this.readOpenMailBodyText();
    if (!body) return false;
    const titleRe = new RegExp(escapeRegExp(title), 'i');
    if (titleRe.test(body)) return true;
    // Some templates only show PO number / generic "Purchase Order" — allow if body is clearly a PO
    // but caller should prefer title match. Return false so we keep waiting for the right mail.
    return false;
  }

  /**
   * Poll inbox after Send: refresh until the **top** mail changes vs pre-send baseline
   * (or a new DOM id appears), open that newest mail, click View PO.
   */
  async waitOpenPoMessageAndClickViewPo(opts = {}) {
    const hint = getMailHintRegex();
    const deadline = Date.now() + this.inboxTimeoutMs;
    const expectedPoTitle = String(opts.expectedPoTitle || '').trim();
    const baseline = opts.baseline || {};
    const baselineIds = new Set(
      (baseline.ids || []).map((id) => String(id || '').trim()).filter(Boolean)
    );
    const baselineTopId = String((baseline.ids || [])[0] || '').trim();
    const baselineTopFp = normalizeInboxFingerprint(
      (baseline.fingerprints || [])[0] || ''
    );
    const baselineCount = Number(baseline.count || 0);

    // eslint-disable-next-line no-console
    console.log(
      `[Yopmail] Waiting for newest mail after send` +
        `${expectedPoTitle ? ` (expect title "${expectedPoTitle}")` : ''}` +
        ` baselineTopId=${baselineTopId || '(none)'} count=${baselineCount}`
    );

    const readTop = async () => {
      const rows = this.inboxRowLocator();
      const count = await rows.count().catch(() => 0);
      if (count < 1) return null;
      const top = rows.first();
      if (!(await top.isVisible({ timeout: 1500 }).catch(() => false))) return null;
      const id = String((await top.getAttribute('id').catch(() => '')) || '').trim();
      const text = ((await top.innerText().catch(() => '')) || '').trim();
      return {
        row: top,
        id,
        text,
        fp: normalizeInboxFingerprint(text),
        count,
      };
    };

    while (Date.now() < deadline) {
      if (this.page.isClosed()) {
        throw new Error('Yopmail page was closed while waiting for new PO mail');
      }

      await this.refreshInbox().catch(() => {});
      await this.page.waitForTimeout(1200);

      const titleRe = expectedPoTitle
        ? new RegExp(escapeRegExp(expectedPoTitle), 'i')
        : null;

      // Prefer any inbox row that already shows the expected PO title (newest match first).
      if (titleRe) {
        const titledRows = this.inboxRowLocator().filter({ hasText: titleRe });
        const titledCount = await titledRows.count().catch(() => 0);
        for (let i = 0; i < Math.min(titledCount, 5); i++) {
          const row = titledRows.nth(i);
          if (!(await row.isVisible({ timeout: 600 }).catch(() => false))) continue;
          const id = String((await row.getAttribute('id').catch(() => '')) || '').trim();
          const text = ((await row.innerText().catch(() => '')) || '').trim();
          const fp = normalizeInboxFingerprint(text);
          const isOldId = id && baselineIds.has(id);
          // Open if new id, OR top-ish titled mail after send (allow first titled if unique title).
          if (isOldId && baselineIds.size > 0) {
            continue;
          }
          // eslint-disable-next-line no-console
          console.log(
            `[Yopmail] Opening titled PO mail #${i + 1} id=${id || '(none)'} fp="${fp.slice(0, 70)}"`
          );
          await row.click({ force: true });
          await this.page.waitForTimeout(900);
          const ifmail = this.mailFrame();
          const viewPo = ifmail
            .getByRole('link', { name: /view\s*po/i })
            .or(ifmail.getByRole('button', { name: /view\s*po/i }))
            .or(ifmail.locator('a').filter({ hasText: /view\s*po/i }))
            .first();
          if (await viewPo.isVisible({ timeout: 8000 }).catch(() => false)) {
            if (await this.openMailBodyMatchesExpected(expectedPoTitle)) {
              console.log(`[Yopmail] Mail body matches PO title "${expectedPoTitle}"`);
            }
            return this.clickViewPoAndResolveVendorPortalPage();
          }
          console.log('[Yopmail] Titled row has no View PO — try next / refresh');
        }
      }

      const top = await readTop();
      if (!top) continue;

      const titleOnTop = titleRe ? titleRe.test(top.text) : false;
      const topIsNewId =
        Boolean(top.id) && (baselineIds.size === 0 || !baselineIds.has(top.id));
      // Title on top only counts when the row id is new (unique PO title per run).
      const titledNewOnTop = titleOnTop && topIsNewId;
      const topChanged =
        (baselineTopId && top.id && top.id !== baselineTopId) ||
        (baselineTopFp && top.fp && top.fp !== baselineTopFp) ||
        topIsNewId ||
        (baselineCount > 0 && top.count > baselineCount) ||
        titledNewOnTop;

      const looksLikePo = hint.test(top.text) || /purchase|order|\bpo\b/i.test(top.text);
      if (!topChanged && baselineIds.size + baselineCount > 0) {
        console.log(
          `[Yopmail] Still waiting — top id=${top.id || '(none)'} fp="${top.fp.slice(0, 50)}"`
        );
        continue;
      }

      if (!looksLikePo && !titledNewOnTop && topChanged) {
        console.log('[Yopmail] Top mail changed but snippet weak — opening anyway');
      } else if (!looksLikePo && !titledNewOnTop && !topChanged) {
        continue;
      }

      console.log(
        `[Yopmail] Opening newest mail id=${top.id || '(none)'} fp="${top.fp.slice(0, 70)}"`
      );
      await top.row.click({ force: true });
      await this.page.waitForTimeout(1000);

      if (expectedPoTitle) {
        const matches = await this.openMailBodyMatchesExpected(expectedPoTitle);
        console.log(
          matches
            ? `[Yopmail] Mail body matches PO title "${expectedPoTitle}"`
            : `[Yopmail] Newest mail body missing title "${expectedPoTitle}" — checking View PO anyway`
        );
      }

      const ifmail = this.mailFrame();
      const viewPo = ifmail
        .getByRole('link', { name: /view\s*po/i })
        .or(ifmail.getByRole('button', { name: /view\s*po/i }))
        .or(ifmail.locator('a').filter({ hasText: /view\s*po/i }))
        .first();

      if (!(await viewPo.isVisible({ timeout: 8000 }).catch(() => false))) {
        console.log('[Yopmail] No View PO in opened mail — refresh and retry');
        continue;
      }

      return this.clickViewPoAndResolveVendorPortalPage();
    }

    throw new Error(
      `Yopmail: no new PO mail appeared at the top of the inbox within ${this.inboxTimeoutMs}ms` +
        `${expectedPoTitle ? ` (title "${expectedPoTitle}")` : ''}.`
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

module.exports = {
  PurchaseOrderVendorYopmailPage,
  yopmailLocalPart,
  normalizeInboxFingerprint,
};
