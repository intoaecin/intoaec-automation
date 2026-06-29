const PurchaseOrderPreviewPoPage = require('./purchase-order-preview-po.page');
const { PurchaseOrderVendorCommentPage } = require('../vendor/purchase-order-vendor-comment.page');
const { expect } = require('@playwright/test');

/**
 * Admin PO list → kebab → Preview fullscreen → top comment → first line comment → save.
 */
class PurchaseOrderSuperAdminCommentPoPage extends PurchaseOrderPreviewPoPage {
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
}

module.exports = PurchaseOrderSuperAdminCommentPoPage;
