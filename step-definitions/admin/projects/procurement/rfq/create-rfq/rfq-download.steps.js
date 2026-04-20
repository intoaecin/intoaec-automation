const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const RfqDownloadPage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-download.page');

function getRfqDownloadPage(world) {
  if (!world.rfqDownloadPage) {
    world.rfqDownloadPage = new RfqDownloadPage(world.page);
  }
  return world.rfqDownloadPage;
}

When('I click the RFQ download icon', { timeout: 240000 }, async function () {
  const rfq = getRfqDownloadPage(this);
  const filename = await rfq.clickRfqDownloadIconAndWaitForDownload();
  this.rfqDownloadedFilename = filename;
});

Then('the RFQ should be downloaded', { timeout: 120000 }, async function () {
  expect(
    this.rfqDownloadedFilename,
    'Missing downloaded filename (download did not start).'
  ).toBeTruthy();
});


