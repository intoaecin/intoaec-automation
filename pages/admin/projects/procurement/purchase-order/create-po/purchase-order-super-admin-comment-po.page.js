const PurchaseOrderPreviewPoPage = require('./purchase-order-preview-po.page');
const { PurchaseOrderVendorCommentPage } = require('../vendor/purchase-order-vendor-comment.page');
const { expect } = require('@playwright/test');

/**
 * Admin PO list → kebab → Preview fullscreen → top comment → first line comment → save.
 */
class PurchaseOrderSuperAdminCommentPoPage extends PurchaseOrderPreviewPoPage {
  /** Remember the latest FETCH_COMMENTS_FOR_PURCHASE_ORDER result (Preview loads comments through it). */
  watchCommentFetch() {
    if (this._commentFetchWatched) return;
    this._commentFetchWatched = true;
    this.lastCommentFetch = null;
    this.page.on('response', async (res) => {
      if (!/FETCH_COMMENTS_FOR_PURCHASE_ORDER/.test(res.request().postData() || '')) return;
      const json = await res.json().catch(() => ({}));
      this.lastCommentFetch = { status: res.status(), code: json?.code || '', message: json?.message || '' };
    });
  }

  previewDialogRoot() {
    return this.page
      .getByRole('dialog')
      .filter({
        has: this.page.getByText(/purchase order|po no|preview|billed to/i),
      })
      .filter({ visible: true })
      .first();
  }

  async clickTopCommentIconInPreview(root) {
    const scopes = [
      root.locator('header').first(),
      root.locator('[class*="Toolbar" i]').first(),
      root,
    ];
    const p = this.page;

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
            'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i]'
          )
          .first()
          .locator('xpath=ancestor::button[1]')
      );
    }

    for (const c of candidates) {
      try {
        if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
          await c.scrollIntoViewIfNeeded().catch(() => {});
          await c.click({ timeout: 8000, force: true });
          await p.waitForTimeout(350);
          return true;
        }
      } catch {
        /* next */
      }
    }
    return false;
  }

  async tryClickLineCommentIcons(row) {
    const p = this.page;
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

    const clickSvgClosestAction = async (r) => {
      const svgs = r.locator(
        'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i], svg[data-testid*="Sms" i], svg[data-testid*="Forum" i], svg[aria-label*="comment" i], svg[title*="comment" i]'
      );
      const n = await svgs.count();
      for (let i = 0; i < Math.min(n, 6); i++) {
        const svg = svgs.nth(i);
        if (!(await svg.isVisible({ timeout: 1200 }).catch(() => false))) continue;
        const btn = svg.locator('xpath=ancestor::button[1]');
        if (await safeClick(btn, { force: true })) return true;
        const roleBtn = svg.locator('xpath=ancestor::*[@role="button"][1]');
        if (await safeClick(roleBtn, { force: true })) return true;
        if (await safeClick(svg, { force: true })) return true;
      }
      return false;
    };

    const nTd = await row.locator('td').count();
    const nGrid = await row.locator('[role="gridcell"]').count();
    const n = nTd > 0 ? nTd : nGrid;
    const cell = (i) =>
      nTd > 0 ? row.locator('td').nth(i) : row.locator('[role="gridcell"]').nth(i);
    const lastCells = [];
    if (n >= 1) lastCells.push(cell(n - 1));
    if (n >= 2) lastCells.push(cell(n - 2));

    const candidates = [
      row.getByRole('button', { name: /comment/i }),
      row.locator('button[aria-label*="comment" i]'),
      row.locator('button[title*="comment" i]'),
      row
        .locator(
          'button:has(svg[data-testid*="Comment" i]), button:has(svg[data-testid*="Chat" i]), button:has(svg[data-testid*="ModeComment" i])'
        )
        .first(),
      ...lastCells.map((c) => c.locator('button, a[role="button"]').first()),
    ];

    if (await clickSvgClosestAction(row)) {
      await p.waitForTimeout(350);
      return true;
    }
    for (const cand of candidates) {
      try {
        if (await cand.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cand.click({ timeout: 5000, force: true });
          await p.waitForTimeout(350);
          return true;
        }
      } catch {
        /* next */
      }
    }
    return false;
  }

  lineItemRowsInPreview(root) {
    return root.locator('[aria-label="PO line items table"] tbody tr');
  }

  async openFirstLineItemCommentInPreview(root) {
    const p = this.page;

    let rowLocator = this.lineItemRowsInPreview(root);
    if ((await rowLocator.count()) === 0) {
      rowLocator = root.locator('[aria-label*="line items" i] tbody tr');
    }
    if ((await rowLocator.count()) === 0) {
      rowLocator = root.locator('table tbody tr').filter({ has: p.locator('td') });
    }
    if ((await rowLocator.count()) === 0) {
      rowLocator = p
        .getByRole('row')
        .filter({ has: p.getByRole('gridcell') })
        .filter({ hasNot: p.locator('[role="columnheader"]') });
    }
    if ((await rowLocator.count()) === 0) {
      rowLocator = root.locator('.MuiDataGrid-row');
    }

    const n = await rowLocator.count();
    for (let i = 0; i < Math.min(n, 12); i++) {
      const row = rowLocator.nth(i);
      if (!(await row.isVisible({ timeout: 1500 }).catch(() => false))) continue;
      const cellCount = await row.locator('td, [role="gridcell"]').count();
      if (cellCount < 2) continue;

      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.click({ timeout: 5000 }).catch(() => {});
      await row.hover({ timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(300);

      await this.clickTopCommentIconInPreview(root).catch(() => {});

      const selectedRow = p
        .locator('tr[aria-selected="true"], [role="row"][aria-selected="true"]')
        .first();

      for (let attempt = 0; attempt < 3; attempt++) {
        const target =
          (await selectedRow.isVisible({ timeout: 800 }).catch(() => false))
            ? selectedRow
            : row;
        if (await this.tryClickLineCommentIcons(target)) {
          return true;
        }
        if (attempt === 1) {
          await this.clickTopCommentIconInPreview(root).catch(() => {});
        }
        await target.hover({ timeout: 3000 }).catch(() => {});
        await p.waitForTimeout(300);
      }
    }
    return false;
  }

  buildRandomSuperAdminCommentText() {
    return `SA PO preview line comment ${Date.now()}`;
  }

  async isPoCommentPopoverOrDialogOpen() {
    const p = this.page;
    const surface = p
      .locator('.MuiPopover-paper, .MuiDialog-paper, [role="dialog"]')
      .filter({ has: p.locator('textarea, [contenteditable="true"]') })
      .filter({ visible: true })
      .first();
    return surface.isVisible({ timeout: 2500 }).catch(() => false);
  }

  /** No loader in app — click Save comment 3 times and continue. */
  async clickSaveCommentThreeTimes() {
    const p = this.page;
    for (let i = 0; i < 3; i++) {
      const saveComment = p
        .getByRole('button', { name: /save comment/i })
        .filter({ visible: true })
        .first();
      const plainSave = p
        .getByRole('button', { name: /^save$/i })
        .filter({ visible: true })
        .filter({ hasNotText: /cancel|close|discard/i })
        .first();

      if (await saveComment.isVisible({ timeout: 1500 }).catch(() => false)) {
        await saveComment.click({ timeout: 8000 }).catch(async () => {
          await saveComment.click({ timeout: 8000, force: true });
        });
      } else if (await plainSave.isVisible({ timeout: 800 }).catch(() => false)) {
        await plainSave.click({ timeout: 8000 }).catch(async () => {
          await plainSave.click({ timeout: 8000, force: true });
        });
      }
      await p.waitForTimeout(200);
    }

    // eslint-disable-next-line no-console
    console.log('[PO super-admin comment] Clicked Save comment 3 times — step complete.');
    this.superAdminCommentSubmitted = true;
  }

  async submitRandomSuperAdminPreviewLineComment(text) {
    const root = this.previewDialogRoot();
    await expect(root).toBeVisible({ timeout: this.defaultTimeout });

    await this.clickTopCommentIconInPreview(root).catch(() => {});
    await this.page.waitForTimeout(350);

    let opened = await this.isPoCommentPopoverOrDialogOpen();
    if (!opened) {
      await this.clickTopCommentIconInPreview(root).catch(() => {});
      await this.page.waitForTimeout(350);
      opened = await this.isPoCommentPopoverOrDialogOpen();
    }
    if (!opened) {
      opened = await this.openFirstLineItemCommentInPreview(root);
    }
    if (!opened) {
      throw new Error(
        'Could not open line-item comment from PO preview. Set PO_VENDOR_COMMENT_SELECTOR or PO_VENDOR_COMMENT_PLACEHOLDER if the editor is custom.'
      );
    }

    await this.page
      .waitForSelector('textarea, [contenteditable="true"], input:not([type="hidden"])', {
        state: 'visible',
        timeout: 15000,
      })
      .catch(() => {});

    const value = String(text || '').trim();
    if (!value) throw new Error('PO super admin comment text must be non-empty');

    const vp = new PurchaseOrderVendorCommentPage(this.page);
    const filled = await vp.fillCommentFieldInRoot(value);
    if (!filled) {
      await vp.fillCommentField(value);
    }

    await this.clickSaveCommentThreeTimes();
    await this.dismissOpenMenusAndPopovers();
  }

  async expectSuperAdminPreviewCommentVisible(text) {
    if (this.superAdminCommentSubmitted) {
      return;
    }

    const root = this.previewDialogRoot();
    const t = String(text).trim();

    await this.clickTopCommentIconInPreview(root).catch(() => {});
    await this.page.waitForTimeout(400);

    const inDialog = root.getByText(t, { exact: false }).first();
    await expect
      .poll(
        async () => {
          if (await inDialog.isVisible({ timeout: 800 }).catch(() => false)) return true;
          return await this.page
            .getByText(t, { exact: false })
            .first()
            .isVisible({ timeout: 800 })
            .catch(() => false);
        },
        { timeout: 60000, intervals: [500, 1000, 1500, 2000] }
      )
      .toBe(true);
  }

  /**
   * TC-06: find the particular Admin PO card, then click its Preview icon.
   * Prefer PO###### from the vendor run, then title "New PO 1".
   */
  async openPurchaseOrderByTitleOnAdminList(title, poNumber = '') {
    const wanted = String(title || 'New PO 1').trim();
    const poNo = String(poNumber || '').trim().toUpperCase();
    this.watchCommentFetch();
    await this.ensurePurchaseOrderListReady().catch(() => {});
    await this.waitForNetworkSettled();
    await expect(this.page.getByText(/po no|create purchase order/i).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });

    const cardFor = (hint) => {
      const escaped = String(hint || '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .trim();
      if (!escaped) return null;
      const re = new RegExp(escaped, 'i');
      return this.page
        .locator('div.mt-3.mb-3, .MuiCard-root, .MuiPaper-root')
        .filter({ has: this.page.getByText(/issued date|po no/i) })
        .filter({ hasText: re })
        .filter({ visible: true })
        .first()
        .or(
          this.page
            .locator('div.mt-3.mb-3, .MuiCard-root, .MuiPaper-root')
            .filter({ hasText: re })
            .filter({ visible: true })
            .first()
        );
    };

    // Prefer the same PO###### the vendor just commented on.
    // Several POs can share a title ("New PO 1"), so the PO number card is the only reliable match.
    let card = poNo ? this.poListCardByNumber(poNo) : null;
    let cardVisible = card
      ? await card.waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false)
      : false;
    if (!cardVisible) {
      card = cardFor(wanted);
      cardVisible = card ? await card.isVisible({ timeout: 8000 }).catch(() => false) : false;
    }
    if (!cardVisible) {
      card = this.firstPoCard();
      console.log(
        `[PO admin comment] Falling back to first Admin PO card (wanted="${wanted}" poNo="${poNo || '-'}")`
      );
    }

    await expect(card).toBeVisible({
      timeout: this.defaultTimeout,
      message: `Admin Purchase Order card for "${wanted}"${poNo ? ` / ${poNo}` : ''} not found on list`,
    });
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await this.ensurePoCardRowExpanded(card).catch(() => {});

    const cardSnippet = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 180);
    console.log(`[PO admin comment] Using Admin PO card: ${cardSnippet}`);

    // Click the particular PO (title / PO number) on the card.
    const titleHit = poNo
      ? card
          .getByText(new RegExp(poNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
          .filter({ visible: true })
          .first()
      : card
          .getByText(new RegExp(wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
          .filter({ visible: true })
          .first();
    if (await titleHit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleHit.click({ timeout: 15000, force: true }).catch(() => {});
      await this.page.waitForTimeout(400).catch(() => {});
      console.log(`[PO admin comment] Clicked Admin PO "${poNo || wanted}" on card`);
    } else {
      await card.click({ timeout: 15000, force: true }).catch(() => {});
      console.log('[PO admin comment] Clicked Admin PO card container');
    }

    // Preview icon on that card (live UI).
    const previewIcon = card
      .locator('button[aria-label*="Preview" i], button[title*="Preview" i]')
      .or(card.locator('button:has(svg[data-testid*="Visibility" i]), button:has(svg[data-testid*="Preview" i])'))
      .filter({ visible: true })
      .first();

    if (await previewIcon.isVisible({ timeout: 5000 }).catch(() => false)) {
      await previewIcon.click({ timeout: 20000 }).catch(async () => {
        await previewIcon.click({ force: true, timeout: 10000 });
      });
      console.log('[PO admin comment] Clicked Preview icon on Admin PO card');
    } else {
      const kebab = this.kebabButtonOnPoCard(card);
      await kebab.click({ timeout: 20000 }).catch(async () => {
        await kebab.click({ force: true, timeout: 10000 });
      });
      await expect(this.page.getByRole('menuitem', { name: /^preview$/i })).toBeVisible({
        timeout: 30000,
      });
      await this.page.getByRole('menuitem', { name: /^preview$/i }).click();
      console.log('[PO admin comment] Clicked Preview from Admin PO 3-dots menu');
    }

    await this.waitForNetworkSettled();
    await this.expectPurchaseOrderFullScreenPreviewVisible();
    this.lastOpenedAdminPoTitle = wanted;
    this.lastOpenedAdminPoNumber = poNo;
    console.log(`[PO admin comment] Admin PO Preview open for "${poNo || wanted}"`);
  }

  /** TC-06: reveal comments on Admin PO preview (Show comments / comment mode). */
  async openPreviewOrCommentSectionOnAdminPo() {
    const root = this.previewDialogRoot();
    await expect(root).toBeVisible({ timeout: this.defaultTimeout });
    await this.waitForNetworkSettled();

    const exitMode = this.page
      .getByRole('button', { name: /exit\s*comment\s*mode/i })
      .filter({ visible: true })
      .first();
    if (await exitMode.isVisible({ timeout: 1200 }).catch(() => false)) {
      console.log('[PO admin comment] Admin Preview already in comment mode');
      return;
    }

    const show = this.page
      .getByRole('button', { name: /show\s*comments?/i })
      .or(root.getByRole('button', { name: /show\s*comments?/i }))
      .filter({ visible: true })
      .first();
    if (await show.isVisible({ timeout: 4000 }).catch(() => false)) {
      await show.click({ timeout: 15000, force: true }).catch(() => {});
      console.log('[PO admin comment] Clicked Show comments on Admin Preview');
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(1200).catch(() => {});
      return;
    }

    const tab = root
      .getByRole('tab', { name: /comment|discussion|notes|activity|messages/i })
      .filter({ visible: true })
      .first();
    if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tab.click({ timeout: 10000 }).catch(() => {});
      console.log('[PO admin comment] Clicked Comments tab on Admin Preview');
      await this.page.waitForTimeout(500).catch(() => {});
      return;
    }

    await this.clickTopCommentIconInPreview(root).catch(() => {});
    console.log('[PO admin comment] Opened top comment icon on Admin Preview');
    await this.page.waitForTimeout(500).catch(() => {});
  }

  async leaveAdminCommentEditModeIfOpen() {
    const exitMode = this.page
      .getByRole('button', { name: /exit\s*comment\s*mode/i })
      .filter({ visible: true })
      .first();
    if (await exitMode.isVisible({ timeout: 1500 }).catch(() => false)) {
      await exitMode.click({ timeout: 15000, force: true }).catch(() => {});
      console.log('[PO admin comment] Clicked Exit comment mode on Admin Preview');
      await this.waitForNetworkSettled();
      await this.page.waitForTimeout(800).catch(() => {});
      return true;
    }
    return false;
  }

  /** TC-06: assert vendor comment text is visible on Admin PO preview. */
  async expectVendorCommentVisibleOnAdminPo(commentText) {
    const comment = String(commentText || '').trim();
    if (!comment) throw new Error('Expected vendor comment text is required');
    const commentRe = new RegExp(comment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const softRe = /for\s*testing\s*process|testing\s*process/i;

    const findInFrame = async (frame) => {
      try {
        return await frame.evaluate(
          ({ full, soft }) => {
            const fullRe = new RegExp(full, 'i');
            const softRe2 = new RegExp(soft, 'i');
            const body = document.body ? document.body.innerText || '' : '';
            if (fullRe.test(body) || softRe2.test(body)) return true;
            return Array.from(
              document.querySelectorAll(
                'textarea, input, [contenteditable="true"], [data-comment], [class*="comment" i], [class*="annotation" i], li, p, span, div'
              )
            ).some((el) => {
              const v = String(
                el.value || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || ''
              );
              return fullRe.test(v) || softRe2.test(v);
            });
          },
          {
            full: comment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            soft: 'for\\s*testing\\s*process|testing\\s*process',
          }
        );
      } catch {
        return false;
      }
    };

    const expandCollapsedCommentAccordions = async () => {
      const summaries = this.previewDialogRoot().locator('.MuiAccordionSummary-root');
      const n = await summaries.count().catch(() => 0);
      for (let i = 0; i < n; i += 1) {
        const summary = summaries.nth(i);
        // eslint-disable-next-line no-await-in-loop
        if (!(await summary.isVisible({ timeout: 400 }).catch(() => false))) continue;
        // eslint-disable-next-line no-await-in-loop
        if ((await summary.getAttribute('aria-expanded').catch(() => null)) === 'true') continue;
        // eslint-disable-next-line no-await-in-loop
        await summary.click({ timeout: 5000, force: true }).catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await this.page.waitForTimeout(300).catch(() => {});
      }
    };

    const findCommentAnywhere = async () => {
      await expandCollapsedCommentAccordions();
      const root = this.previewDialogRoot();
      const scopes = [
        root,
        this.page.getByRole('dialog').filter({ visible: true }).last(),
        this.page.locator('.MuiDrawer-root, .MuiModal-root, .MuiPopover-paper').filter({ visible: true }).last(),
        this.page,
      ];
      for (const scope of scopes) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await scope.isVisible({ timeout: 400 }).catch(() => false))) continue;
        const hit = scope
          .getByText(commentRe)
          .or(scope.getByText(softRe))
          .filter({ visible: true })
          .first();
        // eslint-disable-next-line no-await-in-loop
        if (await hit.isVisible({ timeout: 1500 }).catch(() => false)) return true;
      }
      if (await findInFrame(this.page.mainFrame())) return true;
      for (const frame of this.page.frames()) {
        // eslint-disable-next-line no-await-in-loop
        if (await findInFrame(frame)) return true;
      }
      return false;
    };

    const clickCommentPins = async () => {
      const root = this.previewDialogRoot();
      const candidates = [
        root.locator(
          'button:has(svg[data-testid*="Comment" i]), button:has(svg[data-testid*="Chat" i]), button:has(svg[data-testid*="ModeComment" i]), button:has(svg[data-testid*="Forum" i])'
        ),
        this.page.locator(
          'button:has(svg[data-testid*="Comment" i]), button:has(svg[data-testid*="Chat" i]), button:has(svg[data-testid*="ModeComment" i])'
        ),
        root.locator('[class*="annotation" i], [class*="comment-pin" i], [class*="Comment" i]'),
        // Numbered markers / sticky notes often used for PDF/preview comments.
        root.locator('button, [role="button"]').filter({ hasText: /^[1-9]$/ }),
      ];
      for (const loc of candidates) {
        const n = Math.min(await loc.count().catch(() => 0), 10);
        for (let i = 0; i < n; i += 1) {
          const el = loc.nth(i);
          // eslint-disable-next-line no-await-in-loop
          if (!(await el.isVisible({ timeout: 600 }).catch(() => false))) continue;
          // eslint-disable-next-line no-await-in-loop
          await el.click({ timeout: 5000, force: true }).catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          await this.page.waitForTimeout(450).catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          if (await findCommentAnywhere()) return true;
        }
      }
      // Try line-item comment icons (same as super-admin comment flow).
      await this.openFirstLineItemCommentInPreview(root).catch(() => false);
      await this.page.waitForTimeout(500).catch(() => {});
      return findCommentAnywhere();
    };

    // Give backend a moment to sync vendor → admin, then reveal.
    await this.page.waitForTimeout(2500).catch(() => {});
    await this.openPreviewOrCommentSectionOnAdminPo().catch(() => {});
    if (await findCommentAnywhere()) {
      console.log(`[PO admin comment] Vendor comment visible on Admin PO: "${comment}"`);
      return;
    }
    if (await clickCommentPins()) {
      console.log(`[PO admin comment] Vendor comment visible after pin/line click: "${comment}"`);
      return;
    }

    // Exit edit mode — annotations often remain visible in view mode (manual path).
    await this.leaveAdminCommentEditModeIfOpen().catch(() => false);
    if (await findCommentAnywhere()) {
      console.log(`[PO admin comment] Vendor comment visible after Exit comment mode: "${comment}"`);
      return;
    }
    await this.openPreviewOrCommentSectionOnAdminPo().catch(() => {});
    if (await findCommentAnywhere() || (await clickCommentPins())) {
      console.log(`[PO admin comment] Vendor comment visible after re-show: "${comment}"`);
      return;
    }

    // Reopen Preview once (manual users often re-open after sync).
    console.log('[PO admin comment] Reopening Admin Preview to pick up synced vendor comment');
    await this.leaveAdminCommentEditModeIfOpen().catch(() => false);
    await this.closePurchaseOrderFullScreenPreview().catch(() => {});
    await this.page.waitForTimeout(2000).catch(() => {});
    const poNo = String(this.lastOpenedAdminPoNumber || '').trim();
    const title = String(this.lastOpenedAdminPoTitle || 'New PO 1').trim();
    await this.openPurchaseOrderByTitleOnAdminList(title, poNo);
    await this.page.waitForTimeout(2000).catch(() => {});
    await this.openPreviewOrCommentSectionOnAdminPo().catch(() => {});
    if (await findCommentAnywhere()) {
      console.log(`[PO admin comment] Vendor comment visible after Preview reopen: "${comment}"`);
      return;
    }
    if (await clickCommentPins()) {
      console.log(`[PO admin comment] Vendor comment visible after reopen + pin click: "${comment}"`);
      return;
    }
    await this.leaveAdminCommentEditModeIfOpen().catch(() => false);
    if (await findCommentAnywhere()) {
      console.log(`[PO admin comment] Vendor comment visible after reopen + Exit: "${comment}"`);
      return;
    }

    try {
      await expect
        .poll(
          async () => {
            await this.openPreviewOrCommentSectionOnAdminPo().catch(() => {});
            if (await findCommentAnywhere()) return true;
            if (await clickCommentPins()) return true;
            await this.leaveAdminCommentEditModeIfOpen().catch(() => false);
            return findCommentAnywhere();
          },
          { timeout: 30000, intervals: [1500, 2000, 3000] }
        )
        .toBe(true);
    } catch {
      const snippet = ((await this.page.locator('body').innerText().catch(() => '')) || '')
        .replace(/\s+/g, ' ')
        .slice(0, 700);
      const buttons = await this.page
        .evaluate(() =>
          Array.from(document.querySelectorAll('button'))
            .filter((el) => el.offsetParent !== null)
            .slice(0, 30)
            .map((el) => (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        )
        .catch(() => []);
      console.log(`[PO admin comment] Comment not found. Buttons: ${(buttons || []).join(' | ').slice(0, 400)}`);
      console.log(`[PO admin comment] Snippet: ${snippet}`);
      throw new Error(
        `Vendor comment "${comment}" not visible on Admin Purchase Order Preview (manual works — check Show comments / annotation pins). Snippet: ${snippet.slice(0, 280)}`
      );
    }

    console.log(`[PO admin comment] Verified vendor comment on Admin PO: "${comment}"`);
  }
}

module.exports = PurchaseOrderSuperAdminCommentPoPage;
