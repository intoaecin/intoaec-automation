const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * Vendor portal: add / submit a comment on the PO.
 *
 * Optional env:
 * - PO_VENDOR_COMMENT_SELECTOR — CSS for the comment field (textarea, input, or contenteditable host)
 * - PO_VENDOR_COMMENT_PLACEHOLDER — substring or regex source for placeholder (e.g. "message|comment")
 */
class PurchaseOrderVendorCommentPage extends BasePage {
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

  async openCommentSectionIfNeeded() {
    const p = this.page;
    const tab = p
      .getByRole('tab', { name: /comment|discussion|notes|activity|messages|history/i })
      .first();
    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      await p.waitForTimeout(500);
    }

    const expanders = [
      p.getByRole('button', {
        name: /add comment|new comment|post comment|write comment|comments?|add note|reply/i,
      }),
      p.getByRole('button', { name: /expand|show more/i }),
    ];
    for (const loc of expanders) {
      const el = loc.first();
      if (await el.isVisible({ timeout: 2500 }).catch(() => false)) {
        await el.click();
        await p.waitForTimeout(500);
        break;
      }
    }
  }

  /**
   * @returns {import('@playwright/test').Locator[]}
   */
  commentFieldCandidates() {
    const p = this.page;
    const customSel = String(process.env.PO_VENDOR_COMMENT_SELECTOR || '').trim();
    const phRaw = String(process.env.PO_VENDOR_COMMENT_PLACEHOLDER || '').trim();

    /** @type {import('@playwright/test').Locator[]} */
    const list = [];

    if (customSel) {
      list.push(p.locator(customSel).first());
    }

    let placeholderRe =
      /comment|note|message|remark|type\s*here|write|enter|your\s*response|add\s*a\s*comment/i;
    if (phRaw) {
      try {
        placeholderRe = new RegExp(phRaw, 'i');
      } catch {
        placeholderRe = new RegExp(
          phRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'i'
        );
      }
    }

    list.push(
      p.getByRole('textbox', { name: /comment|note|message|remark/i }),
      p.getByPlaceholder(placeholderRe),
      p.locator('textarea[placeholder*="comment" i]'),
      p.locator('textarea[placeholder*="note" i]'),
      p.locator('textarea[placeholder*="message" i]'),
      p.locator('input[placeholder*="comment" i]'),
      p.locator('textarea.MuiInputBase-input'),
      p.locator('input.MuiInputBase-input:not([type="hidden"])'),
      p.locator(
        'input:not([type="hidden"]):not([type="search"]):not([type="checkbox"]):not([type="radio"])'
      ),
      p.locator('textarea'),
      p.locator('[contenteditable="true"]')
    );

    return list;
  }

  async fillCommentField(text) {
    const value = String(text);
    for (const field of this.commentFieldCandidates()) {
      try {
        await field.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
        if (!(await field.isVisible({ timeout: 6000 }).catch(() => false))) {
          continue;
        }
        const tag = await field.evaluate((el) => el.tagName).catch(() => '');
        const ce =
          tag === 'DIV' ||
          (await field.getAttribute('contenteditable').catch(() => null)) === 'true';
        if (ce) {
          await field.click({ timeout: 5000 });
          await field.evaluate((el) => {
            el.textContent = '';
          });
          await this.page.keyboard.type(value, { delay: 15 });
        } else {
          await field.click({ timeout: 5000 });
          await field.fill(value);
        }
        return;
      } catch {
        /* next candidate */
      }
    }

    throw new Error(
      'Could not find a comment field on the vendor portal. ' +
        'Open Comments tab if needed, then set PO_VENDOR_COMMENT_SELECTOR or PO_VENDOR_COMMENT_PLACEHOLDER.'
    );
  }

  async submitVendorComment(text) {
    await this.settleVendorPortalPage();
    await this.openCommentSectionIfNeeded();
    await this.fillCommentField(text);

    const p = this.page;
    const submit = p
      .getByRole('button', { name: /submit|send|post|save|add comment|post comment|add$/i })
      .filter({ hasNotText: /cancel/i })
      .first();

    if (await submit.isVisible({ timeout: 8000 }).catch(() => false)) {
      await submit.click();
    } else {
      const fallback = p
        .locator('button[type="submit"]')
        .filter({ visible: true })
        .first();
      if (await fallback.isVisible({ timeout: 5000 }).catch(() => false)) {
        await fallback.click();
      } else {
        await p.keyboard.press('Enter');
      }
    }

    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(800);
  }

  async expectCommentVisible(text) {
    const t = String(text).trim();
    await expect(this.page.getByText(t, { exact: false }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = { PurchaseOrderVendorCommentPage };
