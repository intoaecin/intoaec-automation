const { When, Then } = require('@cucumber/cucumber');
const RFQPage = require('../../../../../pages/admin/projects/procurement/rfq/RFQPage');

function getRfqPage(world) {
  if (!world.rfqPage) {
    world.rfqPage = new RFQPage(world.page);
  }
  return world.rfqPage;
}

When('I navigate to the RFQ module', { timeout: 180000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.navigateToRfqModule();
});

Then('I should see the RFQ page loaded', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.expectRfqPageLoaded();
});

When('I click Create RFQ', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.clickCreateRfq();
});

When('I start RFQ from scratch and proceed', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.startFromScratchAndProceed();
});

When('I fill RFQ title with {string}', { timeout: 120000 }, async function (title) {
  const rfq = getRfqPage(this);
  // Keep the exact title (e.g. "New One") — do not append unique suffixes unless {unique} is present.
  const base = String(title);
  const finalTitle = base.includes('{unique}')
    ? base.replace('{unique}', process.env.RFQ_UNIQUE_TITLE_SUFFIX || `${Date.now()}`)
    : base;
  this.lastRfqTitle = finalTitle;
  await rfq.fillRfqTitle(finalTitle);
  console.log(`[RFQ] Title set to exact value "${finalTitle}"`);
});

When('I set RFQ required by date to today', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.setRequiredByToday();
});

When('I set RFQ created on date to today', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.setCreatedOnToday();
});

When('I set RFQ created on date to a random date', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.setCreatedOnRandomDate();
  this.lastRfqCreatedOnDate = rfq.lastCreatedOnDate;
});

When('I add the first vendor in RFQ vendor panel', { timeout: 180000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.addFirstVendorFromPanel();
});

When(
  'I add RFQ line item manually with name {string} quantity {string} unit {string}',
  { timeout: 240000 },
  async function (name, quantity, unit) {
    const rfq = getRfqPage(this);
    await rfq.addLineItemManually({
      itemName: name,
      quantity,
      unitLabel: unit,
    });
  }
);

When('I create the RFQ from Action menu', { timeout: 240000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.openActionMenuAndChooseCreate();
});

Then('I should see RFQ created successfully toast', { timeout: 240000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.expectRfqCreatedToast();
});

When('I open the RFQ titled {string} on the admin RFQ list', { timeout: 180000 }, async function (title) {
  const rfq = getRfqPage(this);
  const wanted = String(this.lastRfqTitle || title || '').trim();
  this.lastRfqTitle = wanted;
  await rfq.openRfqByTitle(wanted);
});

Then('I should see the RFQ price update status on the expanded card', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.expectPriceUpdateStatusOnExpandedCard();
});

Then(
  'I should see the updated RFQ price {string} for the first line item',
  { timeout: 180000 },
  async function (price) {
    const rfq = getRfqPage(this);
    await rfq.expectUpdatedPriceVisible(price, '');
  }
);

Then(
  'I should see the updated RFQ price {string} for the line item {string}',
  { timeout: 180000 },
  async function (price, itemName) {
    const rfq = getRfqPage(this);
    await rfq.expectUpdatedPriceVisible(price, itemName);
  }
);

