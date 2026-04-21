const { When, Then } = require('@cucumber/cucumber');
const EditAssetPage = require('../../../../pages/admin/resources/Asset/EditAssetPage');

function getEditAssetPage(world) {
  // Keep one edit page object instance for the full scenario so created/edited data can be reused.
  if (!world.editAssetPage) {
    world.editAssetPage = new EditAssetPage(world.page);
  }
  return world.editAssetPage;
}

When('I create an asset ready for editing', { timeout: 300000 }, async function () {
  const editAssetPage = getEditAssetPage(this);
  await editAssetPage.createAssetForEditing();
});

When('I open edit from the three dots menu for the created asset', { timeout: 180000 }, async function () {
  const editAssetPage = getEditAssetPage(this);
  await editAssetPage.openEditForCreatedAsset();
});

When('I edit all asset fields with valid values', { timeout: 180000 }, async function () {
  const editAssetPage = getEditAssetPage(this);
  await editAssetPage.editAllAssetFields();
});

When(
  'I attach the edited asset document manually and press Enter to continue',
  { timeout: 300000 },
  async function () {
    const editAssetPage = getEditAssetPage(this);
    await editAssetPage.attachDocumentManuallyAndWait();
  }
);

When('I submit the asset update form', { timeout: 120000 }, async function () {
  const editAssetPage = getEditAssetPage(this);
  await editAssetPage.submitAssetUpdate();
});

Then('I should see the asset updated successfully', { timeout: 120000 }, async function () {
  const editAssetPage = getEditAssetPage(this);
  await editAssetPage.verifyAssetUpdatedSuccessfully();
});

Then('I should see all edited asset values saved correctly', { timeout: 180000 }, async function () {
  const editAssetPage = getEditAssetPage(this);
  await editAssetPage.verifyEditedValuesInForm();
});
