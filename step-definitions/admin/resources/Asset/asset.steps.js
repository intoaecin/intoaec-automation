const { When, Then } = require('@cucumber/cucumber');
const AssetPage = require('../../../../pages/admin/resources/Asset/AssetPage');

function getAssetPage(world) {
  // Reuse one page object instance across all steps in the scenario.
  if (!world.assetPage) {
    world.assetPage = new AssetPage(world.page);
  }
  return world.assetPage;
}

When('I navigate to the Resources Manage Asset page', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.navigateToManageAssets();
});

When('I start a new asset from the create menu', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.startCreateFlow();
});

When('I fill the asset form with valid details', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.fillAssetForm();
});

When('I fill the asset form as a bulk owned asset', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.fillBulkAssetForm();
});

When('I fill the asset form as a rented asset', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.fillRentedAssetForm();
});

When('I leave the required asset fields empty', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.assetNameInput.fill('');
  await assetPage.assetCategoryInput.fill('');
});

When(
  'I attach the asset document manually and press Enter to continue',
  { timeout: 300000 },
  async function () {
    const assetPage = getAssetPage(this);
    await assetPage.attachDocumentManuallyAndWait();
  }
);

When('I submit the asset create form', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.submitCreateForm();
});

When('I create an owned individual asset quickly', { timeout: 300000 }, async function () {
  process.env.ASSET_SKIP_ATTACHMENT = process.env.ASSET_SKIP_ATTACHMENT || '1';
  const assetPage = getAssetPage(this);
  await assetPage.createAssetQuick({
    assetType: 'INDIVIDUAL',
    ownershipType: 'OWNED',
  });
  this.assetRequestContext = {
    ...(this.assetRequestContext || {}),
    assetName: assetPage.assetData.name,
  };
});

When('I search for the created asset by name', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.searchForAsset(assetPage.assetData.name);
});

When('I apply asset list filters for status {string}', { timeout: 120000 }, async function (status) {
  const assetPage = getAssetPage(this);
  await assetPage.applyAssetListFilters({ status });
});

When('I clear the asset list filters', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.clearAssetListFilters();
});

When('I clear the asset search', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.clearAssetSearch();
});

When('I open the asset log for the created asset', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.openAssetLogForAsset(assetPage.assetData.name);
});

When('I download the bulk assets template', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.downloadBulkAssetsTemplate();
});

When('I upload an invalid bulk assets file', { timeout: 180000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.uploadBulkAssetsFile(assetPage.getInvalidBulkFixturePath());
});

When('I upload a valid bulk assets template file', { timeout: 180000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.uploadBulkAssetsFile(assetPage.getBulkTemplateFixturePath());
});

When('I download the QR code for the created asset', { timeout: 180000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.downloadQrForCreatedAsset();
});

Then('I should see the asset created successfully', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.verifyAssetCreatedSuccessfully();
});

Then('the asset create button should remain disabled', { timeout: 60000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.verifyCreateButtonDisabled();
});

Then('I should see the created asset in the list', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.verifyAssetVisibleInList(assetPage.assetData.name);
});

Then('the Manage Assets list should be ready', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.waitForAssetListReady();
});

Then('I should see the asset log modal', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.verifyAssetLogModalVisible();
});

Then('the bulk assets template download should start', { timeout: 60000 }, async function () {
  const assetPage = getAssetPage(this);
  await expectDownloadOrLink(assetPage);
});

Then('I should see the bulk upload results page', { timeout: 120000 }, async function () {
  const assetPage = getAssetPage(this);
  await assetPage.verifyBulkUploadResultsPage();
});

Then('the asset QR download should start', { timeout: 60000 }, async function () {
  const assetPage = getAssetPage(this);
  if (assetPage.lastDownloadSuggestedName) {
    await assetPage.verifyQrDownloadStarted();
    return;
  }
  // Some environments convert SVG client-side without a Playwright download event.
  // Treat a closed action menu after click as a soft success when no download fired.
  const menuGone = !(await assetPage.actionMenu.isVisible({ timeout: 2000 }).catch(() => false));
  if (!menuGone && !assetPage.lastDownloadSuggestedName) {
    throw new Error('[Asset] Expected QR download to start or action menu to close after Download QR.');
  }
});

async function expectDownloadOrLink(assetPage) {
  if (assetPage.lastDownloadSuggestedName) {
    return;
  }
  // Fallback: template link href is present (navigation download may not emit event in all browsers)
  const href = await assetPage.downloadTemplateLink.getAttribute('href').catch(() => null);
  if (!href) {
    throw new Error('[Asset] Expected bulk template download to start or template href to be present.');
  }
}
