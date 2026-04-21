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
  // Step delegates navigation details to the page object.
  const assetPage = getAssetPage(this);
  await assetPage.navigateToManageAssets();
});

When('I start a new asset from the create menu', { timeout: 120000 }, async function () {
  // Opens the asset creation flow from the Manage Assets screen.
  const assetPage = getAssetPage(this);
  await assetPage.startCreateFlow();
});

When('I fill the asset form with valid details', { timeout: 120000 }, async function () {
  // Populates all mandatory and requested fields with generated test data.
  const assetPage = getAssetPage(this);
  await assetPage.fillAssetForm();
});

When(
  'I attach the asset document manually and press Enter to continue',
  { timeout: 300000 },
  async function () {
    // Keeps the scenario paused until the manual upload is completed by the user.
    const assetPage = getAssetPage(this);
    await assetPage.attachDocumentManuallyAndWait();
  }
);

When('I submit the asset create form', { timeout: 120000 }, async function () {
  // Triggers the final create action on the form.
  const assetPage = getAssetPage(this);
  await assetPage.submitCreateForm();
});

Then('I should see the asset created successfully', { timeout: 120000 }, async function () {
  // Verifies the create action using whichever success indicator the UI exposes.
  const assetPage = getAssetPage(this);
  await assetPage.verifyAssetCreatedSuccessfully();
});
