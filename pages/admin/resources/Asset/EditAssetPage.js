const { expect } = require('@playwright/test');
const AssetPage = require('./AssetPage');

class EditAssetPage extends AssetPage {
  constructor(page) {
    super(page);
  }

  getRowActionButton(row) {
    return row
      .getByRole('button', { name: /more|action|options|menu|edit/i })
      .or(
        row.locator(
          'button[aria-label*="more" i], button[aria-label*="action" i], button[aria-label*="menu" i], button'
        ).last()
      )
      .first();
  }

  async createAssetForEditing() {
    await this.navigateToManageAssets();
    await this.startCreateFlow();
    await this.fillAssetForm();
    await this.attachDocumentManuallyAndWait();
    await this.submitCreateForm();
    await this.verifyAssetCreatedSuccessfully();
  }

  async openEditForCreatedAsset() {
    console.log(`[EditAssetPage] Opening edit menu for ${this.assetData.name}`);
    await this.searchForAsset(this.assetData.name);

    const row = this.getAssetRow(this.assetData.name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover().catch(() => {});

    const actionButton = this.getRowActionButton(row);
    await expect(actionButton).toBeVisible({ timeout: this.defaultTimeout });
    await actionButton.click();

    await expect(this.actionMenu).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.editMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.editMenuItem.click();

    await expect(this.assetFormHeading).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.assetNameInput).toBeVisible({ timeout: this.defaultTimeout });
  }

  async editAllAssetFields() {
    this.editedAssetData = this.buildEditAssetData();
    console.log(`[EditAssetPage] Editing asset to ${this.editedAssetData.name}`);
    await this.fillAssetFields(this.editedAssetData);
  }

  async submitAssetUpdate() {
    console.log('[EditAssetPage] Submitting asset update');
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })).catch(() => {});
    await expect(this.updateButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.updateButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.updateButton.click();
  }

  async verifyAssetUpdatedSuccessfully() {
    const edited = this.editedAssetData;
    await expect(async () => {
      const toastVisible = await this.page
        .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
        .filter({ hasText: /asset|updated|saved|success/i })
        .first()
        .isVisible()
        .catch(() => false);

      await this.searchForAsset(edited.name);
      const updatedRow = this.getAssetRow(edited.name);
      const rowVisible = await updatedRow.isVisible().catch(() => false);
      const categoryVisible = rowVisible
        ? await updatedRow.getByText(edited.category, { exact: false }).first().isVisible().catch(() => false)
        : false;

      expect(toastVisible || (rowVisible && categoryVisible)).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }

  async verifyEditedValuesInForm() {
    console.log('[EditAssetPage] Verifying edited values in the asset form');
    await this.searchForAsset(this.editedAssetData.name);
    const row = this.getAssetRow(this.editedAssetData.name);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });

    const actionButton = this.getRowActionButton(row);
    await expect(actionButton).toBeVisible({ timeout: this.defaultTimeout });
    await actionButton.click();
    await expect(this.editMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.editMenuItem.click();

    await expect(this.assetNameInput).toHaveValue(this.editedAssetData.name, {
      timeout: this.defaultTimeout,
    });
    await expect(this.assetCategoryInput).toHaveValue(this.editedAssetData.category, {
      timeout: this.defaultTimeout,
    });
    await expect(this.descriptionInput).toHaveValue(this.editedAssetData.description, {
      timeout: this.defaultTimeout,
    });

    await this.scrollUntilVisible(this.unitCostInput, 'unit cost');
    await expect(this.unitCostInput).toHaveValue(this.editedAssetData.unitCost, {
      timeout: this.defaultTimeout,
    });

    await this.scrollUntilVisible(this.notesInput, 'notes');
    await expect(this.notesInput).toHaveValue(this.editedAssetData.notes, {
      timeout: this.defaultTimeout,
    });
  }
}

module.exports = EditAssetPage;
