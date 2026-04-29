const PurchaseOrderPreviewPoPage = require('./purchase-order-preview-po.page');
const { PurchaseOrderVendorCommentPage } = require('../vendor/purchase-order-vendor-comment.page');
const { expect } = require('@playwright/test');

/**
 * Admin PO list → kebab → Preview fullscreen → top comment → first line comment → save.
 * Fill/save uses vendor-comment page (portaled popovers). Waits for save loaders before closing preview.
 */
class PurchaseOrderSuperAdminCommentPoPage extends PurchaseOrderPreviewPoPage {
  previewDialogRoot() {
    return this.page
      .getByRole('dialog')
      .filter({
        has: this.page.getByText(/purchase order|po no|preview|billed to/i),
      })
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
          await p.waitForTimeout(400);
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
      await p.waitForTimeout(400);
      return true;
    }
    for (const cand of candidates) {
      try {
        if (await cand.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cand.click({ timeout: 5000, force: true });
          await p.waitForTimeout(400);
          return true;
        }
      } catch {
        /* next */
      }
    }
    return false;
  }

  async openFirstLineItemCommentInPreview(root) {
    const p = this.page;

    let rowLocator = root.locator('[aria-label="PO line items table"] tbody tr');
    if ((await rowLocator.count()) === 0) {
      rowLocator = root.locator('table tbody tr');
    }

    const n = await rowLocator.count();
    for (let i = 0; i < Math.min(n, 8); i++) {
      const row = rowLocator.nth(i);
      if (!(await row.isVisible({ timeout: 1500 }).catch(() => false))) continue;
      const cellCount = await row.locator('td, [role="gridcell"]').count();
      if (cellCount < 2) continue;

      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.click({ timeout: 5000 }).catch(() => {});
      await row.hover({ timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(350);

      await this.clickTopCommentIconInPreview(root).catch(() => {});

      for (let attempt = 0; attempt < 3; attempt++) {
        if (await this.tryClickLineCommentIcons(row)) {
          return true;
        }
        await this.clickTopCommentIconInPreview(root).catch(() => {});
        await row.hover({ timeout: 3000 }).catch(() => {});
        await p.waitForTimeout(350);
      }
    }
    return false;
  }

  buildRandomSuperAdminCommentText() {
    return `SA PO preview line comment ${Date.now()}`;
  }

  async waitForCommentSaveLoaderAndSubdialogsToFinish() {
    const p = this.page;

    const spinner = p
      .locator('button .MuiCircularProgress-root, .MuiLoadingButton-loadingIndicator')
      .filter({ visible: true });
    try {
      if ((await spinner.count()) > 0) {
        await spinner.first().waitFor({ state: 'hidden', timeout: 120000 });
      }
    } catch {
      /* ignore */
    }
    const busyBtn = p.locator('button[aria-busy="true"]').filter({ visible: true });
    try {
      if ((await busyBtn.count()) > 0) {
        await expect(busyBtn.first()).toBeHidden({ timeout: 120000 });
      }
    } catch {
      /* ignore */
    }

    await expect
      .poll(
        async () => {
          const spin = await p
            .locator('button .MuiCircularProgress-root')
            .filter({ visible: true })
            .count()
            .catch(() => 0);
          const busy = await p
            .locator('button[aria-busy="true"]')
            .filter({ visible: true })
            .count()
            .catch(() => 0);
          return spin === 0 && busy === 0;
        },
        { timeout: 90000 }
      )
      .toBe(true)
      .catch(() => {});

    await p
      .locator('.MuiPopover-paper')
      .filter({ has: p.locator('textarea, [contenteditable="true"]') })
      .waitFor({ state: 'hidden', timeout: 60000 })
      .catch(() => {});

    await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
    await p.waitForTimeout(600);
  }

  async submitRandomSuperAdminPreviewLineComment(text) {
    const root = this.previewDialogRoot();
    await expect(root).toBeVisible({ timeout: this.defaultTimeout });

    await this.clickTopCommentIconInPreview(root).catch(() => {});

    const opened = await this.openFirstLineItemCommentInPreview(root);
    if (!opened) {
      throw new Error(
        'Could not open line-item comment from PO preview. Set PO_VENDOR_COMMENT_SELECTOR or PO_VENDOR_COMMENT_PLACEHOLDER if the editor is custom.'
      );
    }

    await this.page
      .waitForSelector('textarea, [contenteditable="true"], input:not([type="hidden"])', {
        state: 'visible',
        timeout: 10000,
      })
      .catch(() => {});

    const vp = new PurchaseOrderVendorCommentPage(this.page);
    const filled = await vp.fillCommentFieldInRoot(text);
    if (!filled) {
      await vp.fillCommentField(text);
    }
    await vp.clickSaveCommentButtons();
    await this.waitForCommentSaveLoaderAndSubdialogsToFinish();

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(400);
  }

  async expectSuperAdminPreviewCommentVisible(text) {
    const root = this.previewDialogRoot();
    const t = String(text).trim();
    const inDialog = root.getByText(t, { exact: false }).first();
    if (await inDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(inDialog).toBeVisible({ timeout: this.defaultTimeout });
      return;
    }
    await expect(this.page.getByText(t, { exact: false }).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = PurchaseOrderSuperAdminCommentPoPage;
