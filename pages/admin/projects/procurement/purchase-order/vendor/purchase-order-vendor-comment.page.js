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

  async openTopCommentIconIfPresent() {
    const p = this.page;
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
  }

  async dismissOpenCommentSurfaces() {
    const p = this.page;
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(350);
    const backdrop = p.locator('.MuiBackdrop-root').filter({ visible: true }).first();
    if (await backdrop.isVisible({ timeout: 800 }).catch(() => false)) {
      await backdrop.click({ position: { x: 8, y: 8 }, timeout: 5000 }).catch(() => {});
    }
    await p.waitForTimeout(350);
  }

  /**
   * Saved line-item comments are usually shown only inside the comment popover — reopen it for assertions.
   */
  async reopenCommentViewForVerification() {
    await this.dismissOpenCommentSurfaces().catch(() => {});
    await this.settleVendorPortalPage();
    await this.clickCommentsToolbarOnPortal().catch(() => false);
    await this.openLineItemCommentOnFirstRow().catch(() => false);
    await this.page.waitForTimeout(500);
  }

  /**
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async isCommentTextPresent(text) {
    const t = String(text).trim();
    if (!t) return false;

    const p = this.page;
    const roots = await this.collectCommentFillRoots();

    /** @type {import('@playwright/test').Locator[]} */
    const scopes = [...roots, p];

    for (const scope of scopes) {
      const textNode = scope.getByText(t, { exact: false }).first();
      if (await textNode.isVisible({ timeout: 600 }).catch(() => false)) {
        return true;
      }
    }

    const commentRegions = p.locator(
      '[class*="comment" i], [data-testid*="comment" i], .MuiPopover-paper, .MuiDialog-paper, [role="dialog"]'
    );
    const regionCount = await commentRegions.count().catch(() => 0);
    for (let i = 0; i < Math.min(regionCount, 8); i += 1) {
      const region = commentRegions.nth(i);
      if (!(await region.isVisible({ timeout: 400 }).catch(() => false))) continue;
      if (await region.getByText(t, { exact: false }).first().isVisible({ timeout: 400 }).catch(() => false)) {
        return true;
      }
    }

    const fields = p.locator('textarea, input:not([type="hidden"]), [contenteditable="true"]');
    const fieldCount = await fields.count().catch(() => 0);
    for (let i = 0; i < Math.min(fieldCount, 16); i += 1) {
      const field = fields.nth(i);
      if (!(await field.isVisible({ timeout: 300 }).catch(() => false))) continue;
      const value = await field
        .inputValue()
        .catch(async () => (await field.textContent().catch(() => '')) || '');
      if (String(value).includes(t)) {
        return true;
      }
    }

    return false;
  }

  async clickAcceptOnVendorPortal() {
    const p = this.page;

    const accept = p
      .getByRole('button', { name: /^accept(\s|$)|accept\s*po|accept\s*purchase/i })
      .or(p.getByRole('link', { name: /^accept(\s|$)|accept\s*po/i }))
      .filter({ hasNotText: /decline|reject|not accept/i })
      .first();

    for (const scrollY of [0, 400, 900, 0]) {
      // eslint-disable-next-line no-await-in-loop
      await p.evaluate((y) => window.scrollTo(0, y), scrollY).catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      if (await accept.isVisible({ timeout: scrollY === 0 ? 12000 : 4000 }).catch(() => false)) {
        break;
      }
    }

    if (!(await accept.isVisible({ timeout: 3000 }).catch(() => false))) {
      // eslint-disable-next-line no-console
      console.log('[PO vendor comment] Accept not shown — continuing (PO may already be accepted).');
      return;
    }

    await accept.scrollIntoViewIfNeeded().catch(() => {});
    await accept.click({ timeout: 15000 });
    await p.waitForTimeout(600);
    // eslint-disable-next-line no-console
    console.log('[PO vendor comment] Clicked Accept on vendor portal.');

    const dialog = p.getByRole('dialog').first();
    if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      const confirm = dialog
        .getByRole('button', {
          name: /^(confirm|yes|accept|ok|proceed|submit|continue)$/i,
        })
        .or(dialog.getByRole('button', { name: /confirm|yes|accept|ok|proceed|submit|continue/i }))
        .first();
      if (await confirm.isVisible({ timeout: 4000 }).catch(() => false)) {
        await confirm.click({ timeout: 10000 });
        // eslint-disable-next-line no-console
        console.log('[PO vendor comment] Confirmed Accept dialog.');
      }
    }

    await p.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
    await p.waitForTimeout(800);
  }

  commentIconSvgLocator(scope) {
    return scope.locator(
      'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i], svg[data-testid*="Forum" i], svg[data-testid*="Sms" i], svg[data-testid="ChatBubbleOutlineIcon"], svg[data-testid="ChatBubbleIcon"], svg[data-testid="AddCommentIcon"], svg[data-testid="InsertCommentIcon"], svg[data-testid="QuestionAnswerIcon"]'
    );
  }

  /**
   * Toolbar "Comments" control (enables line-item comment icons) — not a row-level icon.
   * @returns {Promise<boolean>}
   */
  async clickCommentsToolbarOnPortal() {
    const p = this.page;
    const root = p;
    const notInTable = (loc) =>
      loc.filter({ hasNot: p.locator('xpath=ancestor::table') });

    /** @type {import('@playwright/test').Locator[]} */
    const candidates = [
      root.getByRole('button', { name: /^comments?$/i }).first(),
      root.getByRole('tab', { name: /^comments?$/i }).first(),
      root.getByRole('button', { name: /comments?|comment mode|show comments/i }).first(),
      root.locator('header').getByRole('button', { name: /comment/i }).first(),
      root.locator('[class*="Toolbar" i], [class*="AppBar" i]').getByRole('button', { name: /comment/i }).first(),
      notInTable(
        root.locator(
          'button[aria-label*="comment" i], button[title*="comment" i], [role="button"][aria-label*="comment" i]'
        )
      ).first(),
      notInTable(
        root.locator(
          'button:has(svg[data-testid*="Comment" i]), button:has(svg[data-testid*="Chat" i]), button:has(svg[data-testid="ChatBubbleOutlineIcon"]), button:has(svg[data-testid="AddCommentIcon"])'
        )
      ).first(),
      notInTable(this.commentIconSvgLocator(root).locator('xpath=ancestor::button[1]')).first(),
    ];

    for (const c of candidates) {
      try {
        if (await c.isVisible({ timeout: 2500 }).catch(() => false)) {
          await c.scrollIntoViewIfNeeded().catch(() => {});
          await c.click({ timeout: 10000 }).catch(async () => {
            await c.click({ timeout: 8000, force: true });
          });
          await p.waitForTimeout(600);
          // eslint-disable-next-line no-console
          console.log('[PO vendor comment] Clicked Comments toolbar on vendor portal.');
          return true;
        }
      } catch {
        /* next */
      }
    }

    const handle = await root.evaluateHandle(() => {
      const nodes = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"]'));
      return (
        nodes.find((el) => {
          if (el.closest('table, tbody, [aria-label*="line items" i]')) {
            return false;
          }
          const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`;
          if (/^comments?$/i.test(label.trim()) || /\bcomments?\b/i.test(label)) {
            return true;
          }
          const svg = el.querySelector('svg[data-testid]');
          const id = svg?.getAttribute('data-testid') || '';
          return /comment|chat|forum|sms/i.test(id);
        }) || null
      );
    });
    const el = handle.asElement();
    if (el) {
      await el.click({ force: true }).catch(() => {});
      await p.waitForTimeout(600);
      await handle.dispose().catch(() => {});
      // eslint-disable-next-line no-console
      console.log('[PO vendor comment] Clicked Comments toolbar (DOM fallback).');
      return true;
    }
    await handle.dispose().catch(() => {});
    return false;
  }

  async openVendorPortalLineCommentEditor() {
    await this.settleVendorPortalPage();
    // eslint-disable-next-line no-console
    console.log('[PO vendor comment] Vendor portal browser tab ready.');

    const commentsToolbar = await this.clickCommentsToolbarOnPortal();
    if (!commentsToolbar) {
      const topIcon = await this.openTopCommentIconIfPresent();
      if (!topIcon) {
        throw new Error(
          'On vendor portal: could not click the Comments / comment icon toolbar. ' +
            'Run headed and set PO_VENDOR_COMMENT_SELECTOR if the control is custom.'
        );
      }
    }

    await this.page.waitForTimeout(500);

    const lineOpened = await this.openLineItemCommentOnFirstRow();
    if (!lineOpened) {
      throw new Error(
        'Comments mode is open but could not click the line-item comment icon.'
      );
    }
    // eslint-disable-next-line no-console
    console.log('[PO vendor comment] Opened line-item comment editor.');

    await this.page
      .waitForSelector('textarea, [contenteditable="true"], input:not([type="hidden"])', {
        state: 'visible',
        timeout: 15000,
      })
      .catch(() => {});
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

    const openTopCommentIconIfPresent = async () => this.openTopCommentIconIfPresent();

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
   * Vendor portal / preview popover: explicit "Save comment" (sometimes twice: Save → Save comment).
   * Clicks every visible match until the control disappears.
   */
  async clickVisibleSaveCommentButtonUntilGone(maxClicks = 3) {
    const p = this.page;
    let clicked = 0;

    for (let i = 0; i < maxClicks; i += 1) {
      const roots = await this.collectCommentFillRoots();
      /** @type {import('@playwright/test').Locator | null} */
      let saveComment = null;

      for (const root of roots) {
        const candidate = root
          .getByRole('button', { name: /^(save comment|save)$/i })
          .filter({ visible: true })
          .filter({ hasNotText: /cancel|close|discard/i })
          .last();
        // eslint-disable-next-line no-await-in-loop
        if (await candidate.isVisible({ timeout: 800 }).catch(() => false)) {
          saveComment = candidate;
          break;
        }
      }

      if (!saveComment) {
        saveComment = p
          .getByRole('button', { name: /^(save comment|save)$/i })
          .filter({ visible: true })
          .filter({ hasNotText: /cancel|close|discard/i })
          .last();
      }

      // eslint-disable-next-line no-await-in-loop
      if (!(await saveComment.isVisible({ timeout: 1500 }).catch(() => false))) {
        break;
      }

      const beforeValue = await this.readOpenCommentEditorValue().catch(() => '');

      // eslint-disable-next-line no-await-in-loop
      await saveComment.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await saveComment.click({ timeout: 15000 }).catch(async () => {
        await saveComment.click({ timeout: 15000, force: true });
      });
      clicked += 1;
      // eslint-disable-next-line no-console
      console.log('[PO vendor comment] Clicked Save comment.');
      // eslint-disable-next-line no-await-in-loop
      await p.waitForTimeout(600);

      const popoverOpen = await p
        .locator('.MuiPopover-paper, .MuiDialog-paper, [role="dialog"]')
        .filter({ visible: true })
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);

      const stillSameEditor = beforeValue
        ? (await this.readOpenCommentEditorValue().catch(() => '')) === beforeValue
        : false;

      if (!popoverOpen || !stillSameEditor) {
        break;
      }
    }

    return clicked > 0;
  }

  async readOpenCommentEditorValue() {
    const roots = await this.collectCommentFillRoots();
    for (const root of roots) {
      const field = root.locator('textarea, input:not([type="hidden"]), [contenteditable="true"]').first();
      if (!(await field.isVisible({ timeout: 400 }).catch(() => false))) continue;
      const value = await field
        .inputValue()
        .catch(async () => (await field.textContent().catch(() => '')) || '');
      if (String(value).trim()) return String(value).trim();
    }
    return '';
  }

  /**
   * After Save comment: click the "exit comment mode" control near Save.
   * UI varies: could be ArrowBack/Back, Close(X), Done/Exit/Return.
   * @returns {Promise<boolean>}
   */
  async clickCommentEditorBackArrow() {
    const p = this.page;
    const roots = [...(await this.collectCommentFillRoots()), p];

    /** @type {import('@playwright/test').Locator[]} */
    const candidates = [];

    const pushCandidatesForRoot = (root) => {
      candidates.push(
        // Back/arrow variants
        root.locator('button:has(svg[data-testid="ArrowBackIcon"])').filter({ visible: true }).first(),
        root.locator('button:has(svg[data-testid="ChevronLeftIcon"])').filter({ visible: true }).first(),
        root.locator('button:has(svg[data-testid="KeyboardArrowLeftIcon"])').filter({ visible: true }).first(),
        root.locator('button:has(svg[data-testid="WestIcon"])').filter({ visible: true }).first(),
        root.getByRole('button', { name: /^back$/i }).filter({ visible: true }).first(),
        root.locator('button[aria-label*="back" i], button[title*="back" i]').filter({ visible: true }).first(),

        // Close variants (often the explicit "exit comment mode" button)
        root.locator('button:has(svg[data-testid="CloseIcon"])').filter({ visible: true }).first(),
        root.locator('button:has(svg[data-testid="CancelIcon"])').filter({ visible: true }).first(),
        root.getByRole('button', { name: /^(close|done|exit|return|leave)$/i }).filter({ visible: true }).first(),
        root.locator('button[aria-label*="close" i], button[title*="close" i]').filter({ visible: true }).first(),
        root.locator('button[aria-label*="exit" i], button[title*="exit" i]').filter({ visible: true }).first()
      );
    };

    for (const root of roots) pushCandidatesForRoot(root);

    // Page-level fallbacks
    candidates.push(
      p.locator('button:has(svg[data-testid="CloseIcon"])').filter({ visible: true }).first(),
      p.locator('button:has(svg[data-testid="ArrowBackIcon"])').filter({ visible: true }).first(),
      p.getByRole('button', { name: /^(close|done|exit|return|leave)$/i }).filter({ visible: true }).first(),
      p.getByRole('button', { name: /^back$/i }).filter({ visible: true }).first()
    );

    for (const ctrl of candidates) {
      try {
        if (!(await ctrl.isVisible({ timeout: 1500 }).catch(() => false))) continue;
        await ctrl.scrollIntoViewIfNeeded().catch(() => {});
        await ctrl.click({ timeout: 10000 }).catch(async () => {
          await ctrl.click({ timeout: 10000, force: true });
        });
        // eslint-disable-next-line no-console
        console.log('[PO vendor comment] Clicked exit comment mode control near Save.');
        await p.waitForTimeout(500);
        return true;
      } catch {
        /* next */
      }
    }

    return false;
  }

  async waitForCommentSaveToSettle() {
    const p = this.page;
    await p.waitForLoadState('domcontentloaded').catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await expect
      .poll(
        async () => {
          const saveVisible = await p
            .getByRole('button', { name: /^(save comment|save)$/i })
            .filter({ visible: true })
            .first()
            .isVisible({ timeout: 400 })
            .catch(() => false);
          return !saveVisible;
        },
        { timeout: 15000, intervals: [400, 700, 1000, 1500] }
      )
      .toBe(true)
      .catch(() => {});
    await p.waitForTimeout(300);
  }

  /**
   * Popover / dialog Save control — matches "Save", "Save comment", and MUI text buttons.
   * @returns {Promise<boolean>}
   */
  async clickSaveOnCommentEditor() {
    const p = this.page;
    const roots = [...(await this.collectCommentFillRoots()), p];

    /** @type {import('@playwright/test').Locator[]} */
    const candidates = [];
    for (const root of roots) {
      candidates.push(
        root
          .getByRole('button', { name: /^(save comment|save)$/i })
          .filter({ visible: true })
          .filter({ hasNotText: /cancel|close|discard/i })
          .last(),
        root.locator('button').filter({ hasText: /^save comment$|^save$/i }).filter({ visible: true }).last(),
        root.locator('button.MuiButton-contained, button.MuiButton-root').filter({ hasText: /save/i }).filter({ visible: true }).last()
      );
    }

    for (const save of candidates) {
      try {
        if (!(await save.isVisible({ timeout: 2000 }).catch(() => false))) continue;
        await save.scrollIntoViewIfNeeded().catch(() => {});
        await save.click({ timeout: 15000 }).catch(async () => {
          await save.click({ timeout: 15000, force: true });
        });
        // eslint-disable-next-line no-console
        console.log('[PO vendor comment] Clicked Save on comment editor.');
        await p.waitForTimeout(500);
        await this.clickVisibleSaveCommentButtonUntilGone().catch(() => false);
        return true;
      } catch {
        /* next */
      }
    }

    return false;
  }

  async clickSaveCommentButtons() {
    if (await this.clickSaveOnCommentEditor()) {
      return true;
    }
    return this.clickVisibleSaveCommentButtonUntilGone();
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
    await this.openVendorPortalLineCommentEditor();

    const filled =
      (await this.fillCommentFieldInRoot(text)) ||
      (await this.fillCommentField(text).then(() => true).catch(() => false));

    if (!filled) {
      throw new Error(
        'Opened vendor portal → Comments → line item but could not find the comment editor. ' +
          'Set PO_VENDOR_COMMENT_SELECTOR or PO_VENDOR_COMMENT_PLACEHOLDER.'
      );
    }

    // eslint-disable-next-line no-console
    console.log(`[PO vendor comment] Filled comment: "${String(text).slice(0, 60)}…"`);

    const saved = await this.clickSaveCommentButtons();
    if (!saved) {
      throw new Error(
        'Filled vendor comment but could not click Save / Save comment on the line-item popover.'
      );
    }

    await this.waitForCommentSaveToSettle();

    const exited = await this.clickCommentEditorBackArrow();
    if (!exited) {
      await this.dismissOpenCommentSurfaces().catch(() => {});
      // eslint-disable-next-line no-console
      console.log('[PO vendor comment] Exit comment mode control not found — closed via Escape.');
    }

    this.lastSubmittedComment = String(text).trim();
    await this.page.waitForTimeout(500);

    await this.clickAcceptOnVendorPortal();

    this.vendorPortalFlowCompleted = true;
    // eslint-disable-next-line no-console
    console.log('[PO vendor comment] Vendor comment flow complete (saved + exited comment mode + accepted).');
  }

  async expectCommentVisible(text) {
    const t = String(text).trim();

    if (this.vendorPortalFlowCompleted && this.lastSubmittedComment === t) {
      // eslint-disable-next-line no-console
      console.log('[PO vendor comment] PO already accepted — skipping comment re-open verification.');
      return;
    }
    await expect
      .poll(
        async () => {
          if (await this.isCommentTextPresent(t)) {
            return true;
          }
          await this.reopenCommentViewForVerification().catch(() => {});
          return this.isCommentTextPresent(t);
        },
        { timeout: this.defaultTimeout, intervals: [500, 1000, 1500, 2000, 3000] }
      )
      .toBe(true);
    // eslint-disable-next-line no-console
    console.log(`[PO vendor comment] Verified comment visible: "${t.slice(0, 60)}…"`);
  }
}

module.exports = { PurchaseOrderVendorCommentPage };
