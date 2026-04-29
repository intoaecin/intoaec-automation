const { When } = require('@cucumber/cucumber');
const RfqAttachmentPage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-attachment.page');

function getRfqAttachmentPage(world) {
  if (!world.rfqAttachmentPage) {
    world.rfqAttachmentPage = new RfqAttachmentPage(world.page);
  }
  return world.rfqAttachmentPage;
}

When(
  'I add an RFQ attachment before compose',
  { timeout: 600000 },
  async function () {
    // eslint-disable-next-line no-console
    console.log(
      `[RFQ attachment][${new Date().toISOString()}] Step:start - I add an RFQ attachment before compose`
    );
    const rfq = getRfqAttachmentPage(this);
    try {
      await rfq.addRfqAttachmentBeforeCompose();
      // eslint-disable-next-line no-console
      console.log(
        `[RFQ attachment][${new Date().toISOString()}] Step:PASS - I add an RFQ attachment before compose`
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(
        `[RFQ attachment][${new Date().toISOString()}] Step:FAIL - I add an RFQ attachment before compose - ${error && error.message ? error.message : error}`
      );
      throw error;
    }
  }
);

