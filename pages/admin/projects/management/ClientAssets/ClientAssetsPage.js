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

    this.moduleReadyMarker = page
      .getByText(/all\s*assets/i)
      .or(page.getByRole('tab', { name: /request\s*asset/i }))
      .or(this.openRequestAssetButton)
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

  async isOnClientAssetsModule() {
    return this.moduleReadyMarker.isVisible({ timeout: 2500 }).catch(() => false);
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

  async navigateToClientAssets(world) {
    console.log('[ClientAssetsPage] Navigating to client project > Assets page');
    this._pickAssetModalScope = null;
    const nav = new ProjectNavigationPage(this.page);
    const profile = new ProjectProfilePage(this.page);

    if (!(await profile.isInsideProjectProfile())) {
      await nav.navigateToProjects();
      const projectName = await this.captureFirstProjectName();
      syncContextToWorld(world, { projectName });
      await nav.clickFirstProject();
    } else if (!getContext(world).projectName) {
      syncContextToWorld(world, { projectName: await this.captureFirstProjectName() });
    }

    if (!(await this.isOnClientAssetsModule())) {
      await profile.selectHeading('Project Management');
      await profile.clickModuleCard('Assets');
    }

    await this.waitForModuleReady(world);
  }

  async waitForModuleReady(world) {
    console.log('[ClientAssetsPage] Waiting for Assets module');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(this.moduleReadyMarker).toBeVisible({ timeout: this.defaultTimeout });
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
    await expect(this.openRequestAssetButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.openRequestAssetButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.openRequestAssetButton.click();
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
}

module.exports = ClientAssetsPage;
