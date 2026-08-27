const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const VendorRFQPage = require('../../../../pages/vendor/procurement/rfq/VendorRFQPage');
const VendorLoginPage = require('../../../../pages/vendor/auth/VendorLoginPage');

/** Heavy vendor RFQ list/preview after admin send. */
setDefaultTimeout(120000);

const VENDOR_RFQ_TEST_CASE_LOG = {
  TC01: 'TC-01 — Create RFQ "New One" on BBB, vendor Update Price 1000, admin verifies',
};

Before({ tags: '@vendor-rfq' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && VENDOR_RFQ_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${VENDOR_RFQ_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getVendorRfqPage(world) {
  if (!world.vendorRfqPage || world.vendorRfqPage.page !== world.page) {
    world.vendorRfqPage = new VendorRFQPage(world.page);
  }
  return world.vendorRfqPage;
}

function getVendorLoginPage(world) {
  if (!world.vendorLoginPage || world.vendorLoginPage.page !== world.page) {
    world.vendorLoginPage = new VendorLoginPage(world.page);
  }
  return world.vendorLoginPage;
}

When(
  'I sign in to the vendor portal with mobile {string} or email {string} and password {string}',
  { timeout: 180000 },
  async function (mobile, email, password) {
    const vendorLoginPage = getVendorLoginPage(this);
    await vendorLoginPage.signInWithMobileOrEmail(mobile, email, password);
  }
);

When(
  'I sign in to the vendor portal with email {string} and password {string}',
  { timeout: 180000 },
  async function (email, password) {
    const vendorLoginPage = getVendorLoginPage(this);
    await vendorLoginPage.signInWithEmail(email, password);
  }
);

When('I navigate back to the Admin Portal', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.navigateBackToAdminPortal();
});

When('I navigate to the Procurement Hub', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.navigateToProcurementHub();
});

When('I select the connected organization', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.selectConnectedOrganization();
});

When('I select the connected organization {string}', { timeout: 180000 }, async function (orgName) {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.selectConnectedOrganization(orgName);
});

When('I click the first project on the vendor procurement hub', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickFirstProjectOnHub();
});

When('I click the first project name on the vendor procurement hub', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickFirstProjectName();
});

When('I click the project name {string} on the vendor procurement hub', { timeout: 180000 }, async function (projectName) {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickProjectName(projectName);
});

When('I click RFQ on the vendor project', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickRfqOnProject();
});

When('I open the vendor RFQ overflow menu on the first RFQ', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.openFirstRfqOverflowMenu();
});

When('I open the vendor RFQ overflow menu on the first list row', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.openFirstRfqOverflowMenu();
});

When('I open the vendor RFQ overflow menu for {string}', { timeout: 180000 }, async function (title) {
  const vendorRfq = getVendorRfqPage(this);
  vendorRfq.targetRfqTitle = title;
  this.lastRfqTitle = title;
  await vendorRfq.openRfqOverflowMenuByTitle(title);
});

When('I work only on the vendor RFQ titled {string}', { timeout: 60000 }, async function (title) {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.setTargetRfqTitle(title);
  this.lastRfqTitle = title;
});

When('I click Preview from the vendor RFQ overflow menu', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickPreviewFromOverflowMenu();
});

When('I click Price Update from the vendor RFQ overflow menu', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickPriceUpdateFromOverflowMenu();
});

When('I click Update Price from the vendor RFQ overflow menu', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickUpdatePriceFromOverflowMenu();
});

When('I open price update on the vendor RFQ module', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickUpdatePriceFromOverflowMenu();
});

When('I change the vendor RFQ price to {string}', { timeout: 180000 }, async function (price) {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.changeVendorRfqPriceOnAllLineItems(price);
  this.lastVendorRfqPrice = price;
});

When('I change the first row vendor RFQ price to {string}', { timeout: 180000 }, async function (price) {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.changeVendorRfqPriceOnAllLineItems(price);
  this.lastVendorRfqPrice = price;
});

When('I click Update Price on the vendor RFQ', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickUpdatePriceOnVendorRfq();
});

Then('I should see the vendor RFQ price update success', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.expectVendorRfqPriceUpdateSuccess();
});

When('I open the first RFQ in the vendor list', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.openFirstRfqRow();
});

When('I click Preview on the vendor RFQ', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickPreview();
});

Then('I should see the RFQ details displayed correctly', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.expectRfqDetailsDisplayed(this.lastRfqTitle);
});
