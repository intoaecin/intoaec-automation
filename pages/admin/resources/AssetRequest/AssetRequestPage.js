const { expect } = require('@playwright/test');
const AssetPage = require('../Asset/AssetPage');
const {
  syncContextToWorld,
  getContext,
  statusToRegex,
} = require('./assetRequestTestContext');

// Lazy-require to avoid circular dependency with ClientAssetsPage ↔ AssetRequestPage
function getClientAssetsPageClass() {
  return require('../../projects/management/ClientAssets/ClientAssetsPage');
}

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
    // Fallback: tab visible and selected class / aria
    const tabSelected =
      (await this.assetRequestsTab.getAttribute('aria-selected').catch(() => null)) === 'true' ||
      /Mui-selected/i.test((await this.assetRequestsTab.getAttribute('class').catch(() => '')) || '');
    return tabSelected;
  }

  async openAssetRequestsTab() {
    console.log('[AssetRequestPage] Opening Asset Requests tab');
    await expect(this.assetRequestsTab).toBeVisible({ timeout: this.defaultTimeout });

    // Retry click until the tab is actually selected (All Assets + Asset Requests both stay in DOM)
    await expect(async () => {
      const alreadySelected =
        (await this.assetRequestsTab.getAttribute('aria-selected').catch(() => null)) === 'true';
      if (!alreadySelected) {
        await this.assetRequestsTab.click({ force: true });
        await this.page.waitForTimeout(400).catch(() => {});
      }
      const selected =
        (await this.assetRequestsTab.getAttribute('aria-selected').catch(() => null)) === 'true' ||
        /Mui-selected/i.test((await this.assetRequestsTab.getAttribute('class').catch(() => '')) || '');
      expect(selected).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async waitForAssetRequestsListReady() {
    console.log('[AssetRequestPage] Waiting for Asset Requests list');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Do NOT or() heading + tab — both are visible on Manage Assets and cause strict-mode failures.
    await expect(this.assetRequestsTab).toBeVisible({ timeout: this.defaultTimeout });
    await expect(async () => {
      const selected =
        (await this.assetRequestsTab.getAttribute('aria-selected').catch(() => null)) === 'true' ||
        /Mui-selected/i.test((await this.assetRequestsTab.getAttribute('class').catch(() => '')) || '');
      expect(selected).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });

    await expect(this.assetRequestsTable).toBeVisible({ timeout: this.defaultTimeout });
  }

  async navigateToManageAssetsAssetRequestsTab() {
    console.log('[AssetRequestPage] Navigating to Resources > Manage Assets > Asset Requests tab');

    const onManageAssets =
      (await this.addNewButton.isVisible().catch(() => false)) ||
      (await this.assetRequestsTab.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await this.allAssetListHeading.isVisible({ timeout: 2000 }).catch(() => false));

    if (!onManageAssets) {
      await this.navigateToManageAssets();
    }

    if (!(await this.isOnAssetRequestsTab())) {
      await this.openAssetRequestsTab();
    }

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
    // Must use page ExpandableSearch ("Search for Assets"), never header global search
    console.log(`[AssetRequestPage] Searching Asset Requests list for ${term} (page search only)`);
    await this.searchForAsset(term);
  }

  async findRequestRow(world) {
    const context = getContext(world);
    const { assetName } = context;
    console.log(`[AssetRequestPage] Finding asset request row for "${assetName}"`);

    // Skip full re-navigation when already on Asset Requests (previous step often just opened it)
    if (!(await this.isOnAssetRequestsTab())) {
      await this.navigateToManageAssetsAssetRequestsTab();
    } else {
      await this.waitForAssetRequestsListReady();
    }

    if (assetName) {
      await this.searchOnAssetRequestsList(assetName);
    }

    const row = this.getRequestRowByAsset(assetName);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    return row;
  }

  async openRowActionMenu(row) {
    await row.hover().catch(() => {});
    const menuButton = this.getRowActionButton(row);
    await expect(menuButton).toBeVisible({ timeout: 30000 });
    await menuButton.scrollIntoViewIfNeeded().catch(() => {});
    await menuButton.click({ force: true });
    await expect(this.actionMenu).toBeVisible({ timeout: 15000 });
  }

  async clickRowMenuAction(row, actionRegex) {
    console.log(`[AssetRequestPage] Clicking row menu action matching ${actionRegex}`);
    await this.openRowActionMenu(row);
    const menuItem = this.page
      .getByRole('menuitem', { name: actionRegex })
      .or(this.actionMenu.locator('[role="menuitem"]').filter({ hasText: actionRegex }))
      .or(this.actionMenu.locator('li, div, span, button').filter({ hasText: actionRegex }))
      .or(this.page.locator('[role="menu"] >> text=/approve|decline|return/i').filter({ hasText: actionRegex }))
      .first();
    await expect(menuItem).toBeVisible({ timeout: 30000 });
    await menuItem.click({ force: true });
  }

  async confirmDialogIfVisible() {
    if (await this.confirmDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(this.confirmYesButton).toBeVisible({ timeout: 10000 });
      await this.confirmYesButton.click();
    }
  }

  async approveRequestForProject(world) {
    const row = await this.findRequestRow(world);
    await this.clickRowMenuAction(row, /approve/i);
    await this.confirmDialogIfVisible();
    // UI maps Approve → IN_TRANSIT
    syncContextToWorld(world, { lastStatus: 'IN_TRANSIT' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async declineRequestForProject(world, reason) {
    const declineReason = reason || `Automation decline reason ${Date.now()}`;
    const row = await this.findRequestRow(world);
    await this.clickRowMenuAction(row, /^decline$/i);

    if (await this.declineReasonInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.declineReasonInput.fill(declineReason);
    }

    await this.confirmDialogIfVisible();
    syncContextToWorld(world, { lastStatus: 'DECLINED', declineReason });
  }

  async declineRequestWithoutReason(world) {
    const row = await this.findRequestRow(world);
    await this.clickRowMenuAction(row, /^decline$/i);
    // Leave reason empty and attempt confirm — UI should block / toast
    if (await this.confirmYesButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.confirmYesButton.click();
    }
    const toastOrStillOpen = await this.page
      .getByText(/reason|mandatory|required/i)
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    const dialogStillOpen = await this.confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);
    expect(toastOrStillOpen || dialogStillOpen).toBeTruthy();
  }

  async requestReturnForProject(world) {
    const row = await this.findRequestRow(world);
    await this.clickRowMenuAction(row, /request\s*return/i);
    await this.confirmDialogIfVisible();
    syncContextToWorld(world, { lastStatus: 'RETURN_REQUESTED' });
  }

  async markReturnedForProject(world) {
    const row = await this.findRequestRow(world);
    await this.clickRowMenuAction(row, /mark\s*as\s*return|mark\s*returned/i);
    await this.confirmDialogIfVisible();
    syncContextToWorld(world, { lastStatus: 'RETURNED' });
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

    await expect(async () => {
      const statusVisible = await row.getByText(statusRegex).first().isVisible().catch(() => false);
      const pageStatusVisible = await this.page.getByText(statusRegex).first().isVisible().catch(() => false);
      expect(statusVisible || pageStatusVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 4000] });

    syncContextToWorld(world, { lastStatus: status });
  }

  async ensureRequestedAssetRequestExists(world) {
    if (world.assetRequestContext?.lastStatus === 'Requested' && world.assetRequestContext?.assetName) {
      return;
    }

    const ClientAssetsPage = getClientAssetsPageClass();
    const clientAssetsPage = new ClientAssetsPage(this.page);
    await clientAssetsPage.createPendingAssetRequestFromClientAssets(world);
  }

  /**
   * Builds an issued request: project request → admin approve → project receive.
   * Leaves world.assetRequestContext with lastStatus reflecting receive outcome.
   */
  async ensureIssuedAssetRequestExists(world) {
    const context = getContext(world);
    if (/issued|direct.?issue/i.test(String(context.lastStatus || '')) && context.assetName) {
      return;
    }

    await this.ensureRequestedAssetRequestExists(world);
    await this.approveRequestForProject(world);
    await this.verifyRequestStatus(world, 'IN_TRANSIT');

    const ClientAssetsPage = getClientAssetsPageClass();
    const clientAssetsPage = new ClientAssetsPage(this.page);
    await clientAssetsPage.navigateToClientAssets(world);
    await clientAssetsPage.receiveAssetRequest(world);
  }

  /**
   * Builds return-requested state: issued → admin Request Return.
   */
  async ensureReturnRequestedExists(world) {
    const context = getContext(world);
    if (/return.?requested/i.test(String(context.lastStatus || '')) && context.assetName) {
      return;
    }

    await this.ensureIssuedAssetRequestExists(world);
    await this.requestReturnForProject(world);
  }
}

module.exports = AssetRequestPage;
