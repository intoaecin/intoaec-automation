// pages/admin/projects/ProjectProfilePage.js
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

class ProjectProfilePage extends BasePage {
  constructor(page) {
    super(page);
    // Headings
    this.designEstimatesHeading = page.getByRole('button', { name: 'Design & Estimates' });
    this.procurementHeading = page.getByRole('button', { name: 'Procurement' });
    this.financialHeading = page.getByRole('button', { name: 'Financial' });
    this.projectManagementHeading = page.getByRole('button', { name: 'Project Management' });
    this.communicationDocsHeading = page.getByRole('button', { name: 'Communication & Docs' });
  }

  async selectHeading(name) {
    await this.page.getByRole('button', { name }).click();
  }

  /** True when project profile module headings are visible (already inside a project). */
  async isInsideProjectProfile() {
    const main = this.page.locator('main, [role="main"]').first();
    return main
      .getByRole('button', { name: 'Project Management' })
      .isVisible({ timeout: 2000 })
      .catch(() => false);
  }

  async clickModuleCard(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const text = new RegExp(`^\\s*${escaped}\\s*$`, 'i');

    // Prefer clicking inside the main content area to avoid hidden sidebar duplicates.
    const main = this.page.locator('main, [role="main"]').first();
    const scope = (await main.isVisible({ timeout: 1500 }).catch(() => false)) ? main : this.page;

    if ((name || '').trim().toLowerCase() === 'purchase order') {
      await this.clickPurchaseOrderModuleCard(scope, text);
      return;
    }

    // Targeted fallback for Estimate card: the UI has multiple "Estimate" text nodes
    // and generic card/container matching can sometimes click the wrong module.
    // This mirrors the stable selector observed in Playwright inspector for this app.
    if ((name || '').trim().toLowerCase() === 'estimate') {
      const inspectorLike = scope.locator('div').filter({ hasText: text }).nth(4);
      if (await inspectorLike.isVisible({ timeout: 1500 }).catch(() => false)) {
        await inspectorLike.scrollIntoViewIfNeeded().catch(() => {});
        await inspectorLike.click({ timeout: 60000 });
        await this.page.waitForLoadState('domcontentloaded');
        return;
      }
    }

    // Schedule card: lives in a MUI grid on Project Management; generic card matching often misses it.
    // Prefer the grid cell from the app (plus stable fallback if the emotion class hash changes, or by label).
    if ((name || '').trim().toLowerCase() === 'schedule') {
      const scheduleTimeout = 40000;
      const exactGridCell = scope.locator(
        "div[class='MuiGrid-root MuiGrid-container MuiGrid-spacing-xs-2 css-isbt42'] div:nth-child(2) div:nth-child(1)"
      );
      const stableGridCell = scope
        .locator('div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2')
        .first()
        .locator('div:nth-child(2) div:nth-child(1)')
        .first();
      // Avoid matching both a wrapper and inner <p>Schedule</p> (strict mode); prefer card-like targets.
      const scheduleByLabel = scope
        .locator('div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2')
        .locator('.MuiCard-root, .MuiPaper-root, [role="button"], a')
        .filter({ hasText: text })
        .first();

      // .or() can match multiple visible nodes; .first() picks one target for strict assertions/clicks.
      const scheduleCard = exactGridCell.or(stableGridCell).or(scheduleByLabel).first();
      await expect(scheduleCard).toBeVisible({ timeout: scheduleTimeout });
      await scheduleCard.scrollIntoViewIfNeeded().catch(() => {});
      await scheduleCard.click({ timeout: scheduleTimeout });
      await this.page.waitForLoadState('domcontentloaded');
      return;
    }

    // Task card: same Project Management grid as Schedule; generic card matching often misses it.
    if ((name || '').trim().toLowerCase() === 'task') {
      const taskTimeout = 40000;
      const grid = scope
        .locator('div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2, motion.div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2')
        .first();
      const taskByLabel = grid
        .locator('.MuiCard-root, .MuiPaper-root, [role="button"], a, div')
        .filter({ hasText: text })
        .first();
      const taskCell = grid.locator('div').filter({ has: scope.getByText(text) }).first();
      const taskCard = taskByLabel.or(taskCell).first();
      await expect(taskCard).toBeVisible({ timeout: taskTimeout });
      await taskCard.scrollIntoViewIfNeeded().catch(() => {});
      await taskCard.click({ timeout: taskTimeout });
      await this.page.waitForLoadState('domcontentloaded');
      return;
    }

    // PROBLEM: the module label can exist in the DOM but be CSS-hidden (sidebar duplicates).
    // SOLUTION: click a *visible* module card/container within `main` that contains the label text.
    const candidates = scope
      .locator('.MuiCard-root, .MuiPaper-root, [role="tab"], [role="button"], button, a, [role="link"]')
      .filter({ has: scope.getByText(text) });

    const count = await candidates.count();
    for (let i = 0; i < count; i += 1) {
      const el = candidates.nth(i);
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click({ timeout: 60000 });
        await this.page.waitForLoadState('domcontentloaded');
        return;
      }
    }

    // Last resort: force click the first match (still scoped to main).
    const fallback = candidates.first();
    await expect(fallback).toHaveCount(1, { timeout: 60000 });
    await fallback.scrollIntoViewIfNeeded().catch(() => {});
    await fallback.click({ timeout: 60000, force: true });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickPurchaseOrderModuleCard(scope, text) {
    const createPurchaseOrder = this.page.getByRole('button', {
      name: /create purchase order/i,
    });

    if (await createPurchaseOrder.isVisible({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    const candidates = [
      scope.getByRole('tab', { name: text }).first(),
      scope.getByRole('button', { name: text }).first(),
      scope
        .locator('[role="tab"], .MuiTab-root, .MuiCard-root, .MuiPaper-root, [role="button"], button, a, [role="link"]')
        .filter({ hasText: text })
        .first(),
      scope
        .locator('div, span, p')
        .filter({ hasText: text })
        .filter({ visible: true })
        .first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 3000 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click({ timeout: 30000 }).catch(async () => {
        await candidate.click({ timeout: 30000, force: true });
      });
      await this.page.waitForLoadState('domcontentloaded');
      await this.page
        .waitForLoadState('networkidle', { timeout: 20000 })
        .catch(() => {});

      if (await createPurchaseOrder.isVisible({ timeout: 15000 }).catch(() => false)) {
        return;
      }
    }

    await expect(createPurchaseOrder).toBeVisible({ timeout: 60000 });
  }
}

module.exports = ProjectProfilePage;
