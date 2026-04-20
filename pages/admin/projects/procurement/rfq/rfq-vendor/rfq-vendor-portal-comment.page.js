const BasePage = require('../../../../../BasePage');
const { expect } = require('@playwright/test');

/**
 * RFQ vendor portal: open the comment icon, add a comment, save it, and verify it appears.
 *
 * Optional env:
 * - RFQ_VENDOR_COMMENT_SELECTOR - CSS for the comment field
 * - RFQ_VENDOR_COMMENT_PLACEHOLDER - regex source / substring for placeholder text
 */
class RfqVendorPortalCommentPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
  }

  buildRandomRelevantComment() {
    const suffix = Math.random().toString(36).slice(2, 8);
    return `Vendor review note ${suffix}: pricing details will be shared after internal verification.`;
  }

  getCommentPlaceholderRegex() {
    const phRaw = String(process.env.RFQ_VENDOR_COMMENT_PLACEHOLDER || '').trim();
    let placeholderRe =
      /comment|note|message|remark|type\s*here|write|enter|your\s*response|add\s*a\s*comment/i;

    if (phRaw) {
      try {
        placeholderRe = new RegExp(phRaw, 'i');
      } catch {
        placeholderRe = new RegExp(phRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
    }

    return placeholderRe;
  }

  async settleVendorPortalPage() {
    await this.page.bringToFront();
    await this.page.waitForLoadState('domcontentloaded', { timeout: this.defaultTimeout });
    await this.page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  }

  async openCommentIcon() {
    const p = this.page;
    const customSel = String(process.env.RFQ_VENDOR_COMMENT_SELECTOR || '').trim();

    /** @type {import('@playwright/test').Locator[]} */
    const candidates = [];

    if (customSel) {
      candidates.push(p.locator(customSel).first());
    }

    candidates.push(
      p.getByRole('button', { name: /comment|comments|chat|message|note/i }).first(),
      p.getByRole('link', { name: /comment|comments|chat|message|note/i }).first(),
      p.locator('button[aria-label*="comment" i], button[title*="comment" i]').first(),
      p.locator('[aria-label*="comment" i], [title*="comment" i]').first(),
      p
        .locator(
          'button:has(svg[data-testid*="Comment" i]), button:has(svg[data-testid*="Chat" i]), button:has(svg[data-testid*="ModeComment" i]), button:has(svg[data-testid*="Forum" i])'
        )
        .first(),
      p
        .locator(
          'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i], svg[data-testid*="Forum" i]'
        )
        .first()
        .locator('xpath=ancestor::button[1]')
    );

    for (const candidate of candidates) {
      try {
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        if (await candidate.isVisible({ timeout: 4000 }).catch(() => false)) {
          await expect(candidate).toBeVisible({ timeout: 10000 });
          await candidate.click({ timeout: 10000, force: true }).catch(async () => {
            await candidate.click({ timeout: 10000, force: true });
          });
          return;
        }
      } catch {
        // Try next selector.
      }
    }

    throw new Error(
      'Could not find a Comment control on the RFQ vendor portal. ' +
        'Run headed, inspect the control, then set RFQ_VENDOR_COMMENT_SELECTOR.'
    );
  }

  /**
   * RFQ vendor line items: comment icon is usually on each row (often last / amount-adjacent cell).
   * Opens popover or dialog for that line.
   * @returns {boolean} true if a line-item comment control was opened
   */
  async openLineItemCommentOnFirstRow() {
    const p = this.page;

    const safeClick = async (loc, opts = {}) => {
      try {
        if (!(await loc.isVisible({ timeout: 1200 }).catch(() => false))) return false;
        await loc.scrollIntoViewIfNeeded().catch(() => {});
        await loc.click({ timeout: 8000, ...opts });
        return true;
      } catch {
        return false;
      }
    };

    const clickSvgClosestAction = async (row) => {
      const svgs = row.locator(
        'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i], svg[data-testid*="Sms" i], svg[data-testid*="Forum" i], svg[aria-label*="comment" i], svg[title*="comment" i]'
      );
      const n = await svgs.count();
      for (let i = 0; i < Math.min(n, 6); i += 1) {
        const svg = svgs.nth(i);
        if (!(await svg.isVisible({ timeout: 1200 }).catch(() => false))) continue;
        const btn = svg.locator('xpath=ancestor::button[1]');
        if (await safeClick(btn, { force: true })) return true;
        const roleBtn = svg.locator('xpath=ancestor::*[@role="button"][1]');
        if (await safeClick(roleBtn, { force: true })) return true;
        const clickable = svg.locator('xpath=ancestor::a[1] | ancestor::div[1] | ancestor::span[1]');
        if (await safeClick(clickable.first(), { force: true })) return true;
        if (await safeClick(svg, { force: true })) return true;
      }
      return false;
    };

    const getRowCommentIconCandidates = async (row) => {
      const nTd = await row.locator('td').count();
      const nGrid = await row.locator('[role="gridcell"]').count();
      const n = nTd > 0 ? nTd : nGrid;
      const cell = nTd > 0 ? (i) => row.locator('td').nth(i) : (i) => row.locator('[role="gridcell"]').nth(i);

      const lastCells = [];
      if (n >= 1) lastCells.push(cell(n - 1));
      if (n >= 2) lastCells.push(cell(n - 2));

      return [
        row.getByRole('button', { name: /comment/i }).first(),
        row.locator('button[aria-label*="comment" i]').first(),
        row.locator('button[title*="comment" i]').first(),
        row.locator('a[aria-label*="comment" i]').first(),
        row
          .locator(
            'button:has(svg[data-testid*="Comment" i]), button:has(svg[data-testid*="Chat" i]), button:has(svg[data-testid*="ModeComment" i]), button:has(svg[data-testid*="Sms" i]), button:has(svg[data-testid*="Forum" i])'
          )
          .first(),
        ...lastCells.map((c) => c.locator('button, a[role="button"]').first()),
        row.locator('td:last-child .MuiIconButton-root, [role="gridcell"]:last-child .MuiIconButton-root').first(),
        ...lastCells.map((c) => c.locator('svg, button svg').first()),
      ];
    };

    const tryClickCommentIconsOnRow = async (row) => {
      if (await clickSvgClosestAction(row)) {
        await p.waitForTimeout(450);
        return true;
      }
      const candidates = await getRowCommentIconCandidates(row);
      for (const cand of candidates) {
        try {
          if (await cand.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cand.click({ timeout: 8000, force: true });
            await p.waitForTimeout(450);
            return true;
          }
        } catch {
          /* next */
        }
      }
      return false;
    };

    const tryRows = async (rowLocator) => {
      const n = await rowLocator.count();
      for (let i = 0; i < Math.min(n, 12); i += 1) {
        const row = rowLocator.nth(i);
        if (!(await row.isVisible({ timeout: 1500 }).catch(() => false))) continue;
        const cellCount = await row.locator('td, [role="gridcell"]').count();
        if (cellCount < 2) continue;

        await row.scrollIntoViewIfNeeded().catch(() => {});
        await row.click({ timeout: 6000 }).catch(() => {});
        await row.hover({ timeout: 6000 }).catch(() => {});
        await p.waitForTimeout(350);

        const selectedRow = p
          .locator('tr[aria-selected="true"], [role="row"][aria-selected="true"]')
          .first();

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const target =
            (await selectedRow.isVisible({ timeout: 800 }).catch(() => false)) ? selectedRow : row;

          // eslint-disable-next-line no-await-in-loop
          if (await tryClickCommentIconsOnRow(target)) {
            return true;
          }
          // eslint-disable-next-line no-await-in-loop
          await target.hover({ timeout: 3000 }).catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          await p.waitForTimeout(400);
        }
      }
      return false;
    };

    const tableBodyRows = p.locator('table tbody tr').filter({ has: p.locator('td') });
    if ((await tableBodyRows.count().catch(() => 0)) > 0) {
      if (await tryRows(tableBodyRows)) return true;
    }

    const gridRows = p
      .getByRole('row')
      .filter({ has: p.getByRole('gridcell') })
      .filter({ hasNot: p.locator('[role="columnheader"]') });
    if ((await gridRows.count().catch(() => 0)) > 0) {
      if (await tryRows(gridRows)) return true;
    }

    return false;
  }

  async collectCommentFillRoots() {
    const p = this.page;
    /** @type {import('@playwright/test').Locator[]} */
    const roots = [];

    const dialog = p.getByRole('dialog').first();
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      roots.push(dialog);
    }

    const papers = p.locator(
      '.MuiPopover-paper, .MuiMenu-paper, .MuiDialog-paper, .MuiModal-root .MuiPaper-root'
    );
    const paperCount = await papers.count();
    for (let i = paperCount - 1; i >= 0; i--) {
      const paper = papers.nth(i);
      if (await paper.isVisible({ timeout: 800 }).catch(() => false)) {
        roots.push(paper);
        break;
      }
    }

    roots.push(p);
    return roots;
  }

  async fillCommentFieldInRoot(text) {
    const value = String(text);
    const placeholderRe = this.getCommentPlaceholderRegex();
    const roots = await this.collectCommentFillRoots();

    for (const scope of roots) {
      const fields = [
        scope.getByPlaceholder(placeholderRe).first(),
        scope.getByRole('textbox', { name: /comment|note|message|remark/i }).first(),
        scope.locator('textarea').first(),
        scope.locator('input:not([type="hidden"])').first(),
        scope.locator('[contenteditable="true"]').first(),
      ];

      for (const field of fields) {
        try {
          await field.scrollIntoViewIfNeeded().catch(() => {});
          if (!(await field.isVisible({ timeout: 5000 }).catch(() => false))) {
            continue;
          }

          const isContentEditable =
            (await field.getAttribute('contenteditable').catch(() => null)) === 'true';

          await field.click({ timeout: 5000 }).catch(() => {});
          if (isContentEditable) {
            await this.page.keyboard.press('Control+A').catch(() => {});
            await this.page.keyboard.press('Backspace').catch(() => {});
            await this.page.keyboard.type(value, { delay: 12 });
          } else {
            await field.fill('').catch(() => {});
            await field.fill(value);
          }
          return true;
        } catch {
          // Try next field.
        }
      }
    }

    return false;
  }

  async clickSaveCommentButton() {
    const p = this.page;
    const roots = await this.collectCommentFillRoots();

    for (const scope of roots) {
      const saveButtons = [
        scope.getByRole('button', { name: /save comment|save|submit|post|send|add comment/i }).first(),
        scope.locator('button[type="submit"]').first(),
      ];

      for (const button of saveButtons) {
        try {
          if (await button.isVisible({ timeout: 4000 }).catch(() => false)) {
            await button.click({ timeout: 10000, force: true }).catch(async () => {
              await button.click({ timeout: 10000, force: true });
            });
            return;
          }
        } catch {
          // Try next button.
        }
      }
    }

    await p.keyboard.press('Enter').catch(() => {});
  }

  async submitVendorComment(text) {
    await this.settleVendorPortalPage();
    await this.openCommentIcon();

    // Your UI: comment editor opens after clicking the line-item comment icon.
    await this.openLineItemCommentOnFirstRow().catch(() => false);

    const filled = await this.fillCommentFieldInRoot(text);
    if (!filled) {
      throw new Error(
        'Clicked RFQ vendor comment icon but could not find the comment editor. ' +
          'Set RFQ_VENDOR_COMMENT_SELECTOR or RFQ_VENDOR_COMMENT_PLACEHOLDER.'
      );
    }

    await this.clickSaveCommentButton();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }

  async expectCommentVisible(text) {
    const commentText = String(text).trim();
    await expect(this.page.getByText(commentText, { exact: false }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = { RfqVendorPortalCommentPage };
