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

  _visibleHeading(name) {
    return this.page.getByRole('button', { name }).filter({ visible: true }).first();
  }

  async selectHeading(name) {
    let heading = this._visibleHeading(name);

    if (!(await heading.isVisible({ timeout: 3000 }).catch(() => false))) {
      const ProjectNavigationPage = require('./ProjectNavigationPage');
      const nav = new ProjectNavigationPage(this.page);
      if (!(await nav.returnToProjectProfile())) {
        await nav.openClientsProjectsList();
        await nav.clickFirstProject();
      }
      heading = this._visibleHeading(name);
    }

    await expect(heading).toBeVisible({ timeout: 60000 });
    await heading.scrollIntoViewIfNeeded().catch(() => {});
    await heading.click();
  }

  /** True when the project profile hub is open (section headings as button or tab). */
  async isInsideProjectProfile() {
    const nameRe =
      /^(Project Management|Procurement|Design & Estimates|Financial|Communication & Docs)$/;
    return this.page
      .getByRole('button', { name: nameRe })
      .or(this.page.getByRole('tab', { name: nameRe }))
      .filter({ visible: true })
      .first()
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

    if ((name || '').trim().toLowerCase() === 'work order') {
      await this.clickWorkOrderModuleCard(scope, text);
      return;
    }

    if ((name || '').trim().toLowerCase() === 'indent') {
      await this.clickIndentModuleCard(scope, text);
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

  async clickIndentModuleCard(scope, text) {
    const createIndent = this.page.getByRole('button', {
      name: /create indent/i,
    });

    if (await createIndent.isVisible({ timeout: 1500 }).catch(() => false)) {
      return;
    }

    const href = this.page.url();
    if (
      /tab=RFQAndPO/i.test(href) &&
      (/subTab=Indent/i.test(href) || /subTab%3DIndent/i.test(href))
    ) {
      await this.activateIndentSubTabIfPresent();
      if (await createIndent.isVisible({ timeout: 5000 }).catch(() => false)) {
        return;
      }
    }

    const candidates = [
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

      if (await createIndent.isVisible({ timeout: 10000 }).catch(() => false)) {
        return;
      }
    }

    const projectMatch = href.match(/projectId=([^&]+)/i);
    const clientMatch = href.match(/clientId=([^&]+)/i);
    if (projectMatch && clientMatch) {
      const base = href.split('?')[0];
      const indentUrl = `${base}?projectId=${projectMatch[1]}&isActive=true&tab=RFQAndPO&subTab=Indent&clientId=${clientMatch[1]}`;
      await this.page.goto(indentUrl, { waitUntil: 'domcontentloaded' });
      await this.page
        .waitForURL(/tab=RFQAndPO/i, { timeout: 60000 })
        .catch(() => {});
    }

    await expect(createIndent).toBeVisible({ timeout: 60000 });
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
