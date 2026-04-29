const { When, Then } = require('@cucumber/cucumber');
const RFQComposePage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-compose.page');

function getRfqComposePage(world) {
  if (!world.rfqComposePage) {
    world.rfqComposePage = new RFQComposePage(world.page);
  }
  return world.rfqComposePage;
}

When(
  'I open RFQ compose email from Action menu',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqComposePage(this);
    await rfq.openActionMenuAndComposeEmail();
  }
);

When(
  'I compose and send the RFQ email',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqComposePage(this);
    await rfq.openActionMenuAndComposeEmail();
    await rfq.sendEmailFromRfqComposeModal();
  }
);

When(
  'I send email from RFQ compose dialog',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqComposePage(this);
    await rfq.sendEmailFromRfqComposeModal();
  }
);

Then(
  'I should see RFQ compose email success toast',
  { timeout: 240000 },
  async function () {
    const rfq = getRfqComposePage(this);
    await rfq.expectRfqComposeEmailSuccessToast();
  }
);

