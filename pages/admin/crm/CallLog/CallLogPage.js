const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const ProjectNavigationPage = require('../../projects/ProjectNavigationPage');

class CallLogPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.projectNavigationPage = new ProjectNavigationPage(page);

    this.selectFeaturesInput = page.getByRole('textbox', { name: /select feature\(s\)/i });
    this.callLogMenuItem = page.getByRole('menuitem', { name: /call log/i }).first();
    this.callLogTab = page.getByRole('tab', { name: /^call\s*log$/i });
    this.callLogOverviewLink = page
      .locator('[id*="Overview"], .MuiTabPanel-root, div.MuiBox-root')
      .getByText(/^call\s*log$/i)
      .first();
    this.clientMenuPanel = page.locator(
      'nav, aside, .MuiDrawer-root, .MuiTabs-root, [class*="sidebar"], [class*="feature"]'
    );
    this.leadFeatureSidebar = page.locator('aside').filter({ visible: true });
    this.classicUiToggle = page
      .getByRole('button', { name: /classic ui/i })
      .or(page.getByRole('switch', { name: /classic ui/i }))
      .or(page.locator('label').filter({ hasText: /classic ui/i }))
      .first();
    this.overviewClientMenuPanel = page.locator('[id*="P-Overview"]').first();

    this.actionButton = page.getByRole('button', { name: 'Action', exact: true }).first();
    this.actionMenu = page.locator('[role="menu"]').filter({ visible: true }).first();
    this.addLogButton = page
      .getByRole('button', { name: /^(add log|add call log)$/i })
      .filter({ visible: true })
      .first();

    this.callLogDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByPlaceholder(/enter call purpose/i) })
      .first();
    this.callPurposeInput = this.callLogDialog
      .getByPlaceholder(/enter call purpose/i)
      .or(this.callLogDialog.getByRole('textbox', { name: /^(enter )?call purpose$/i }))
      .first();
    this.callOutcomeCombobox = this.callLogDialog
      .getByRole('combobox', { name: /what happened on this call/i })
      .or(this.callLogDialog.getByLabel(/what happened on this call/i))
      .first();
    this.commentInput = this.callLogDialog
      .getByRole('textbox', { name: /^comments?$/i })
      .or(this.callLogDialog.getByPlaceholder(/leave a comment/i))
      .first();
    this.callLogCloseIcon = this.callLogDialog
      .locator('button')
      .filter({ has: page.locator('svg') })
      .filter({ hasNotText: /add log|update log|summarize/i })
      .or(this.callLogDialog.getByRole('button', { name: /^close$|×/i }))
      .or(this.callLogDialog.locator('button:has(svg[data-testid="CloseIcon"])'))
      .first();

    // In-tab Call Log ExpandableSearch only. Never use header global search.
    this.callLogSearch = page.getByRole('search', { name: /search on call purpose/i }).first();
    this.callLogSearchToggle = this.callLogSearch
      .getByRole('button', { name: /search on call purpose|^search$/i })
      .first();
    this.searchInput = this.callLogSearch
      .getByRole('textbox', { name: /search on call purpose/i })
      .or(this.callLogSearch.getByPlaceholder(/search on call purpose/i))
      .or(page.getByRole('textbox', { name: /search on call purpose/i }))
      .or(page.getByPlaceholder(/search on call purpose/i))
      .first();

    this.successToast = page
      .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"], .MuiSnackbarContent-root')
      .filter({ hasText: /call\s*log|log\s*added|added\s*successfully|created\s*successfully|saved\s*successfully|success/i })
      .first();

    this.editMenuItem = page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^edit$/i }))
      .first();

    this.deleteMenuItem = page
      .getByRole('menuitem', { name: /^delete$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^delete$/i }))
      .first();

    this.confirmDialog = page
      .getByRole('dialog')
      .filter({ hasText: /delete|confirm|remove|are you sure/i })
      .filter({ hasNot: page.getByPlaceholder(/enter call purpose/i) })
      .first();

    this.confirmYesButton = page
      .getByRole('button', { name: /^yes$/i })
      .or(page.locator('button').filter({ hasText: /^yes$/i }))
      .first();

    this.confirmCancelButton = page
      .getByRole('button', { name: /^(no|cancel)$/i })
      .or(page.locator('button').filter({ hasText: /^(no|cancel)$/i }))
      .first();
  }

  buildRandomSuffix() {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  buildCallLogData() {
    const suffix = this.buildRandomSuffix();
    return {
      callPurpose: `Site visit follow-up ${suffix}`,
      callOutcome: 'Good Discussion',
      comment: `Discussed project timeline, material delivery, and the next site visit. Ref ${suffix}`,
    };
  }

  isOnLeadProfile() {
    return this.isOnClientOrLeadProfile();
  }

  isOnClientOrLeadProfile() {
    const url = this.page.url();
    if (/leadmanager\/profile/i.test(url)) return true;
    if (/\/client\/profile/i.test(url) && /projectId=/i.test(url)) return true;
    if (/\/project\//i.test(url)) return true;
    return false;
  }

  getCallLogSidebarEntry() {
    return this.page
      .locator('aside, .MuiListItemButton-root, div.MuiBox-root, div.MuiPaper-root')
      .locator('div, button, a, label, span, p')
      .filter({ hasText: /^call\s*log$/i })
      .first();
  }

  getProjectSidebarScrollTarget() {
    return this.page
      .locator('.MuiListItemButton-root')
      .filter({ hasText: /^overview$/i })
      .first()
      .locator('xpath=ancestor::div[contains(@style,"overflow")][1]');
  }

  getCallLogOverviewCard() {
    return this.overviewClientMenuPanel
      .locator('label, div, button, a, span')
      .filter({ hasText: /^call\s*log$/i })
      .first();
  }

  async isCallLogPresentInClientMenu() {
    const menuItemVisible = await this.callLogMenuItem.isVisible().catch(() => false);
    const tabVisible = await this.callLogTab.isVisible().catch(() => false);
    const sidebarVisible = await this.getCallLogSidebarEntry().isVisible().catch(() => false);
    const sidebarButtonVisible = await this.page
      .getByRole('button', { name: /^call\s*log$/i })
      .first()
      .isVisible()
      .catch(() => false);
    const overviewVisible = await this.getCallLogOverviewCard().isVisible().catch(() => false);
    const toolbarVisible =
      (await this.actionButton.isVisible({ timeout: 1500 }).catch(() => false)) ||
      (await this.addLogButton.isVisible({ timeout: 1500 }).catch(() => false));
    return menuItemVisible || tabVisible || sidebarVisible || sidebarButtonVisible || overviewVisible || toolbarVisible;
  }

  async waitForLeadProfileReady() {
    console.log('[CallLogPage] Waiting for client/project profile to be ready');
    await this.page.waitForURL(/leadmanager\/profile|client\/profile|\/project\//i, {
      timeout: this.defaultTimeout,
    }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect(async () => {
      const featureInputVisible = await this.selectFeaturesInput.first().isVisible().catch(() => false);
      const featureLabelVisible = await this.page.getByText(/select feature\(s\)/i).first().isVisible().catch(() => false);
      const sidebarVisible = await this.leadFeatureSidebar.first().isVisible().catch(() => false);
      const overviewVisible = await this.page
        .getByRole('button', { name: /^overview$/i })
        .first()
        .isVisible()
        .catch(() => false);
      const classicUiVisible = await this.classicUiToggle.isVisible().catch(() => false);
      const callLogVisible = await this.isCallLogPresentInClientMenu();
      expect(
        this.isOnClientOrLeadProfile() ||
          featureInputVisible ||
          featureLabelVisible ||
          sidebarVisible ||
          overviewVisible ||
          classicUiVisible ||
          callLogVisible
      ).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async navigateToLeadProfileIfNeeded() {
    if (this.isOnClientOrLeadProfile()) {
      console.log('[CallLogPage] Client/project profile already open');
      await this.waitForLeadProfileReady().catch(() => {});
      return;
    }

    console.log('[CallLogPage] Navigating to client profile via Clients/Projects');
    await this.projectNavigationPage.navigateToProjects();
    await this.projectNavigationPage.clickFirstProject();
    await this.waitForLeadProfileReady();
  }

  async scrollClientMenuForCallLog() {
    console.log('[CallLogPage] Scrolling client menu to find Call Log');
    const scrollTargets = [
      this.getProjectSidebarScrollTarget(),
      this.leadFeatureSidebar.nth(1),
      this.leadFeatureSidebar.first(),
      this.clientMenuPanel.filter({ visible: true }).first(),
    ];

    for (const target of scrollTargets) {
      if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (await this.isCallLogPresentInClientMenu()) {
          return true;
        }

        await target.evaluate((el) => {
          el.scrollBy(0, 350);
        }).catch(() => {});
      }
    }

    return this.isCallLogPresentInClientMenu();
  }

  async openCallLogViaFeatureSelector() {
    console.log('[CallLogPage] Opening Call Log via Select Feature(s) search');
    const featureSelector = this.selectFeaturesInput.first();
    await expect(featureSelector).toBeVisible({ timeout: this.defaultTimeout });
    await featureSelector.click();

    const featureSearch = this.selectFeaturesInput.nth(1);
    await expect(featureSearch).toBeVisible({ timeout: this.defaultTimeout });
    await featureSearch.fill('call log');

    const callLogInMenu = this.callLogMenuItem
      .or(this.page.getByRole('menuitem', { name: /call log/i }))
      .first();
    await expect(callLogInMenu).toBeVisible({ timeout: this.defaultTimeout });
    await callLogInMenu.scrollIntoViewIfNeeded().catch(() => {});
    await callLogInMenu.click({ timeout: 15000 });
    await expect(this.page).toHaveURL(/tab=CallLog/i, { timeout: 30000 });
  }

  async expandOthersSectionIfNeeded() {
    const othersAccordion = this.page
      .locator('.MuiAccordion-root')
      .filter({ hasText: /others/i })
      .first();

    if (!(await othersAccordion.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }

    const isExpanded = await othersAccordion
      .evaluate((el) => el.classList.contains('Mui-expanded'))
      .catch(() => true);

    if (!isExpanded) {
      console.log('[CallLogPage] Expanding Others section in project sidebar');
      await othersAccordion.locator('.MuiAccordionSummary-root').click({ timeout: 15000 });
      await expect(othersAccordion).toHaveClass(/Mui-expanded/, { timeout: 10000 });
    }
  }

  async clickCallLogInSidebar() {
    console.log('[CallLogPage] Opening Call Log from lead profile sidebar');
    await this.dismissOpenMenus();
    await this.expandOthersSectionIfNeeded();
    await this.scrollClientMenuForCallLog();

    const callLogEntry = this.getCallLogSidebarEntry()
      .or(this.page.getByRole('button', { name: /^call\s*log$/i }))
      .or(this.page.locator('.MuiListItemButton-root').filter({ hasText: /^call\s*log$/i }))
      .or(this.page.locator('div.MuiBox-root, div.MuiPaper-root').filter({ hasText: /^call\s*log$/i }))
      .first();

    await expect(callLogEntry).toBeVisible({ timeout: this.defaultTimeout });
    await callLogEntry.scrollIntoViewIfNeeded().catch(() => {});
    await callLogEntry.click({ timeout: 15000, force: true });
    await expect(this.page).toHaveURL(/tab=CallLog/i, { timeout: 30000 });
  }

  async switchToClassicUiIfNeeded() {
    if (!(await this.classicUiToggle.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }

    console.log('[CallLogPage] Switching to Classic UI');
    await this.classicUiToggle.scrollIntoViewIfNeeded().catch(() => {});
    await this.classicUiToggle.click({ timeout: 15000 });
    return true;
  }

  async openCallLogFromClassicOverview() {
    console.log('[CallLogPage] Opening Call Log from Classic UI Overview client menu');
    await this.switchToClassicUiIfNeeded();

    const callLogCard = this.getCallLogOverviewCard()
      .or(this.callLogOverviewLink)
      .first();

    await expect(callLogCard).toBeVisible({ timeout: this.defaultTimeout });
    await callLogCard.scrollIntoViewIfNeeded().catch(() => {});
    await callLogCard.click({ timeout: 15000 });
    await expect(this.page).toHaveURL(/tab=CallLog/i, { timeout: 30000 });
  }

  async openCallLogViaUrlFallback() {
    console.log('[CallLogPage] Opening Call Log via tab URL fallback');
    const url = new URL(this.page.url());
    url.searchParams.set('tab', 'CallLog');
    await this.page.goto(url.toString(), {
      waitUntil: 'domcontentloaded',
      timeout: this.defaultTimeout,
    });
    await expect(this.page).toHaveURL(/tab=CallLog/i, { timeout: this.defaultTimeout });
  }

  async openCallLogModule() {
    console.log('[CallLogPage] Opening Call Log module on lead profile');
    await this.dismissOpenMenus();

    if (await this.isOnCallLogModule()) {
      await this.waitForCallLogModuleReady();
      return;
    }

    await this.navigateToLeadProfileIfNeeded();

    if (await this.getCallLogSidebarEntry().isVisible({ timeout: 3000 }).catch(() => false)) {
      try {
        await this.clickCallLogInSidebar();
        await this.waitForCallLogModuleReady();
        return;
      } catch (error) {
        console.warn(`[CallLogPage] Sidebar path failed: ${error.message}`);
      }
    } else {
      try {
        await this.clickCallLogInSidebar();
        await this.waitForCallLogModuleReady();
        return;
      } catch (error) {
        console.warn(`[CallLogPage] Sidebar scroll path failed: ${error.message}`);
      }
    }

    if (await this.callLogTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.callLogTab.click();
      await this.waitForCallLogModuleReady();
      return;
    }

    if (await this.selectFeaturesInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      try {
        await this.openCallLogViaFeatureSelector();
        await this.waitForCallLogModuleReady();
        return;
      } catch (error) {
        console.warn(`[CallLogPage] Select Feature(s) path failed: ${error.message}`);
      }
    }

    try {
      await this.openCallLogFromClassicOverview();
      await this.waitForCallLogModuleReady();
      return;
    } catch (error) {
      console.warn(`[CallLogPage] Classic UI Overview path failed: ${error.message}`);
    }

    await this.dismissOpenMenus();
    if (await this.callLogOverviewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      try {
        await this.callLogOverviewLink.click({ timeout: 8000, force: true });
        await this.waitForCallLogModuleReady();
        return;
      } catch (error) {
        console.warn(`[CallLogPage] Overview Call Log click failed: ${error.message}`);
      }
    }

    await this.openCallLogViaUrlFallback();
    await this.waitForCallLogModuleReady();
  }

  async isOnCallLogModule() {
    const onTab = /tab=CallLog/i.test(this.page.url());
    const actionVisible = await this.actionButton.isVisible({ timeout: 1500 }).catch(() => false);
    const addLogVisible = await this.addLogButton.isVisible({ timeout: 1500 }).catch(() => false);
    return onTab && (actionVisible || addLogVisible);
  }

  async waitForCallLogModuleReady() {
    console.log('[CallLogPage] Waiting for Call Log module toolbar');
    await this.page.waitForURL(/tab=CallLog/i, { timeout: this.defaultTimeout }).catch(() => {});
    await expect(async () => {
      const actionVisible = await this.actionButton.isVisible().catch(() => false);
      const addLogVisible = await this.addLogButton.isVisible().catch(() => false);
      expect(actionVisible || addLogVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000, 3000] });
  }

  async clickAddCallLog() {
    console.log('[CallLogPage] Clicking Add Call Log');
    if (await this.isCallLogFormOpen()) {
      await this.waitForCallLogFormReady();
      return;
    }

    await this.openCallLogFormFromActionMenu();
  }

  async openCallLogFormFromActionMenu() {
    console.log('[CallLogPage] Opening Call Log form via Action > Call Log');
    await this.dismissOpenMenus();

    if (await this.isCallLogFormOpen()) {
      await this.waitForCallLogFormReady();
      return;
    }

    if (await this.addLogButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (!(await this.actionButton.isVisible({ timeout: 1500 }).catch(() => false))) {
        await this.addLogButton.click();
        await this.waitForCallLogFormReady();
        return;
      }
    }

    if (!(await this.actionButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[CallLogPage] Action not visible; using Add Log toolbar button');
      await expect(this.addLogButton).toBeVisible({ timeout: this.defaultTimeout });
      await this.addLogButton.click();
      await this.waitForCallLogFormReady();
      return;
    }

    let opened = false;
    for (let attempt = 0; attempt < 4 && !opened; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenus();
      }

      await this.actionButton.scrollIntoViewIfNeeded().catch(() => {});
      await this.actionButton.click(
        attempt === 0 ? { timeout: 15000 } : { timeout: 15000, force: true }
      );

      const menu = this.page.locator('[role="menu"]').filter({ visible: true }).first();
      const menuVisible = await menu.isVisible({ timeout: 5000 }).catch(() => false);
      if (!menuVisible) {
        continue;
      }

      const callLogInMenu = menu
        .getByRole('menuitem', { name: /^call\s*log$/i })
        .or(menu.getByRole('menuitem', { name: /call log|add call log|create call log/i }))
        .first();

      if (await callLogInMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await callLogInMenu.click({ timeout: 15000 });
        opened = await this.callLogDialog.isVisible({ timeout: 8000 }).catch(() => false);
        if (opened) {
          break;
        }
      }
    }

    if (!opened) {
      console.log('[CallLogPage] Action menu Call Log did not open form; falling back to Add Log');
      await this.dismissOpenMenus();
      if (await this.addLogButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.addLogButton.click();
      }
    }

    await this.waitForCallLogFormReady();
  }

  async dismissOpenMenus() {
    const menuRoot = this.page.locator(
      '.MuiModal-root.MuiMenu-root, .MuiPopover-root.MuiMenu-root, [role="menu"]'
    );

    for (let i = 0; i < 4; i += 1) {
      const menuVisible = await menuRoot.filter({ visible: true }).first().isVisible().catch(() => false);
      const backdrop = this.page.locator('.MuiMenu-root .MuiBackdrop-root').filter({ visible: true }).first();
      const backdropVisible = await backdrop.isVisible().catch(() => false);
      if (!menuVisible && !backdropVisible) {
        break;
      }

      await this.page.keyboard.press('Escape').catch(() => {});
      if (backdropVisible) {
        await backdrop.click({ force: true, timeout: 2000 }).catch(() => {});
      }
    }

    await menuRoot.filter({ visible: true }).first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  getCallLogRow(identifier) {
    const name = String(identifier || '');
    const card = this.page.locator('.MuiCard-root').filter({ hasText: name }).first();
    const tableRow = this.page.locator('tbody tr, .MuiDataGrid-row, .MuiTableRow-root').filter({ hasText: name }).first();
    const roleRow = this.page.locator('[role="row"]').filter({ hasText: name }).first();
    return card.or(tableRow).or(roleRow).first();
  }

  getRowActionButton(row) {
    return row
      .locator('button:has([data-testid="MoreHorizIcon"])')
      .or(row.locator('button:has([data-testid="MoreVertIcon"])'))
      .or(row.getByRole('button', { name: /more|action|options|menu/i }))
      .or(
        row.locator(
          'button[aria-label*="more" i], button[aria-label*="action" i], button[aria-label*="menu" i], button.MuiIconButton-root'
        ).last()
      )
      .first();
  }

  async isCallLogFormOpen() {
    return this.callLogDialog.isVisible({ timeout: 1500 }).catch(() => false);
  }

  async closeCallLogFormIfOpen() {
    if (!(await this.isCallLogFormOpen())) {
      return;
    }

    console.log('[CallLogPage] Closing open Call Log form');
    const cancelButton = this.page
      .getByRole('button', { name: /^cancel$/i })
      .filter({ visible: true })
      .first();
    if (await this.callLogCloseIcon.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.callLogCloseIcon.click({ timeout: 15000 }).catch(() => {});
    } else if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelButton.click({ timeout: 15000 }).catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await this.dismissOpenMenus();
    await expect(this.callLogDialog).toBeHidden({ timeout: 15000 }).catch(() => {});
  }

  async clearCallLogSearch() {
    if (!(await this.searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }

    const value = await this.searchInput.inputValue().catch(() => '');
    if (!String(value || '').trim()) return;

    await this.searchInput.click().catch(() => {});
    await this.searchInput.press('Control+A').catch(() => {});
    await this.searchInput.fill('');
    await expect(this.searchInput).toHaveValue('', { timeout: this.defaultTimeout });
  }

  async ensureCallLogListReadyForCreate() {
    await this.openCallLogModule();
    await this.dismissOpenMenus();
    await this.closeCallLogFormIfOpen();
    await this.clearCallLogSearch();
    await this.waitForCallLogModuleReady();
  }

  async ensureOnCallLogModuleList() {
    if (!(await this.isOnCallLogModule())) {
      await this.openCallLogModule();
    }
    await this.dismissOpenMenus();
    await this.closeCallLogFormIfOpen();
    await this.waitForCallLogModuleReady();
  }

  async openRowActionMenuForCallLog(identifier) {
    console.log(`[CallLogPage] Opening row action menu for: ${identifier}`);
    await this.ensureOnCallLogModuleList();
    await this.dismissOpenMenus();
    await this.searchForCallLog(identifier);

    const row = this.getCallLogRow(identifier);
    await expect(row).toBeVisible({ timeout: 60000 });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    const actionButton = this.getRowActionButton(row);
    await expect(actionButton).toBeVisible({ timeout: 30000 });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenus();
      }

      await actionButton.click({ timeout: 15000, force: attempt > 0 });

      if (await this.actionMenu.isVisible({ timeout: 4000 }).catch(() => false)) {
        return;
      }
    }

    throw new Error(`[CallLogPage] Row action menu did not open for call log: ${identifier}`);
  }

  async searchForCallLog(identifier) {
    await this.ensureOnCallLogModuleList();

    let isSearchInputVisible = await this.searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isSearchInputVisible) {
      if (await this.callLogSearchToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[CallLogPage] Opening Call Log in-tab search');
        await this.callLogSearchToggle.click({ timeout: 15000 });
        isSearchInputVisible = await this.searchInput.isVisible({ timeout: 5000 }).catch(() => false);
      }
    }

    if (!isSearchInputVisible) {
      console.warn('[CallLogPage] Call Log in-tab search control was not found; skipping list search');
      return;
    }

    console.log(`[CallLogPage] Searching Call Log list for: ${identifier}`);
    await this.searchInput.click().catch(() => {});
    await this.searchInput.press('Control+A').catch(() => {});
    await this.searchInput.fill('');
    await this.searchInput.fill(String(identifier));
    await this.searchInput.press('Tab').catch(() => {});
    await expect(this.searchInput).toHaveValue(String(identifier), { timeout: this.defaultTimeout });
  }

  async navigateToCallLogForm() {
    console.log('[CallLogPage] Navigating to Call Log form');
    if (await this.isCallLogFormOpen()) {
      console.log('[CallLogPage] Call Log form already open — closing before reopening');
      await this.closeCallLogFormIfOpen();
    }

    await this.ensureCallLogListReadyForCreate();

    if (!(await this.isCallLogFormOpen())) {
      await this.openCallLogFormFromActionMenu();
    }
  }

  async waitForCallLogFormReady() {
    console.log('[CallLogPage] Waiting for Call Log form');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(this.callLogDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
  }

  async clickCallLogCloseIcon() {
    console.log('[CallLogPage] Clicking Call Log close icon');
    await expect(this.callLogDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callLogCloseIcon).toBeVisible({ timeout: this.defaultTimeout });
    await this.callLogCloseIcon.click({ timeout: 15000 });
    await expect(this.callLogDialog).toBeHidden({ timeout: this.defaultTimeout });
  }

  async expectCallLogPopupClosed() {
    console.log('[CallLogPage] Verifying Call Log popup is closed');
    await expect(this.callLogDialog).toBeHidden({ timeout: this.defaultTimeout });
    await expect(this.actionButton.or(this.addLogButton).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async expectEnteredCallLogNotInList() {
    const purpose = this.callLogData?.callPurpose;
    if (!purpose) {
      throw new Error('[CallLogPage] Missing call purpose for not-saved verification');
    }

    console.log(`[CallLogPage] Verifying call log was not saved: ${purpose}`);
    await this.ensureOnCallLogModuleList();
    await this.searchForCallLog(purpose);

    await expect(async () => {
      const rowVisible = await this.getCallLogRow(purpose).isVisible().catch(() => false);
      expect(rowVisible).toBeFalsy();
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000] });
  }

  async fillMandatoryCallLogFields() {
    this.callLogData = this.buildCallLogData();
    console.log(`[CallLogPage] Filling call log form: ${this.callLogData.callPurpose}`);

    if (!(await this.isCallLogFormOpen())) {
      await this.navigateToCallLogForm();
    }

    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.callPurposeInput.click();
    await this.callPurposeInput.press('Control+A').catch(() => {});
    await this.callPurposeInput.fill(this.callLogData.callPurpose);

    await expect(this.callOutcomeCombobox).toBeVisible({ timeout: this.defaultTimeout });
    await this.callOutcomeCombobox.click();
    const outcomeOption = this.page
      .getByRole('option', { name: this.callLogData.callOutcome, exact: true })
      .or(this.page.getByRole('menuitem', { name: this.callLogData.callOutcome, exact: true }))
      .first();
    await expect(outcomeOption).toBeVisible({ timeout: this.defaultTimeout });
    await outcomeOption.click();

    await expect(this.commentInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.commentInput.click();
    await this.commentInput.press('Control+A').catch(() => {});
    await this.commentInput.fill(this.callLogData.comment);
  }

  async submitCreateCallLog() {
    console.log('[CallLogPage] Submitting call log with Add Log');
    const submitButton = this.page
      .getByRole('button', { name: /^add log$/i })
      .filter({ visible: true })
      .last();
    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(submitButton).toBeEnabled({ timeout: this.defaultTimeout });

    const createResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        (response.request().postData() || '').includes('CREATE_CALL_LOG'),
      { timeout: this.defaultTimeout }
    );

    await submitButton.click();
    const response = await createResponse.catch(() => null);
    this.lastCreateStatus = response?.status() ?? null;
    this.createSucceeded = Boolean(response && response.status() >= 200 && response.status() < 300);

    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      const ipRejected = /"ip"\s*is\s*not\s*allowed/i.test(body);
      throw new Error(
        `[CallLogPage] CREATE_CALL_LOG failed (${response.status()})${
          ipRejected ? ' — meetandnote API rejects the "ip" field (backend issue)' : ''
        }: ${body.slice(0, 500)}`
      );
    }

    if (!response) {
      console.warn('[CallLogPage] CREATE_CALL_LOG response was not captured');
    }

    await expect(this.callLogDialog).toBeHidden({ timeout: 30000 });
    await this.ensureOnCallLogModuleList();
    await this.closeCallLogFormIfOpen();
  }

  async verifyCallLogCreatedSuccessfully({ timeout = this.defaultTimeout } = {}) {
    console.log('[CallLogPage] Verifying created call log in the list');
    const data = this.callLogData;
    if (!data?.callPurpose) {
      throw new Error('[CallLogPage] Missing call purpose data for verification');
    }

    if (this.createSucceeded === false) {
      throw new Error('[CallLogPage] Call log create API did not succeed; list verification skipped');
    }

    await this.ensureOnCallLogModuleList();

    await expect(async () => {
      await this.searchForCallLog(data.callPurpose);
      const row = this.getCallLogRow(data.callPurpose);
      await expect(row).toBeVisible();
      await expect(row.getByText(data.callPurpose, { exact: false })).toBeVisible();
      await expect(row.getByText(data.callOutcome, { exact: false })).toBeVisible();
      await expect(row.getByText(data.comment, { exact: false })).toBeVisible();
    }).toPass({ timeout, intervals: [1000, 2000, 4000] });
  }
}

module.exports = CallLogPage;
