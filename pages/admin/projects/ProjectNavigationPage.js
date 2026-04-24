// pages/admin/projects/ProjectNavigationPage.js
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

class ProjectNavigationPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.projectsLink = page.getByLabel('Clients/Projects').first();
    this.clientsMenu = page.getByRole('button', { name: /clients/i }).first();
    this.clientsProjectsMenuItem = page
      .getByRole('menuitem', { name: /clients\/projects|projects/i })
      .first();
    this.clientsRfqMenuItem = page.getByRole('menuitem', { name: /\brfq\b|request for quotation/i }).first();
    this.firstProject = page.getByRole('rowheader').first();
    this.projectRows = page.locator('tbody tr');
  }

  async navigateToProjects() {
    // Prefer explicit Clients menu → Projects when available (some navs hide the link label).
    if (await this.clientsMenu.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.clientsMenu.click({ timeout: 15000, force: true });
      if (await this.clientsProjectsMenuItem.isVisible({ timeout: 2500 }).catch(() => false)) {
        await this.clientsProjectsMenuItem.click({ timeout: 15000, force: true });
      } else if (await this.projectsLink.isVisible({ timeout: 1500 }).catch(() => false)) {
        await this.projectsLink.click({ timeout: 15000, force: true });
      }
    } else {
      await expect(this.projectsLink).toBeVisible({ timeout: this.defaultTimeout });
      await this.projectsLink.click({ timeout: 15000, force: true });
    }

    await expect(async () => {
      const rowCount = await this.projectRows.count();
      expect(rowCount).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
  }

  async clickFirstProject() {
    await expect(this.firstProject).toBeVisible({ timeout: this.defaultTimeout });
    await this.firstProject.click();
  }

  async openRfqFromClientMenu() {
    // As requested: use the left Client(s) menu, then click RFQ.
    const rfqRe = /\brfq\b|request\s*for\s*quotation|request\s*for\s*quote|quotation|quote/i;

    const tryClick = async (locator) => {
      if (!(await locator.isVisible({ timeout: 1200 }).catch(() => false))) return false;
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click({ timeout: 15000, force: true });
      return true;
    };

    // Open the left Clients menu if present (different builds use different roles).
    const clientsOpeners = [
      this.clientsMenu,
      this.page.getByRole('link', { name: /clients/i }).first(),
      this.page.getByText(/^clients$/i).filter({ visible: true }).first(),
      this.page.getByLabel(/clients/i).first(),
    ];
    for (const opener of clientsOpeners) {
      if (await tryClick(opener)) break;
    }

    // RFQ entry can be a menuitem, link, button, or list item in the sidebar.
    const sidebar = this.page.locator('aside, nav, [role="navigation"]').filter({ visible: true }).first();
    const scopes = [
      (await sidebar.isVisible({ timeout: 800 }).catch(() => false)) ? sidebar : null,
      this.page,
    ].filter(Boolean);

    for (const scope of scopes) {
      const candidates = [
        // Best: href contains rfq (works even when label is different)
        scope.locator('a[href*="rfq" i]').filter({ visible: true }).first(),
        scope.locator('a[href*="/request-for-quotation" i], a[href*="quotation" i], a[href*="quote" i]').filter({ visible: true }).first(),
        scope.getByRole('menuitem', { name: rfqRe }).first(),
        scope.getByRole('link', { name: rfqRe }).first(),
        scope.getByRole('button', { name: rfqRe }).first(),
        scope
          .locator('[role="menuitem"], [role="link"], [role="button"], a, button, li, div, span')
          .filter({ hasText: rfqRe })
          .filter({ visible: true })
          .first(),
        this.clientsRfqMenuItem, // keep old locator as fallback
      ];
      for (const c of candidates) {
        if (await tryClick(c)) {
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          return;
        }
      }
    }

    throw new Error(
      'Navigation: could not click RFQ from the left menu. The UI may label it differently or hide it behind another section.'
    );
  }
}

module.exports = ProjectNavigationPage;
