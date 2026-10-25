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
  try {
    require('../../../../../support/vendor-rfq-session').setRfqTitle(finalTitle);
  } catch {
    /* optional */
  }
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
  const email = await rfq.addFirstVendorFromPanel();
  if (email) this.vendorRfqLoginEmail = email;
});

When('I add a vendor in the RFQ vendor panel', { timeout: 180000 }, async function () {
  const testData = require('../../../../../utils/testData');
  const vendorRfqSession = require('../../../../../support/vendor-rfq-session');
  const rfq = getRfqPage(this);
  const preferEmail = String(testData.vendor?.rfqUser?.email || '').trim();
  const email = await rfq.addVendorFromPanel({ preferEmail });
  this.vendorRfqLoginEmail = email || preferEmail || null;
  if (this.vendorRfqLoginEmail) vendorRfqSession.setVendorEmail(this.vendorRfqLoginEmail);
  console.log(
    `[RFQ] Selected vendor for portal login: ${this.vendorRfqLoginEmail || '(unknown — using testData fallback at login)'}`
  );
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

When(
  'I select {string} from the RFQ item category type dropdown',
  { timeout: 120000 },
  async function (category) {
    const rfq = getRfqPage(this);
    await rfq.selectItemCategoryType(category);
  }
);

When(
  'I select {int} products from the RFQ Material product dropdown',
  { timeout: 180000 },
  async function (count) {
    const rfq = getRfqPage(this);
    const selected = await rfq.selectMaterialProductsFromDropdown(count);
    this.lastRfqSelectedProducts = selected;
  }
);

When(
  'I create {int} new Material products in the RFQ cost catalog',
  { timeout: 240000 },
  async function (count) {
    const rfq = getRfqPage(this);
    this.lastRfqSelectedProducts = await rfq.createMaterialProductsInCatalog(count);
  }
);

Then(
  'I should see {int} selected products added to the RFQ',
  { timeout: 120000 },
  async function (count) {
    const rfq = getRfqPage(this);
    if (this.lastRfqSelectedProducts) {
      rfq.lastRfqSelectedProducts = this.lastRfqSelectedProducts;
    }
    await rfq.expectSelectedProductsAddedToRfq(count);
  }
);

When('I enter quantity for each selected RFQ product', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  if (this.lastRfqSelectedProducts) {
    rfq.lastRfqSelectedProducts = this.lastRfqSelectedProducts;
  }
  await rfq.enterQuantityForSelectedRfqProducts('1');
  this.lastRfqSelectedProducts = rfq.lastRfqSelectedProducts;
});

When(
  'I select unit {string} for each selected RFQ product',
  { timeout: 120000 },
  async function (unit) {
    const rfq = getRfqPage(this);
    if (this.lastRfqSelectedProducts) {
      rfq.lastRfqSelectedProducts = this.lastRfqSelectedProducts;
    }
    await rfq.selectUnitForSelectedRfqProducts(unit);
    this.lastRfqSelectedProducts = rfq.lastRfqSelectedProducts;
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
  const vendorRfqSession = require('../../../../../support/vendor-rfq-session');
  const rfq = getRfqPage(this);
  const wanted = String(title || this.lastRfqTitle || vendorRfqSession.getRfqTitle() || '').trim();
  this.lastRfqTitle = wanted;
  await rfq.openRfqByTitle(wanted);
});

Then('I should see the RFQ price update status on the expanded card', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.expectPriceUpdateStatusOnExpandedCard();
});

Then('I should see the RFQ vendor response status on the expanded card', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.expectVendorResponseStatusOnExpandedCard();
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

Then('I should see the RFQ status displayed as Declined on the admin RFQ card', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.expectDeclinedStatusOnExpandedCard();
});

Then('I should see the RFQ vendor declined response on the admin RFQ card', { timeout: 120000 }, async function () {
  const rfq = getRfqPage(this);
  await rfq.expectVendorDeclinedResponseOnExpandedCard();
});

Then('I should see the vendor comment {string} on the admin RFQ', { timeout: 120000 }, async function (comment) {
  const rfq = getRfqPage(this);
  await rfq.expectVendorCommentVisibleOnExpandedCard(comment);
});

