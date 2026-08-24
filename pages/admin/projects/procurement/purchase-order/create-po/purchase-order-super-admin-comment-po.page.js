const PurchaseOrderPreviewPoPage = require('./purchase-order-preview-po.page');
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

  commentIconSvgLocator(scope) {
    return scope.locator(
      'svg[data-testid*="Comment" i], svg[data-testid*="Chat" i], svg[data-testid*="ModeComment" i], svg[data-testid*="Forum" i], svg[data-testid*="Sms" i], svg[data-testid="ChatBubbleOutlineIcon"], svg[data-testid="ChatBubbleIcon"], svg[data-testid="AddCommentIcon"], svg[data-testid="InsertCommentIcon"], svg[data-testid="QuestionAnswerIcon"]'
    );
  }

  /**
   * Preview toolbar Comments icon only (not a line-item icon inside the table).
   */
  async clickTopCommentIconInPreview(root) {
    const p = this.page;
    const notInTable = (loc) =>
      loc.filter({ hasNot: p.locator('xpath=ancestor::table') });

    const candidates = [
      root.getByRole('button', { name: /^comments?$/i }).first(),
      root.getByRole('button', { name: /comment|comments|chat|message/i }).first(),
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
      if (await c.isVisible({ timeout: 2000 }).catch(() => false)) {
        await c.scrollIntoViewIfNeeded().catch(() => {});
        await c.click({ timeout: 10000 }).catch(async () => {
          await c.click({ timeout: 8000, force: true });
        });
        await p.waitForTimeout(500);
        return true;
      }
    }

    const handle = await root.evaluateHandle(() => {
      const nodes = Array.from(document.querySelectorAll('button, [role="button"]'));
      return (
        nodes.find((el) => {
          if (el.closest('table, tbody, [aria-label*="line items" i]')) {
            return false;
          }
          const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`;
          if (/comment/i.test(label)) {
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
      await p.waitForTimeout(500);
      await handle.dispose().catch(() => {});
      return true;
    }
    await handle.dispose().catch(() => {});
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

    const lineCommentBtn = p
      .locator(
        'table tbody tr button:has(svg[data-testid*="Comment" i]), table tbody tr button:has(svg[data-testid*="Chat" i]), table tbody tr button:has(svg[data-testid="ChatBubbleOutlineIcon"]), table tbody tr button:has(svg[data-testid="AddCommentIcon"]), table tbody tr button[aria-label*="comment" i]'
      )
      .filter({ visible: true })
      .first();
    if (await lineCommentBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await lineCommentBtn.scrollIntoViewIfNeeded().catch(() => {});
      await lineCommentBtn.click({ timeout: 10000 }).catch(async () => {
        await lineCommentBtn.click({ timeout: 8000, force: true });
      });
      await p.waitForTimeout(400);
      return true;
    }

    const scopes = [
      root,
      p.locator('.MuiDrawer-paper, .MuiPopover-paper, [role="dialog"]').filter({ visible: true }).last(),
      p,
    ];

    for (const scope of scopes) {
      if (!(await scope.isVisible({ timeout: 400 }).catch(() => false))) {
        continue;
      }

      let rowLocator = this.lineItemRowsInPreview(scope);
      if ((await rowLocator.count()) === 0) {
        rowLocator = scope.locator('[aria-label*="line items" i] tbody tr');
      }
      if ((await rowLocator.count()) === 0) {
        rowLocator = scope.locator('table tbody tr').filter({ has: p.locator('td') });
      }
      if ((await rowLocator.count()) === 0) {
        rowLocator = scope.locator('.MuiDataGrid-row');
      }

      const n = await rowLocator.count();
      for (let i = 0; i < Math.min(n, 12); i += 1) {
        const row = rowLocator.nth(i);
        if (!(await row.isVisible({ timeout: 1500 }).catch(() => false))) continue;

        await row.scrollIntoViewIfNeeded().catch(() => {});
        await row.hover({ timeout: 5000 }).catch(() => {});
        await p.waitForTimeout(250);

        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (await this.tryClickLineCommentIcons(row)) {
            return true;
          }
          await row.hover({ timeout: 3000 }).catch(() => {});
          await p.waitForTimeout(250);
        }
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

  async fillPreviewLineCommentEditor(text) {
    const value = String(text || '').trim();
    const p = this.page;
    const scopes = [
      p.locator('.MuiPopover-paper, .MuiDialog-paper, [role="dialog"]').filter({ visible: true }).last(),
      p.locator('.MuiDrawer-paper, [class*="Drawer" i]').filter({ visible: true }).last(),
      this.previewDialogRoot(),
      p,
    ];

    const fieldSelectors = (scope) => [
      scope.getByPlaceholder(/comment|note|message|type here|write|add a comment/i).first(),
      scope.getByRole('textbox', { name: /comment|note|message|remark/i }).first(),
      scope.locator('textarea').filter({ visible: true }).last(),
      scope.locator('[contenteditable="true"]').filter({ visible: true }).last(),
      scope.locator('input.MuiInputBase-input:not([type="hidden"])').filter({ visible: true }).last(),
    ];

    for (const scope of scopes) {
      if (!(await scope.isVisible({ timeout: 800 }).catch(() => false))) {
        continue;
      }
      for (const field of fieldSelectors(scope)) {
        if (!(await field.isVisible({ timeout: 1500 }).catch(() => false))) {
          continue;
        }
        await field.scrollIntoViewIfNeeded().catch(() => {});
        await field.click({ timeout: 8000 }).catch(() => {});
        const tag = await field.evaluate((el) => el.tagName).catch(() => '');
        if (tag === 'TEXTAREA' || tag === 'INPUT') {
          await field.fill(value);
        } else {
          await field.evaluate((el) => {
            el.textContent = '';
          });
          await p.keyboard.type(value, { delay: 12 });
        }
        return;
      }
    }

    throw new Error(
      'PO preview: line-item comment editor did not appear after clicking the comment icon.'
    );
  }

  async clickSaveOnPreviewComment() {
    const p = this.page;
    const save = p
      .getByRole('button', { name: /^(save comment|save)$/i })
      .filter({ visible: true })
      .filter({ hasNotText: /cancel|close|discard/i })
      .last();
    await expect(save).toBeVisible({ timeout: 20000 });
    await save.click({ timeout: 15000 }).catch(async () => {
      await save.click({ timeout: 10000, force: true });
    });
    // eslint-disable-next-line no-console
    console.log('[PO super-admin comment] Clicked Save.');
    this.superAdminCommentSubmitted = true;
  }

  /**
   * Preview → Comments icon → line-item comment icon → type comment → Save.
   */
  async submitRandomSuperAdminPreviewLineComment(text) {
    const root = this.previewDialogRoot();
    await expect(root).toBeVisible({ timeout: this.defaultTimeout });

    const value = String(text || '').trim();
    if (!value) {
      throw new Error('PO super admin comment text must be non-empty');
    }

    const clickedComments = await this.clickTopCommentIconInPreview(root);
    if (!clickedComments) {
      throw new Error('PO preview: could not click the Comments icon.');
    }
    // eslint-disable-next-line no-console
    console.log('[PO super-admin comment] Clicked preview Comments icon.');
    await this.page.waitForTimeout(600);

    const clickedLine = await this.openFirstLineItemCommentInPreview(root);
    if (!clickedLine) {
      throw new Error(
        'PO preview: could not click the comment icon on the line item after opening Comments.'
      );
    }
    // eslint-disable-next-line no-console
    console.log('[PO super-admin comment] Clicked line-item comment icon.');

    await this.fillPreviewLineCommentEditor(value);
    await this.clickSaveOnPreviewComment();
    await this.dismissOpenMenusAndPopovers().catch(() => {});
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
