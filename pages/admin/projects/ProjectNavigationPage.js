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

  /**
   * Wait for IntoAEC SPA splash (AEC circle loader) to clear without hanging on networkidle.
   * Reloads once if still stuck after ~20s.
   */
  async waitForSpaReady({ timeoutMs = 45000 } = {}) {
    if (this.page.isClosed()) return false;

    const contentReady = async () => {
      if (await this.firstProject.isVisible({ timeout: 400 }).catch(() => false)) return true;
      if ((await this.projectRows.count().catch(() => 0)) > 0) return true;
      if (await this._profilePage().isInsideProjectProfile()) return true;
      if (await this.page.getByLabel(/clients\/projects/i).isVisible({ timeout: 400 }).catch(() => false)) {
        return true;
      }
      if (
        await this.page
          .getByRole('button', { name: /account settings|profile settings|resources|dashboard/i })
          .first()
          .isVisible({ timeout: 400 })
          .catch(() => false)
      ) {
        return true;
      }
      return false;
    };

    const splashVisible = async () => {
      const bodyText = ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 200);
      // Splash often has almost no text while a centered loader is shown.
      const hasMain = await this.page.locator('main, [role="main"], table, tbody tr').first().isVisible({ timeout: 300 }).catch(() => false);
      return !hasMain && bodyText.replace(/\s+/g, '').length < 40;
    };

    const deadline = Date.now() + timeoutMs;
    const started = Date.now();
    let reloaded = false;
    while (Date.now() < deadline) {
      if (await contentReady()) return true;
      if ((await splashVisible()) && !reloaded && Date.now() - started > 20000) {
        console.log(`[Admin] SPA splash still showing on ${this.page.url()} — reloading once`);
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        reloaded = true;
      }
      await this.page.waitForTimeout(500).catch(() => {});
    }
    return contentReady();
  }

  async openClientsProjectsList() {
    const env = require('../../../config/env');
    const adminBase = String(env.admin || '').replace(/\/$/, '');
    const clientsUrl = `${adminBase}/client?isActive=true`;

    console.log(`[Admin] Opening Active Clients list: ${clientsUrl}`);
    await this.page.goto(clientsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.waitForSpaReady({ timeoutMs: 45000 });

    if (!/\/client(\?|$|#)/i.test(this.page.url())) {
      console.log(`[Admin] Redirected to ${this.page.url()} — retrying ${clientsUrl}`);
      await this.page.goto(clientsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.waitForSpaReady({ timeoutMs: 30000 });
    }

    // Prefer rows if present; do not hang 120s on empty splash.
    const hasRows =
      (await this.firstProject.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await this.projectRows.count().catch(() => 0)) > 0;

    if (!hasRows) {
      console.log(`[Admin] Clients list rows not ready yet (${this.page.url()}) — continuing anyway`);
    } else {
      console.log(`[Admin] Active Clients list ready: ${this.page.url()}`);
    }
  }

  /**
   * Fast path: open project profile by name without waiting on slow /client list splash.
   * For BBB uses known classic profile URL (override with ADMIN_BBB_PROJECT_URL).
   */
  async openProjectProfileDirect(name) {
    const wanted = String(name || '').trim();
    if (!wanted) throw new Error('Project name is required');

    const env = require('../../../config/env');
    const adminBase = String(env.admin || '').replace(/\/$/, '');
    const profile = this._profilePage();

    if (/^bbb$/i.test(wanted)) {
      const bbbProfileUrl =
        process.env.ADMIN_BBB_PROJECT_URL ||
        `${adminBase}/client/profile?projectId=ea2fbbb5-e761-4ad8-a1e8-d5673657e3c7&clientId=048c2677-5232-452d-9634-a00d4d03ffe1&isActive=true`;
      console.log(`[Admin] Opening project BBB profile directly (skip slow /client list): ${bbbProfileUrl}`);
      await this.page.goto(bbbProfileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.waitForSpaReady({ timeoutMs: 40000 });
      await expect(async () => {
        expect(await profile.isInsideProjectProfile()).toBeTruthy();
      }).toPass({ timeout: 45000, intervals: [500, 1000, 2000] });
      console.log(`[Admin] Project BBB profile ready (${this.page.url()})`);
      await profile.ensureClassicProjectUi();
      return;
    }

    await this.clickProjectByName(wanted);
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

  /**
   * Always open the Active Clients list (never skip when already inside a project profile).
   * Target: {admin}/client?isActive=true  e.g. https://app.aecplayhouse.com/client?isActive=true
   */
  async navigateToActiveClientsList() {
    await this.openClientsProjectsList();
    const url = String(this.page.url() || '');
    if (!/\/client(\?|$|#)/i.test(url)) {
      throw new Error(`Expected Active Clients list (/client?isActive=true) but was on: ${url}`);
    }
    console.log(`[Admin] Active Clients list ready: ${url}`);
  }

  async clickFirstProject() {
    const profile = this._profilePage();

    // Always land on Active Clients list first so we do not reuse another project's profile.
    await this.openClientsProjectsList();

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect(this.firstProject).toBeVisible({ timeout: 30000 });
    const projectName = ((await this.firstProject.innerText().catch(() => '')) || '')
      .trim()
      .split('\n')[0]
      .trim();
    await this.firstProject.click({ timeout: 15000 });

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(async () => {
      expect(await profile.isInsideProjectProfile()).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000, 3000] });

    console.log(
      `[Admin] Opened first client/project "${projectName || '(unnamed)'}" → ${this.page.url()}`
    );
    await profile.ensureClassicProjectUi();
  }

  /**
   * Open Clients/Projects list and click the project/client whose name matches `name`
   * (e.g. project "BBB"). Searches Active → All → Inactive; for BBB also opens known profile URL.
   */
  async clickProjectByName(name) {
    const wanted = String(name || '').trim();
    if (!wanted) {
      throw new Error('Project/client name is required');
    }

    const profile = this._profilePage();
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRe = new RegExp(`^\\s*${escapeRe(wanted)}\\s*$`, 'i');
    const containsRe = new RegExp(escapeRe(wanted), 'i');
    const env = require('../../../config/env');
    const adminBase = String(env.admin || '').replace(/\/$/, '');

    // Known BBB project profile (classic UI) — override with ADMIN_BBB_PROJECT_URL if IDs change.
    const bbbProfileUrl =
      process.env.ADMIN_BBB_PROJECT_URL ||
      `${adminBase}/client/profile?projectId=ea2fbbb5-e761-4ad8-a1e8-d5673657e3c7&clientId=048c2677-5232-452d-9634-a00d4d03ffe1&isActive=true`;

    const listUrls = [
      `${adminBase}/client?isActive=true`,
      `${adminBase}/client`,
      `${adminBase}/client?isActive=false`,
    ];

    const tryFindAndClick = async () => {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(800).catch(() => {});

      await this.page
        .locator('tbody tr, [role="row"], th[scope="row"], span.text-dark, .MuiCard-root, .MuiPaper-root')
        .filter({ visible: true })
        .first()
        .waitFor({ state: 'visible', timeout: 20000 })
        .catch(() => {});

      const search = this.page
        .getByPlaceholder(/search client name or project name|search/i)
        .or(this.page.getByRole('textbox', { name: /search/i }))
        .or(this.page.locator('input[type="search"], input[placeholder*="Search" i]'))
        .filter({ visible: true })
        .first();

      if (await search.isVisible({ timeout: 2500 }).catch(() => false)) {
        await search.click({ timeout: 10000 }).catch(() => {});
        await search.fill('');
        await search.type(wanted, { delay: 50 });
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(800).catch(() => {});
        // Avoid networkidle — keeps hanging on SPA long-polls / splash.
      }

      const candidates = [
        this.page.locator('th[scope="row"] span.text-dark').filter({ hasText: exactRe }).filter({ visible: true }).first(),
        this.page.locator('th[scope="row"] span.text-dark').filter({ hasText: containsRe }).filter({ visible: true }).first(),
        this.page.getByRole('rowheader', { name: exactRe }).filter({ visible: true }).first(),
        this.page.getByRole('rowheader').filter({ hasText: containsRe }).filter({ visible: true }).first(),
        this.page.getByRole('link', { name: exactRe }).filter({ visible: true }).first(),
        this.page.getByRole('cell', { name: exactRe }).filter({ visible: true }).first(),
        this.page
          .locator('main, [role="main"]')
          .getByText(exactRe)
          .filter({ visible: true })
          .first(),
        this.page
          .locator('main tbody tr, main [role="row"], tbody tr, [role="row"], main .MuiCard-root, main .MuiPaper-root')
          .filter({ hasText: containsRe })
          .filter({ visible: true })
          .first(),
        this.page
          .locator('main td, main th, main a, main span.text-dark')
          .filter({ hasText: exactRe })
          .filter({ visible: true })
          .first(),
      ];

      for (const candidate of candidates) {
        if (!(await candidate.isVisible({ timeout: 2000 }).catch(() => false))) continue;
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: 15000, force: true }).catch(async () => {
          const row = candidate.locator('xpath=ancestor::tr[1] | ancestor::*[@role="row"][1]').first();
          if (await row.isVisible({ timeout: 1000 }).catch(() => false)) {
            await row.click({ timeout: 15000, force: true });
          } else {
            throw new Error('click failed');
          }
        });
        console.log(`[Admin] Clicked project/client match for "${wanted}"`);
        return true;
      }

      if (await search.isVisible({ timeout: 1000 }).catch(() => false)) {
        await search.fill('');
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(1500).catch(() => {});

        const clearMatch = this.page
          .locator('th[scope="row"] span.text-dark, th[scope="row"], tbody tr, [role="row"], .MuiCard-root')
          .filter({ hasText: containsRe })
          .filter({ visible: true })
          .first();
        if (await clearMatch.isVisible({ timeout: 4000 }).catch(() => false)) {
          await clearMatch.scrollIntoViewIfNeeded().catch(() => {});
          await clearMatch.click({ timeout: 15000, force: true });
          console.log(`[Admin] Clicked project/client "${wanted}" after clearing search`);
          return true;
        }
      }

      return false;
    };

    const openProfileAndFinish = async () => {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(1000).catch(() => {});

      if (!(await profile.isInsideProjectProfile())) {
        const darkName = this.page
          .locator('th[scope="row"] span.text-dark')
          .filter({ hasText: containsRe })
          .filter({ visible: true })
          .first();
        if (await darkName.isVisible({ timeout: 3000 }).catch(() => false)) {
          await darkName.click({ timeout: 15000, force: true });
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          await this.page.waitForTimeout(1000).catch(() => {});
        }
      }

      await expect(async () => {
        const ok = await profile.isInsideProjectProfile();
        if (!ok) {
          console.log(`[Admin] Waiting for classic project profile after "${wanted}" — ${this.page.url()}`);
        }
        expect(ok).toBeTruthy();
      }).toPass({ timeout: 45000, intervals: [500, 1000, 2000, 3000] });

      console.log(`Opened project "${wanted}" (${this.page.url()})`);
      await profile.ensureClassicProjectUi();
    };

    for (const listUrl of listUrls) {
      console.log(`[Admin] Looking for project "${wanted}" on ${listUrl}`);
      await this.page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
      await this.page.waitForTimeout(800).catch(() => {});

      if (await tryFindAndClick()) {
        await openProfileAndFinish();
        return;
      }
      console.log(`[Admin] Project "${wanted}" not found on ${listUrl}`);
    }

    // Direct open for BBB when list search fails (classic profile URL).
    if (/^bbb$/i.test(wanted)) {
      console.log(`[Admin] Opening project BBB via direct profile URL`);
      await this.page.goto(bbbProfileUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
      await this.page.waitForTimeout(1200).catch(() => {});
      await openProfileAndFinish();
      return;
    }

    throw new Error(
      `Could not find project "${wanted}" in Active/All/Inactive Clients lists (${adminBase}/client)`
    );
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
