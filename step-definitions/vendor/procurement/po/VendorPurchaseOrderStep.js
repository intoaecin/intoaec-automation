const { Before, After, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const VendorPurchaseOrderPage = require('../../../../pages/vendor/procurement/po/VendorPurchaseOrderPage');
const VendorLoginPage = require('../../../../pages/vendor/auth/VendorLoginPage');
const testData = require('../../../../utils/testData');
const vendorPoSession = require('../../../../support/vendor-po-session');

setDefaultTimeout(120000);

const VENDOR_PO_TEST_CASE_LOG = {
  TC01: 'TC-01 — Admin create/send PO "New PO 1" (session saved for TC-02/TC-03/TC-04/TC-05/TC-06)',
  TC02: 'TC-02 — Same PO from TC-01 → Vendor Portal → 3-dots → Preview → verify',
  TC03: 'TC-03 — Vendor Portal Preview → Accept PO → Admin status Accepted',
  TC04: 'TC-04 — Vendor Portal Preview → Decline P.O → status Declined',
  TC05: 'TC-05 — Vendor Portal Preview → Add Comment "For Testing Process"',
  TC06: 'TC-06 — Vendor Add Comment → Admin verifies "For Testing Process"',
};

Before({ tags: '@purchase-order-tc' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && VENDOR_PO_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${VENDOR_PO_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
  if (tc && /^(TC02|TC03|TC04|TC05|TC06)$/i.test(tc)) {
    vendorPoSession.applyToWorld(this);
  }
});

After({ tags: '@purchase-order-tc and @TC01' }, async function () {
  vendorPoSession.saveFromWorld(this);
});

function getVendorPoPage(world) {
  if (!world.vendorPurchaseOrderPage || world.vendorPurchaseOrderPage.page !== world.page) {
    world.vendorPurchaseOrderPage = new VendorPurchaseOrderPage(world.page);
  }
  return world.vendorPurchaseOrderPage;
}

function getVendorLoginPage(world) {
  if (!world.vendorLoginPage || world.vendorLoginPage.page !== world.page) {
    world.vendorLoginPage = new VendorLoginPage(world.page);
  }
  return world.vendorLoginPage;
}

When(
  'I login to the Vendor Portal using the Purchase Order vendor credentials',
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

    let sessionRfqVendor = '';
    try {
      sessionRfqVendor = require('../../../../support/vendor-rfq-session').getVendorEmail();
    } catch {
      /* optional */
    }

    // Same vendor email that was added on the PO (or RFQ session), like Vendor RFQ login.
    const email = [
      this.vendorYopmailEmail,
      this.vendorRfqLoginEmail,
      this.purchaseOrderCreatePoPage?.lastAddedVendorEmail,
      vendorPoSession.getVendorEmail(),
      sessionRfqVendor,
      knownEmail,
    ]
      .map((e) => String(e || '').trim().toLowerCase())
      .find((e) => e && e !== adminEmail);

    if (!email) {
      throw new Error(
        `Vendor PO login needs the vendor email added on the PO (expected ${knownEmail}). Do not use Admin.`
      );
    }
    this.vendorRfqLoginEmail = email;
    this.vendorYopmailEmail = email;
    console.log(`[VendorPO] Logging into Vendor Portal as the PO-added vendor: ${email}`);
    await vendorLoginPage.ensureAuthenticated(email, password);
  }
);

When(
  'I open the vendor procurement project associated with the Purchase Order',
  { timeout: 180000 },
  async function () {
    const vendorPo = getVendorPoPage(this);
    const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
    await vendorPo.openAdityaProjectWithPurchaseOrder(wanted);
  }
);

When(
  'I open a vendor Aditya Constructions project that has Purchase Order {string}',
  { timeout: 240000 },
  async function (title) {
    const vendorPo = getVendorPoPage(this);
    const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || title || 'New PO 1').trim();
    const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
    this.lastPoTitle = wanted;
    if (poNumber) {
      this.lastPoNumber = poNumber;
      vendorPo.setTargetPoNumber(poNumber);
    }
    await vendorPo.openAdityaProjectWithPurchaseOrder(wanted);
  }
);

When(
  'I open a vendor Aditya Constructions project that has the Purchase Order from TC-01',
  { timeout: 240000 },
  async function () {
    const vendorPo = getVendorPoPage(this);
    const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
    const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
    this.lastPoTitle = wanted;
    if (poNumber) {
      this.lastPoNumber = poNumber;
      vendorPo.setTargetPoNumber(poNumber);
    }
    console.log(
      `[VendorPO] Scanning kumar projects for PO ${poNumber || 'latest PO######'} (title hint "${wanted}")`
    );
    await vendorPo.openAdityaProjectWithPurchaseOrder(wanted);
  }
);

When('I click Purchase Order on the vendor project', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  await vendorPo.clickPurchaseOrderOnProject();
});

When('I work only on the vendor Purchase Order titled {string}', { timeout: 60000 }, async function (title) {
  const vendorPo = getVendorPoPage(this);
  const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || title || 'New PO 1').trim();
  await vendorPo.setTargetPoTitle(wanted);
  this.lastPoTitle = wanted;
  const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) {
    this.lastPoNumber = poNumber;
    vendorPo.setTargetPoNumber(poNumber);
  }
});

When('I click the vendor Purchase Order titled {string}', { timeout: 180000 }, async function (title) {
  const vendorPo = getVendorPoPage(this);
  const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || title || 'New PO 1').trim();
  const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
  await vendorPo.setTargetPoTitle(wanted);
  this.lastPoTitle = wanted;
  if (poNumber) {
    this.lastPoNumber = poNumber;
    vendorPo.setTargetPoNumber(poNumber);
  }
  await vendorPo.clickVendorPoByTitle(wanted);
});

When('I click the vendor Purchase Order by its PO number', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
  const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
  await vendorPo.setTargetPoTitle(wanted);
  this.lastPoTitle = wanted;
  if (poNumber) {
    this.lastPoNumber = poNumber;
    vendorPo.setTargetPoNumber(poNumber);
  }
  console.log(`[VendorPO] Clicking PO by number ${poNumber || '(latest PO######)'}`);
  await vendorPo.clickVendorPoByNumber(poNumber);
});

When('I click the most recently received vendor Purchase Order', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
  await vendorPo.setTargetPoTitle(wanted);
  this.lastPoTitle = wanted;
  // Prefer recently received list order / highest PO###### over a stale/bad saved number.
  vendorPo.setTargetPoNumber('');
  console.log('[VendorPO] Clicking most recently received vendor PO (PO######)');
  await vendorPo.clickMostRecentlyReceivedPo();
  if (vendorPo.targetPoNumber) {
    this.lastPoNumber = vendorPo.targetPoNumber;
  }
});

When(
  'I open the vendor Purchase Order overflow menu for {string}',
  { timeout: 180000 },
  async function (title) {
    const vendorPo = getVendorPoPage(this);
    const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || title || 'New PO 1').trim();
    const poNumber = String(this.lastPoNumber || vendorPo.targetPoNumber || vendorPoSession.getPoNumber() || '').trim();
    await vendorPo.setTargetPoTitle(wanted);
    this.lastPoTitle = wanted;
    if (poNumber) {
      this.lastPoNumber = poNumber;
      vendorPo.setTargetPoNumber(poNumber);
    }
    await vendorPo.openPoOverflowMenuByTitle(wanted);
  }
);

When('I open the vendor Purchase Order overflow menu by its PO number', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
  const poNumber = String(this.lastPoNumber || vendorPo.targetPoNumber || vendorPoSession.getPoNumber() || '').trim();
  await vendorPo.setTargetPoTitle(wanted);
  this.lastPoTitle = wanted;
  if (poNumber) {
    this.lastPoNumber = poNumber;
    vendorPo.setTargetPoNumber(poNumber);
  } else {
    vendorPo.setTargetPoNumber('');
  }
  console.log(`[VendorPO] Opening 3-dots for PO ${poNumber || '(most recently received PO######)'}`);
  await vendorPo.openPoOverflowMenuByTitle(wanted);
});

When('I click Preview from the vendor Purchase Order overflow menu', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) vendorPo.setTargetPoNumber(poNumber);
  await vendorPo.clickPreviewFromOverflowMenuOnly();
});

When('I click Preview on the vendor Purchase Order', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) vendorPo.setTargetPoNumber(poNumber);
  await vendorPo.clickPreviewOnVendorPo({ keepOpen: true });
});

Then(
  'I should see the Purchase Order preview displayed for {string}',
  { timeout: 180000 },
  async function (title) {
    const vendorPo = getVendorPoPage(this);
    const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
    if (poNumber) vendorPo.setTargetPoNumber(poNumber);
    await vendorPo.expectPoPreviewDisplayed(this.lastPoTitle || title);
  }
);

Then(
  'I should see the Purchase Order preview displayed for the PO from TC-01',
  { timeout: 180000 },
  async function () {
    const vendorPo = getVendorPoPage(this);
    const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
    if (poNumber) vendorPo.setTargetPoNumber(poNumber);
    await vendorPo.expectPoPreviewDisplayed(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1');
  }
);

Then('I should see the vendor details on the Purchase Order preview', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  const hint =
    this.vendorYopmailEmail ||
    this.vendorRfqLoginEmail ||
    vendorPoSession.getVendorEmail() ||
    testData.vendor?.rfqUser?.email ||
    '';
  await vendorPo.expectVendorDetailsOnPreview(hint);
});

Then('I should see the Purchase Order items on the vendor preview', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  const products =
    this.lastPoSelectedProducts ||
    this.purchaseOrderCreatePoPage?.lastPoSelectedProducts ||
    vendorPoSession.getProducts() ||
    [];
  await vendorPo.expectPoItemsOnPreview(products);
});

Then(
  'I should see quantities 1, 2 and 3 on the Purchase Order vendor preview',
  { timeout: 120000 },
  async function () {
    const vendorPo = getVendorPoPage(this);
    await vendorPo.expectQuantitiesOnPreview(['1', '2', '3']);
  }
);

Then(
  'I should see unit {string} for each item on the Purchase Order vendor preview',
  { timeout: 120000 },
  async function (unit) {
    const vendorPo = getVendorPoPage(this);
    await vendorPo.expectUnitsOnPreview(unit);
  }
);

Then(
  'I should see the price or amount for each item on the Purchase Order vendor preview',
  { timeout: 120000 },
  async function () {
    const vendorPo = getVendorPoPage(this);
    await vendorPo.expectPricesOnPreview([]);
  }
);

Then(
  'I should see the total amount on the Purchase Order vendor preview',
  { timeout: 120000 },
  async function () {
    const vendorPo = getVendorPoPage(this);
    await vendorPo.expectTotalAmountOnPreview();
  }
);

When('I click Preview for the required vendor Purchase Order', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  const wanted = String(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
  await vendorPo.setTargetPoTitle(wanted);
  this.lastPoTitle = wanted;
  const poNumber = String(this.lastPoNumber || vendorPoSession.getPoNumber() || '').trim();
  vendorPo.setTargetPoNumber(poNumber);
  console.log(`[VendorPO] Preview for required PO ${vendorPo.targetPoNumber || '(most recently received)'}`);
  await vendorPo.clickPreviewForRequiredPo();
  if (vendorPo.targetPoNumber) this.lastPoNumber = vendorPo.targetPoNumber;
});

When('I select a vendor Purchase Order with status {string}', { timeout: 180000 }, async function (status) {
  const vendorPo = getVendorPoPage(this);
  const wantedStatus = String(status || 'Received').trim();
  console.log(`[VendorPO] TC-04 — selecting PO with status "${wantedStatus}" (not Accepted)`);
  await vendorPo.selectPoWithStatus(wantedStatus);
  if (vendorPo.targetPoNumber) {
    this.lastPoNumber = vendorPo.targetPoNumber;
    this.lastPoTitle = vendorPo.targetPoNumber;
  }
});

When('I click Preview for the selected vendor Purchase Order', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoNumber) vendorPo.setTargetPoNumber(this.lastPoNumber);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  await vendorPo.clickPreviewForSelectedPo();
  if (vendorPo.targetPoNumber) this.lastPoNumber = vendorPo.targetPoNumber;
});

Then('I should see the Purchase Order preview displayed for the selected PO', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoNumber) vendorPo.setTargetPoNumber(this.lastPoNumber);
  await vendorPo.expectSelectedPoPreviewDisplayed();
});

When('I click Accept PO on the vendor Purchase Order preview', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  const poNumber = String(this.lastPoNumber || vendorPo.targetPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) {
    this.lastPoNumber = poNumber;
    vendorPo.setTargetPoNumber(poNumber);
  }
  await vendorPo.clickAcceptPoOnPreview();
});

When('I click Accept PO from the vendor Purchase Order overflow menu', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  const poNumber = String(this.lastPoNumber || vendorPo.targetPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) {
    this.lastPoNumber = poNumber;
    vendorPo.setTargetPoNumber(poNumber);
  }
  await vendorPo.clickAcceptPoFromOverflowMenu();
});

When('I confirm the Accept PO action if confirmation is displayed', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  await vendorPo.confirmAcceptPoIfDisplayed();
});

Then('I should see the Purchase Order acceptance success message', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  await vendorPo.expectAcceptPoSuccessMessage();
});

Then('I should see the Purchase Order status displayed as Accepted', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  const poNumber = String(this.lastPoNumber || vendorPo.targetPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) vendorPo.setTargetPoNumber(poNumber);
  await vendorPo.expectPoStatusAccepted();
});

When(
  'I switch to the Admin Portal Purchase Order list for the accepted PO',
  { timeout: 180000 },
  async function () {
    const env = require('../../../../config/env');
    const adminBase = String(env.admin || env.app || 'https://app.aecplayhouse.com').replace(/\/$/, '');
    const projectUrl = String(
      this.lastVendorPoAdminProjectUrl || vendorPoSession.getAdminProjectUrl() || ''
    ).trim();
    const projectName = String(
      this.lastAdminProjectName || vendorPoSession.getAdminProjectName() || ''
    ).trim();

    // Prefer navigating the shared browser page back to Admin (same tab after vendor login).
    let target = projectUrl;
    if (target && !/app\.aecplayhouse|admin/i.test(target) && /client\/profile/i.test(target)) {
      // keep as-is
    }
    if (!target || !/client\/profile|projectId=/i.test(target)) {
      target = `${adminBase}/dashboard`;
    } else if (/vendor\.aecplayhouse/i.test(target)) {
      target = `${adminBase}/dashboard`;
    }

    // Force PO sub-tab when we have a client profile URL.
    if (/client\/profile/i.test(target)) {
      const u = new URL(target);
      u.searchParams.set('tab', 'RFQAndPO');
      u.searchParams.set('subTab', 'PO');
      target = u.toString();
    }

    console.log(
      `[VendorPO] Switching to Admin PO list for accepted PO (project="${projectName || '(session)'}"): ${target}`
    );
    await this.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await this.page.waitForTimeout(1500).catch(() => {});

    // If we only landed on dashboard, open the saved project name.
    if (!/client\/profile|subTab=PO/i.test(this.page.url()) && projectName && !/^available project$/i.test(projectName)) {
      const ProjectNavigationPage = require('../../../../pages/admin/projects/ProjectNavigationPage');
      const ProjectProfilePage = require('../../../../pages/admin/projects/ProjectProfilePage');
      const nav = new ProjectNavigationPage(this.page);
      await nav.clickProjectByName(projectName).catch(async () => {
        await nav.clickAvailableProjectSkipping({
          skipNames: ['Dev-Inprogress', 'Dont touch', 'BBB', 'AEC Solutions'],
          preferNames: [projectName, 'malick', 'ZAYAN'],
        });
      });
      const profile = new ProjectProfilePage(this.page);
      await profile.selectHeading('Procurement');
      await profile.clickModuleCard('Purchase Order');
    }

    const PurchaseOrderCreatePoPage = require('../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');
    this.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(this.page);
    await this.purchaseOrderCreatePoPage.ensurePurchaseOrderListReady().catch(() => {});
    console.log(`[VendorPO] Admin PO list ready (${this.page.url()})`);
  }
);

When(
  'I refresh the Purchase Order list until it shows status {string} for the PO from TC-01',
  { timeout: 240000 },
  async function (status) {
    const poNumber = String(this.lastPoNumber || '').trim();
    if (poNumber) {
      const PurchaseOrderCreatePoPage = require('../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');
      this.purchaseOrderCreatePoPage = this.purchaseOrderCreatePoPage || new PurchaseOrderCreatePoPage(this.page);
      await this.purchaseOrderCreatePoPage.refreshUntilPoPreviewShowsStatus(poNumber, status || 'Accepted');
      return;
    }
    const GoodsReceiptPage = require('../../../../pages/admin/projects/procurement/GoodsReceiptPage');
    const title = String(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
    this.lastPoTitle = title;
    const gr = new GoodsReceiptPage(this.page);
    await gr.refreshUntilPurchaseOrderShowsStatus(title, status || 'Accepted');
  }
);

Then(
  'the Purchase Order from TC-01 should show status {string} on the Admin list',
  { timeout: 120000 },
  async function (status) {
    const poNumber = String(this.lastPoNumber || '').trim();
    if (poNumber) {
      const PurchaseOrderCreatePoPage = require('../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');
      this.purchaseOrderCreatePoPage = this.purchaseOrderCreatePoPage || new PurchaseOrderCreatePoPage(this.page);
      await this.purchaseOrderCreatePoPage.refreshUntilPoPreviewShowsStatus(poNumber, status || 'Accepted', 60000);
      return;
    }
    const { expect } = require('@playwright/test');
    const GoodsReceiptPage = require('../../../../pages/admin/projects/procurement/GoodsReceiptPage');
    const title = String(this.lastPoTitle || vendorPoSession.getPoTitle() || 'New PO 1').trim();
    const statusLabel = String(status || 'Accepted').trim();
    const gr = new GoodsReceiptPage(this.page);
    const statusRe = new RegExp(`\\b${statusLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const card = gr.poListCardForTitle(title);
    if (await card.isVisible({ timeout: 15000 }).catch(() => false)) {
      await expect(card.getByText(statusRe).first()).toBeVisible({ timeout: 30000 });
    } else {
      await expect(
        this.page
          .locator('div.mt-3.mb-3, .MuiCard-root, .MuiPaper-root')
          .filter({ hasText: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .filter({ hasText: statusRe })
          .first()
      ).toBeVisible({ timeout: 60000 });
    }
    console.log(`[VendorPO] Verified Admin PO "${title}" status "${statusLabel}"`);
  }
);

When('I click Decline PO from the vendor Purchase Order overflow menu', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  const poNumber = String(this.lastPoNumber || vendorPo.targetPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) {
    this.lastPoNumber = poNumber;
    vendorPo.setTargetPoNumber(poNumber);
  }
  await vendorPo.clickDeclinePoFromOverflowMenu();
});

When('I confirm the Decline PO action', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  await vendorPo.confirmDeclinePoAction();
});

When('I confirm the Decline PO action if confirmation is displayed', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  await vendorPo.confirmDeclinePoAction();
});

Then('I should see the Purchase Order decline success message', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  await vendorPo.expectDeclinePoSuccessMessage();
});

Then('I should see the Purchase Order status displayed as Declined', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  const poNumber = String(this.lastPoNumber || vendorPo.targetPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) vendorPo.setTargetPoNumber(poNumber);
  await vendorPo.expectPoStatusDeclined();
});

When('I click Add Comment from the vendor Purchase Order overflow menu', { timeout: 180000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  if (this.lastPoTitle) vendorPo.setTargetPoTitle(this.lastPoTitle);
  const poNumber = String(this.lastPoNumber || vendorPo.targetPoNumber || vendorPoSession.getPoNumber() || '').trim();
  if (poNumber) {
    this.lastPoNumber = poNumber;
    vendorPo.setTargetPoNumber(poNumber);
  }
  await vendorPo.clickAddCommentFromOverflowMenu();
});

When('I enter the vendor Purchase Order comment {string}', { timeout: 120000 }, async function (comment) {
  const vendorPo = getVendorPoPage(this);
  this.lastVendorPoComment = comment;
  await vendorPo.enterVendorPoComment(comment);
});

When('I submit the vendor Purchase Order comment', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  await vendorPo.submitVendorPoComment();
});

Then('I should see the vendor Purchase Order comment added successfully', { timeout: 120000 }, async function () {
  const vendorPo = getVendorPoPage(this);
  await vendorPo.expectVendorPoCommentAddedSuccessfully(this.lastVendorPoComment);
  if (vendorPo.targetPoNumber) {
    this.lastPoNumber = vendorPo.targetPoNumber;
    vendorPoSession.saveFromWorld(this);
  }
});

Then(
  'I should see the vendor Purchase Order comment {string} displayed',
  { timeout: 120000 },
  async function (comment) {
    const vendorPo = getVendorPoPage(this);
    await vendorPo.expectVendorPoCommentDisplayed(comment || this.lastVendorPoComment);
  }
);
