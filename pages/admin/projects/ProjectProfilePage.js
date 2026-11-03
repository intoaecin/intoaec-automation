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
    // Pill control shown after opening a project (label: "Switch to Classic UI").
    this.uiModeToggleLabel = page.getByText(/switch to (classic|new) ui/i).first();
    this.uiModeToggleRoot = page
      .locator('div, label, button, span')
      .filter({ hasText: /switch to (classic|new) ui/i })
      .filter({ visible: true })
      .first();
    this.uiModeToggle = this.uiModeToggleRoot
      .locator('[role="switch"], input[type="checkbox"], .MuiSwitch-switchBase, .MuiSwitch-root')
      .or(
        page
          .getByRole('switch', { name: /switch to (classic|new) ui/i })
          .or(page.getByLabel(/switch to (classic|new) ui/i))
          .or(page.getByRole('checkbox', { name: /switch to (classic|new) ui/i }))
      )
      .first();
  }

  _visibleHeading(name) {
    const exact = new RegExp(`^\\s*${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    return this.page
      .getByRole('tab', { name: exact })
      .or(this.page.getByRole('button', { name: exact }))
      .or(this.page.locator('.MuiTab-root, [role="tab"]').filter({ hasText: exact }))
      .or(this.page.getByText(exact))
      .filter({ visible: true })
      .first();
  }

  /**
   * Classic project profile (screenshot): header "New UI" toggle must be OFF.
   * When ON, module tiles / Procurement tabs differ from the automation selectors.
   */
  async ensureClassicProjectUi() {
    const url = String(this.page.url() || '');
    if (!/\/client\/profile|\/project\//i.test(url)) {
      return false;
    }

    const newUiLabel = this.page.getByText(/^New\s*UI$/i).filter({ visible: true }).first();
    if (!(await newUiLabel.isVisible({ timeout: 2500 }).catch(() => false))) {
      console.log('[ProjectProfile] Classic UI already active (no New UI toggle found)');
      return true;
    }

    const switchControl = this.page
      .getByRole('switch', { name: /new\s*ui/i })
      .or(
        newUiLabel
          .locator(
            'xpath=ancestor::*[.//input[@type="checkbox"] or .//*[@role="switch"]][1]//input[@type="checkbox"] | ancestor::*[.//*[@role="switch"]][1]//*[@role="switch"]'
          )
          .first()
      )
      .or(this.page.locator('header input[type="checkbox"], header [role="switch"]').filter({ visible: true }).last())
      .filter({ visible: true })
      .first();

    // MUI Switch: often the input is visually near the "New UI" text.
    const muiSwitch = this.page
      .locator('span.MuiSwitch-root, label')
      .filter({ has: this.page.getByText(/^New\s*UI$/i) })
      .locator('input[type="checkbox"], [role="switch"]')
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator('header, [class*="AppBar"], [class*="Toolbar"]')
          .locator('.MuiSwitch-root input[type="checkbox"], [role="switch"]')
          .filter({ visible: true })
          .first()
      );

    const control = (await switchControl.isVisible({ timeout: 1500 }).catch(() => false))
      ? switchControl
      : muiSwitch;

    if (!(await control.isVisible({ timeout: 3000 }).catch(() => false))) {
      // Click the label area / nearest switch sibling.
      const nearSwitch = newUiLabel
        .locator('xpath=following::input[@type="checkbox"][1] | preceding::input[@type="checkbox"][1] | following::*[@role="switch"][1] | preceding::*[@role="switch"][1]')
        .first();
      if (await nearSwitch.isVisible({ timeout: 2000 }).catch(() => false)) {
        const checked =
          (await nearSwitch.getAttribute('aria-checked').catch(() => null)) === 'true' ||
          (await nearSwitch.isChecked().catch(() => false));
        if (checked) {
          await nearSwitch.click({ timeout: 10000, force: true });
          await this.page.waitForTimeout(1200).catch(() => {});
          console.log('[ProjectProfile] Turned OFF New UI toggle (classic profile)');
        } else {
          console.log('[ProjectProfile] New UI toggle already OFF — classic profile');
        }
        return true;
      }
      console.log('[ProjectProfile] Could not locate New UI switch — continuing');
      return false;
    }

    const checked =
      (await control.getAttribute('aria-checked').catch(() => null)) === 'true' ||
      (await control.isChecked().catch(() => false));

    if (checked) {
      await control.click({ timeout: 10000, force: true }).catch(async () => {
        await newUiLabel.click({ timeout: 10000, force: true });
      });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(1500).catch(() => {});
      console.log(`[ProjectProfile] Turned OFF New UI — classic grid (${this.page.url()})`);
    } else {
      console.log('[ProjectProfile] New UI already OFF — classic project profile');
    }

    // Classic markers: All / Procurement tabs + RFQ tile text.
    const classicMarker = this.page
      .getByRole('tab', { name: /^all$/i })
      .or(this.page.getByRole('button', { name: /^procurement$/i }))
      .or(this.page.getByText(/^RFQ$/i))
      .filter({ visible: true })
      .first();
    await classicMarker.isVisible({ timeout: 8000 }).catch(() => false);
    return true;
  }

  async selectHeading(name) {
    await this.ensureClassicProjectUi();

    let heading = this._visibleHeading(name);

    if (!(await heading.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await this.page.waitForTimeout(1200);
      heading = this._visibleHeading(name);
    }

    if (!(await heading.isVisible({ timeout: 3000 }).catch(() => false))) {
      const ProjectNavigationPage = require('./ProjectNavigationPage');
      const nav = new ProjectNavigationPage(this.page);
      if (!(await nav.returnToProjectProfile())) {
        await nav.openClientsProjectsList();
        await nav.clickFirstProject();
      }
      await this.ensureClassicProjectUi();
      heading = this._visibleHeading(name);
    }

    await expect(heading).toBeVisible({ timeout: 60000 });
    await heading.scrollIntoViewIfNeeded().catch(() => {});
    await heading.click();
    await this.page.waitForTimeout(600).catch(() => {});
  }

  /** True when the classic project profile hub is open (any main section heading). */
  async isInsideProjectProfile() {
    const headings = [
      'Project Management',
      'Procurement',
      'Design & Estimates',
      'Financial',
      'Communication & Docs',
    ];
    for (const name of headings) {
      if (await this._visibleHeading(name).isVisible({ timeout: 800 }).catch(() => false)) {
        return true;
      }
    }
    const url = String(this.page.url() || '');
    if (/\/client\/profile|\/project\//i.test(url) && !/\/client(\?|$)/i.test(url)) {
      return true;
    }
    return false;
  }

  /** Project is open (classic hub, UI-mode toggle, or project URL). */
  async isProjectWorkspaceOpen() {
    if (await this.isInsideProjectProfile()) return true;
    if (await this.uiModeToggleLabel.isVisible({ timeout: 800 }).catch(() => false)) return true;
    if (await this.uiModeToggle.isVisible({ timeout: 500 }).catch(() => false)) return true;
    const href = this.page.url() || '';
    if (/\/client\/?(\?|#|$)/i.test(href) && !/projectId=/i.test(href)) return false;
    return /projectId=/i.test(href) || /\/project\//i.test(href);
  }

  async _isUiModeToggleOn() {
    const toggle = this.uiModeToggle;
    if (!(await toggle.isVisible({ timeout: 1500 }).catch(() => false))) {
      return false;
    }
    const aria = await toggle.getAttribute('aria-checked').catch(() => null);
    if (aria === 'true') return true;
    if (aria === 'false') return false;
    const input = this.uiModeToggleRoot
      .locator('input[type="checkbox"]')
      .or(toggle.locator('input[type="checkbox"]'))
      .first();
    if (await input.count().catch(() => 0)) {
      const checked = await input.isChecked().catch(() => null);
      if (checked !== null) return checked;
    }
    const className = (await toggle.getAttribute('class').catch(() => '')) || '';
    if (/\bMui-checked\b/.test(className)) return true;
    return toggle
      .evaluate((el) => !!el.closest('.Mui-checked, .MuiSwitch-root.Mui-checked, .MuiSwitch-switchBase.Mui-checked'))
      .catch(() => false);
  }

  /**
   * After opening a project, "Switch to Classic UI" appears ON by default.
   * Turn the toggle OFF, wait for the classic hub, then continue existing steps.
   */
  async ensureClassicProjectUi() {
    const labelVisible = await this.uiModeToggleLabel.isVisible({ timeout: 1200 }).catch(() => false);
    if (!labelVisible) {
      if (await this.isInsideProjectProfile()) return;
      if (!(await this.isProjectWorkspaceOpen())) return;
    } else {
      const on = await this._isUiModeToggleOn();
      // Default is ON in the new UI; if state cannot be read, still click once to disable.
      if (on || !(await this.isInsideProjectProfile())) {
        const switchEl = this.uiModeToggle;
        const clickTarget = (await switchEl.isVisible({ timeout: 2000 }).catch(() => false))
          ? switchEl
          : this.uiModeToggleRoot;
        await expect(clickTarget).toBeVisible({ timeout: 15000 });
        await clickTarget.scrollIntoViewIfNeeded().catch(() => {});
        await clickTarget.click({ timeout: 15000 }).catch(async () => {
          await clickTarget.click({ timeout: 10000, force: true });
        });
        // eslint-disable-next-line no-console
        console.log('[nav] Disabled "Switch to Classic UI" toggle — waiting for classic project UI');
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      } else {
        // eslint-disable-next-line no-console
        console.log('[nav] "Switch to Classic UI" toggle already OFF');
      }
    }

    if (await this.isInsideProjectProfile()) {
      return;
    }

    if (!labelVisible && !(await this.isProjectWorkspaceOpen())) {
      return;
    }

    await expect
      .poll(async () => this.isInsideProjectProfile(), {
        timeout: 60000,
        intervals: [500, 1000, 2000],
      })
      .toBeTruthy();
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

    if ((name || '').trim().toLowerCase() === 'work order') {
      await this.clickWorkOrderModuleCard(scope, text);
      return;
    }

    if ((name || '').trim().toLowerCase() === 'indent') {
      await this.clickIndentModuleCard(scope, text);
      return;
    }

    if ((name || '').trim().toLowerCase() === 'rfq') {
      await this.clickRfqModuleCard(scope, text);
      return;
    }

    if ((name || '').trim().toLowerCase() === 'client report') {
      await this.clickClientReportModuleCard(scope, text);
      return;
    }

    if ((name || '').trim().toLowerCase() === 'daily report') {
      await this.clickDailyReportModuleCard(scope, text);
      return;
    }

    if ((name || '').trim().toLowerCase() === 'proposal') {
      const ProposalPage = require('../common/ProposalPage');
      const proposalPage = new ProposalPage(this.page);
      await proposalPage.openProposalTab();
      return;
    }

    if ((name || '').trim().toLowerCase() === 'invoice') {
      await this.clickInvoiceModuleCard(scope);
      return;
    }

    if ((name || '').trim().toLowerCase() === 'estimate') {
      await this.clickEstimateModuleCard(scope);
      return;
    }

    // Schedule card: prefer exact "Schedule" label — positional nth-child often hits Estimate
    // when Design & Estimates grid is still visible / overlapping.
    if ((name || '').trim().toLowerCase() === 'schedule') {
      await this.clickScheduleModuleCard(scope, text);
      return;
    }

    // Assets card: same Project Management grid as Schedule/Task; generic card matching often misses it.
    if ((name || '').trim().toLowerCase() === 'assets') {
      const assetsTimeout = 40000;
      const grid = scope
        .locator(
          'div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2, motion.div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2'
        )
        .first();
      const assetsByLabel = grid
        .locator('.MuiCard-root, .MuiPaper-root, [role="button"], a, div')
        .filter({ hasText: text })
        .first();
      const assetsCell = grid.locator('div').filter({ has: scope.getByText(text) }).first();
      const assetsCard = assetsByLabel.or(assetsCell).first();
      await expect(assetsCard).toBeVisible({ timeout: assetsTimeout });
      await assetsCard.scrollIntoViewIfNeeded().catch(() => {});
      await assetsCard.click({ timeout: assetsTimeout });
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

    // Budgeting card: same Project Management grid; generic card matching often misses it after module hops.
    if ((name || '').trim().toLowerCase() === 'budgeting') {
      await this.clickBudgetingModuleCard(scope, text);
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

  /**
   * Design & Estimates → Estimate tile (MuiGrid-item, not always a MuiCard).
   */
  async clickEstimateModuleCard(scope) {
    const createEstimate = this.page.getByRole('button', { name: /create estimate/i }).first();
    if (
      /tab=Estimate/i.test(this.page.url() || '') &&
      (await createEstimate.isVisible({ timeout: 1500 }).catch(() => false))
    ) {
      return;
    }

    const heading = this._visibleHeading('Design & Estimates');
    if (await heading.isVisible({ timeout: 4000 }).catch(() => false)) {
      await heading.click({ timeout: 15000 }).catch(() => {});
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    const gridItem = this.page
      .locator('.MuiGrid-item')
      .filter({ hasText: /^Estimates?$/i })
      .first();
    const tile = scope
      .locator('.MuiGrid-item, .MuiCard-root, .MuiPaper-root, [role="button"], a, div.MuiBox-root')
      .filter({ has: this.page.getByText(/^\s*Estimates?\s*$/i) })
      .filter({ visible: true })
      .first();
    const label = this.page
      .locator('p, span, h6, button')
      .filter({ hasText: /^\s*Estimates?\s*$/i })
      .filter({ visible: true })
      .first();

    const candidates = [gridItem, tile, label];
    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 4000 }).catch(() => false))) continue;
      const txt = ((await candidate.innerText().catch(() => '')) || '').trim();
      if (/design\s*&\s*estimates/i.test(txt) && !/^estimates?$/im.test(txt.split('\n')[0] || '')) {
        continue;
      }
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await candidate
        .click({ timeout: 20000 })
        .then(() => true)
        .catch(async () => {
          await candidate.click({ timeout: 15000, force: true });
          return true;
        })
        .catch(() => false);
      if (!clicked) continue;
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      if (
        /tab=Estimate/i.test(this.page.url() || '') ||
        (await createEstimate.isVisible({ timeout: 4000 }).catch(() => false))
      ) {
        return;
      }
    }

    const current = new URL(this.page.url());
    const projectId = current.searchParams.get('projectId') || '';
    const clientId = current.searchParams.get('clientId') || '';
    if (!projectId) {
      throw new Error(`Estimate module was not visible. URL=${this.page.url()}`);
    }
    const qs = new URLSearchParams({
      projectId,
      isActive: 'true',
      tab: 'Estimate',
      clientId,
    });
    await this.page.goto(`${current.origin}/client/profile?${qs.toString()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
  }

  /**
   * Money Matters Invoice is a tab (Invoice / Invoices), not always a hub card.
   */
  async clickInvoiceModuleCard(scope) {
    const invoiceTab = this.page
      .getByRole('tab', { name: /^invoices?$/i })
      .or(this.page.getByRole('button', { name: /^invoices?$/i }))
      .filter({ visible: true })
      .first();
    if (await invoiceTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await invoiceTab.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      return;
    }

    const card = scope
      .locator(
        '.MuiCard-root, .MuiPaper-root, [role="tab"], [role="button"], button, a, [role="link"], div.MuiBox-root'
      )
      .filter({ has: this.page.getByText(/^invoices?$/i) })
      .filter({ visible: true })
      .first();
    if (await card.isVisible({ timeout: 4000 }).catch(() => false)) {
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await card.click({ timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      return;
    }

    const current = new URL(this.page.url());
    const projectId = current.searchParams.get('projectId') || '';
    const clientId = current.searchParams.get('clientId') || '';
    if (!projectId) {
      throw new Error(`Invoice module was not visible. URL=${this.page.url()}`);
    }
    const qs = new URLSearchParams({
      projectId,
      isActive: '',
      tab: 'Money Matters',
      subTab: 'INVOICE',
      clientId,
    });
    await this.page.goto(`${current.origin}/client/profile?${qs.toString()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
  }

  /**
   * Project Management → Schedule tile.
   * Never use positional nth-child (that often clicks Estimate under Design & Estimates).
   */
  async clickScheduleModuleCard(scope, text) {
    const scheduleTimeout = 40000;
    const href = this.page.url();

    if (/tab=Schedule/i.test(href)) {
      return;
    }

    // Ensure Project Management section is active so Schedule cards are in view.
    const pmHeading = this._visibleHeading('Project Management');
    if (await pmHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pmHeading.click({ timeout: 10000 }).catch(() => {});
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    }

    const grid = scope
      .locator('div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2')
      .first();

    const candidates = [
      // Exact label on a card / box (preferred)
      grid
        .locator('.MuiCard-root, .MuiPaper-root, [role="button"], a, div.MuiBox-root')
        .filter({ has: scope.getByText(/^schedule$/i) })
        .first(),
      scope
        .locator('.MuiCard-root, .MuiPaper-root, [role="button"], a, div.MuiBox-root')
        .filter({ has: scope.getByText(/^schedule$/i) })
        .filter({ visible: true })
        .first(),
      scope.getByText(/^Schedule$/i).filter({ visible: true }).first(),
      scope.getByRole('button', { name: /^schedule$/i }).first(),
      scope.getByRole('tab', { name: /^schedule$/i }).first(),
      // Last resort: grid cell that contains exact Schedule text (still label-based)
      grid.locator('div').filter({ has: scope.getByText(/^schedule$/i) }).first(),
    ];

    let clicked = false;
    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await candidate.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      // Never click Estimate / Design cards that somehow match loosely
      // eslint-disable-next-line no-await-in-loop
      const label = ((await candidate.innerText().catch(() => '')) || '').trim();
      if (/estimate|design/i.test(label) && !/^schedule$/im.test(label.split('\n')[0] || '')) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      const ok = await candidate
        .click({ timeout: 15000 })
        .then(() => true)
        .catch(async () => {
          await candidate.click({ timeout: 15000, force: true });
          return true;
        })
        .catch(() => false);
      if (!ok) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await this.page.waitForTimeout(500).catch(() => {});

      // Reject Estimate landing page
      // eslint-disable-next-line no-await-in-loop
      const landedUrl = this.page.url();
      if (/tab=Estimate|tab=Design/i.test(landedUrl)) {
        // eslint-disable-next-line no-console
        console.log('[ProjectProfile] Schedule click landed on Estimate/Design — retrying next candidate.');
        continue;
      }

      // Schedule module markers: Gantt + List tabs, or tab=Schedule
      // eslint-disable-next-line no-await-in-loop
      const onSchedule =
        /tab=Schedule/i.test(landedUrl) ||
        ((await this.page.getByRole('tab', { name: /^gantt$/i }).isVisible({ timeout: 3000 }).catch(() => false)) &&
          (await this.page.getByRole('tab', { name: /^list$/i }).isVisible({ timeout: 1500 }).catch(() => false)));

      if (onSchedule) {
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // URL fallback when we have project/client ids
      const projectMatch = href.match(/projectId=([^&]+)/i);
      const clientMatch = href.match(/clientId=([^&]+)/i);
      if (projectMatch && clientMatch) {
        const base = href.split('?')[0];
        const scheduleUrl = `${base}?projectId=${projectMatch[1]}&isActive=true&tab=Schedule&clientId=${clientMatch[1]}`;
        await this.page.goto(scheduleUrl, { waitUntil: 'domcontentloaded' });
        await this.page.waitForURL(/tab=Schedule/i, { timeout: 60000 }).catch(() => {});
        clicked = true;
      }
    }

    if (!clicked) {
      throw new Error(
        'Could not open Schedule module. Clicks either missed or opened Estimate/Design instead.'
      );
    }

    await expect
      .poll(
        async () =>
          /tab=Schedule/i.test(this.page.url()) ||
          ((await this.page.getByRole('tab', { name: /^gantt$/i }).isVisible({ timeout: 500 }).catch(() => false)) &&
            (await this.page.getByRole('tab', { name: /^list$/i }).isVisible({ timeout: 500 }).catch(() => false))),
        { timeout: scheduleTimeout, intervals: [500, 1000, 2000] }
      )
      .toBe(true);
  }

  /**
   * Project Management → Budgeting tile.
   * Inspector path: <p class="MuiTypography-root MuiTypography-body1">Budgeting</p>
   */
  async clickBudgetingModuleCard(scope, text) {
    const href = this.page.url();

    if (/tab=Budgeting|tab=Budget/i.test(href)) {
      return;
    }

    const pmHeading = this._visibleHeading('Project Management');
    if (await pmHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pmHeading.click({ timeout: 10000 }).catch(() => {});
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(800).catch(() => {});
    }

    // Exact user path (avoid generated css-* hash). Prefer page-wide so main-scope misses still work.
    const budgetingLabel = this.page
      .locator('p.MuiTypography-root.MuiTypography-body1')
      .filter({ hasText: /^Budgeting$/i })
      .first();

    await expect(budgetingLabel).toBeVisible({ timeout: 40000 });
    await budgetingLabel.scrollIntoViewIfNeeded().catch(() => {});
    await budgetingLabel.click({ timeout: 15000 }).catch(async () => {
      await budgetingLabel.click({ timeout: 15000, force: true });
    });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(800).catch(() => {});

    const landedUrl = this.page.url();
    const onBudgeting =
      /tab=Budgeting|tab=Budget/i.test(landedUrl) ||
      (await this.page.getByText(/actual\s*budget/i).first().isVisible({ timeout: 8000 }).catch(() => false)) ||
      (await this.page.locator('table').filter({ visible: true }).first().isVisible({ timeout: 5000 }).catch(() => false));

    if (onBudgeting) {
      return;
    }

    const projectMatch = href.match(/projectId=([^&]+)/i) || this.page.url().match(/projectId=([^&]+)/i);
    const clientMatch = href.match(/clientId=([^&]+)/i) || this.page.url().match(/clientId=([^&]+)/i);
    if (projectMatch && clientMatch) {
      const base = this.page.url().split('?')[0];
      const budgetingUrl = `${base}?projectId=${projectMatch[1]}&isActive=true&tab=Budgeting&clientId=${clientMatch[1]}`;
      await this.page.goto(budgetingUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForURL(/tab=Budgeting|tab=Budget/i, { timeout: 60000 }).catch(() => {});
      return;
    }

    throw new Error('Could not open Budgeting module via p.MuiTypography-body1 "Budgeting".');
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
      if (!(await candidate.isVisible({ timeout: 800 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click({ timeout: 15000 }).catch(async () => {
        await candidate.click({ timeout: 15000, force: true });
      });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});

      if (await createPurchaseOrder.isVisible({ timeout: 8000 }).catch(() => false)) {
        return;
      }
    }

    await expect(createPurchaseOrder).toBeVisible({ timeout: 30000 });
  }

  async clickWorkOrderModuleCard(scope, text) {
    const createWorkOrder = this.page.getByRole('button', {
      name: /create work order/i,
    });

    if (await createWorkOrder.isVisible({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    const href = this.page.url();
    if (
      /tab=RFQAndPO/i.test(href) &&
      (/subTab=WO/i.test(href) ||
        /subTab=WorkOrder/i.test(href) ||
        /subTab%3DWO/i.test(href) ||
        /subTab%3DWorkOrder/i.test(href))
    ) {
      await this.activateWorkOrderSubTabIfPresent();
      if (await createWorkOrder.isVisible({ timeout: 5000 }).catch(() => false)) {
        return;
      }
    }

    const candidates = [
      this.page.locator('div').filter({ hasText: /^Work Order$/i }).nth(1),
      scope.locator('div').filter({ hasText: /^Work Order$/i }).nth(1),
      scope.getByRole('tab', { name: /work order/i }).first(),
      scope.getByText(/^Work Order$/i).first(),
      scope.getByRole('tab', { name: text }).first(),
      scope.getByRole('button', { name: text }).first(),
      scope
        .locator(
          '[role="tab"], .MuiTab-root, .MuiCard-root, .MuiPaper-root, [role="button"], button, a, [role="link"]'
        )
        .filter({ hasText: text })
        .first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await candidate
        .click({ timeout: 10000, force: true })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        continue;
      }

      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(() => {});

      if (await createWorkOrder.isVisible({ timeout: 10000 }).catch(() => false)) {
        return;
      }
    }

    const projectMatch = href.match(/projectId=([^&]+)/i);
    const clientMatch = href.match(/clientId=([^&]+)/i);
    if (projectMatch && clientMatch) {
      const base = href.split('?')[0];
      const woUrl = `${base}?projectId=${projectMatch[1]}&isActive=true&tab=RFQAndPO&subTab=WorkOrder&clientId=${clientMatch[1]}`;
      await this.page.goto(woUrl, { waitUntil: 'domcontentloaded' });
      await this.page
        .waitForURL(/tab=RFQAndPO/i, { timeout: 60000 })
        .catch(() => {});
    }

    await expect(createWorkOrder).toBeVisible({ timeout: 60000 });
  }

  async activateWorkOrderSubTabIfPresent() {
    const woTab = this.page.getByRole('tab', { name: /work order/i }).first();
    if (!(await woTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }
    if ((await woTab.getAttribute('aria-selected').catch(() => null)) === 'true') {
      return;
    }
    await woTab.click({ timeout: 10000, force: true }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  createIndentListControl() {
    return this.page
      .getByRole('button', { name: /create indent/i })
      .or(this.page.getByRole('link', { name: /create indent/i }))
      .or(this.page.locator('button').filter({ hasText: /create indent/i }))
      .or(this.page.getByText(/create indent/i))
      .first();
  }

  _isOnIndentListUrl(href = this.page.url()) {
    return (
      /tab=RFQAndPO/i.test(href) &&
      (/subTab=Indent/i.test(href) || /subTab%3DIndent/i.test(href))
    );
  }

  async clickRfqModuleCard(scope, text) {
    const createRfq = this.page.getByRole('button', { name: /create rfq/i }).first();

    if (await createRfq.isVisible({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    const href = this.page.url();
    if (/tab=RFQAndPO/i.test(href) && /subTab=RFQ(?:&|$)/i.test(href)) {
      await this.activateRfqSubTabIfPresent();
      if (await createRfq.isVisible({ timeout: 5000 }).catch(() => false)) {
        return;
      }
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForTimeout(800).catch(() => {});

    // Classic project profile tile (screenshot): p.MuiTypography-body1 "RFQ"
    const rfqLabel = this.page
      .locator('p.MuiTypography-root.MuiTypography-body1')
      .filter({ hasText: /^RFQ$/i })
      .filter({ visible: true })
      .first();

    const candidates = [
      rfqLabel,
      this.page.locator('div').filter({ hasText: /^RFQ$/i }).nth(1),
      scope.locator('div').filter({ hasText: /^RFQ$/i }).nth(1),
      scope.getByRole('tab', { name: /^rfq$/i }).first(),
      scope.getByText(/^RFQ$/i).filter({ visible: true }).first(),
      scope.getByRole('button', { name: /^rfq$/i }).first(),
      scope
        .locator(
          '[role="tab"], .MuiTab-root, .MuiCard-root, .MuiPaper-root, [role="button"], button, a, [role="link"], div.MuiBox-root'
        )
        .filter({ hasText: text })
        .first(),
      this.page.getByText(/request\s*for\s*quotation/i).filter({ visible: true }).first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await candidate
        .click({ timeout: 10000, force: true })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        continue;
      }

      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(() => {});
      await this.activateRfqSubTabIfPresent();

      if (await createRfq.isVisible({ timeout: 10000 }).catch(() => false)) {
        return;
      }
    }

    const projectMatch = href.match(/projectId=([^&]+)/i) || this.page.url().match(/projectId=([^&]+)/i);
    const clientMatch = href.match(/clientId=([^&]+)/i) || this.page.url().match(/clientId=([^&]+)/i);
    if (projectMatch && clientMatch) {
      const base = this.page.url().split('?')[0];
      const rfqUrl = `${base}?projectId=${projectMatch[1]}&isActive=true&tab=RFQAndPO&subTab=RFQ&clientId=${clientMatch[1]}`;
      await this.page.goto(rfqUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForURL(/tab=RFQAndPO|tab=RFQ/i, { timeout: 60000 }).catch(() => {});
      await this.activateRfqSubTabIfPresent();
    }

    await expect(createRfq).toBeVisible({ timeout: 60000 });
  }

  async activateRfqSubTabIfPresent() {
    const rfqTab = this.page.getByRole('tab', { name: /^rfq$/i }).first();
    if (!(await rfqTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }
    if ((await rfqTab.getAttribute('aria-selected').catch(() => null)) === 'true') {
      return;
    }
    await rfqTab.click({ timeout: 10000, force: true }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async clickIndentModuleCard(scope, text) {
    const createIndent = this.createIndentListControl();

    if (await createIndent.isVisible({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    if (this._isOnIndentListUrl()) {
      await this.activateIndentSubTabIfPresent();
      if (await createIndent.isVisible({ timeout: 8000 }).catch(() => false)) {
        return;
      }
    }

    const indentLabel = this.page
      .locator('p.MuiTypography-root.MuiTypography-body1')
      .filter({ hasText: /^Indent$/i })
      .first();

    const candidates = [
      indentLabel,
      this.page.locator('div').filter({ hasText: /^Indent$/i }).nth(1),
      scope.locator('div').filter({ hasText: /^Indent$/i }).nth(1),
      scope.getByRole('tab', { name: /^indent$/i }).first(),
      scope.getByText(/^Indent$/i).first(),
      scope.getByRole('tab', { name: text }).first(),
      scope.getByRole('button', { name: text }).first(),
      scope
        .locator(
          '[role="tab"], .MuiTab-root, .MuiCard-root, .MuiPaper-root, [role="button"], button, a, [role="link"]'
        )
        .filter({ hasText: text })
        .first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await candidate
        .click({ timeout: 10000, force: true })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        continue;
      }

      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(() => {});
      await this.activateIndentSubTabIfPresent().catch(() => {});

      if (await createIndent.isVisible({ timeout: 10000 }).catch(() => false)) {
        return;
      }
      if (this._isOnIndentListUrl()) {
        if (await createIndent.isVisible({ timeout: 5000 }).catch(() => false)) {
          return;
        }
      }
    }

    const hrefNow = this.page.url();
    const projectMatch = hrefNow.match(/projectId=([^&]+)/i);
    const clientMatch = hrefNow.match(/clientId=([^&]+)/i);
    if (projectMatch && clientMatch) {
      const base = hrefNow.split('?')[0];
      const indentUrl = `${base}?projectId=${projectMatch[1]}&isActive=true&tab=RFQAndPO&subTab=Indent&clientId=${clientMatch[1]}`;
      await this.page.goto(indentUrl, { waitUntil: 'domcontentloaded' });
      await this.page
        .waitForURL(/tab=RFQAndPO/i, { timeout: 60000 })
        .catch(() => {});
    }

    await this.activateIndentSubTabIfPresent().catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    if (await createIndent.isVisible({ timeout: 20000 }).catch(() => false)) {
      return;
    }
    if (this._isOnIndentListUrl()) {
      return;
    }

    throw new Error(
      `Could not open Indent module. URL: ${this.page.url()}`
    );
  }

  async activateIndentSubTabIfPresent() {
    const indentTab = this.page.getByRole('tab', { name: /^indent$/i }).first();
    if (!(await indentTab.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }
    if ((await indentTab.getAttribute('aria-selected').catch(() => null)) === 'true') {
      return;
    }
    await indentTab.click({ timeout: 10000, force: true }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  /**
   * Communication & Docs grid tile — generic card matching misses Client Report (same as Call Log).
   */
  async clickClientReportModuleCard(scope, text) {
    const createClientReport = this.page
      .getByRole('button', { name: /create client report/i })
      .or(this.page.getByRole('button', { name: /^create$/i }))
      .first();

    if (await createClientReport.isVisible({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    const href = this.page.url();
    if (/tab=ClientReport/i.test(href) && (await createClientReport.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }

    const grid = scope
      .locator('div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2')
      .first();

    const candidates = [
      grid
        .locator('div.MuiBox-root')
        .filter({ hasText: /^client\s*report$/i })
        .first(),
      grid
        .locator('.MuiCard-root, .MuiPaper-root, [role="button"], a, div')
        .filter({ hasText: /^client\s*report$/i })
        .first(),
      grid.locator('div').filter({ has: scope.getByText(/^client\s*report$/i) }).first(),
      scope.locator('div').filter({ hasText: /^Client Report$/i }).first(),
      scope.locator('div').filter({ hasText: /^Client Report$/i }).nth(1),
      scope.getByRole('tab', { name: /client report/i }).first(),
      scope.getByRole('button', { name: /client report/i }).first(),
      scope.getByText(/^Client Report$/i).first(),
      scope
        .locator(
          '[role="tab"], .MuiTab-root, .MuiCard-root, .MuiPaper-root, [role="button"], button, a, [role="link"], div.MuiBox-root'
        )
        .filter({ hasText: text })
        .first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await candidate
        .click({ timeout: 10000, force: true })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        continue;
      }

      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(() => {});

      if (await createClientReport.isVisible({ timeout: 10000 }).catch(() => false)) {
        return;
      }
    }

    const projectMatch = href.match(/projectId=([^&]+)/i);
    const clientMatch = href.match(/clientId=([^&]+)/i);
    if (projectMatch && clientMatch) {
      const base = href.split('?')[0];
      const clientReportUrl = `${base}?projectId=${projectMatch[1]}&isActive=true&tab=ClientReport&clientId=${clientMatch[1]}`;
      await this.page.goto(clientReportUrl, { waitUntil: 'domcontentloaded' });
      await this.page
        .waitForURL(/tab=ClientReport/i, { timeout: 60000 })
        .catch(() => {});
    }

    await expect(createClientReport).toBeVisible({ timeout: 60000 });
  }

  /** Project Management grid tile — Daily Report (same pattern as Client Report / Assets). */
  async clickDailyReportModuleCard(scope, text) {
    const createDailyReport = this.page
      .getByRole('button', { name: /create daily report/i })
      .or(this.page.getByRole('button', { name: /^create$/i }))
      .first();

    if (await createDailyReport.isVisible({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    const href = this.page.url();
    if (
      (/tab=DailyReport/i.test(href) || /tab=DailyLog/i.test(href)) &&
      (await createDailyReport.isVisible({ timeout: 3000 }).catch(() => false))
    ) {
      return;
    }

    const grid = scope
      .locator('div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2')
      .first();

    const candidates = [
      scope.getByText('Daily report').first(),
      scope.getByText(/^daily report$/i).first(),
      grid
        .locator('div.MuiBox-root')
        .filter({ hasText: /^daily\s*report$/i })
        .first(),
      grid
        .locator('.MuiCard-root, .MuiPaper-root, [role="button"], a, div')
        .filter({ hasText: /^daily\s*report$/i })
        .first(),
      grid.locator('div').filter({ has: scope.getByText(/^daily\s*report$/i) }).first(),
      scope.locator('div').filter({ hasText: /^Daily Report$/i }).first(),
      scope.locator('div').filter({ hasText: /^Daily Report$/i }).nth(1),
      scope.getByRole('tab', { name: /daily report/i }).first(),
      scope.getByRole('button', { name: /daily report/i }).first(),
      scope.getByText(/^Daily Report$/i).first(),
      scope
        .locator(
          '[role="tab"], .MuiTab-root, .MuiCard-root, .MuiPaper-root, [role="button"], button, a, [role="link"], div.MuiBox-root'
        )
        .filter({ hasText: text })
        .first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      const clicked = await candidate
        .click({ timeout: 10000, force: true })
        .then(() => true)
        .catch(() => false);
      if (!clicked) {
        continue;
      }

      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(() => {});

      if (await createDailyReport.isVisible({ timeout: 10000 }).catch(() => false)) {
        return;
      }
    }

    const projectMatch = href.match(/projectId=([^&]+)/i);
    const clientMatch = href.match(/clientId=([^&]+)/i);
    if (projectMatch && clientMatch) {
      const base = href.split('?')[0];
      const dailyReportUrl = `${base}?projectId=${projectMatch[1]}&isActive=true&tab=DailyReport&clientId=${clientMatch[1]}`;
      await this.page.goto(dailyReportUrl, { waitUntil: 'domcontentloaded' });
      await this.page
        .waitForURL(/tab=DailyReport/i, { timeout: 60000 })
        .catch(() => {});
    }

    await expect(createDailyReport).toBeVisible({ timeout: 60000 });
  }
}

module.exports = ProjectProfilePage;
