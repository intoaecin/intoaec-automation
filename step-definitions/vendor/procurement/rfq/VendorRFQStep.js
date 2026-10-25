const { Before, After, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const VendorRFQPage = require('../../../../pages/vendor/procurement/rfq/VendorRFQPage');
const VendorLoginPage = require('../../../../pages/vendor/auth/VendorLoginPage');
const testData = require('../../../../utils/testData');
const vendorRfqSession = require('../../../../support/vendor-rfq-session');

/** Heavy vendor RFQ list/preview after admin send. */
setDefaultTimeout(120000);

const VENDOR_RFQ_TEST_CASE_LOG = {
  TC01: 'TC-01 — Verify Admin Can Send RFQ to Accepted Vendor',
  TC02: 'TC-02 — Vendor Update Price 1000 on "New One" → Admin verify status, vendor response, price 1000',
  TC03: 'TC-03 — Vendor Declines RFQ "New One" → Declined on Vendor + Admin',
  TC04: 'TC-04 — Admin creates and sends "Vendor Comment RFQ"',
  TC05: 'TC-05 — Vendor adds comment "For Testing Process" on "Vendor Comment RFQ"',
  TC06: 'TC-06 — Admin verifies the vendor comment on "Vendor Comment RFQ"',
};

Before({ tags: '@vendor-rfq' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && VENDOR_RFQ_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${VENDOR_RFQ_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

After({ tags: '@vendor-rfq and (@TC01 or @TC04)' }, async function () {
  const url = String(this.lastVendorRfqAdminProjectUrl || '').trim();
  const name = String(this.lastAdminProjectName || '').trim();
  const vendorEmail = String(
    this.vendorRfqLoginEmail ||
      this.rfqPage?.lastAddedVendorEmail ||
      this.rfqComposePage?.lastAddedVendorEmail ||
      ''
  )
    .trim()
    .toLowerCase();
  const isAditya =
    /aditya|malick|b042a8dd-51b2-4d16-b242-405158add775/i.test(`${url} ${name}`);
  if (url && /client\/profile|projectId=/i.test(url) && !isAditya) {
    vendorRfqSession.saveAdminProject({ url, name });
    vendorRfqSession.setRfqTitle(this.lastRfqTitle || 'New One');
    if (vendorEmail) vendorRfqSession.setVendorEmail(vendorEmail);
    console.log(`[VendorRFQ] After: session persisted → ${vendorRfqSession.FILE}`);
  } else {
    console.warn(
      `[VendorRFQ] After: skip persisting session (url="${url}" name="${name}")`
    );
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
  'I login to the Vendor Portal using valid vendor credentials',
  { timeout: 180000 },
  async function () {
    const vendorLoginPage = getVendorLoginPage(this);
    const adminEmail = String(testData.admin?.validUser?.email || 'kumar@diy.in')
      .trim()
      .toLowerCase();
    const knownEmail = String(testData.vendor?.rfqUser?.email || 'praveen@yopmail.com')
      .trim()
      .toLowerCase();
    const password = String(testData.vendor?.rfqUser?.password || 'Simple@10').trim();

    // Same vendor email that was added on the RFQ and used for compose/send (TC-01 session for TC-02).
    const sessionVendorEmail = vendorRfqSession.getVendorEmail();
    const email = [
      this.vendorRfqLoginEmail,
      this.rfqPage?.lastAddedVendorEmail,
      this.rfqComposePage?.lastAddedVendorEmail,
      this.vendorYopmailEmail,
      sessionVendorEmail,
      knownEmail,
    ]
      .map((e) => String(e || '').trim().toLowerCase())
      .find((e) => e && e !== adminEmail);

    if (!email) {
      throw new Error(
        `Vendor RFQ login needs the vendor email added on the RFQ (expected ${knownEmail}). Do not use Admin.`
      );
    }
    this.vendorRfqLoginEmail = email;
    vendorRfqSession.setVendorEmail(email);
    console.log(
      `[VendorRFQ] Logging into Vendor Portal as the RFQ-added vendor: ${email}`
    );
    // Try Simple@10 first, then other known vendor passwords used in this suite.
    await vendorLoginPage.ensureAuthenticated(email, password);
  }
);

When('I navigate to the Procurement Hub', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.navigateToProcurementHub();
});

When('I select the connected organization {string}', { timeout: 180000 }, async function (orgName) {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.selectConnectedOrganization(orgName);
});

When('I click the first project name on the vendor procurement hub', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickFirstProjectName();
});

When('I click RFQ on the vendor project', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickRfqOnProject();
});

When('I work only on the vendor RFQ titled {string}', { timeout: 60000 }, async function (title) {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.setTargetRfqTitle(title);
  this.lastRfqTitle = title;
});

When('I open the vendor RFQ overflow menu for {string}', { timeout: 180000 }, async function (title) {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.setTargetRfqTitle(title);
  this.lastRfqTitle = title;
  await vendorRfq.openRfqOverflowMenuByTitle(title);
});

When('I click Update Price from the vendor RFQ overflow menu', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickUpdatePriceFromOverflowMenu();
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

When('I navigate back to the Admin Portal', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.navigateBackToAdminPortal();
});

When('I click Preview on the vendor RFQ', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickPreview({ keepOpen: true });
});

Then(
  'I should see the RFQ available in the Vendor Portal with title {string}',
  { timeout: 180000 },
  async function (title) {
    const vendorRfq = getVendorRfqPage(this);
    const wanted = String(this.lastRfqTitle || title || '').trim();
    await vendorRfq.expectRfqAvailableInVendorPortal(wanted);
  }
);

Then(
  'I should see the vendor RFQ preview contains the selected Material products with unit {string}',
  { timeout: 180000 },
  async function (unit) {
    const vendorRfq = getVendorRfqPage(this);
    const products =
      this.lastRfqSelectedProducts ||
      this.rfqPage?.lastRfqSelectedProducts ||
      [];
    await vendorRfq.expectPreviewContainsSelectedMaterials(products, unit);
  }
);

When('I click Decline RFQ from the vendor RFQ overflow menu', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickDeclineRfqFromOverflowMenu();
});

When('I confirm the Decline RFQ action if confirmation is displayed', { timeout: 120000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.confirmDeclineRfqIfPrompted();
});

Then('I should see the vendor RFQ decline success message', { timeout: 120000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.expectDeclineSuccessMessage();
});

Then(
  'I should see the RFQ status displayed as Declined in the Vendor Portal',
  { timeout: 120000 },
  async function () {
    const vendorRfq = getVendorRfqPage(this);
    await vendorRfq.expectRfqStatusDeclined();
  }
);

When('I click Add Comment from the vendor RFQ overflow menu', { timeout: 180000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.clickAddCommentFromOverflowMenu();
});

When('I enter the vendor RFQ comment {string}', { timeout: 120000 }, async function (comment) {
  const vendorRfq = getVendorRfqPage(this);
  this.lastRfqVendorComment = comment;
  await vendorRfq.enterVendorRfqComment(comment);
});

When('I submit the vendor RFQ comment', { timeout: 120000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.submitVendorRfqComment();
});

Then('I should see the vendor RFQ comment added successfully', { timeout: 120000 }, async function () {
  const vendorRfq = getVendorRfqPage(this);
  await vendorRfq.expectVendorRfqCommentAddedSuccessfully(this.lastRfqVendorComment);
});
