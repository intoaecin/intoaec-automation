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
    this.clientsRfqMenuItem = page
      .getByRole('menuitem', { name: /\brfq\b|request for quotation/i })
      .first();
    this.firstProject = page.getByRole('rowheader').first();
    this.projectRows = page.locator('tbody tr');
  }

  async tryClick(locator, timeout = 5000) {
    if (!(await locator.isVisible({ timeout }).catch(() => false))) {
      return false;
    }
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: 15000, force: true });
    return true;
  }

  _profilePage() {
    const ProjectProfilePage = require('./ProjectProfilePage');
    return new ProjectProfilePage(this.page);
  }

  async _isActivityTrackerView() {
    const url = this.page.url();
    if (/activity[-_ ]?tracker/i.test(url)) return true;

    const main = this.page.locator('main, [role="main"]').first();
    if (await main.getByRole('heading', { name: /activity tracker/i }).isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }
    if (await main.getByText(/^activity tracker$/i).isVisible({ timeout: 1500 }).catch(() => false)) {
      return true;
    }

    const pmVisible = await this._profilePage().isInsideProjectProfile();
    if (pmVisible) return false;

    return main
      .getByText(/created a schedule|updated a schedule|deleted a schedule|created a milestone|updated a milestone|updated working days/i)
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false);
  }

  async openClientsProjectsList() {
    const candidates = [
      this.projectsLink,
      this.page.getByRole('link', { name: /clients\/projects|clients|projects/i }).first(),
      this.page.getByRole('button', { name: /clients\/projects|clients|projects/i }).first(),
    ];

    let clicked = false;
    for (const candidate of candidates) {
      if (await this.tryClick(candidate)) {
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      await expect(this.projectsLink).toBeVisible({ timeout: this.defaultTimeout });
      await this.projectsLink.click();
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(async () => {
      const hasRowheader = await this.firstProject.isVisible({ timeout: 500 }).catch(() => false);
      const hasRows = (await this.projectRows.count()) > 0;
      expect(hasRowheader || hasRows).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000, 3000] });
  }

  async _waitForProjectProfile() {
    const profile = this._profilePage();
    try {
      await expect(async () => {
        expect(await profile.isInsideProjectProfile()).toBeTruthy();
      }).toPass({ timeout: 15000, intervals: [500, 1000, 2000, 3000] });
      return true;
    } catch {
      return false;
    }
  }

  _sidebarScopes() {
    return this.page.locator('aside, nav, [role="navigation"]').filter({ visible: true });
  }

  async _clickModuleBackButton() {
    const backBtn = this.page
      .locator('button:has(svg[data-testid="ChevronLeftIcon"])')
      .filter({ visible: true })
      .first();
    if (!(await backBtn.isVisible({ timeout: 2000 }).catch(() => false))) return false;
    await backBtn.click({ force: true, timeout: 8000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    return this._waitForProjectProfile();
  }

  async _gotoSidebarProjectHref() {
    const sidebars = this._sidebarScopes();
    const scopeCount = await sidebars.count();
    for (let s = 0; s < scopeCount; s += 1) {
      const sidebar = sidebars.nth(s);
      const links = sidebar
        .locator('a[href*="/project" i]:not([href*="activity" i]), a[href*="projectId" i]')
        .filter({ visible: true });
      const linkCount = await links.count();
      for (let i = 0; i < linkCount; i += 1) {
        const link = links.nth(i);
        const href = await link.getAttribute('href').catch(() => null);
        if (!href || /activity/i.test(href)) continue;
        try {
          await link.click({ force: true, timeout: 8000 });
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          if (await this._waitForProjectProfile()) return true;
        } catch {
          /* try next */
        }
      }
    }
    return false;
  }

  async _clickSidebarProjectRowheader() {
    const sidebars = this._sidebarScopes();
    const scopeCount = await sidebars.count();
    for (let s = 0; s < scopeCount; s += 1) {
      const sidebar = sidebars.nth(s);
      const rowheaders = sidebar.getByRole('rowheader').filter({ visible: true });
      const rhCount = await rowheaders.count();
      for (let i = 0; i < rhCount; i += 1) {
        const row = rowheaders.nth(i);
        try {
          if (!(await row.isVisible({ timeout: 1500 }).catch(() => false))) continue;
          await row.scrollIntoViewIfNeeded().catch(() => {});
          await row.click({ force: true, timeout: 8000 });
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          if (await this._waitForProjectProfile()) return true;
        } catch {
          /* try next */
        }
      }
    }
    return false;
  }

  async gotoProjectProfileFromUrl() {
    const url = this.page.url();
    const patterns = [
      url.match(/^(.*\/project\/[^/?#]+)/i),
      url.match(/^(.*\/client\/profile\?[^#]*projectId=[^&#]+)/i),
    ].filter(Boolean);

    for (const match of patterns) {
      try {
        await this.page.goto(match[1], { waitUntil: 'domcontentloaded' });
        if (await this._waitForProjectProfile()) return true;
      } catch {
        /* try next */
      }
    }
    return false;
  }

  /** Leave Activity Tracker / deep link and open the project profile hub. */
  async returnToProjectProfile() {
    const profile = this._profilePage();
    if (await profile.isInsideProjectProfile()) return true;

    if (await this._isActivityTrackerView()) {
      if (await this._clickModuleBackButton()) return true;
      if (await this._gotoSidebarProjectHref()) return true;
      if (await this._clickSidebarProjectRowheader()) return true;

      await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      if (await this._waitForProjectProfile()) return true;

      if (await this.gotoProjectProfileFromUrl()) return true;
    }

    const sidebar = this._sidebarScopes().first();
    const rowheaders = sidebar.getByRole('rowheader').filter({ visible: true });
    const rhCount = await rowheaders.count();
    for (let i = 0; i < rhCount; i += 1) {
      const row = rowheaders.nth(i);
      try {
        await row.click({ force: true, timeout: 8000 });
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        if (await profile.isInsideProjectProfile()) return true;
      } catch {
        /* try next */
      }
    }

    if (await this._clickModuleBackButton()) return true;

    await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
    if (await profile.isInsideProjectProfile()) return true;

    const match = this.page.url().match(/^(.*\/project\/[^/?#]+)/i);
    if (match) {
      await this.page.goto(match[1], { waitUntil: 'domcontentloaded' }).catch(() => {});
      if (await profile.isInsideProjectProfile()) return true;
    }

    return false;
  }

  async navigateToProjects() {
    const profile = this._profilePage();
    if (await profile.isInsideProjectProfile()) {
      return;
    }

    if (await this._isActivityTrackerView()) {
      if (await this.returnToProjectProfile()) {
        return;
      }
      await this.openClientsProjectsList();
      return;
    }

    await this.openClientsProjectsList();
  }

  async clickFirstProject() {
    const profile = this._profilePage();
    if (await profile.isInsideProjectProfile()) {
      return;
    }

    if (await this._isActivityTrackerView()) {
      if (await this.returnToProjectProfile()) {
        return;
      }
      await this.openClientsProjectsList();
    } else {
      await this.openClientsProjectsList();
    }

    await this.page.waitForLoadState('networkidle').catch(() => {});

    if (await profile.isInsideProjectProfile()) {
      return;
    }

    await expect(this.firstProject).toBeVisible({ timeout: 60000 });
    await this.firstProject.click({ timeout: 15000 });

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(async () => {
      expect(await profile.isInsideProjectProfile()).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [500, 1000, 2000, 3000] });
  }

  async openRfqFromClientMenu() {
    const rfqRe =
      /\brfq\b|request\s*for\s*quotation|request\s*for\s*quote|quotation|quote/i;

    const tryClick = async (locator) => {
      if (!(await locator.isVisible({ timeout: 1200 }).catch(() => false))) return false;
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click({ timeout: 15000, force: true });
      return true;
    };

    const clientsOpeners = [
      this.clientsMenu,
      this.page.getByRole('link', { name: /clients/i }).first(),
      this.page.getByText(/^clients$/i).filter({ visible: true }).first(),
      this.page.getByLabel(/clients/i).first(),
    ];
    for (const opener of clientsOpeners) {
      if (await tryClick(opener)) break;
    }

    const sidebar = this.page.locator('aside, nav, [role="navigation"]').filter({ visible: true }).first();
    const scopes = [
      (await sidebar.isVisible({ timeout: 800 }).catch(() => false)) ? sidebar : null,
      this.page,
    ].filter(Boolean);

    for (const scope of scopes) {
      const candidates = [
        scope.locator('a[href*="rfq" i]').filter({ visible: true }).first(),
        scope
          .locator('a[href*="/request-for-quotation" i], a[href*="quotation" i], a[href*="quote" i]')
          .filter({ visible: true })
          .first(),
        scope.getByRole('menuitem', { name: rfqRe }).first(),
        scope.getByRole('link', { name: rfqRe }).first(),
        scope.getByRole('button', { name: rfqRe }).first(),
        scope
          .locator('[role="menuitem"], [role="link"], [role="button"], a, button, li, div, span')
          .filter({ hasText: rfqRe })
          .filter({ visible: true })
          .first(),
        this.clientsRfqMenuItem,
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
