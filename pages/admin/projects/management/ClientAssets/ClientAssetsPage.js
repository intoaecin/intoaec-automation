const { expect } = require('@playwright/test');
const BasePage = require('../../../../BasePage');
const ProjectNavigationPage = require('../../ProjectNavigationPage');
const ProjectProfilePage = require('../../ProjectProfilePage');
const {
  buildAssetRequestContext,
  syncContextToWorld,
  getContext,
  statusToRegex,
} = require('../../../resources/AssetRequest/assetRequestTestContext');

class ClientAssetsPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.main = page.locator('main, [role="main"]').first();

    // Primary CTA is a MUI contained button with start icon + "Request Asset" label (often outside main).
    this.openRequestAssetButton = page
      .locator('button.MuiButton-containedPrimary')
      .filter({ hasText: /request\s*asset/i })
      .or(page.locator('button.MuiButton-contained').filter({ hasText: /request\s*asset/i }))
      .or(page.getByRole('button', { name: /request\s*asset/i }))
      .first();

    this.pickAssetDialog = page
      .getByRole('dialog')
      .filter({ hasText: /request\s*asset/i })
      .or(page.locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root').filter({ hasText: /request\s*asset/i }))
      .first();

    this.selectAssetButton = page
      .locator('button.MuiButton-containedPrimary')
      .filter({ hasText: /^select\s*asset$/i })
      .or(page.getByRole('button', { name: /^select\s*asset$/i }))
      .first();

    this.selectedAssetsDialog = page
      .getByRole('dialog')
      .filter({ hasText: /selected\s*asset/i })
      .or(page.locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root').filter({ hasText: /selected\s*asset/i }))
      .first();

    this.assetPickerSearch = page.getByPlaceholder(/search item name/i).first();

    // Prefer the Request Asset CTA — do NOT use "All Asset List" (collides with org Manage Assets)
    this.moduleReadyMarker = this.openRequestAssetButton
      .or(page.getByRole('tab', { name: /request\s*asset/i }))
      .or(page.getByRole('button', { name: /request\s*asset/i }))
      .first();

    this.actionMenu = page.locator('[role="menu"]').first();
    this.receiveReturnModal = page
      .locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root')
      .filter({ hasText: /receive\s*asset|return\s*asset/i })
      .first();
    this.receivedByAutocomplete = page
      .getByLabel(/received\s*by/i)
      .or(page.locator('.MuiAutocomplete-root input').first())
      .or(page.getByRole('combobox').first())
      .first();
    this.collectButton = page
      .getByRole('button', { name: /^collect$/i })
      .or(page.locator('button').filter({ hasText: /^collect$/i }))
      .first();
    this.returnSubmitButton = page
      .getByRole('button', { name: /^return$/i })
      .or(page.locator('button.MuiButton-contained').filter({ hasText: /^return$/i }))
      .first();
    this.receiveReturnNotes = page
      .getByLabel(/notes?/i)
      .or(page.getByPlaceholder(/notes?/i))
      .or(page.locator('textarea'))
      .first();
    // Project Assets ExpandableSearch only — never header global "Search Anything in IntoAEC"
    this.listSearchRegion = page
      .getByRole('search', { name: /search\s*for\s*assets?/i })
      .or(page.locator('[role="search"]').filter({ has: page.getByPlaceholder(/search\s*for\s*assets?/i) }))
      .first();
    this.listSearchToggle = page
      .getByRole('button', { name: /search\s*for\s*assets?/i })
      .or(this.listSearchRegion.getByRole('button', { name: /search/i }))
      .or(
        page
          .locator('main, [role="main"], #app-content-scroll')
          .getByRole('button', { name: /^search$/i })
      )
      .first();
    this.searchInput = page
      .getByRole('textbox', { name: /search\s*for\s*assets?/i })
      .or(page.getByPlaceholder(/search\s*for\s*assets?/i))
      .or(this.listSearchRegion.locator('input:not([type="hidden"])'))
      .first();
    this.filterButton = page
      .getByRole('button', { name: /filter/i })
      .or(page.locator('[data-testid="FilterListIcon"], button:has([data-testid="FilterListIcon"])'))
      .first();
  }

  getRowActionButton(row) {
    return row
      .locator('button:has([data-testid="MoreVertIcon"])')
      .or(row.getByRole('button', { name: /more|action|options|menu/i }))
      .or(row.locator('button').last())
      .first();
  }

  getPickAssetModalScope() {
    if (this._pickAssetModalScope) {
      return this._pickAssetModalScope;
    }
    return this.pickAssetDialog.or(this.page.locator('body')).first();
  }

  async resolvePickAssetModalScope() {
    const scope = this.page
      .locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root')
      .filter({ hasText: /request\s*asset/i })
      .or(this.page.locator('.MuiDialog-root, .MuiModal-root').filter({ has: this.selectAssetButton }))
      .first();

    await expect(
      scope
        .or(this.selectAssetButton)
        .or(this.assetPickerSearch)
        .or(scope.locator('table').filter({ hasText: /asset\s*name|asset\s*id/i }))
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });

    this._pickAssetModalScope = scope;
    return scope;
  }

  isOnOrgManageAssetsUrl() {
    return /\/asset-management(\/|$|\?)/i.test(String(this.page.url() || ''));
  }

  isOnProjectProfileAssetsUrl() {
    const url = String(this.page.url() || '');
    return (
      /\/(client|leadmanager)\/profile/i.test(url) &&
      (/tab=Assets/i.test(url) || /Assets/i.test(url))
    );
  }

  async isOnClientAssetsModule() {
    // Org Manage Assets also shows "All Asset List" — never treat that as project Assets
    if (this.isOnOrgManageAssetsUrl()) {
      return false;
    }
    const requestCtaVisible = await this.openRequestAssetButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (requestCtaVisible) {
      return true;
    }
    if (this.isOnProjectProfileAssetsUrl()) {
      return this.moduleReadyMarker.isVisible({ timeout: 2500 }).catch(() => false);
    }
    return false;
  }

  async captureFirstProjectName() {
    const nav = new ProjectNavigationPage(this.page);
    await nav.navigateToProjects();
    const firstProjectHeader = this.page.getByRole('rowheader').first();
    await expect(firstProjectHeader).toBeVisible({ timeout: this.defaultTimeout });
    const projectName = ((await firstProjectHeader.innerText().catch(() => '')) || '').trim();
    if (!projectName) {
      throw new Error('[ClientAssetsPage] Could not read project name from projects list.');
    }
    console.log(`[ClientAssetsPage] Captured project name: ${projectName}`);
    return projectName;
  }

  /**
   * New project UI (sidebar): Client/project → ONSITE → Assets.
   * Returns true when Assets module appears after click.
   */
  async expandOnsiteAccordionIfCollapsed() {
    // Assets lives under accordion "05 — Onsite" (often collapsed: aria-expanded=false)
    const onsiteSummary = this.page
      .locator('.MuiAccordionSummary-root, [role="button"]')
      .filter({ hasText: /05\s*[—–-]?\s*Onsite|^\s*Onsite\s*$/i })
      .filter({ visible: true })
      .first();

    if (!(await onsiteSummary.isVisible({ timeout: 3000 }).catch(() => false))) {
      return false;
    }

    const expanded = await onsiteSummary.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== 'true') {
      console.log('[ClientAssetsPage] Expanding Onsite accordion');
      await onsiteSummary.click({ force: true, timeout: 10000 }).catch(() => {});
      await this.page.waitForTimeout(600).catch(() => {});
    }
    return true;
  }

  async clickProjectAssetsMenuItem() {
    await this.expandOnsiteAccordionIfCollapsed();

    // Prefer the list item button that owns the "Assets" label (not intercepted by accordion headers)
    const assetsListItem = this.page
      .locator('.MuiListItemButton-root, .MuiListItem-root, [role="button"]')
      .filter({ has: this.page.locator('.MuiListItemText-primary, span').filter({ hasText: /^\s*Assets\s*$/i }) })
      .filter({ visible: true })
      .first()
      .or(
        this.page
          .locator('.MuiAccordion-root')
          .filter({ hasText: /Onsite/i })
          .locator('.MuiListItemButton-root, [role="button"]')
          .filter({ hasText: /^\s*Assets\s*$/i })
          .filter({ visible: true })
          .first()
      );

    if (await assetsListItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await assetsListItem.scrollIntoViewIfNeeded().catch(() => {});
      await assetsListItem.click({ force: true, timeout: 15000 });
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(800).catch(() => {});
      return true;
    }
    return false;
  }

  async openAssetsViaDeepLink() {
    const url = String(this.page.url() || '');
    if (!/\/(client|leadmanager)\/profile/i.test(url)) {
      return false;
    }
    const next = new URL(url);
    next.searchParams.set('tab', 'Assets');
    console.log(`[ClientAssetsPage] Deep-linking to Assets tab: ${next.toString()}`);
    await this.page.goto(next.toString(), { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    return this.openRequestAssetButton.isVisible({ timeout: 20000 }).catch(() => false);
  }

  async openAssetsViaNewUiSideNav() {
    console.log('[ClientAssetsPage] Trying project menu Assets (ONSITE accordion)');

    try {
      // Fast path: deep-link when already on client/lead profile
      if (await this.openAssetsViaDeepLink()) {
        console.log('[ClientAssetsPage] Opened Assets via deep-link');
        return true;
      }

      if (await this.clickProjectAssetsMenuItem()) {
        if (
          (await this.openRequestAssetButton.isVisible({ timeout: 10000 }).catch(() => false)) ||
          /tab=Assets/i.test(String(this.page.url() || ''))
        ) {
          console.log('[ClientAssetsPage] Opened Assets via Onsite menu item');
          return true;
        }
      }
    } catch (err) {
      console.log(`[ClientAssetsPage] Onsite Assets navigation error: ${err.message}`);
    }

    console.log('[ClientAssetsPage] Onsite Assets menu path not successful');
    return false;
  }

  async openAssetsViaClassicProjectManagement() {
    console.log('[ClientAssetsPage] Classic / fallback path to project Assets');
    const profile = new ProjectProfilePage(this.page);

    // Prefer deep-link whenever on profile URL (most reliable)
    if (await this.openAssetsViaDeepLink()) {
      return true;
    }

    await profile.ensureClassicProjectUi();

    try {
      if (
        await this.page
          .getByRole('button', { name: /project\s*management/i })
          .or(this.page.getByRole('tab', { name: /project\s*management/i }))
          .first()
          .isVisible({ timeout: 4000 })
          .catch(() => false)
      ) {
        await profile.selectHeading('Project Management');
        await profile.clickModuleCard('Assets');
      } else if (await this.clickProjectAssetsMenuItem()) {
        // accordion path already handled
      }
    } catch (err) {
      console.log(`[ClientAssetsPage] Classic Assets click failed: ${err.message}`);
      if (await this.openAssetsViaDeepLink()) {
        return true;
      }
      throw err;
    }

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    return this.openRequestAssetButton.isVisible({ timeout: 15000 }).catch(() => false);
  }

  async navigateToClientAssets(world) {
    console.log('[ClientAssetsPage] Navigating to client project > Assets page');
    this._pickAssetModalScope = null;
    const nav = new ProjectNavigationPage(this.page);
    const profile = new ProjectProfilePage(this.page);

    // Always leave org Manage Assets before checking project Assets markers
    if (this.isOnOrgManageAssetsUrl()) {
      console.log('[ClientAssetsPage] Leaving org Manage Assets → Projects list');
      await nav.navigateToProjects();
      const projectName = await this.captureFirstProjectName();
      syncContextToWorld(world, { projectName });
      await nav.clickFirstProject();
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(1000).catch(() => {});
    } else if (await this.isOnClientAssetsModule()) {
      await this.waitForModuleReady(world);
      return;
    } else if (!(await profile.isInsideProjectProfile())) {
      await nav.navigateToProjects();
      const projectName = await this.captureFirstProjectName();
      syncContextToWorld(world, { projectName });
      await nav.clickFirstProject();
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(1000).catch(() => {});
    } else if (!getContext(world).projectName) {
      syncContextToWorld(world, { projectName: await this.captureFirstProjectName().catch(() => '') });
    }

    if (await this.isOnClientAssetsModule()) {
      await this.waitForModuleReady(world);
      return;
    }

    // Prefer New UI: project side menu → Assets (under ONSITE); else classic hub / deep-link
    const openedNewUi = await this.openAssetsViaNewUiSideNav();
    if (!openedNewUi) {
      const openedClassic = await this.openAssetsViaClassicProjectManagement();
      if (!openedClassic) {
        console.log('[ClientAssetsPage] Classic Assets open did not show Request Asset yet — waiting in waitForModuleReady');
      }
    }

    await this.waitForModuleReady(world);
  }

  async waitForModuleReady(world) {
    console.log('[ClientAssetsPage] Waiting for Assets module');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(this.openRequestAssetButton).toBeVisible({ timeout: this.defaultTimeout });
    if (world) {
      await this.captureProjectNameIfMissing(world);
    }
  }

  async captureProjectNameIfMissing(world) {
    if (getContext(world).projectName) {
      return;
    }

    const candidates = [
      this.page.getByText(/project\s*name\s*:/i).locator('xpath=following::*[1]').first(),
      this.main.locator('h1, h2, h3, span, p').filter({ hasText: /^[A-Z0-9][A-Z0-9_ -]+$/i }).first(),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible({ timeout: 1500 }).catch(() => false))) {
        continue;
      }
      const text = ((await candidate.innerText().catch(() => '')) || '').trim().split('\n')[0].trim();
      if (text && !/project management|assets?|all assets|request asset/i.test(text)) {
        syncContextToWorld(world, { projectName: text });
        console.log(`[ClientAssetsPage] Captured project name from profile: ${text}`);
        return;
      }
    }
  }

  getRequestAssetPickerScope() {
    if (this._pickAssetModalScope) {
      return this._pickAssetModalScope;
    }

    return this.pickAssetDialog
      .or(this.page.locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root').filter({ hasText: /request\s*asset/i }))
      .or(this.page.locator('.MuiDialog-root, .MuiModal-root').filter({ has: this.selectAssetButton }))
      .first();
  }

  getAssetPickerTable() {
    const scope = this.getRequestAssetPickerScope();
    return scope
      .locator('table')
      .filter({ hasText: /asset\s*name|category|asset\s*id/i })
      .first()
      .or(scope.locator('table').first());
  }

  getSelectedAssetsTable() {
    const scope = this.page
      .locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root')
      .filter({ hasText: /selected\s*asset/i })
      .first();
    return scope
      .locator('table')
      .filter({ hasText: /requested\s*qty|apx\.?\s*return\s*time/i })
      .first()
      .or(scope.locator('table').first());
  }

  getPickAssetDialogRows() {
    const table = this.getAssetPickerTable();
    const checkboxRows = table.locator(
      'tbody tr:has(input[type="checkbox"]), tbody tr:has([role="checkbox"]), tbody tr:has(.MuiCheckbox-root)'
    );
    const assetIdRows = table.locator('tbody tr').filter({ hasText: /\bAS\d+\b/i });
    return checkboxRows.or(assetIdRows);
  }

  async countPickAssetDialogRows() {
    const rows = this.getPickAssetDialogRows();
    const count = await rows.count().catch(() => 0);
    if (count > 0) {
      return count;
    }

    const scope = this.getRequestAssetPickerScope();
    return scope.locator('tbody tr').filter({ hasText: /\bAS\d+\b/i }).count();
  }

  async openRequestAssetDialog() {
    console.log('[ClientAssetsPage] Clicking Request Asset button');
    this._pickAssetModalScope = null;

    if (this.isOnOrgManageAssetsUrl()) {
      throw new Error(
        '[ClientAssetsPage] Still on org Manage Assets — cannot click project Request Asset. Navigate to project Assets first.'
      );
    }

    const requestBtn = this.page
      .getByRole('button', { name: /request\s*asset/i })
      .or(this.openRequestAssetButton)
      .filter({ visible: true })
      .first();

    await expect(requestBtn).toBeVisible({ timeout: this.defaultTimeout });
    await requestBtn.scrollIntoViewIfNeeded().catch(() => {});
    await requestBtn.click({ timeout: 30000 });
    await this.resolvePickAssetModalScope();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    console.log('[ClientAssetsPage] Request Asset picker is open');
  }

  async verifyAssetsListedInRequestDialog() {
    console.log('[ClientAssetsPage] Verifying assets are listed in Request Asset dialog');
    await expect(this.getAssetPickerTable()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(async () => {
      const count = await this.countPickAssetDialogRows();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 4000] });
  }

  async readAssetNameFromRow(row) {
    const cells = row.locator('td');
    const cellCount = await cells.count().catch(() => 0);
    for (let i = 0; i < cellCount; i += 1) {
      const text = ((await cells.nth(i).innerText().catch(() => '')) || '').trim();
      if (text && !/^(bulk|individual|\d+|€|\$|owned|rented|as\d+)/i.test(text)) {
        return text.split('\n')[0].trim();
      }
    }
    const rowText = ((await row.innerText().catch(() => '')) || '').trim();
    return rowText.split('\n').map((line) => line.trim()).find(Boolean) || '';
  }

  async selectFirstListedAsset(world) {
    console.log('[ClientAssetsPage] Selecting first listed asset in Request Asset dialog');
    await this.verifyAssetsListedInRequestDialog();

    const firstRow = this.getPickAssetDialogRows().first();
    await expect(firstRow).toBeVisible({ timeout: this.defaultTimeout });

    const rowText = ((await firstRow.innerText().catch(() => '')) || '').trim();
    const assetName = await this.readAssetNameFromRow(firstRow);
    if (!assetName) {
      throw new Error('[ClientAssetsPage] Could not read asset name from request dialog listing.');
    }

    const assetTypeMatch = rowText.match(/\b(Bulk|Individual)\b/i);
    syncContextToWorld(world, buildAssetRequestContext({
      assetName,
      projectName: getContext(world).projectName,
      isBulkAsset: assetTypeMatch ? /bulk/i.test(assetTypeMatch[1]) : false,
    }));

    const checkbox = firstRow
      .locator('input[type="checkbox"]')
      .or(firstRow.getByRole('checkbox'))
      .or(firstRow.locator('.MuiCheckbox-root'))
      .first();
    await expect(checkbox).toBeVisible({ timeout: this.defaultTimeout });
    await checkbox.click({ force: true }).catch(async () => {
      await checkbox.check().catch(() => {});
    });

    console.log(`[ClientAssetsPage] Selected asset: ${assetName} (${getContext(world).isBulkAsset ? 'Bulk' : 'Individual'})`);
    return assetName;
  }

  async selectFirstListedAssetAndProceed(world) {
    await this.selectFirstListedAsset(world);
    await this.clickSelectAssetInRequestDialog();
  }

  async selectAssetByNameAndProceed(world, assetName) {
    console.log(`[ClientAssetsPage] Selecting asset by name: ${assetName}`);
    await this.verifyAssetsListedInRequestDialog();

    const search = this.assetPickerSearch;
    if (await search.isVisible({ timeout: 5000 }).catch(() => false) && assetName && assetName.length >= 3) {
      await search.fill(assetName);
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await this.page.waitForTimeout(1000);
    }

    const row = this.getPickAssetDialogRows().filter({ hasText: assetName }).first()
      .or(this.getPickAssetDialogRows().first());
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });

    const resolvedName = (await this.readAssetNameFromRow(row)) || assetName;
    const rowText = ((await row.innerText().catch(() => '')) || '').trim();
    const assetTypeMatch = rowText.match(/\b(Bulk|Individual)\b/i);
    syncContextToWorld(world, buildAssetRequestContext({
      assetName: resolvedName,
      projectName: getContext(world).projectName,
      isBulkAsset: assetTypeMatch ? /bulk/i.test(assetTypeMatch[1]) : false,
    }));

    const checkbox = row
      .locator('input[type="checkbox"]')
      .or(row.getByRole('checkbox'))
      .or(row.locator('.MuiCheckbox-root'))
      .first();
    await expect(checkbox).toBeVisible({ timeout: this.defaultTimeout });
    await checkbox.click({ force: true }).catch(async () => {
      await checkbox.check().catch(() => {});
    });

    await this.clickSelectAssetInRequestDialog();
    return resolvedName;
  }

  async clickSelectAssetInRequestDialog() {
    console.log('[ClientAssetsPage] Clicking Select Asset');
    await expect(this.selectAssetButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.selectAssetButton.click();
    await expect(
      this.selectedAssetsDialog
        .or(this.page.locator('.MuiDialog-root, .MuiModal-root').filter({ hasText: /selected\s*asset/i }))
        .or(this.page.getByPlaceholder(/^duration$/i))
        .first()
    ).toBeVisible({ timeout: this.defaultTimeout });
  }

  async enterRequestedQuantityAndReturnTime(world) {
    const context = getContext(world);
    console.log('[ClientAssetsPage] Entering requested quantity and approximate return time');

    const table = this.getSelectedAssetsTable();
    await expect(table).toBeVisible({ timeout: this.defaultTimeout });
    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: this.defaultTimeout });

    const qtyInput = firstRow.locator('input[type="text"], input[type="number"]').first();
    if (context.isBulkAsset && (await qtyInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      const isEnabled = await qtyInput.isEnabled().catch(() => false);
      if (isEnabled) {
        await qtyInput.click().catch(() => {});
        await qtyInput.fill(String(context.quantity));
        console.log(`[ClientAssetsPage] Filled bulk requested qty: ${context.quantity}`);
      }
    } else {
      console.log('[ClientAssetsPage] Individual asset — skipping qty entry');
    }

    const durationInput = table.getByPlaceholder(/^duration$/i).first();
    await expect(durationInput).toBeVisible({ timeout: this.defaultTimeout });
    await durationInput.click().catch(() => {});
    await durationInput.fill(String(context.returnDuration));
    console.log(`[ClientAssetsPage] Filled approximate return duration: ${context.returnDuration} ${context.returnDurationUnit}`);
  }

  async submitAssetRequest(world) {
    console.log('[ClientAssetsPage] Submitting asset request from Selected Asset(s) dialog');
    const modal = this.page
      .locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root')
      .filter({ hasText: /selected\s*asset/i })
      .first();
    const submitButton = modal
      .locator('button.MuiButton-containedPrimary')
      .filter({ hasText: /^request\s*asset$/i })
      .or(modal.getByRole('button', { name: /^request\s*asset$/i }))
      .first();
    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(submitButton).toBeEnabled({ timeout: this.defaultTimeout });
    await submitButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    if (world) {
      syncContextToWorld(world, { lastStatus: 'Requested' });
    }
  }

  async createPendingAssetRequestFromClientAssets(world) {
    await this.navigateToClientAssets(world);
    await this.openRequestAssetDialog();
    await this.selectFirstListedAssetAndProceed(world);
    await this.enterRequestedQuantityAndReturnTime(world);
    await this.submitAssetRequest(world);
  }

  getRequestRow(identifier) {
    return this.page
      .locator('tbody tr, .MuiDataGrid-row, [role="row"]')
      .filter({ hasText: identifier })
      .first();
  }

  async verifyRequestStatus(world, status) {
    const context = getContext(world);
    const rowKey = context.assetName || context.projectName;
    console.log(`[ClientAssetsPage] Verifying status "${status}" for ${rowKey}`);

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const row = this.getRequestRow(rowKey);
    const statusRegex = statusToRegex(status);

    await expect(async () => {
      const rowVisible = await row.isVisible().catch(() => false);
      const statusVisible = await row.getByText(statusRegex).first().isVisible().catch(() => false);
      const pageStatusVisible = await this.page.getByText(statusRegex).first().isVisible().catch(() => false);
      expect(rowVisible && (statusVisible || pageStatusVisible)).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });

    syncContextToWorld(world, { lastStatus: status });
  }

  async searchProjectAssets(term) {
    console.log(`[ClientAssetsPage] Searching project assets for ${term} (page ExpandableSearch only)`);

    if (!(await this.searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      if (await this.listSearchToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.listSearchToggle.click({ force: true });
      } else if (await this.listSearchRegion.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.listSearchRegion.click({ force: true }).catch(() => {});
      }
      await this.page.waitForTimeout(300).catch(() => {});
    }

    if (!(await this.searchInput.isVisible({ timeout: 8000 }).catch(() => false))) {
      console.log('[ClientAssetsPage] Page search not available — locating row without search');
      return;
    }

    const ph = ((await this.searchInput.getAttribute('placeholder').catch(() => '')) || '').trim();
    const aria = ((await this.searchInput.getAttribute('aria-label').catch(() => '')) || '').trim();
    if (/anything|intoaec/i.test(`${ph} ${aria}`)) {
      throw new Error(
        '[ClientAssetsPage] Refusing to use header global search. Use page "Search for Assets" only.'
      );
    }

    await this.searchInput.click({ force: true }).catch(() => {});
    await this.searchInput.press('Control+A').catch(() => {});
    await this.searchInput.fill(String(term));
    await this.searchInput.press('Enter').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async openRowMenuForRequest(world) {
    const context = getContext(world);
    const rowKey = context.assetName;
    if (rowKey) {
      await this.searchProjectAssets(rowKey);
    }
    const row = this.getRequestRow(rowKey);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});
    const menuButton = this.getRowActionButton(row);
    await expect(menuButton).toBeVisible({ timeout: this.defaultTimeout });
    await menuButton.click();
    await expect(this.actionMenu).toBeVisible({ timeout: 10000 });
    return row;
  }

  async clickRequestRowMenuAction(world, actionRegex) {
    await this.openRowMenuForRequest(world);
    const menuItem = this.page
      .getByRole('menuitem', { name: actionRegex })
      .or(this.actionMenu.locator('[role="menuitem"]').filter({ hasText: actionRegex }))
      .or(this.actionMenu.getByText(actionRegex))
      .first();
    await expect(menuItem).toBeVisible({ timeout: this.defaultTimeout });
    await menuItem.click();
  }

  async selectReceivedByUser() {
    console.log('[ClientAssetsPage] Selecting Received by user');
    await expect(this.receiveReturnModal).toBeVisible({ timeout: this.defaultTimeout });

    // Scope ONLY inside the receive modal — avoid page pagination combobox ("10 row(s)")
    const autocomplete = this.receiveReturnModal
      .locator('.MuiAutocomplete-root input[role="combobox"]')
      .filter({ hasNotText: /row/i })
      .first()
      .or(this.receiveReturnModal.getByRole('combobox').filter({ hasNot: this.page.locator('[value*="row" i]') }).first())
      .or(this.receiveReturnModal.locator('input[role="combobox"]').nth(0));

    // Prefer the empty Received-by field (not pagination)
    const inputs = this.receiveReturnModal.locator('.MuiAutocomplete-root input[role="combobox"]');
    const count = await inputs.count().catch(() => 0);
    let target = autocomplete;
    for (let i = 0; i < count; i += 1) {
      const value = (await inputs.nth(i).inputValue().catch(() => '')) || '';
      if (!/row/i.test(value)) {
        target = inputs.nth(i);
        break;
      }
    }

    await expect(target).toBeVisible({ timeout: this.defaultTimeout });
    await target.click({ force: true });
    await this.page.waitForTimeout(500);

    const option = this.page
      .locator('[role="listbox"] [role="option"], .MuiAutocomplete-option')
      .filter({ visible: true })
      .first();

    if (await option.isVisible({ timeout: 10000 }).catch(() => false)) {
      await option.click();
    } else {
      await target.fill('a');
      await this.page.waitForTimeout(800);
      const fallback = this.page.locator('[role="listbox"] [role="option"], .MuiAutocomplete-option').first();
      await expect(fallback).toBeVisible({ timeout: this.defaultTimeout });
      await fallback.click();
    }
  }

  async receiveAssetRequest(world, { skipUser = false } = {}) {
    console.log('[ClientAssetsPage] Receiving asset request');
    await this.clickRequestRowMenuAction(world, /mark\s*as\s*receive|receive/i);
    await expect(this.receiveReturnModal).toBeVisible({ timeout: this.defaultTimeout });

    if (!skipUser) {
      await this.selectReceivedByUser();
    }

    await expect(this.collectButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.collectButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    if (!skipUser) {
      syncContextToWorld(world, { lastStatus: 'ISSUED' });
    }
  }

  async receiveAssetWithoutUser(world) {
    await this.receiveAssetRequest(world, { skipUser: true });
    const toastVisible = await this.page
      .getByText(/required|received\s*by|select\s*user/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(toastVisible).toBeTruthy();
  }

  async returnAssetRequest(world, notes = 'Automation return notes') {
    console.log('[ClientAssetsPage] Returning asset request');
    await this.clickRequestRowMenuAction(world, /mark\s*as\s*return|return/i);
    await expect(this.receiveReturnModal).toBeVisible({ timeout: this.defaultTimeout });

    if (await this.receiveReturnNotes.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.receiveReturnNotes.fill(notes);
    }

    await expect(this.returnSubmitButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.returnSubmitButton.click();
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    syncContextToWorld(world, { lastStatus: 'RETURN_INITIATED' });
  }

  async submitRequestWithInvalidQuantity(world) {
    console.log('[ClientAssetsPage] Submitting request with invalid quantity');
    await this.openRequestAssetDialog();
    await this.selectFirstListedAssetAndProceed(world);

    const table = this.getSelectedAssetsTable();
    const qtyInput = table.locator('tbody tr').first().locator('input[type="text"], input[type="number"]').first();
    if (await qtyInput.isVisible({ timeout: 5000 }).catch(() => false) && (await qtyInput.isEnabled().catch(() => false))) {
      await qtyInput.fill('0');
    }

    const modal = this.page
      .locator('.MuiDialog-root, .MuiModal-root, .MuiDrawer-root')
      .filter({ hasText: /selected\s*asset/i })
      .first();
    const submitButton = modal
      .locator('button.MuiButton-containedPrimary')
      .filter({ hasText: /^request\s*asset$/i })
      .first();
    await submitButton.click();

    const toastVisible = await this.page
      .getByText(/please\s*fill|invalid|required|quantity/i)
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false);
    expect(toastVisible).toBeTruthy();
  }

  async submitRequestWithoutSelection() {
    console.log('[ClientAssetsPage] Submitting request without selecting an asset');
    await this.openRequestAssetDialog();
    await expect(this.selectAssetButton).toBeVisible({ timeout: this.defaultTimeout });
    // Select Asset may be disabled with no selection; click if enabled, else assert disabled
    const enabled = await this.selectAssetButton.isEnabled().catch(() => false);
    if (enabled) {
      await this.selectAssetButton.click();
    }
    const blocked =
      !enabled ||
      (await this.page
        .getByText(/please\s*select\s*asset|select\s*at\s*least/i)
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false));
    expect(blocked).toBeTruthy();
  }

  async verifyMenuActionAvailable(world, actionRegex, shouldExist = true) {
    await this.openRowMenuForRequest(world);
    const menuItem = this.page
      .getByRole('menuitem', { name: actionRegex })
      .or(this.actionMenu.getByText(actionRegex))
      .first();
    const visible = await menuItem.isVisible({ timeout: 5000 }).catch(() => false);
    expect(visible).toBe(shouldExist);
    await this.page.keyboard.press('Escape').catch(() => {});
  }
}

module.exports = ClientAssetsPage;
