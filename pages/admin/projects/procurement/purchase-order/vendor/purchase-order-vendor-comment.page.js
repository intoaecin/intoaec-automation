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

  getCommentPlaceholderRegex() {
    const phRaw = String(process.env.PO_VENDOR_COMMENT_PLACEHOLDER || '').trim();
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
   * Vendor PO line items: comment icon is usually on each row (often last / amount-adjacent cell).
   * Opens popover or dialog for that line.
   * @returns {boolean} true if a comment control was opened
   */
  async openLineItemCommentOnFirstRow() {
    const p = this.page;

    const openTopCommentIconIfPresent = async () => {
      // Some vendor portals require clicking a top-level comment icon first,
      // then the per-line-item comment icons become visible in the table.
      const headerRegion = p.locator('header, [role="banner"]').first();
      const scopes = [headerRegion, p];

      /** @type {import('@playwright/test').Locator[]} */
      const candidates = [];
      for (const scope of scopes) {
        candidates.push(
          scope.getByRole('button', { name: /comment|comments|chat|message/i }).first(),
          scope.locator('button[aria-label*="comment" i], button[title*="comment" i]').first(),
          scope
            .locator(
              'button:has(svg[data-testid*="Comment" i]), button:has(svg[data-testid*="Chat" i]), button:has(svg[data-testid*="ModeComment" i]), button:has(svg[data-testid*="Forum" i])'
            )
            .first(),
          scope
            .locator(
              'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i], svg[data-testid*="Forum" i]'
            )
            .first()
            .locator('xpath=ancestor::button[1]')
        );
      }

      for (const c of candidates) {
        try {
          if (await c.isVisible({ timeout: 1200 }).catch(() => false)) {
            await c.scrollIntoViewIfNeeded().catch(() => {});
            await c.click({ timeout: 5000, force: true });
            await p.waitForTimeout(500);
            return true;
          }
        } catch {
          /* next */
        }
      }
      return false;
    };

    const safeClick = async (loc, opts = {}) => {
      try {
        if (!(await loc.isVisible({ timeout: 1200 }).catch(() => false))) return false;
        await loc.scrollIntoViewIfNeeded().catch(() => {});
        await loc.click({ timeout: 5000, ...opts });
        return true;
      } catch {
        return false;
      }
    };

    const clickSvgClosestAction = async (row) => {
      // Sometimes the icon isn't a <button>; it's an svg inside a span/div.
      const svgs = row.locator(
        'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i], svg[data-testid*="Sms" i], svg[data-testid*="Forum" i], svg[aria-label*="comment" i], svg[title*="comment" i]'
      );
      const n = await svgs.count();
      for (let i = 0; i < Math.min(n, 6); i++) {
        const svg = svgs.nth(i);
        if (!(await svg.isVisible({ timeout: 1200 }).catch(() => false))) continue;
        // Prefer clicking the nearest actionable ancestor.
        const btn = svg.locator('xpath=ancestor::button[1]');
        if (await safeClick(btn, { force: true })) return true;
        const roleBtn = svg.locator('xpath=ancestor::*[@role="button"][1]');
        if (await safeClick(roleBtn, { force: true })) return true;
        const clickable = svg.locator('xpath=ancestor::a[1] | ancestor::div[1] | ancestor::span[1]');
        if (await safeClick(clickable.first(), { force: true })) return true;
        // Last resort: click the svg itself
        if (await safeClick(svg, { force: true })) return true;
      }
      return false;
    };

    /**
     * @param {import('@playwright/test').Locator} row
     */
    const getRowCommentIconCandidates = async (row) => {
      const nTd = await row.locator('td').count();
      const nGrid = await row.locator('[role="gridcell"]').count();
      const n = nTd > 0 ? nTd : nGrid;
      const cell = nTd > 0 ? (i) => row.locator('td').nth(i) : (i) => row.locator('[role="gridcell"]').nth(i);
      /** @type {import('@playwright/test').Locator[]} */
      const lastCells = [];
      if (n >= 1) {
        lastCells.push(cell(n - 1));
      }
      if (n >= 2) {
        lastCells.push(cell(n - 2));
      }
      return [
        row.getByRole('button', { name: /comment/i }),
        row.locator('button[aria-label*="comment" i]'),
        row.locator('button[title*="comment" i]'),
        row.locator('a[aria-label*="comment" i]'),
        row
          .locator(
            'button:has(svg[data-testid*="Comment" i]), button:has(svg[data-testid*="Chat" i]), button:has(svg[data-testid*="ModeComment" i]), button:has(svg[data-testid*="Sms" i]), button:has(svg[data-testid*="Forum" i])'
          )
          .first(),
        ...lastCells.map((cell) =>
          cell.locator('button, a[role="button"]').first()
        ),
        row.locator('td:last-child .MuiIconButton-root, [role="gridcell"]:last-child .MuiIconButton-root').first(),
        // Icon-only within the last/second-last cell
        ...lastCells.map((c) => c.locator('svg, button svg').first()),
      ];
    };

    const tryClickCommentIconsOnRow = async (row) => {
      // First attempt: click via SVG -> closest button/role=button
      if (await clickSvgClosestAction(row)) {
        await p.waitForTimeout(450);
        return true;
      }
      const candidates = await getRowCommentIconCandidates(row);
      for (const cand of candidates) {
        try {
          if (await cand.isVisible({ timeout: 2000 }).catch(() => false)) {
            await cand.click({ timeout: 5000, force: true });
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
      for (let i = 0; i < Math.min(n, 12); i++) {
        const row = rowLocator.nth(i);
        if (!(await row.isVisible({ timeout: 1500 }).catch(() => false))) {
          continue;
        }
        const cellCount = await row.locator('td, [role="gridcell"]').count();
        if (cellCount < 2) {
          continue;
        }

        await row.scrollIntoViewIfNeeded().catch(() => {});
        // Your UI: comment icon appears only after selecting the line item.
        await row.click({ timeout: 5000 }).catch(() => {});
        await row.hover({ timeout: 5000 }).catch(() => {});
        await p.waitForTimeout(350);

        // Prefer the actually-selected row if aria-selected is used.
        const selectedRow = p
          .locator('tr[aria-selected="true"], [role="row"][aria-selected="true"]')
          .first();

        // Retry a few times to allow the action/icon to render next to the amount column.
        for (let attempt = 0; attempt < 3; attempt++) {
          const target =
            (await selectedRow.isVisible({ timeout: 800 }).catch(() => false)) ? selectedRow : row;

          if (await tryClickCommentIconsOnRow(target)) {
            return true;
          }

          // If the per-row icon depends on a top toolbar toggle, retry it once.
          if (attempt === 1) {
            await openTopCommentIconIfPresent().catch(() => {});
          }

          await target.hover({ timeout: 3000 }).catch(() => {});
          await p.waitForTimeout(400);
        }
      }
      return false;
    };

    // First: click top-of-page comment icon if it exists (enables table icons).
    await openTopCommentIconIfPresent().catch(() => {});

    const tableBodyRows = p.locator('table tbody tr').filter({
      has: p.locator('td'),
    });
    if (await tableBodyRows.count() > 0) {
      if (await tryRows(tableBodyRows)) {
        return true;
      }
    }

    const gridRows = p
      .getByRole('row')
      .filter({ has: p.getByRole('gridcell') })
      .filter({ hasNot: p.locator('[role="columnheader"]') });
    if (await gridRows.count() > 0) {
      if (await tryRows(gridRows)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Dialog, MUI popover/menu paper, then full page — wherever the line-item comment UI opened.
   */
  async collectCommentFillRoots() {
    const p = this.page;
    /** @type {import('@playwright/test').Locator[]} */
    const roots = [];
    const dialog = p.getByRole('dialog').first();
    if (await dialog.isVisible({ timeout: 4000 }).catch(() => false)) {
      roots.push(dialog);
    }
    const papers = p.locator(
      '.MuiPopover-paper, .MuiMenu-paper, .MuiDialog-paper, .MuiModal-root .MuiPaper-root'
    );
    const pc = await papers.count();
    for (let i = pc - 1; i >= 0; i--) {
      const paper = papers.nth(i);
      if (await paper.isVisible({ timeout: 600 }).catch(() => false)) {
        roots.push(paper);
        break;
      }
    }
    const popoverRoots = p.locator('.MuiPopover-root, .MuiModal-root, [role="presentation"]');
    const rc = await popoverRoots.count();
    for (let i = rc - 1; i >= 0; i--) {
      const r = popoverRoots.nth(i);
      if (await r.isVisible({ timeout: 400 }).catch(() => false)) {
        roots.push(r);
        break;
      }
    }
    roots.push(p);
    return roots;
  }

  async fillCommentFieldInRoot(text) {
    const value = String(text);
    const roots = await this.collectCommentFillRoots();
    const placeholderRe = this.getCommentPlaceholderRegex();

    for (const scope of roots) {
      const fields = [
        scope.getByPlaceholder(placeholderRe),
        scope.getByRole('textbox', { name: /comment|note|message|remark/i }),
        scope.getByRole('textbox').filter({ hasText: /comment|note|message|remark/i }).first(),
        scope.locator('textarea').first(),
        scope.locator('input:not([type="hidden"])').first(),
        scope.locator('[contenteditable="true"]').first(),
      ];
      for (const field of fields) {
        try {
          await field.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
          if (!(await field.isVisible({ timeout: 5000 }).catch(() => false))) {
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
            await this.page.keyboard.type(value, { delay: 12 });
          } else {
            await field.click({ timeout: 5000 });
            await field.fill(value);
          }
          return true;
        } catch {
          /* next */
        }
      }
    }
    return false;
  }

  /**
   * Many UIs: primary "Save" then confirm "Save comment" (or a single combined button).
   */
  async clickSaveCommentButtons() {
    const p = this.page;
    const dialog = p.getByRole('dialog').first();
    let root = p;
    if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      root = dialog;
    } else {
      const papers = p.locator(
        '.MuiPopover-paper, .MuiMenu-paper, .MuiDialog-paper, .MuiModal-root .MuiPaper-root'
      );
      const pc = await papers.count();
      for (let i = pc - 1; i >= 0; i--) {
        const paper = papers.nth(i);
        if (await paper.isVisible({ timeout: 800 }).catch(() => false)) {
          root = paper;
          break;
        }
      }
    }

    const savePlain = root
      .getByRole('button', { name: /^save$/i })
      .filter({ hasNotText: /cancel|close|discard/i });
    const saveComment = root.getByRole('button', { name: /save comment/i });

    // Prefer the explicit "Save comment" button (your popup flow).
    const saveCommentGlobal = p.getByRole('button', { name: /save comment/i }).first();
    if (await saveCommentGlobal.isVisible({ timeout: 8000 }).catch(() => false)) {
      await saveCommentGlobal.click();
      await p.waitForTimeout(500);
      return;
    }
    if (await saveComment.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveComment.first().click();
      await p.waitForTimeout(500);
      return;
    }

    if (await savePlain.first().isVisible({ timeout: 6000 }).catch(() => false)) {
      await savePlain.first().click();
      await p.waitForTimeout(500);
    }

    const anySave = root
      .getByRole('button', { name: /save/i })
      .filter({ hasNotText: /cancel|close|discard/i });
    const n = await anySave.count();
    for (let i = 0; i < n; i++) {
      const b = anySave.nth(i);
      if (await b.isVisible({ timeout: 2000 }).catch(() => false)) {
        const name = (await b.textContent().catch(() => '')) || '';
        if (/save comment/i.test(name)) {
          await b.click();
          await p.waitForTimeout(500);
          return;
        }
      }
    }

    if (await savePlain.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await savePlain.first().click();
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

    const openedLineComment = await this.openLineItemCommentOnFirstRow();
    if (openedLineComment) {
      // Give the popover/dialog a moment to render the editor.
      await this.page
        .waitForSelector('textarea, [contenteditable="true"], input:not([type="hidden"])', {
          state: 'visible',
          timeout: 7000,
        })
        .catch(() => {});
      const filled = await this.fillCommentFieldInRoot(text);
      if (filled) {
        await this.clickSaveCommentButtons();
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page
          .waitForLoadState('networkidle', { timeout: 20000 })
          .catch(() => {});
        await this.page.waitForTimeout(800);
        return;
      }
      // If icon click worked but editor wasn't found, fail fast with clear message.
      throw new Error(
        'Clicked line-item comment icon but could not find the comment editor. ' +
          'Set PO_VENDOR_COMMENT_SELECTOR to the editor CSS inside the popup, or PO_VENDOR_COMMENT_PLACEHOLDER.'
      );
    }

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
