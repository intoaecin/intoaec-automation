const { expect } = require('@playwright/test');
const AssetPage = require('./AssetPage');

class DeleteAssetPage extends AssetPage {
  constructor(page) {
    super(page);
  }

  getRowActionButton(row) {
    return row
      .getByRole('button', { name: /more|action|options|menu|edit|delete/i })
      .or(
        row.locator(
          'button[aria-label*="more" i], button[aria-label*="action" i], button[aria-label*="menu" i], button'
        ).last()
      )
      .first();
  }

  async createAssetForDeletion() {
    await this.navigateToManageAssets();
    await this.startCreateFlow();
    await this.fillAssetForm();
    await this.attachDocumentManuallyAndWait();
    await this.submitCreateForm();
    await this.verifyAssetCreatedSuccessfully();
  }

  async openDeleteForCreatedAsset() {
    console.log(`[DeleteAssetPage] Opening delete menu for ${this.assetData.name}`);
    await this.searchForAsset(this.assetData.name);

    const row = this.getAssetRow(this.assetData.name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    const actionButton = this.getRowActionButton(row);
    await expect(actionButton).toBeVisible({ timeout: this.defaultTimeout });
    await actionButton.click();

    await expect(this.actionMenu).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.deleteMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.deleteMenuItem.click();
  }

  async fillDeleteReason() {
    this.deleteReason = `Deleting asset ${this.buildRandomSuffix()} during automation`;
    console.log('[DeleteAssetPage] Filling delete reason in confirmation popup');

    if (await this.confirmDialog.isVisible().catch(() => false)) {
      await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    }

    await expect(this.deleteReasonInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.deleteReasonInput.click().catch(() => {});
    await this.deleteReasonInput.press('Control+A').catch(() => {});
    await this.deleteReasonInput.fill(this.deleteReason);
  }

  async confirmDelete() {
    console.log('[DeleteAssetPage] Confirming asset deletion');
    await expect(this.confirmYesButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.confirmYesButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.confirmYesButton.click();
  }

  async verifyAssetDeletedSuccessfully() {
    const deletedName = this.assetData.name;
    await expect(async () => {
      const toastVisible = await this.page
        .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
        .filter({ hasText: /asset|deleted|removed|success/i })
        .first()
        .isVisible()
        .catch(() => false);

      await this.searchForAsset(deletedName);
      const deletedRowVisible = await this.getAssetRow(deletedName).isVisible().catch(() => false);
      const genericDeletedCopy = await this.page
        .getByText(/deleted|removed|successfully/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(toastVisible || genericDeletedCopy || !deletedRowVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }
}

module.exports = DeleteAssetPage;
