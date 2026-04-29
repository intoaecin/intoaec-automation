const { When, Then } = require('@cucumber/cucumber');
const RfqAddFromLibraryPage = require('../../../../../../pages/admin/projects/procurement/rfq/create-rfq/rfq-add-from-library.page');

function getRfqAddFromLibraryPage(world) {
  if (!world.rfqAddFromLibraryPage) {
    world.rfqAddFromLibraryPage = new RfqAddFromLibraryPage(world.page);
  }
  return world.rfqAddFromLibraryPage;
}

When(
  'I click add from library on the RFQ form',
  { timeout: 120000 },
  async function () {
    const rfq = getRfqAddFromLibraryPage(this);
    await rfq.clickAddFromLibraryOnRfqForm();
  }
);

Then(
  'I should see the RFQ library drawer',
  { timeout: 120000 },
  async function () {
    const rfq = getRfqAddFromLibraryPage(this);
    await rfq.expectRfqLibraryDrawerVisible();
  }
);

When(
  'I select the first two rows in the RFQ library grid',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqAddFromLibraryPage(this);
    await rfq.selectFirstTwoRowsInRfqLibraryGrid();
  }
);

When(
  'I click add in the RFQ library drawer',
  { timeout: 180000 },
  async function () {
    const rfq = getRfqAddFromLibraryPage(this);
    await rfq.clickAddInRfqLibraryDrawer();
  }
);

When(
  'I log the RFQ line item row count for diagnostics',
  { timeout: 60000 },
  async function () {
    const rfq = getRfqAddFromLibraryPage(this);
    await rfq.logRfqLineItemRowCount('manualStep');
  }
);

/**
 * One step with full logging (AGENTS.md: log page actions). Avoids duplicating compose step patterns.
 */
When(
  'I compose and send RFQ email after add from library',
  { timeout: 360000 },
  async function () {
    const rfq = getRfqAddFromLibraryPage(this);
    await rfq.composeAndSendEmailWithLibraryFlowLogs();
  }
);

Then(
  'I should see RFQ compose email success toast after library compose',
  { timeout: 120000 },
  async function () {
    // eslint-disable-next-line no-console
    console.log(
      `[RFQ add-from-library][${new Date().toISOString()}] Then:toastAssertion:start`
    );
    const rfq = getRfqAddFromLibraryPage(this);
    await rfq.expectRfqComposeEmailSuccessToast();
    // eslint-disable-next-line no-console
    console.log(
      `[RFQ add-from-library][${new Date().toISOString()}] Then:toastAssertion:PASS`
    );
  }
);

