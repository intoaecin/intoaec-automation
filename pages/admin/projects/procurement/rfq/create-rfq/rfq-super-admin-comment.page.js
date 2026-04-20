const { expect } = require('@playwright/test');
const {
  PurchaseOrderVendorCommentPage,
} = require('../../purchase-order/vendor/purchase-order-vendor-comment.page');
const RfqPreviewPage = require('./rfq-preview.page');

/**
 * RFQ: compose-send → preview → super admin line-item comment → save.
 * Mirrors the PO super-admin preview flow: row select/hover, comment icon, MUI popover,
 * then shared vendor-comment helpers for fill + "Save comment".
 */
class RfqSuperAdminCommentPage extends RfqPreviewPage {
  buildRandomSuperAdminCommentText() {
    return `SA RFQ preview line comment ${Date.now()}`;
  }

  async clickTopCommentIconInPreview(root) {
    const scopes = [
      root.locator('header').first(),
      root.locator('[class*="Toolbar" i]').first(),
      root,
    ];

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
      if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
        await c.scrollIntoViewIfNeeded().catch(() => {});
        await c.click({ timeout: 8000, force: true });
        await this.page.waitForTimeout(350);
        return true;
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
      for (let i = 0; i < Math.min(n, 6); i += 1) {
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
    const cell = (idx) =>
      nTd > 0 ? row.locator('td').nth(idx) : row.locator('[role="gridcell"]').nth(idx);
    const lastCells = [];
    if (n >= 1) lastCells.push(cell(n - 1));
    if (n >= 2) lastCells.push(cell(n - 2));

    const fallbackButtons = [
      row.getByRole('button', { name: /comment/i }).first(),
      row.locator('button[aria-label*="comment" i]').first(),
      row.locator('button[title*="comment" i]').first(),
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
    for (const cand of fallbackButtons) {
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

  lineItemRowsInPreview(root) {
    let rows = root.locator('[aria-label*="line items" i] tbody tr');
    return rows;
  }

  async openFirstLineItemCommentInPreview(root) {
    const p = this.page;

    let rowLocator = this.lineItemRowsInPreview(root);
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
    for (let i = 0; i < Math.min(n, 12); i += 1) {
      const row = rowLocator.nth(i);
      if (!(await row.isVisible({ timeout: 1500 }).catch(() => false))) continue;

      const cellCount = await row.locator('td, [role="gridcell"]').count();
      if (cellCount < 2) continue;

      await row.scrollIntoViewIfNeeded().catch(() => {});
      await row.click({ timeout: 5000 }).catch(() => {});
      await row.hover({ timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(350);

      await this.clickTopCommentIconInPreview(root).catch(() => {});

      const selectedRow = p
        .locator('tr[aria-selected="true"], [role="row"][aria-selected="true"]')
        .first();

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const target =
          (await selectedRow.isVisible({ timeout: 800 }).catch(() => false)) ? selectedRow : row;

        // eslint-disable-next-line no-await-in-loop
        if (await this.tryClickLineCommentIcons(target)) {
          return true;
        }
        if (attempt === 1) {
          // eslint-disable-next-line no-await-in-loop
          await this.clickTopCommentIconInPreview(root).catch(() => {});
        }
        // eslint-disable-next-line no-await-in-loop
        await target.hover({ timeout: 3000 }).catch(() => {});
        // eslint-disable-next-line no-await-in-loop
        await p.waitForTimeout(350);
      }
    }
    return false;
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

  async isRfqCommentPopoverOrDialogOpen() {
    const p = this.page;
    const surface = p
      .locator('.MuiPopover-paper, .MuiDialog-paper, [role="dialog"]')
      .filter({ has: p.locator('textarea, [contenteditable="true"]') })
      .filter({ visible: true })
      .first();
    return surface.isVisible({ timeout: 2500 }).catch(() => false);
  }

  async submitRandomSuperAdminPreviewLineComment(text) {
    await this.waitForNetworkSettled();

    // Preview is opened by the scenario ("When I click the RFQ preview icon").
    // Do not call `clickPreviewIconOnRfqPage` here: on full-page/iframe previews
    // `rfqPreviewContainer()` may be false while still on preview, which would
    // try the RFQ list kebab and hang.
    await this.expectRfqPreviewLoaded();

    const root = await this.resolveRfqPreviewInteractionRoot();

    await this.clickTopCommentIconInPreview(root).catch(() => {});
    await this.page.waitForTimeout(400);

    let opened = await this.isRfqCommentPopoverOrDialogOpen();
    if (!opened) {
      await this.clickTopCommentIconInPreview(root).catch(() => {});
      await this.page.waitForTimeout(400);
      opened = await this.isRfqCommentPopoverOrDialogOpen();
    }

    if (!opened) {
      opened = await this.openFirstLineItemCommentInPreview(root);
    }

    if (!opened) {
      throw new Error(
        'RFQ comment: could not open the comment editor from preview. ' +
          'Click the preview comment icon (toolbar or line item) so a popover with a text field appears.'
      );
    }

    await this.page
      .waitForSelector('textarea, [contenteditable="true"], input:not([type="hidden"])', {
        state: 'visible',
        timeout: 15000,
      })
      .catch(() => {});

    const value = String(text || '').trim();
    if (!value) throw new Error('RFQ comment text must be non-empty');

    const vp = new PurchaseOrderVendorCommentPage(this.page);
    const filled = await vp.fillCommentFieldInRoot(value);
    if (!filled) {
      await vp.fillCommentField(value);
    }

    await vp.clickSaveCommentButtons();
    await this.clickVisibleSaveCommentButtonUntilGone();

    await this.waitForCommentSaveLoaderAndSubdialogsToFinish();

    await this.clickVisibleSaveCommentButtonUntilGone();

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(400);
  }

  /**
   * RFQ preview often uses an explicit "Save comment" control (sometimes shown twice:
   * primary save + confirm). Clicks while the button stays visible.
   */
  async clickVisibleSaveCommentButtonUntilGone(maxClicks = 4) {
    const p = this.page;
    for (let i = 0; i < maxClicks; i += 1) {
      const saveComment = p.getByRole('button', { name: /save comment/i }).filter({ visible: true }).first();
      // eslint-disable-next-line no-await-in-loop
      if (!(await saveComment.isVisible({ timeout: 1200 }).catch(() => false))) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await saveComment.click({ timeout: 15000 }).catch(async () => {
        await saveComment.click({ timeout: 15000, force: true });
      });
      // eslint-disable-next-line no-await-in-loop
      await p.waitForTimeout(450);
    }
  }

  async expectSuperAdminPreviewCommentVisible(text) {
    const root = await this.resolveRfqPreviewInteractionRoot();
    const t = String(text).trim();
    const inRoot = root.getByText(t, { exact: false }).first();
    if (await inRoot.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(inRoot).toBeVisible({ timeout: this.previewOpenTimeout() });
      return;
    }
    await expect(this.page.getByText(t, { exact: false }).first()).toBeVisible({
      timeout: this.previewOpenTimeout(),
    });
  }
}

module.exports = RfqSuperAdminCommentPage;
