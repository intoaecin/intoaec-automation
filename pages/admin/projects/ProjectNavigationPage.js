// pages/admin/projects/ProjectNavigationPage.js
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const env = require('../../../config/env');

/**
 * Sidebar label is i18n: en "Projects" (key sidebar.clients/projects), not the raw
 * constant "Clients/Projects". ListItemButton has no aria-label — name comes from text.
 */
class ProjectNavigationPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.projectsNameRe = /^(clients\s*\/\s*projects|projects|proyectos)$/i;
    this.projectsLooseRe = /clients\s*\/\s*projects|^\s*projects\s*$|^\s*proyectos\s*$/i;
    this.projectsLink = page.getByRole('button', { name: this.projectsNameRe }).first();
    // MasterGrid: client name is th[scope=row] with router.push to /client/profile
    this.firstProject = page.locator('tbody tr').first().locator('th[scope="row"], th').first();
    this.projectRows = page.locator('tbody tr, .MuiDataGrid-row');
  }

  async dismissOverlays() {
    for (let i = 0; i < 3; i += 1) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(200).catch(() => {});
    }
  }

  async resolveClientsProjectsLink() {
    const sidebar = this.page.locator(
      'nav, aside, [class*="Drawer"], [class*="Sidebar"], [class*="MuiDrawer"], [class*="MuiList"]'
    );

    const candidates = [
      sidebar.getByRole('button', { name: this.projectsNameRe }).first(),
      this.page.getByRole('button', { name: this.projectsNameRe }).first(),
      sidebar.getByRole('link', { name: this.projectsNameRe }).first(),
      this.page.getByRole('link', { name: this.projectsNameRe }).first(),
      this.page.getByLabel(/clients\s*\/?\s*projects|^\s*projects\s*$/i).first(),
      sidebar.getByText(this.projectsLooseRe).first(),
      this.page.getByText(this.projectsLooseRe).filter({ visible: true }).first(),
    ];

    for (const loc of candidates) {
      if (!(await loc.isVisible({ timeout: 1200 }).catch(() => false))) continue;
      const clickable = loc
        .locator('xpath=ancestor-or-self::*[self::button or @role="button" or self::a][1]')
        .first();
      if (await clickable.isVisible({ timeout: 500 }).catch(() => false)) {
        return clickable;
      }
      return loc;
    }
    return null;
  }

  async openClientsViaUrl() {
    const base = String(env.admin || '').replace(/\/$/, '');
    const target = `${base}/client`;
    await this.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(1000).catch(() => {});
  }

  async navigateToProjects() {
    await this.dismissOverlays();

    let link = null;
    try {
      await expect(async () => {
        link = await this.resolveClientsProjectsLink();
        expect(link, 'Projects nav candidate').toBeTruthy();
        expect(await link.isVisible().catch(() => false)).toBeTruthy();
      }).toPass({ timeout: Math.min(30000, this.defaultTimeout), intervals: [1000, 2000, 4000] });
    } catch {
      // Sidebar label varies by locale / layout — deep-link as fallback
      // eslint-disable-next-line no-console
      console.log(
        `Projects sidebar not found at ${this.page.url()} — opening /client directly`
      );
      await this.openClientsViaUrl();
      link = null;
    }

    if (link) {
      await link.click({ force: true });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    // If still no rows after click, try URL once more
    const hasRowsEarly = (await this.projectRows.count().catch(() => 0)) > 0;
    if (!hasRowsEarly && !/\/client/i.test(this.page.url())) {
      await this.openClientsViaUrl();
    }

    try {
      await expect(async () => {
        const rowCount = await this.projectRows.count();
        expect(rowCount).toBeGreaterThan(0);
      }).toPass({ timeout: Math.min(45000, this.defaultTimeout), intervals: [1000, 2000, 3000] });
    } catch {
      // Slow API / empty first paint — hard reload /client once
      // eslint-disable-next-line no-console
      console.log('Projects list empty — reloading /client');
      await this.openClientsViaUrl();
      await this.page.waitForTimeout(2000).catch(() => {});
    }

    try {
      await expect(async () => {
        const rowCount = await this.projectRows.count();
        expect(rowCount).toBeGreaterThan(0);
      }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
    } catch (err) {
      const url = this.page.url();
      throw new Error(
        `Clients/Projects list has no project rows. Current URL: ${url}. ` +
          `${(err && err.message) || err}`
      );
    }
  }

  async clickFirstProject() {
    const row = this.page.locator('tbody tr').filter({ visible: true }).first();
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });

    const clientCell = row.locator('th[scope="row"], th').first();
    const projectLink = row.locator('a').filter({ visible: true }).first();
    const target = (await clientCell.isVisible({ timeout: 2000 }).catch(() => false))
      ? clientCell
      : (await projectLink.isVisible({ timeout: 1000 }).catch(() => false))
        ? projectLink
        : row;

    await target.click({ force: true });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    try {
      await this.page.waitForURL(/client\/profile|projectId=/i, {
        timeout: 60000,
      });
    } catch (err) {
      // Retry once via client-name cell without force
      if (await clientCell.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clientCell.click({ timeout: 10000 }).catch(() => {});
        await this.page.waitForURL(/client\/profile|projectId=/i, {
          timeout: 60000,
        }).catch(() => {});
      }
      if (!/client\/profile|projectId=/i.test(this.page.url())) {
        throw new Error(
          `Failed to open project profile after clicking first row. Current URL: ${this.page.url()}. ` +
            `${(err && err.message) || err}`
        );
      }
    }
  }
}

module.exports = ProjectNavigationPage;
