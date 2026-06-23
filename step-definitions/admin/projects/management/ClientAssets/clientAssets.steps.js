const { When } = require('@cucumber/cucumber');
const ClientAssetsPage = require('../../../../../pages/admin/projects/management/ClientAssets/ClientAssetsPage');

function getClientAssetsPage(world) {
  if (!world.clientAssetsPage) {
    world.clientAssetsPage = new ClientAssetsPage(world.page);
  }
  return world.clientAssetsPage;
}

When('I navigate to the project Client Assets module', { timeout: 120000 }, async function () {
  const clientAssetsPage = getClientAssetsPage(this);
  await clientAssetsPage.navigateToClientAssets(this);
});

When('I wait for the client assets module to load', { timeout: 120000 }, async function () {
  const clientAssetsPage = getClientAssetsPage(this);
  await clientAssetsPage.waitForModuleReady(this);
});

When('I click Request Asset', { timeout: 120000 }, async function () {
  const clientAssetsPage = getClientAssetsPage(this);
  await clientAssetsPage.openRequestAssetDialog();
});

When('I select the first listed asset and click Select Asset', { timeout: 120000 }, async function () {
  const clientAssetsPage = getClientAssetsPage(this);
  await clientAssetsPage.selectFirstListedAssetAndProceed(this);
});

When('I enter requested quantity and approximate return time for the asset request', { timeout: 120000 }, async function () {
  const clientAssetsPage = getClientAssetsPage(this);
  await clientAssetsPage.enterRequestedQuantityAndReturnTime(this);
});

When('I submit the asset request', { timeout: 120000 }, async function () {
  const clientAssetsPage = getClientAssetsPage(this);
  await clientAssetsPage.submitAssetRequest(this);
});
