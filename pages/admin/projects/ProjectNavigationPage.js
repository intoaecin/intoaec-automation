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

    if (/^bbb$/i.test(wanted)) {
      const bbbProfileUrl = this._resolveKnownProjectProfileUrl('BBB');
      console.log(`[Admin] Opening project BBB profile directly (skip slow /client list): ${bbbProfileUrl}`);
      await this._openProfileFromDirectUrl(bbbProfileUrl, 'project BBB');
      return;
    }

    const mvbUrl = this._resolveKnownProjectProfileUrl(wanted);
    if (mvbUrl && /^(mvb|hari|bhavani|kumar|kumarorganization.*)$/i.test(wanted)) {
      console.log(`[Admin] Opening project ${wanted} profile directly (skip slow /client list): ${mvbUrl}`);
      await this._openProfileFromDirectUrl(mvbUrl, `project ${wanted}`);
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
    return projectName;
  }

  /**
   * Open an Active Clients project while skipping excluded names
   * (Dev-Inprogress, BBB, Don't touch, AEC Solutions, etc.).
   * @param {{ skipNames?: string[], preferNames?: string[], requireNamePattern?: RegExp }} [opts]
   * @returns {Promise<string>} opened project display name
   */
  async clickAvailableProjectSkipping(opts = {}) {
    const profile = this._profilePage();
    const skipNames = (
      opts.skipNames || [
        'Dev-Inprogress',
        'Dev-In Progress',
        'Dev Inprogress',
        'BBB',
        'AEC_Solutions',
        'AEC Solutions',
      ]
    )
      .map((n) => String(n || '').trim().toLowerCase())
      .filter(Boolean);
    const preferNames = (opts.preferNames || [
      'adityaconstructions',
      'adityaconstuctions',
      'Aditya Constructions',
      'aditya constructions',
    ])
      .map((n) => String(n || '').trim())
      .filter(Boolean);
    const requireNamePattern = opts.requireNamePattern || null;

    const isSkipped = (name) => {
      const n = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
      if (!n) return true;
      if (/dont\s*touch|don'?t\s*touch/i.test(n)) return true;
      if (/^bbb$/i.test(n) || /\bbbb\b/i.test(n)) return true;
      if (/aec[_\s-]*solutions/i.test(n)) return true;
      return skipNames.some(
        (skip) =>
          n === skip ||
          n.includes(skip) ||
          /dev[-\s]?in[-\s]?progress/i.test(n)
      );
    };

    const matchesRequired = (name) => {
      if (!requireNamePattern) return true;
      return requireNamePattern.test(String(name || ''));
    };

    /** Numbered "adityaconstructions_123" list stubs often do not open a profile — try last. */
    const isNumberedAdityaStub = (name) =>
      /^aditya\s*const[ru]+ctions[_\s-]?\d+$/i.test(String(name || '').trim());

    /**
     * Active Clients table: Client Name is column 1 (e.g. "John"),
     * Project Name is a later column (e.g. "kumarorganization_661235").
     * Never treat the client name as the project name.
     */
    const extractProjectNameFromRow = async (row) => {
      const cells = row.locator('td, th, [role="cell"], [role="rowheader"]');
      const count = await cells.count().catch(() => 0);
      const texts = [];
      for (let i = 0; i < count; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const t = ((await cells.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (t) texts.push(t);
      }
      if (!texts.length) {
        const raw = ((await row.innerText().catch(() => '')) || '')
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 1);
        texts.push(...raw);
      }

      // Prefer Project Name cells that look like org_project tokens.
      const byKumar = texts.find((t) => /kumar(?!@)/i.test(t));
      if (byKumar) return byKumar;
      const byAditya = texts.find((t) => /aditya[_\s-]*const/i.test(t));
      if (byAditya) return byAditya;
      // Project Name is typically column index 2 (0=Client, 1=Phone, 2=Project Name).
      if (texts.length >= 3 && texts[2].length > 1) return texts[2];
      // Fallback: longest token that is not a phone / date / short client label.
      const scored = texts
        .filter((t) => !/^\+?\d[\d\s-]{6,}$/.test(t) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t))
        .sort((a, b) => b.length - a.length);
      return scored[0] || texts[0] || '';
    };

    const tryOpenCandidate = async (_clickTarget, projectName) => {
      const wanted = String(projectName || '').trim();
      if (!wanted) return false;

      await this.openClientsProjectsList().catch(() => {});
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(500).catch(() => {});

      // Narrow the Active Clients list — full list refresh often hides numbered Project Names.
      const search = this.page
        .getByPlaceholder(/search client name or project name|search/i)
        .or(this.page.getByRole('textbox', { name: /search/i }))
        .or(this.page.locator('input[type="search"], input[placeholder*="Search" i]'))
        .filter({ visible: true })
        .first();
      if (await search.isVisible({ timeout: 2500 }).catch(() => false)) {
        const hint = wanted.replace(/_+/g, ' ').slice(0, 40);
        await search.click({ timeout: 8000 }).catch(() => {});
        await search.fill('').catch(() => {});
        await search.fill(hint).catch(() => {});
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(900).catch(() => {});
        console.log(`[Admin] Active Clients search for Project Name: "${hint}"`);
      }

      // Re-find the row by Project Name after list refresh / search.
      const row = this.page
        .locator('tbody tr, [role="row"]')
        .filter({ hasText: wanted })
        .filter({ visible: true })
        .first()
        .or(
          this.page
            .locator('tbody tr, [role="row"]')
            .filter({ hasText: new RegExp(wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
            .filter({ visible: true })
            .first()
        );
      if (!(await row.isVisible({ timeout: 10000 }).catch(() => false))) {
        // Broader: any visible kumar/aditya row after search.
        const softRow = this.page
          .locator('tbody tr, [role="row"]')
          .filter({ hasText: /kumar(?!@)|aditya[_\s-]*const/i })
          .filter({ visible: true })
          .first();
        if (await softRow.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log(`[Admin] Exact row "${wanted}" missing — using first matching const row after search`);
          const profileLink = softRow.locator('a[href*="projectId"], a[href*="/client/profile"]').first();
          const clientCell = softRow.locator('td, th, [role="cell"], [role="rowheader"]').filter({ visible: true }).first();
          if (await profileLink.isVisible({ timeout: 800 }).catch(() => false)) {
            await profileLink.click({ timeout: 15000, force: true }).catch(() => profileLink.click({ timeout: 15000 }));
          } else {
            await clientCell.click({ timeout: 15000, force: true }).catch(() => softRow.click({ timeout: 15000, force: true }));
          }
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          await this.page
            .waitForURL((u) => /client\/profile|projectId=/i.test(String(u)) && !/\/client\?isActive/i.test(String(u)), {
              timeout: 20000,
            })
            .catch(() => {});
          const openedSoft = await profile.isInsideProjectProfile().catch(() => false);
          if (openedSoft) {
            console.log(`[Admin] Opened project via soft match (wanted "${wanted}") → ${this.page.url()}`);
            await profile.ensureClassicProjectUi();
            return true;
          }
        }
        console.log(`[Admin] Row for Project Name "${wanted}" not visible after list refresh`);
        return false;
      }

      // Client Name cell (e.g. "John") / profile link opens the project — Project Name text often does not.
      const profileLink = row.locator('a[href*="projectId"], a[href*="/client/profile"]').first();
      const clientCell = row
        .locator('td, th, [role="cell"], [role="rowheader"]')
        .filter({ visible: true })
        .first();

      if (await profileLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        await profileLink.click({ timeout: 15000, force: true }).catch(async () => {
          await profileLink.click({ timeout: 15000 });
        });
      } else {
        await clientCell.scrollIntoViewIfNeeded().catch(() => {});
        await clientCell.click({ timeout: 15000, force: true }).catch(async () => {
          await row.click({ timeout: 15000, force: true });
        });
      }

      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page
        .waitForURL((u) => /client\/profile|projectId=/i.test(String(u)) && !/\/client\?isActive/i.test(String(u)), {
          timeout: 20000,
        })
        .catch(() => {});
      await this.page.waitForTimeout(800).catch(() => {});

      const ok = await profile.isInsideProjectProfile().catch(() => false);
      if (!ok) {
        // One more attempt: double-click client cell
        if (await clientCell.isVisible({ timeout: 1000 }).catch(() => false)) {
          await clientCell.dblclick({ timeout: 10000 }).catch(() => {});
          await this.page.waitForTimeout(1000).catch(() => {});
        }
      }
      const opened = await profile.isInsideProjectProfile().catch(() => false);
      if (!opened) {
        console.log(
          `[Admin] Click on client row for Project Name "${wanted}" did not open profile (url=${this.page.url()}) — trying next`
        );
        return false;
      }
      console.log(`[Admin] Opened project "${wanted}" → ${this.page.url()}`);
      await profile.ensureClassicProjectUi();
      return true;
    };

    const wantsKumarOrg =
      preferNames.some((name) => /kumarorganization/i.test(name)) ||
      (requireNamePattern && /kumar/i.test(String(requireNamePattern)));
    if (wantsKumarOrg) {
      const kumarUrl = this._resolveKnownProjectProfileUrl('kumarorganization');
      if (kumarUrl) {
        console.log('[Admin] Opening kumarorganization profile directly');
        await this._openProfileFromDirectUrl(kumarUrl, 'project kumarorganization');
        return 'kumarorganization';
      }
    }

    await this.openClientsProjectsList();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(1000).catch(() => {});

    // 1) Prefer known Aditya / configured projects by visible name.
    for (const prefer of preferNames) {
      if (isSkipped(prefer) || !matchesRequired(prefer) || isNumberedAdityaStub(prefer)) continue;
      const re = new RegExp(prefer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const target = this.page
        .getByRole('rowheader', { name: re })
        .filter({ visible: true })
        .first()
        .or(this.page.getByRole('link', { name: re }).filter({ visible: true }).first())
        .or(this.page.getByRole('cell', { name: re }).filter({ visible: true }).first())
        .or(
          this.page
            .getByText(new RegExp(`^\\s*${prefer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'))
            .filter({ visible: true })
            .first()
        )
        .or(this.page.getByText(re).filter({ visible: true }).first());
      // eslint-disable-next-line no-await-in-loop
      if (!(await target.isVisible({ timeout: 4000 }).catch(() => false))) continue;
      console.log(`[Admin] Preferring project "${prefer}" (not AEC Solutions)`);
      // eslint-disable-next-line no-await-in-loop
      if (await tryOpenCandidate(target, prefer)) return prefer;
    }

    // 2) Scan rowheaders / table rows — use Project Name column (not Client Name like "John").
    const collectCandidates = async (locator) => {
      const n = await locator.count().catch(() => 0);
      const primary = [];
      const stubs = [];
      for (let i = 0; i < n; i += 1) {
        const row = locator.nth(i);
        // eslint-disable-next-line no-await-in-loop
        const projectName = await extractProjectNameFromRow(row);
        if (!projectName || isSkipped(projectName) || !matchesRequired(projectName)) {
          if (projectName) {
            console.log(
              `[Admin] Skipping project "${projectName}" (${isSkipped(projectName) ? 'excluded' : 'filtered'})`
            );
          }
          continue;
        }
        const entry = { row, projectName };
        if (isNumberedAdityaStub(projectName)) stubs.push(entry);
        else primary.push(entry);
      }
      return [...primary, ...stubs];
    };

    // Wait briefly for real project names to render (list can mount empty rowheaders first).
    await this.page
      .waitForFunction(() => {
        const headers = Array.from(document.querySelectorAll('[role="rowheader"], tbody tr td'));
        return headers.some((el) => ((el.textContent || '').trim().length > 1));
      }, { timeout: 15000 })
      .catch(() => {});

    const headers = this.page.getByRole('rowheader').filter({ visible: true });
    for (const { row, projectName } of await collectCandidates(headers)) {
      console.log(
        `[Admin] Trying project "${projectName}"${isNumberedAdityaStub(projectName) ? ' (Aditya numbered stub — last)' : ''}`
      );
      // eslint-disable-next-line no-await-in-loop
      if (await tryOpenCandidate(row, projectName)) return projectName;
    }

    const rows = this.projectRows.filter({ visible: true });
    for (const { row, projectName } of await collectCandidates(rows)) {
      console.log(
        `[Admin] Trying project "${projectName}"${isNumberedAdityaStub(projectName) ? ' (Aditya numbered stub — last)' : ''}`
      );
      // eslint-disable-next-line no-await-in-loop
      if (await tryOpenCandidate(row, projectName)) return projectName;
    }

    // 3) Fail clearly when a required name pattern was set (e.g. kumar only).
    if (requireNamePattern) {
      throw new Error(
        `No Admin project matching ${requireNamePattern} was found. ` +
          `Skipped: ${skipNames.join(', ') || '(none)'}. ` +
          `Set VENDOR_RFQ_ADMIN_PROJECT to a matching project name, or ensure Active Clients has kumarorganization.`
      );
    }

    // 4) Fallback (non-restricted callers only): MVB known profile URL — never if MVB is skipped.
    const mvbSkipped = skipNames.some((s) => /mvb|hari|aec/.test(s)) || isSkipped('MVB');
    const mvbUrl = !mvbSkipped ? this._resolveKnownProjectProfileUrl('MVB') : null;
    if (mvbUrl) {
      console.log('[Admin] List open failed after skipping exclusions — opening MVB via direct URL');
      await this._openProfileFromDirectUrl(mvbUrl, 'project MVB');
      return 'MVB';
    }

    throw new Error(
      `No suitable Admin project found after skipping: ${skipNames.join(', ') || '(none)'}. ` +
        'Add another Active Clients project or set VENDOR_RFQ_ADMIN_PROJECT.'
    );
  }

  _escapeProjectNameRe(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Customer portal TCs rename client "john" → "Hari" (same record as MVB).
   * List search must try those aliases on the same page so TC-03 still opens after TC-02.
   */
  _clientPortalNameAliases(wanted) {
    const testData = require('../../../utils/testData');
    const family = [
      testData.client?.portalUser?.originalName,
      'john',
      'John',
      testData.client?.portalUser?.updatedName,
      'Hari',
      testData.client?.mvb?.clientName,
      'MVB',
    ]
      .map((n) => String(n || '').trim())
      .filter(Boolean);

    const wantedName = String(wanted || '').trim();
    if (!wantedName) return [];

    const inFamily = family.some((n) => n.toLowerCase() === wantedName.toLowerCase());
    const names = inFamily ? [wantedName, ...family] : [wantedName];
    const unique = [];
    const seen = new Set();
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(name);
    }
    return unique;
  }

  _resolveKnownProjectProfileUrl(name) {
    const wanted = String(name || '').trim();
    if (!wanted) return null;

    const env = require('../../../config/env');
    const testData = require('../../../utils/testData');
    const adminBase = String(env.admin || '').replace(/\/$/, '');
    const mvb = testData.client?.mvb || {};
    const original = String(testData.client?.portalUser?.originalName || 'john').trim();
    const updated = String(testData.client?.portalUser?.updatedName || 'Hari').trim();

    if (/^bbb$/i.test(wanted)) {
      return (
        process.env.ADMIN_BBB_PROJECT_URL ||
        `${adminBase}/client/profile?projectId=ea2fbbb5-e761-4ad8-a1e8-d5673657e3c7&clientId=048c2677-5232-452d-9634-a00d4d03ffe1&isActive=true`
      );
    }

    if (/^bhavani$/i.test(wanted) || /^kumar$/i.test(wanted) || /^kumarorganization/i.test(wanted)) {
      return (
        process.env.ADMIN_KUMAR_PROJECT_URL ||
        process.env.ADMIN_BHAVANI_PROJECT_URL ||
        `${adminBase}/client/profile?projectId=35d12553-b66b-4ffb-9433-9e39f1c70dcd&clientId=ca47abf3-9521-45f8-a5f7-4a8444deb1e9&isActive=true`
      );
    }

    const isMvbFamily =
      /^(mvb|hari|john)$/i.test(wanted) ||
      new RegExp(`^${this._escapeProjectNameRe(mvb.clientName || 'MVB')}$`, 'i').test(wanted) ||
      new RegExp(`^${this._escapeProjectNameRe(updated)}$`, 'i').test(wanted) ||
      new RegExp(`^${this._escapeProjectNameRe(original)}$`, 'i').test(wanted);

    if (isMvbFamily) {
      if (process.env.ADMIN_MVB_PROJECT_URL) return process.env.ADMIN_MVB_PROJECT_URL;
      if (mvb.projectId && mvb.clientId) {
        return `${adminBase}/client/profile?projectId=${mvb.projectId}&clientId=${mvb.clientId}&isActive=true`;
      }
    }

    return null;
  }

  async _openProfileFromDirectUrl(profileUrl, label) {
    const profile = this._profilePage();
    console.log(`[Admin] Opening ${label} via direct profile URL: ${profileUrl}`);
    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    await this.waitForSpaReady({ timeoutMs: 40000 });
    await this.page.waitForTimeout(1200).catch(() => {});

    await expect(async () => {
      const ok = await profile.isInsideProjectProfile();
      if (!ok) {
        console.log(`[Admin] Waiting for classic project profile after direct URL — ${this.page.url()}`);
      }
      expect(ok).toBeTruthy();
    }).toPass({ timeout: 45000, intervals: [500, 1000, 2000, 3000] });

    console.log(`[Admin] Project profile ready (${this.page.url()})`);
    await profile.ensureClassicProjectUi();
  }

  /**
   * Try several list names, then known direct profile URLs (MVB/Hari, BBB).
   */
  async clickProjectByAnyName(names = []) {
    const candidates = [...new Set((names || []).map((n) => String(n || '').trim()).filter(Boolean))];
    if (!candidates.length) throw new Error('At least one project/client name is required');

    let lastError = null;
    for (const name of candidates) {
      try {
        await this.openClientsProjectsList();
        await this.clickProjectByName(name);
        console.log(`[Admin] Opened project using list name "${name}"`);
        return name;
      } catch (err) {
        lastError = err;
        console.log(`[Admin] Could not open project "${name}" from list — ${err.message}`);
      }
    }

    for (const name of candidates) {
      const directUrl = this._resolveKnownProjectProfileUrl(name);
      if (!directUrl) continue;
      try {
        await this._openProfileFromDirectUrl(directUrl, `project "${name}"`);
        return name;
      } catch (err) {
        lastError = err;
        console.log(`[Admin] Direct URL open failed for "${name}" — ${err.message}`);
      }
    }

    const testData = require('../../../utils/testData');
    const email = testData.client?.mvb?.email || testData.client?.portalUser?.email;
    if (email) {
      try {
        await this.openClientsProjectsList();
        await this.clickProjectByName(email.split('@')[0]);
        console.log(`[Admin] Opened project using email local-part search "${email.split('@')[0]}"`);
        return email;
      } catch (err) {
        lastError = err;
        console.log(`[Admin] Email search open failed — ${err.message}`);
      }
    }

    throw lastError || new Error(`Could not open project among: ${candidates.join(', ')}`);
  }

  /**
   * Open Clients/Projects list and click the project/client whose name matches `name`
   * (e.g. project "BBB"). Searches Active → All → Inactive; for BBB also opens known profile URL.
   * Customer portal names john/Hari/MVB are treated as aliases of the same client.
   */
  async clickProjectByName(name) {
    const wanted = String(name || '').trim();
    if (!wanted) {
      throw new Error('Project/client name is required');
    }

    const kumarUrl = this._resolveKnownProjectProfileUrl(wanted);
    if (kumarUrl && /^(kumar|kumarorganization)/i.test(wanted)) {
      console.log(`[Admin] Opening kumarorganization profile directly for "${wanted}"`);
      await this._openProfileFromDirectUrl(kumarUrl, `project ${wanted}`);
      return;
    }

    const profile = this._profilePage();
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const env = require('../../../config/env');
    const adminBase = String(env.admin || '').replace(/\/$/, '');
    const aliases = this._clientPortalNameAliases(wanted);

    const listUrls = [
      `${adminBase}/client?isActive=true`,
      `${adminBase}/client`,
      `${adminBase}/client?isActive=false`,
    ];

    const tryFindAndClick = async (searchName, { quick = false } = {}) => {
      const needle = String(searchName || '').trim();
      if (!needle) return false;
      const exactRe = new RegExp(`^\\s*${escapeRe(needle)}\\s*$`, 'i');
      const containsRe = new RegExp(escapeRe(needle), 'i');
      const visTimeout = quick ? 400 : 2000;

      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      if (!quick) {
        await this.page.waitForTimeout(800).catch(() => {});
        await this.page
          .locator('tbody tr, [role="row"], th[scope="row"], span.text-dark, .MuiCard-root, .MuiPaper-root')
          .filter({ visible: true })
          .first()
          .waitFor({ state: 'visible', timeout: 20000 })
          .catch(() => {});
      }

      const search = this.page
        .getByPlaceholder(/search client name or project name|search/i)
        .or(this.page.getByRole('textbox', { name: /search/i }))
        .or(this.page.locator('input[type="search"], input[placeholder*="Search" i]'))
        .filter({ visible: true })
        .first();

      if (await search.isVisible({ timeout: quick ? 800 : 2500 }).catch(() => false)) {
        await search.click({ timeout: 10000 }).catch(() => {});
        await search.fill('');
        await search.type(needle, { delay: 50 });
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(quick ? 400 : 800).catch(() => {});
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
        if (!(await candidate.isVisible({ timeout: visTimeout }).catch(() => false))) continue;
        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: 15000, force: true }).catch(async () => {
          const row = candidate.locator('xpath=ancestor::tr[1] | ancestor::*[@role="row"][1]').first();
          if (await row.isVisible({ timeout: 1000 }).catch(() => false)) {
            await row.click({ timeout: 15000, force: true });
          } else {
            throw new Error('click failed');
          }
        });
        console.log(`[Admin] Clicked project/client match for "${needle}"`);
        return true;
      }

      if (await search.isVisible({ timeout: 1000 }).catch(() => false)) {
        await search.fill('');
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(quick ? 600 : 1500).catch(() => {});

        const clearMatch = this.page
          .locator('th[scope="row"] span.text-dark, th[scope="row"], tbody tr, [role="row"], .MuiCard-root')
          .filter({ hasText: containsRe })
          .filter({ visible: true })
          .first();
        if (await clearMatch.isVisible({ timeout: quick ? 1200 : 4000 }).catch(() => false)) {
          await clearMatch.scrollIntoViewIfNeeded().catch(() => {});
          await clearMatch.click({ timeout: 15000, force: true });
          console.log(`[Admin] Clicked project/client "${needle}" after clearing search`);
          return true;
        }
      }

      return false;
    };

    const openProfileAndFinish = async (matchedName) => {
      const matched = String(matchedName || wanted).trim();
      const containsRe = new RegExp(escapeRe(matched), 'i');
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
          console.log(`[Admin] Waiting for classic project profile after "${matched}" — ${this.page.url()}`);
        }
        expect(ok).toBeTruthy();
      }).toPass({ timeout: 45000, intervals: [500, 1000, 2000, 3000] });

      console.log(`Opened project "${matched}" (${this.page.url()})`);
      await profile.ensureClassicProjectUi();
    };

    for (const listUrl of listUrls) {
      console.log(`[Admin] Looking for project "${wanted}" on ${listUrl}`);
      await this.page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
      await this.page.waitForTimeout(800).catch(() => {});

      for (let i = 0; i < aliases.length; i += 1) {
        const alias = aliases[i];
        if (alias.toLowerCase() !== wanted.toLowerCase()) {
          console.log(`[Admin] Trying client alias "${alias}" for "${wanted}"`);
        }
        if (await tryFindAndClick(alias, { quick: i > 0 })) {
          await openProfileAndFinish(alias);
          return;
        }
      }
      console.log(`[Admin] Project "${wanted}" not found on ${listUrl}`);
    }

    // Direct open for known projects when list search fails (classic profile URL).
    for (const alias of aliases) {
      const directUrl = this._resolveKnownProjectProfileUrl(alias);
      if (!directUrl) continue;
      await this._openProfileFromDirectUrl(directUrl, `project "${wanted}"`);
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
