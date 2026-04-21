const { When, Then } = require('@cucumber/cucumber');
const DeleteAssetPage = require('../../../../pages/admin/resources/Asset/DeleteAssetPage');

function getDeleteAssetPage(world) {
  // Persist one page object instance so created asset data is available through delete verification.
  if (!world.deleteAssetPage) {
    world.deleteAssetPage = new DeleteAssetPage(world.page);
  }
  return world.deleteAssetPage;
}

When('I create an asset ready for deletion', { timeout: 300000 }, async function () {
  const deleteAssetPage = getDeleteAssetPage(this);
  await deleteAssetPage.createAssetForDeletion();
});

When('I open delete from the three dots menu for the created asset', { timeout: 180000 }, async function () {
  const deleteAssetPage = getDeleteAssetPage(this);
  await deleteAssetPage.openDeleteForCreatedAsset();
});

When('I fill the delete reason for the asset', { timeout: 120000 }, async function () {
  const deleteAssetPage = getDeleteAssetPage(this);
  await deleteAssetPage.fillDeleteReason();
});

When('I confirm asset deletion from the popup', { timeout: 120000 }, async function () {
  const deleteAssetPage = getDeleteAssetPage(this);
  await deleteAssetPage.confirmDelete();
});

Then('I should see the asset deleted successfully', { timeout: 120000 }, async function () {
  const deleteAssetPage = getDeleteAssetPage(this);
  await deleteAssetPage.verifyAssetDeletedSuccessfully();
});
