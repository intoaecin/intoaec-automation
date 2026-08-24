// pages/admin/projects/ProjectNavigationPage.js
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');
const env = require('../../../config/env');

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
    // Clients/Projects table: client name cell (Time Tracking / Proposal flows).
    this.firstClientName = page.locator('th[scope="row"] span.text-dark').first();
    this.addClientButton = page
      .getByRole('button', { name: /^add client$/i })
      .or(page.locator('button').filter({ hasText: /^add client$/i }))
      .first();
  }

  async tryClick(locator, timeout = 5000) {
    if (!(await locator.isVisible({ timeout }).catch(() => false))) {
      return false;
    }
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: 15000, force: true });
    return true;
  }

  _main() {
    return this.page.locator('main, [role="main"]').first();
  }

  _isDeepModuleUrl() {
    // Only real module screens — not the Clients/Projects list (`/client/profile` without projectId).
    return /purchase-order|work[-_]?order|\/rfq|indent|tab=RFQAndPO|tab=Schedule/i.test(
      this.page.url()
    );
  }

  _clientsListRow() {
    return this.page
      .locator('th[scope="row"] span.text-dark')
      .or(this.page.getByRole('rowheader'))
      .or(this.page.locator('tbody tr'))
      .filter({ visible: true })
      .first();
  }

  async _isClientsProjectsListVisible() {
    if (await this.firstClientName.isVisible({ timeout: 800 }).catch(() => false)) return true;
    if (await this.addClientButton.isVisible({ timeout: 500 }).catch(() => false)) return true;
    if (
      await this.page
        .getByPlaceholder(/search client name or project name/i)
        .first()
        .isVisible({ timeout: 400 })
        .catch(() => false)
    ) {
      return true;
    }
    return this._clientsListRow().isVisible({ timeout: 400 }).catch(() => false);
  }

  _profilePage() {
    const ProjectProfilePage = require('./ProjectProfilePage');
    return new ProjectProfilePage(this.page);
  }

  async _isActivityTrackerView() {
    const url = this.page.url();
    if (/activity[-_ ]?tracker/i.test(url)) return true;

    const main = this._main();
    if (await main.getByRole('heading', { name: /^activity tracker$/i }).isVisible({ timeout: 800 }).catch(() => false)) {
      return true;
    }
    return main.getByText(/^activity tracker$/i).isVisible({ timeout: 500 }).catch(() => false);
  }

  async openClientsProjectsList() {
    if (await this._isClientsProjectsListVisible()) {
      // eslint-disable-next-line no-console
      console.log('[nav] Clients/Projects list already visible');
      return;
    }

    await this._waitForClientsProjectsNav().catch(() => {});

    const candidates = this._clientsProjectsNavCandidates();

    let clicked = false;
    for (const candidate of candidates) {
      if (await this.tryClick(candidate, 8000)) {
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      const navVisible = await this._anyClientsProjectsNavVisible(3000);
      if (navVisible) {
        for (const candidate of candidates) {
          await candidate.scrollIntoViewIfNeeded().catch(() => {});
          const forced = await candidate
            .click({ timeout: 15000, force: true })
            .then(() => true)
            .catch(() => false);
          if (forced) {
            clicked = true;
            break;
          }
        }
      }
    }

    if (!clicked) {
      // eslint-disable-next-line no-console
      console.log('[nav] Clients/Projects nav not found — opening list URL directly');
      await this._gotoClientsProjectsListByUrl();
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect
      .poll(
        async () => {
          const url = this.page.url();
          if (/\/(purchase-order|work-order|rfq)\/(create|edit)/i.test(url)) return false;
          // Accept /client page URL as success even before list elements render.
          if (/\/client(\?|$)/i.test(url)) return true;
          return this._isClientsProjectsListVisible();
        },
        { timeout: 30000, intervals: [400, 800, 1500, 2500] }
      )
      .toBe(true);

    // eslint-disable-next-line no-console
    console.log(`[nav] Clients/Projects list ready. URL=${this.page.url()}`);
  }

  _clientsProjectsNavCandidates() {
    const sidebar = this._sidebarScopes().first();
    return [
      this.page
        .getByLabel('Clients/Projects')
        .getByRole('button', { name: /clients\/projects/i })
        .first(),
      this.projectsLink,
      this.page
        .getByLabel('Clients/Projects')
        .getByRole('link', { name: /clients\/projects/i })
        .first(),
      this.page.getByRole('link', { name: /clients\/projects/i }).first(),
      this.page.getByRole('button', { name: /clients\/projects/i }).first(),
      sidebar.getByRole('button', { name: /clients\/projects/i }).first(),
      sidebar.getByRole('link', { name: /clients\/projects/i }).first(),
    ];
  }

  async _anyClientsProjectsNavVisible(timeout = 1500) {
    for (const candidate of this._clientsProjectsNavCandidates()) {
      if (await candidate.isVisible({ timeout }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  async _waitForClientsProjectsNav(timeout = 60000) {
    await expect
      .poll(
        async () => {
          if (await this._isClientsProjectsListVisible()) return true;
          return this._anyClientsProjectsNavVisible(800);
        },
        { timeout, intervals: [500, 1000, 2000, 3000] }
      )
      .toBe(true);
  }

  async _gotoClientsProjectsListByUrl() {
    const base = String(env.admin || '').replace(/\/$/, '');
    await this.page
      .goto(`${base}/client/profile`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      .catch(async () => {
        await this.page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
      });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async _waitForProjectProfile(timeout = 15000) {
    const profile = this._profilePage();
    try {
      await expect(async () => {
        expect(await profile.isInsideProjectProfile()).toBeTruthy();
      }).toPass({ timeout, intervals: [400, 800, 1500] });
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
    await this.openClientsProjectsList();
  }

  _clientNameCells() {
    return this.page.locator('th[scope="row"] span.text-dark').filter({ visible: true });
  }

  async _clickVisible(locator, timeout = 15000) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout }).catch(async () => {
      await locator.click({ timeout: Math.min(timeout, 10000), force: true });
    });
  }

  async _clickFirstClientName() {
    // Wait for the page to settle so the list has time to render.
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const candidates = [
      // Scoped cell span (table layout).
      this._clientNameCells().first(),
      // Table rowheader.
      this.page.locator('table th[scope="row"], table [role="rowheader"]').filter({ visible: true }).first(),
      // Any <a> inside a table row.
      this.page.locator('table tbody tr td a, table tbody tr th a').filter({ visible: true }).first(),
      // First clickable table row cell (no link).
      this.page.locator('table tbody tr td').filter({ visible: true }).first(),
      // Card / list item layout.
      this.page.locator('[class*="card"], [class*="Card"]').filter({ visible: true }).first(),
      // Generic: first clickable row in main content area.
      this.page.locator('main tr, [role="main"] tr, #root tr').filter({ visible: true }).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 5000 }).catch(() => false)) {
        const label = ((await candidate.innerText().catch(() => '')) || '').trim().slice(0, 80);
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: 15000 }).catch(async () => {
          await candidate.click({ timeout: 10000, force: true });
        });
        // eslint-disable-next-line no-console
        console.log(`[nav] Clicked first client: ${label || '(unnamed)'}`);
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        return;
      }
    }

    throw new Error('[nav] Could not find any client name to click in the clients list.');
  }

  async _clickFirstProjectUnderClient(nameCountBefore, urlBefore) {
    if (await this._profilePage().isInsideProjectProfile()) {
      return true;
    }

    let nameCountAfter = nameCountBefore;
    try {
      await expect
        .poll(
          async () => {
            if (await this._profilePage().isInsideProjectProfile()) {
              return true;
            }
            nameCountAfter = await this._clientNameCells().count();
            return nameCountAfter > nameCountBefore;
          },
          { timeout: 1500, intervals: [200, 400, 700] }
        )
        .toBe(true);
    } catch {
      nameCountAfter = await this._clientNameCells().count().catch(() => nameCountBefore);
    }

    if (await this._profilePage().isInsideProjectProfile()) {
      return true;
    }

    if (nameCountAfter > nameCountBefore) {
      const projectName = this._clientNameCells().nth(1);
      const visible = await projectName.isVisible({ timeout: 1200 }).catch(() => false);
      if (visible) {
        const clicked = await projectName
          .click({ timeout: 4000, force: true })
          .then(() => true)
          .catch(() => false);
        if (clicked) {
          const label = ((await projectName.innerText().catch(() => '')) || '').trim().slice(0, 80);
          // eslint-disable-next-line no-console
          console.log(`[nav] Clicked first project under client${label ? `: ${label}` : ''}`);
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          return true;
        }
      }
      // eslint-disable-next-line no-console
      console.log('[nav] Nested project row disappeared or was not clickable — continuing');
    }

    const urlAfter = this.page.url();
    if (
      urlAfter !== urlBefore &&
      (await this._clientNameCells().first().isVisible({ timeout: 1500 }).catch(() => false)) &&
      !(await this._profilePage().isInsideProjectProfile())
    ) {
      const projectName = this._clientNameCells().first();
      const clicked = await projectName
        .click({ timeout: 4000, force: true })
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        // eslint-disable-next-line no-console
        console.log('[nav] Clicked first project on client detail page');
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        return true;
      }
    }

    return false;
  }

  async _clickSelectedRowProfileIcon() {
    const selected = this.page
      .locator('tbody tr.Mui-selected, tbody tr[aria-selected="true"]')
      .filter({ visible: true })
      .first();
    const row = (await selected.isVisible({ timeout: 800 }).catch(() => false))
      ? selected
      : this.page.locator('tbody tr').filter({ visible: true }).first();
    const iconBtn = row
      .locator('button.MuiIconButton-root.MuiIconButton-sizeSmall, button.MuiIconButton-root')
      .filter({ visible: true })
      .first();
    const rowLink = row.locator('a').filter({ visible: true }).first();

    if (await iconBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const clicked = await iconBtn
        .click({ timeout: 5000, force: true })
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        // eslint-disable-next-line no-console
        console.log('[nav] Clicked client/project row profile icon');
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        return true;
      }
    }
    if (await rowLink.isVisible({ timeout: 1500 }).catch(() => false)) {
      const clicked = await rowLink
        .click({ timeout: 4000, force: true })
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        // eslint-disable-next-line no-console
        console.log('[nav] Clicked client/project row link');
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        return true;
      }
    }
    return false;
  }

  async clickFirstProject() {
    const profile = this._profilePage();
    if (await profile.isInsideProjectProfile()) {
      // eslint-disable-next-line no-console
      console.log('[nav] Already on project profile hub — skip client/project click');
      return;
    }

    const listVisible = await this._isClientsProjectsListVisible();
    if (!listVisible) {
      if (this._isDeepModuleUrl() && (await this.returnToProjectProfile())) {
        return;
      }
      await this.openClientsProjectsList();
    }

    if (await profile.isInsideProjectProfile()) {
      return;
    }

    const urlBefore = this.page.url();
    const nameCountBefore = await this._clientNameCells().count().catch(() => 0);

    await this._clickFirstClientName();
    if (await this._waitForProjectProfile(5000)) {
      return;
    }

    await this._clickFirstProjectUnderClient(nameCountBefore, urlBefore);
    if (await this._waitForProjectProfile(4000)) {
      return;
    }

    await this._clickSelectedRowProfileIcon();
    if (await this._waitForProjectProfile()) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`[nav] First client/project did not open hub. URL=${this.page.url()}`);
    await expect(async () => {
      expect(await profile.isInsideProjectProfile()).toBeTruthy();
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000] });
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
