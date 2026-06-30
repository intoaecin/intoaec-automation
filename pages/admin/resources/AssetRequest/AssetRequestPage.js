const { expect } = require('@playwright/test');
const AssetPage = require('../Asset/AssetPage');
const ClientAssetsPage = require('../../projects/management/ClientAssets/ClientAssetsPage');
const {
  syncContextToWorld,
  getContext,
  statusToRegex,
} = require('./assetRequestTestContext');

class AssetRequestPage extends AssetPage {
  constructor(page) {
    super(page);

    this.allAssetListHeading = page
      .getByRole('heading', { name: /all asset list/i })
      .or(page.getByText(/all asset list/i))
      .first();

    this.assetRequestsTab = page
      .getByRole('tab', { name: /asset requests/i })
      .or(page.getByRole('button', { name: /asset requests/i }))
      .first();

    this.assetRequestsTable = page
      .locator('table')
      .filter({ hasText: /asset name|status/i })
      .first();

    this.declineReasonInput = page
      .getByLabel(/reason|comments?/i)
      .or(page.getByPlaceholder(/reason|comments?|enter\s*reason/i))
      .or(page.locator('textarea[name*="reason" i], textarea[id*="reason" i], textarea'))
      .first();
  }

  async isOnAssetRequestsTab() {
    const selected = await this.assetRequestsTab.getAttribute('aria-selected').catch(() => null);
    if (selected === 'true') {
      return true;
    }
    return this.assetRequestsTable
      .getByText(/^status$/i)
      .isVisible({ timeout: 1500 })
      .catch(() => false);
  }

  async openAssetRequestsTab() {
    console.log('[AssetRequestPage] Opening Asset Requests tab');
    await expect(this.assetRequestsTab).toBeVisible({ timeout: this.defaultTimeout });
    await this.assetRequestsTab.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async waitForAssetRequestsListReady() {
    console.log('[AssetRequestPage] Waiting for Asset Requests list');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(this.allAssetListHeading.or(this.assetRequestsTab)).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.assetRequestsTable).toBeVisible({ timeout: this.defaultTimeout });
  }

  async navigateToManageAssetsAssetRequestsTab() {
    console.log('[AssetRequestPage] Navigating to Resources > Manage Assets > Asset Requests tab');
    if (await this.isOnAssetRequestsTab()) {
      await this.waitForAssetRequestsListReady();
      return;
    }

    const onManageAssets = await this.addNewButton.isVisible().catch(() => false);
    if (!onManageAssets) {
      await this.navigateToManageAssets();
    }

    await this.openAssetRequestsTab();
    await this.waitForAssetRequestsListReady();
  }

  /** @deprecated use navigateToManageAssetsAssetRequestsTab */
  async navigateToAssetRequests() {
    await this.navigateToManageAssetsAssetRequestsTab();
  }

  getRequestRowByAsset(assetName) {
    return this.page
      .locator('tbody tr, .MuiDataGrid-row, [role="row"]')
      .filter({ hasText: assetName })
      .first();
  }

  async searchOnAssetRequestsList(term) {
    console.log(`[AssetRequestPage] Searching Asset Requests list for ${term}`);

    let isSearchInputVisible = await this.searchInput.isVisible().catch(() => false);
    if (!isSearchInputVisible) {
      const toggle = this.page
        .getByRole('button', { name: /search/i })
        .or(this.page.locator('[data-testid="SearchIcon"], svg[data-testid="SearchIcon"]'))
        .first();
      if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await toggle.click();
      }
    }

    if (await this.searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.searchInput.click().catch(() => {});
      await this.searchInput.press('Control+A').catch(() => {});
      await this.searchInput.fill(term);
      await this.searchInput.press('Tab').catch(() => {});
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    }
  }

  async findRequestRow(world) {
    const context = getContext(world);
    const { assetName } = context;
    console.log(`[AssetRequestPage] Finding asset request row for "${assetName}"`);

    await this.navigateToManageAssetsAssetRequestsTab();

    if (assetName) {
      await this.searchOnAssetRequestsList(assetName);
    }

    const row = this.getRequestRowByAsset(assetName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    return row;
  }

  async openRowActionMenu(row) {
    const menuButton = this.getRowActionButton(row);
    await expect(menuButton).toBeVisible({ timeout: this.defaultTimeout });
    await menuButton.scrollIntoViewIfNeeded().catch(() => {});
    await menuButton.click();
    await expect(this.actionMenu).toBeVisible({ timeout: 10000 });
  }

  async clickRowMenuAction(row, actionRegex) {
    console.log(`[AssetRequestPage] Clicking row menu action matching ${actionRegex}`);
    await this.openRowActionMenu(row);
    const menuItem = this.page
      .getByRole('menuitem', { name: actionRegex })
      .or(this.actionMenu.locator('[role="menuitem"]').filter({ hasText: actionRegex }))
      .or(this.actionMenu.getByText(actionRegex))
      .first();
    await expect(menuItem).toBeVisible({ timeout: this.defaultTimeout });
    await menuItem.click();
  }

  async confirmDialogIfVisible() {
    if (await this.confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(this.confirmYesButton).toBeVisible({ timeout: 10000 });
      await this.confirmYesButton.click();
    }
  }

  async approveRequestForProject(world) {
    const row = await this.findRequestRow(world);
    await this.clickRowMenuAction(row, /^approve$/i);
    await this.confirmDialogIfVisible();
    syncContextToWorld(world, { lastStatus: 'Approved' });
  }

  async declineRequestForProject(world, reason) {
    const declineReason = reason || `Automation decline reason ${Date.now()}`;
    const row = await this.findRequestRow(world);
    await this.clickRowMenuAction(row, /^decline$/i);

    if (await this.declineReasonInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.declineReasonInput.fill(declineReason);
    }

    await this.confirmDialogIfVisible();
    syncContextToWorld(world, { lastStatus: 'Declined', declineReason });
  }

  async verifyRequestStatus(world, status) {
    const context = getContext(world);
    console.log(`[AssetRequestPage] Verifying status "${status}" for asset "${context.assetName}"`);
    await this.navigateToManageAssetsAssetRequestsTab();

    if (context.assetName) {
      await this.searchOnAssetRequestsList(context.assetName);
    }

    const row = this.getRequestRowByAsset(context.assetName);
    const statusRegex = statusToRegex(status);

    await expect(row.getByText(statusRegex).first()).toBeVisible({ timeout: this.defaultTimeout });
    syncContextToWorld(world, { lastStatus: status });
  }

  async ensureRequestedAssetRequestExists(world) {
    if (world.assetRequestContext?.lastStatus === 'Requested' && world.assetRequestContext?.assetName) {
      return;
    }

    const clientAssetsPage = new ClientAssetsPage(this.page);
    await clientAssetsPage.createPendingAssetRequestFromClientAssets(world);
  }
}

module.exports = AssetRequestPage;
