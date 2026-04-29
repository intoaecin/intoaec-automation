const { When, Then } = require('@cucumber/cucumber');
const RfqPreviewPage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-preview.page');

function getRfqPreviewPage(world) {
  if (!world.rfqPreviewPage) {
    world.rfqPreviewPage = new RfqPreviewPage(world.page);
  }
  return world.rfqPreviewPage;
}

When('I click the RFQ preview icon', { timeout: 240000 }, async function () {
  const rfq = getRfqPreviewPage(this);
  if (this.lastRfqTitle) {
    process.env.RFQ_PREVIEW_TITLE = this.lastRfqTitle;
  }
  await rfq.clickPreviewIconOnRfqPage();
});

Then('the RFQ preview page should load', { timeout: 240000 }, async function () {
  const rfq = getRfqPreviewPage(this);
  await rfq.expectRfqPreviewLoaded();
});

When('I close the RFQ preview page', { timeout: 240000 }, async function () {
  const rfq = getRfqPreviewPage(this);
  await rfq.closeRfqPreview();
});


