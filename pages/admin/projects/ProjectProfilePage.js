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

  async clickModuleCard(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const text = new RegExp(`^\\s*${escaped}\\s*$`, 'i');

    // Prefer clicking inside the main content area to avoid hidden sidebar duplicates.
    const main = this.page.locator('main, [role="main"]').first();
    const scope = (await main.isVisible({ timeout: 1500 }).catch(() => false)) ? main : this.page;

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

    // PROBLEM: the module label can exist in the DOM but be CSS-hidden (sidebar duplicates).
    // SOLUTION: click a *visible* module card/container within `main` that contains the label text.
    const candidates = scope
      .locator('.MuiCard-root, .MuiPaper-root, [role="button"], button, a, [role="link"]')
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
}

module.exports = ProjectProfilePage;
