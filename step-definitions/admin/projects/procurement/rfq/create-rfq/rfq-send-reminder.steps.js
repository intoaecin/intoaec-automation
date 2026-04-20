const { When, Then } = require('@cucumber/cucumber');
const RfqSendReminderPage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-send-reminder.page');

function getRfqSendReminderPage(world) {
  if (!world.rfqSendReminderPage) {
    world.rfqSendReminderPage = new RfqSendReminderPage(world.page);
  }
  return world.rfqSendReminderPage;
}

When('I wait for the created RFQ card on the list', { timeout: 240000 }, async function () {
  const rfq = getRfqSendReminderPage(this);
  console.log(
    `[RFQ send-reminder][${new Date().toISOString()}] Step: wait for created RFQ card - ${this.lastRfqTitle || 'first card'}`
  );
  await rfq.waitForCreatedRfqCardOnList(this.lastRfqTitle);
});

When(
  'I click the expand button on the created RFQ card',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqSendReminderPage(this);
    console.log(
      `[RFQ send-reminder][${new Date().toISOString()}] Step: expand created RFQ card - ${this.lastRfqTitle || 'first card'}`
    );
    await rfq.clickExpandButtonOnCreatedRfqCard(this.lastRfqTitle);
  }
);

When(
  'I open the three dot menu on the created RFQ card',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqSendReminderPage(this);
    console.log(
      `[RFQ send-reminder][${new Date().toISOString()}] Step: open three dot menu - ${this.lastRfqTitle || 'first card'}`
    );
    await rfq.openThreeDotMenuOnCreatedRfqCard(this.lastRfqTitle);
  }
);

When('I click send reminder in the RFQ card menu', { timeout: 180000 }, async function () {
  const rfq = getRfqSendReminderPage(this);
  console.log(`[RFQ send-reminder][${new Date().toISOString()}] Step: click send reminder`);
  await rfq.clickSendReminderInRfqCardMenu();
});

Then(
  'I should see the RFQ reminder compose email dialog',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqSendReminderPage(this);
    console.log(
      `[RFQ send-reminder][${new Date().toISOString()}] Step: verify reminder compose dialog`
    );
    await rfq.expectRfqReminderComposeEmailDialogReady();
  }
);

When(
  'I click send email in the RFQ reminder compose dialog',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqSendReminderPage(this);
    console.log(
      `[RFQ send-reminder][${new Date().toISOString()}] Step: click send email in reminder compose dialog`
    );
    await rfq.clickSendEmailInRfqReminderComposeDialog();
  }
);

Then('I should see the RFQ reminder email sent toast', { timeout: 180000 }, async function () {
  const rfq = getRfqSendReminderPage(this);
  console.log(
    `[RFQ send-reminder][${new Date().toISOString()}] Step: verify reminder email sent toast`
  );
  await rfq.expectRfqReminderEmailSentToast(this.lastRfqTitle);
});

