const { Given, When, Then } = require('@cucumber/cucumber');
const AssetRequestPage = require('../../../../pages/admin/resources/AssetRequest/AssetRequestPage');
const ClientAssetsPage = require('../../../../pages/admin/projects/management/ClientAssets/ClientAssetsPage');

function getAssetRequestPage(world) {
  if (!world.assetRequestPage) {
    world.assetRequestPage = new AssetRequestPage(world.page);
  }
  return world.assetRequestPage;
}

function getClientAssetsPage(world) {
  if (!world.clientAssetsPage) {
    world.clientAssetsPage = new ClientAssetsPage(world.page);
  }
  return world.clientAssetsPage;
}

async function verifyAssetRequestStatus(world, status) {
  const clientAssetsPage = getClientAssetsPage(world);
  if (await clientAssetsPage.isOnClientAssetsModule()) {
    await clientAssetsPage.verifyRequestStatus(world, status);
    return;
  }
  const assetRequestPage = getAssetRequestPage(world);
  await assetRequestPage.verifyRequestStatus(world, status);
}

Given('a requested asset exists from a project', { timeout: 360000 }, async function () {
  const assetRequestPage = getAssetRequestPage(this);
  await assetRequestPage.ensureRequestedAssetRequestExists(this);
});

Given('a pending asset request exists from a project', { timeout: 360000 }, async function () {
  const assetRequestPage = getAssetRequestPage(this);
  await assetRequestPage.ensureRequestedAssetRequestExists(this);
});

When('I navigate to Resources Manage Assets Asset Requests tab', { timeout: 120000 }, async function () {
  const assetRequestPage = getAssetRequestPage(this);
  await assetRequestPage.navigateToManageAssetsAssetRequestsTab();
});

When('I navigate to the Resources Asset Requests page', { timeout: 120000 }, async function () {
  const assetRequestPage = getAssetRequestPage(this);
  await assetRequestPage.navigateToManageAssetsAssetRequestsTab();
});

When('I approve the asset request from the three dots menu', { timeout: 120000 }, async function () {
  const assetRequestPage = getAssetRequestPage(this);
  await assetRequestPage.approveRequestForProject(this);
});

When('I approve the pending asset request from the project row menu', { timeout: 120000 }, async function () {
  const assetRequestPage = getAssetRequestPage(this);
  await assetRequestPage.approveRequestForProject(this);
});

When('I decline the asset request from the three dots menu with reason {string}', { timeout: 120000 }, async function (reason) {
  const assetRequestPage = getAssetRequestPage(this);
  await assetRequestPage.declineRequestForProject(this, reason);
});

When(
  'I decline the pending asset request from the project row menu with reason {string}',
  { timeout: 120000 },
  async function (reason) {
    const assetRequestPage = getAssetRequestPage(this);
    await assetRequestPage.declineRequestForProject(this, reason);
  }
);

Then('I should see the asset request status as {string}', { timeout: 120000 }, async function (status) {
  await verifyAssetRequestStatus(this, status);
});
