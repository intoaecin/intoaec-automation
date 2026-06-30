const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const ProjectNavigationPage = require('../../projects/ProjectNavigationPage');

class CallLogPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.main = page.locator('main, [role="main"]').first();

    this.firstClientRow = page.getByRole('rowheader').first();
    this.clientRowIconButton = page
      .locator('tbody tr')
      .first()
      .locator('button.MuiIconButton-root.MuiIconButton-sizeSmall')
      .first();

    this.communicationDocsButton = page.getByRole('button', { name: 'Communication & Docs' }).first();
    this.communicationDocsGrid = page
      .locator('div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2')
      .first();
    this.callLogModuleTile = this.communicationDocsGrid
      .locator('div.MuiBox-root')
      .filter({ has: page.locator('[data-testid="CallIcon"]') })
      .filter({ hasText: /^call\s*log$/i })
      .first();

    this.actionButton = page.getByRole('button', { name: 'Action', exact: true }).first();
    this.callLogMenuItem = page.getByRole('menuitem', { name: /call log/i }).first();
    this.actionMenu = page.locator('[role="menu"]').filter({ visible: true }).first();
    this.addLogButton = page.getByRole('button', { name: /^add log$/i }).first();

    this.callPurposeInput = page.getByRole('textbox', { name: /call purpose/i });
    this.callOutcomeCombobox = page.getByRole('combobox', { name: /what happened on this call/i });
    this.commentInput = page.getByRole('textbox', { name: /^comment/i });
    this.submitAddLogButton = page.getByRole('button', { name: /^add log$/i }).last();

    this.searchInput = page
      .getByRole('textbox', { name: /search/i })
      .or(page.getByPlaceholder(/search/i))
      .first();

    this.callLogRows = page
      .locator('tbody tr, .MuiDataGrid-row, .MuiTableRow-root, [role="row"]')
      .filter({ hasNotText: /call purpose|no data found|header/i });

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
      .filter({ hasText: /delete|confirm|remove|call\s*log/i })
      .first();

    this.confirmYesButton = page
      .getByRole('button', { name: /^yes$/i })
      .or(page.locator('button').filter({ hasText: /^yes$/i }))
      .first();
  }

  buildRandomSuffix() {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  buildCallLogData() {
    const suffix = this.buildRandomSuffix();
    return {
      callPurpose: `Auto Call Purpose ${suffix}`,
      callOutcome: 'Call Later',
      comment: `Automation call log comment ${suffix}`,
    };
  }

  async isOnClientProjectProfile() {
    if (!/client\/profile/i.test(this.page.url())) {
      return false;
    }
    return this.communicationDocsButton.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async openClientsProjects() {
    console.log('[CallLogPage] Opening Clients/Projects');
    if (await this.isOnCallLogModule() || (await this.isOnClientProjectProfile())) {
      console.log('[CallLogPage] Already on client project / Call Log module');
      return;
    }

    const nav = new ProjectNavigationPage(this.page);
    const rowCount = await nav.projectRows.count().catch(() => 0);
    if (rowCount > 0) {
      return;
    }

    await nav.navigateToProjects();
  }

  async openFirstClientProfile() {
    if (await this.isOnClientProjectProfile()) {
      console.log('[CallLogPage] Client project profile already open');
      return;
    }

    console.log('[CallLogPage] Selecting first client from the list');
    await expect(this.firstClientRow).toBeVisible({ timeout: this.defaultTimeout });
    await this.firstClientRow.click();

    if (await this.clientRowIconButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[CallLogPage] Opening client profile from row action icon');
      await this.clientRowIconButton.click();
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await expect(this.communicationDocsButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  async openCallLogModule() {
    console.log('[CallLogPage] Opening Communication & Docs > Call Log module');

    if (this.page.url().includes('tab=CallLog')) {
      if (await this.isOnCallLogModule()) {
        return;
      }
    }

    await expect(this.communicationDocsButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.communicationDocsButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    await expect(this.communicationDocsGrid).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callLogModuleTile).toBeVisible({ timeout: this.defaultTimeout });
    await this.callLogModuleTile.scrollIntoViewIfNeeded().catch(() => {});
    await this.callLogModuleTile.click();

    await this.page.waitForURL(/tab=CallLog/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
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
    await expect(async () => {
      const actionVisible = await this.actionButton.isVisible().catch(() => false);
      const addLogVisible = await this.addLogButton.isVisible().catch(() => false);
      expect(actionVisible || addLogVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000, 3000] });
  }

  async openCallLogFormFromActionMenu() {
    console.log('[CallLogPage] Opening Call Log form via Action > Call Log');
    await this.dismissOpenMenus();

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
      await this.page.waitForTimeout(attempt === 0 ? 300 : 500);

      const menuVisible = await this.actionMenu.isVisible({ timeout: 4000 }).catch(() => false);
      if (!menuVisible) {
        continue;
      }

      const callLogInMenu = this.actionMenu
        .getByRole('menuitem', { name: /call log/i })
        .or(this.page.getByRole('menuitem', { name: /call log/i }))
        .first();

      if (await callLogInMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await callLogInMenu.click({ timeout: 15000, force: true });
        opened = true;
        break;
      }
    }

    if (!opened) {
      console.log('[CallLogPage] Action menu Call Log not found; falling back to Add Log');
      await this.dismissOpenMenus();
      await expect(this.addLogButton).toBeVisible({ timeout: this.defaultTimeout });
      await this.addLogButton.click();
    }

    await this.waitForCallLogFormReady();
  }

  async dismissOpenMenus() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.locator('[role="menu"]').filter({ visible: true }).waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
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

  async ensureOnCallLogModuleList() {
    if (!(await this.isOnCallLogModule())) {
      if (await this.isOnClientProjectProfile()) {
        await this.openCallLogModule();
      } else {
        await this.openClientsProjects();
        await this.openFirstClientProfile();
        await this.openCallLogModule();
      }
    }
    await this.waitForCallLogModuleReady();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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
      await this.page.waitForTimeout(300);

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
      const toggle = this.page
        .getByRole('button', { name: /search/i })
        .or(this.page.locator('[data-testid="SearchIcon"], svg[data-testid="SearchIcon"]'))
        .first();
      if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[CallLogPage] Revealing search input via search toggle');
        await toggle.click();
        isSearchInputVisible = await this.searchInput.isVisible({ timeout: 5000 }).catch(() => false);
      }
    }

    if (!isSearchInputVisible) {
      return;
    }

    console.log(`[CallLogPage] Searching call log list for: ${identifier}`);
    await this.searchInput.click().catch(() => {});
    await this.searchInput.press('Control+A').catch(() => {});
    await this.searchInput.fill('');
    await this.searchInput.fill(String(identifier));
    await this.searchInput.press('Tab').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async waitForCallLogInList(identifier) {
    console.log(`[CallLogPage] Waiting for call log in list: ${identifier}`);
    let reloaded = false;

    await expect(async () => {
      await this.searchForCallLog(identifier);

      const rowVisible = await this.getCallLogRow(identifier).isVisible().catch(() => false);
      const cardVisible = await this.page
        .locator('.MuiCard-root')
        .filter({ hasText: String(identifier) })
        .first()
        .isVisible()
        .catch(() => false);
      const textVisible = await this.page
        .getByText(String(identifier), { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      const toastVisible = await this.successToast.isVisible().catch(() => false);
      const noDataVisible = await this.page
        .getByText(/no data found/i)
        .first()
        .isVisible()
        .catch(() => false);

      if (!rowVisible && !textVisible && !toastVisible && noDataVisible && !reloaded) {
        reloaded = true;
        await this.page.reload().catch(() => {});
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.waitForCallLogModuleReady().catch(() => {});
        await this.searchForCallLog(identifier);
      }

      expect(rowVisible || cardVisible || textVisible || toastVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 4000] });
  }

  async navigateToCallLogForm() {
    console.log('[CallLogPage] Navigating to Call Log form');
    if (await this.callPurposeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[CallLogPage] Call Log form already open');
      return;
    }

    await this.openClientsProjects();
    await this.openFirstClientProfile();
    await this.openCallLogModule();
    await this.openCallLogFormFromActionMenu();
  }

  async waitForCallLogFormReady() {
    console.log('[CallLogPage] Waiting for Call Log form');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
  }

  async fillMandatoryCallLogFields() {
    this.callLogData = this.buildCallLogData();
    console.log(`[CallLogPage] Filling call log form: ${this.callLogData.callPurpose}`);

    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.callPurposeInput.click();
    await this.callPurposeInput.fill(this.callLogData.callPurpose);

    await expect(this.callOutcomeCombobox).toBeVisible({ timeout: this.defaultTimeout });
    await this.callOutcomeCombobox.click();
    await this.page.getByRole('option', { name: this.callLogData.callOutcome }).click();

    await expect(this.commentInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.commentInput.click();
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

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(this.callPurposeInput).toBeHidden({ timeout: 30000 }).catch(() => {});

    await this.page
      .locator('.MuiSnackbar-root, .MuiAlert-root')
      .filter({ hasText: /success|added|created/i })
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});

    await this.ensureOnCallLogModuleList();
  }

  async verifyCallLogCreatedSuccessfully() {
    console.log('[CallLogPage] Verifying call log created successfully');
    const purpose = this.callLogData?.callPurpose;
    if (!purpose) {
      throw new Error('[CallLogPage] Missing call purpose data for verification');
    }

    if (this.createSucceeded === false) {
      throw new Error('[CallLogPage] Call log create API did not succeed; list verification skipped');
    }

    await this.waitForCallLogInList(purpose);
  }
}

module.exports = CallLogPage;
