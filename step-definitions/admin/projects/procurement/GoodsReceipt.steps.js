const { Before, After, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const GoodsReceiptPage = require('../../../../pages/admin/projects/procurement/GoodsReceiptPage');
const InventoryPage = require('../../../../pages/admin/projects/procurement/InventoryPage');
const InventoryRequestPage = require('../../../../pages/admin/projects/procurement/InventoryRequestPage');
const testData = require('../../../../utils/testData');
const goodsReceiptSession = require('../../../../support/goods-receipt-session');

setDefaultTimeout(120000);

const GOODS_RECEIPT_TC_LOG = {
  TC01: 'TC-01 — Create and send the Goods Receipt purchase order',
  TC01A: 'TC-01A — Accept the purchase order from Yopmail and verify Accepted on Admin',
  TC01B: 'TC-01B — Inventory group and goods receipt from the accepted PO',
  TC02: 'TC-02 — Request Items group → request products → Add to Group',
  TC03: 'TC-03 — Create/Accept PO via Yopmail → Inventory → Goods Receipts Preview',
  TC04: 'TC-04 — Create/Accept PO via Yopmail → Inventory → Goods Receipts Preview → Download',
};

function getGoodsReceiptPage(world) {
  if (!world.goodsReceiptPage || world.goodsReceiptPage.page !== world.page) {
    world.goodsReceiptPage = new GoodsReceiptPage(world.page);
  }
  return world.goodsReceiptPage;
}

function getInventoryPage(world) {
  if (!world.inventoryPage || world.inventoryPage.page !== world.page) {
    world.inventoryPage = new InventoryPage(world.page);
  }
  return world.inventoryPage;
}

function getInventoryRequestPage(world) {
  if (!world.inventoryRequestPage || world.inventoryRequestPage.page !== world.page) {
    world.inventoryRequestPage = new InventoryRequestPage(world.page);
  }
  // Keep group name from inventory / goods-receipt steps.
  const groupName =
    world.lastCreatedInventoryGroupName ||
    world.inventoryPage?.lastCreatedGroupName ||
    world.goodsReceiptPage?.lastCreatedGroupName ||
    '';
  if (groupName) {
    world.inventoryRequestPage.lastCreatedGroupName = groupName;
  }
  // Restore tracked request products if the page object was recreated mid-scenario.
  if (
    Array.isArray(world.lastRequestedProducts) &&
    world.lastRequestedProducts.length &&
    !(world.inventoryRequestPage.lastRequestedProducts || []).length
  ) {
    world.inventoryRequestPage.lastRequestedProducts = world.lastRequestedProducts;
  }
  return world.inventoryRequestPage;
}

Before({ tags: '@goods-receipt' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+[A-Z]?$/i.test(t));
  const tcKey = tc ? tc.toUpperCase() : '';
  if (tcKey && GOODS_RECEIPT_TC_LOG[tcKey]) {
    console.log(`\n>>> ${GOODS_RECEIPT_TC_LOG[tcKey]}\n`);
  }
  // Keep admin page so we can return after Yopmail / Mailinator / vendor portal tabs.
  this.adminPage = this.page;
  this.vendorMailinatorEmail =
    testData.vendor?.goodsReceiptMailinator?.email ||
    'bhavani123456@mailinator.com';
  this.vendorYopmailEmail =
    testData.vendor?.goodsReceiptYopmail?.email || 'poojaal002@yopmail.com';

  const saved = goodsReceiptSession.load();
  const continuesSavedPo = tcKey === 'TC01A' || tcKey === 'TC01B';
  if (continuesSavedPo) {
    if (!saved.title) {
      throw new Error(
        'No saved Goods Receipt purchase order. Run "@goods-receipt and @TC01" first, then TC-01A, then TC-01B.'
      );
    }
    this.lastPoTitle = saved.title;
    if (saved.email) this.vendorYopmailEmail = saved.email;
    if (saved.poNumber) this.lastPoNumber = saved.poNumber;
    console.log(
      `[GoodsReceipt] Reusing saved PO "${this.lastPoTitle}"` +
        (saved.poNumber ? ` (${saved.poNumber})` : '') +
        (saved.email ? ` inbox ${saved.email}` : '')
    );
  } else {
    this.lastPoTitle = `New PO FOR Goods Receipt ${String(Date.now()).slice(-8)}`;
  }

  // TC-01 sheet: single Wires line + Yopmail External Accept.
  if (tcKey === 'TC01' || tcKey === 'TC01A' || tcKey === 'TC01B') {
    this.lastPoLineItems = [
      { name: 'Wires', quantity: '10', rate: '1000', unit: 'Nos' },
    ];
    // Org dropdown rarely lists "Yopmail" — unique PO title search is enough.
    this.goodsReceiptPreferredVendorName = '';
  } else {
    this.lastPoLineItems = [
      { name: 'Wires', quantity: '10', rate: '1000', unit: 'Nos' },
      { name: 'Lubbers', quantity: '15', rate: '2000', unit: 'Nos' },
      { name: 'Motors', quantity: '3', rate: '3000', unit: 'Nos' },
    ];
    this.goodsReceiptPreferredVendorName = '';
  }
});

After({ tags: '@goods-receipt and @TC01' }, async function () {
  const title = String(this.lastPoTitle || '').trim();
  if (!title) return;
  goodsReceiptSession.save({
    title,
    email: String(this.vendorYopmailEmail || '').trim(),
    poNumber: String(this.lastPoNumber || '').trim(),
  });
  console.log(`[GoodsReceipt] Saved PO "${title}" for TC-01A / TC-01B`);
});

After({ tags: '@goods-receipt and @TC01A' }, async function () {
  const saved = goodsReceiptSession.load();
  goodsReceiptSession.save({
    title: String(this.lastPoTitle || saved.title || '').trim(),
    email: String(this.vendorYopmailEmail || saved.email || '').trim(),
    poNumber: String(this.lastPoNumber || saved.poNumber || '').trim(),
  });
});

When(
  'I fill a unique goods receipt purchase order title starting with {string}',
  { timeout: 120000 },
  async function (prefix) {
    const PurchaseOrderCreatePoPage = require('../../../../pages/admin/projects/procurement/purchase-order/create-po/purchase-order-create-po.page');
    if (
      !this.purchaseOrderCreatePoPage ||
      this.purchaseOrderCreatePoPage.page !== this.page
    ) {
      this.purchaseOrderCreatePoPage = new PurchaseOrderCreatePoPage(this.page);
    }
    const title = `${String(prefix || 'New PO FOR Goods Receipt').trim()} ${String(Date.now()).slice(-8)}`;
    this.lastPoTitle = title;
    await this.purchaseOrderCreatePoPage.fillPurchaseOrderTitle(title);
    console.log(`[GoodsReceipt] PO title: ${title}`);
  }
);

When('I switch back to the Admin Portal after vendor PO accept', { timeout: 180000 }, async function () {
  const adminPage = this.adminPage || this.page;
  if (!adminPage || adminPage.isClosed()) {
    throw new Error('Admin page is missing or closed after vendor PO accept');
  }
  await adminPage.bringToFront().catch(() => {});
  this.page = adminPage;
  // Refresh page-object caches onto the admin page.
  this.goodsReceiptPage = new GoodsReceiptPage(adminPage);
  this.inventoryPage = new InventoryPage(adminPage);
  await adminPage.waitForLoadState('domcontentloaded').catch(() => {});
  // Land back on PO list if we drifted (compose may have closed into list already).
  const url = String(adminPage.url() || '');
  if (!/subTab=PO|purchase-order|RFQAndPO/i.test(url)) {
    console.log(`[GoodsReceipt] Admin URL after Accept not on PO list (${url}) — refresh`);
    await adminPage.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  console.log(`[GoodsReceipt] Switched back to Admin Portal (${adminPage.url()})`);
});

When(
  'I refresh the Purchase Order list until {string} shows status {string}',
  { timeout: 240000 },
  async function (poTitle, status) {
    const title = String(poTitle || this.lastPoTitle || '').trim();
    this.lastPoTitle = title;
    await getGoodsReceiptPage(this).refreshUntilPurchaseOrderShowsStatus(
      title,
      status || 'Accepted'
    );
  }
);

When(
  'I refresh the last purchase order list until it shows status {string}',
  { timeout: 240000 },
  async function (status) {
    const title = String(this.lastPoTitle || '').trim();
    if (!title) throw new Error('lastPoTitle is empty — fill PO title first');
    const gr = getGoodsReceiptPage(this);
    await gr.refreshUntilPurchaseOrderShowsStatus(title, status || 'Accepted');
    const poNo = await gr.capturePoNumberForTitle(title);
    if (poNo) this.lastPoNumber = poNo;
  }
);

Then(
  'the purchase order titled {string} should show status {string} on the Admin list',
  { timeout: 120000 },
  async function (poTitle, status) {
    const title = String(poTitle || this.lastPoTitle || '').trim();
    const statusLabel = String(status || 'Accepted').trim();
    this.lastPoTitle = title;
    const gr = getGoodsReceiptPage(this);
    const statusRe = new RegExp(
      `(?<![a-z])${statusLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`,
      'i'
    );
    if (await gr.purchaseOrderStatusVisibleNearTitle(title, statusRe)) {
      console.log(`[GoodsReceipt] Verified Admin PO "${title}" status "${statusLabel}"`);
      return;
    }
    const card = gr.poListCardForTitle(title);
    if (await card.isVisible({ timeout: 15000 }).catch(() => false)) {
      await expect(card.getByText(statusRe).first()).toBeVisible({ timeout: 30000 });
    } else {
      await expect(
        gr.page
          .locator('div.mt-3.mb-3, .MuiCard-root, .MuiPaper-root')
          .filter({ hasText: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .filter({ hasText: statusRe })
          .first()
      ).toBeVisible({ timeout: 60000 });
    }
    console.log(`[GoodsReceipt] Verified Admin PO "${title}" status "${statusLabel}"`);
  }
);

Then(
  'the last purchase order should show status {string} on the Admin list',
  { timeout: 120000 },
  async function (status) {
    const title = String(this.lastPoTitle || '').trim();
    const statusLabel = String(status || 'Accepted').trim();
    const gr = getGoodsReceiptPage(this);
    const statusRe = new RegExp(
      `(?<![a-z])${statusLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`,
      'i'
    );
    if (await gr.purchaseOrderStatusVisibleNearTitle(title, statusRe)) {
      const poNo = await gr.capturePoNumberForTitle(title);
      if (poNo) this.lastPoNumber = poNo;
      console.log(
        `[GoodsReceipt] Verified Admin PO "${title}" status "${statusLabel}"` + (poNo ? ` (${poNo})` : '')
      );
      return;
    }
    const card = gr.poListCardForTitle(title);
    if (await card.isVisible({ timeout: 15000 }).catch(() => false)) {
      await expect(card.getByText(statusRe).first()).toBeVisible({ timeout: 30000 });
    } else {
      await expect(
        gr.page
          .locator('div.mt-3.mb-3, .MuiCard-root, .MuiPaper-root')
          .filter({ hasText: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
          .filter({ hasText: statusRe })
          .first()
      ).toBeVisible({ timeout: 60000 });
    }
    const poNo = await gr.capturePoNumberForTitle(title);
    if (poNo) this.lastPoNumber = poNo;
    console.log(
      `[GoodsReceipt] Verified Admin PO "${title}" status "${statusLabel}"` +
        (poNo ? ` (${poNo})` : '')
    );
  }
);

When(
  'I open Inventory from the Admin portal after PO accepted',
  { timeout: 180000 },
  async function () {
    const adminPage = this.adminPage || this.page;
    if (adminPage && !adminPage.isClosed()) {
      await adminPage.bringToFront().catch(() => {});
      this.page = adminPage;
      this.goodsReceiptPage = new GoodsReceiptPage(adminPage);
      this.inventoryPage = new InventoryPage(adminPage);
    }
    await getGoodsReceiptPage(this).navigateToInventoryAfterPoAccepted();
  }
);

When('I enter inventory group name {string}', { timeout: 120000 }, async function (groupName) {
  const inv = getInventoryPage(this);
  // Unique per run so prior "For Sample Testing" groups do not steal the click.
  const base = String(groupName || '').trim() || 'For Sample Testing';
  const name = `${base} ${String(Date.now()).slice(-6)}`;
  await inv.expectCreateGroupPopupVisible();
  const input = inv.groupNameInput();
  await input.click({ timeout: 15000 });
  await input.fill(name);
  inv.lastCreatedGroupName = name;
  this.lastCreatedInventoryGroupName = name;
  getGoodsReceiptPage(this).lastCreatedGroupName = name;
  getInventoryRequestPage(this).lastCreatedGroupName = name;
  console.log(`[Inventory] Entered inventory group name: ${name}`);
});

When(
  'I complete goods receipt from the accepted PO with notes {string}',
  { timeout: 360000 },
  async function (notes) {
    const gr = getGoodsReceiptPage(this);
    const inv = getInventoryPage(this);
    gr.lastCreatedGroupName =
      gr.lastCreatedGroupName ||
      this.lastCreatedInventoryGroupName ||
      inv.lastCreatedGroupName ||
      '';
    if (this.lastPoNumber) {
      gr.lastPoNumber = this.lastPoNumber;
    }
    await gr.completeGoodsReceiptFromAcceptedPoFlow({
      poTitle: this.lastPoTitle,
      lineItems: this.lastPoLineItems || [
        { name: 'Wires', quantity: '10' },
      ],
      notes:
        notes ||
        `GR auto notes ${String(Date.now()).slice(-6)}`,
      preferredVendorName: '',
      pickAnyAcceptedPo: true,
      openGroupAndAddItems: false,
    });
    this.goodsReceiptAddCompleted = !!gr.goodsReceiptAddCompleted;
    if (gr.lastSelectedGrPoTitle) {
      this.lastSelectedGrPoTitle = gr.lastSelectedGrPoTitle;
    }
    if (gr.lastPoNumber) this.lastPoNumber = gr.lastPoNumber;
  }
);

When(
  'I complete goods receipt from the accepted PO with vehicle {string} and notes {string}',
  { timeout: 360000 },
  async function (_vehicle, notes) {
    // Legacy step wording — vehicle is ignored; only notes / required qty are used.
    const gr = getGoodsReceiptPage(this);
    const inv = getInventoryPage(this);
    gr.lastCreatedGroupName =
      gr.lastCreatedGroupName ||
      this.lastCreatedInventoryGroupName ||
      inv.lastCreatedGroupName ||
      '';
    if (this.lastPoNumber) {
      gr.lastPoNumber = this.lastPoNumber;
    }
    await gr.completeGoodsReceiptFromAcceptedPoFlow({
      poTitle: this.lastPoTitle,
      lineItems: this.lastPoLineItems || [
        { name: 'Wires', quantity: '10' },
      ],
      notes:
        notes ||
        `GR auto notes ${String(Date.now()).slice(-6)}`,
      preferredVendorName: '',
      pickAnyAcceptedPo: true,
      openGroupAndAddItems: false,
    });
    this.goodsReceiptAddCompleted = !!gr.goodsReceiptAddCompleted;
    if (gr.lastSelectedGrPoTitle) {
      this.lastSelectedGrPoTitle = gr.lastSelectedGrPoTitle;
    }
    if (gr.lastPoNumber) this.lastPoNumber = gr.lastPoNumber;
  }
);

When('I select Add from PO in inventory', { timeout: 120000 }, async function () {
  await getGoodsReceiptPage(this).selectAddFromPo();
});

When('I select the vendor for goods receipt from PO', { timeout: 180000 }, async function () {
  await getGoodsReceiptPage(this).selectVendorForGoodsReceipt();
});

When(
  'I select the accepted purchase order titled {string}',
  { timeout: 180000 },
  async function (poTitle) {
    const title = String(poTitle || this.lastPoTitle || '').trim();
    this.lastPoTitle = title;
    await getGoodsReceiptPage(this).selectAcceptedPurchaseOrder(title);
  }
);

When('I enter received quantities matching the PO line items', { timeout: 180000 }, async function () {
  const items = this.lastPoLineItems || [];
  await getGoodsReceiptPage(this).enterReceivedQuantities(items);
});

When('I enter goods receipt vehicle number {string}', { timeout: 60000 }, async function (_vehicle) {
  // Vehicle number removed from Goods Receipt flow — no-op for legacy steps.
  console.log('[GoodsReceipt] Skipping vehicle number (removed from flow)');
});

When('I enter goods receipt notes {string}', { timeout: 120000 }, async function (notes) {
  await getGoodsReceiptPage(this).enterNotes(notes);
});

When('I click Add on the goods receipt form', { timeout: 120000 }, async function () {
  await getGoodsReceiptPage(this).clickAddOnGoodsReceiptForm();
});

Then('I should see the goods receipt added successfully', { timeout: 120000 }, async function () {
  const gr = getGoodsReceiptPage(this);
  // When-step may have already completed Add → Yes; keep flag across page-object refresh.
  if (this.goodsReceiptAddCompleted) {
    gr.goodsReceiptAddCompleted = true;
  }
  await gr.expectGoodsReceiptAddedSuccess();
  this.goodsReceiptAddCompleted = gr.goodsReceiptAddCompleted;
});

Then(
  'I should see the PO items and received quantities under the inventory group',
  { timeout: 180000 },
  async function () {
    const gr = getGoodsReceiptPage(this);
    await gr.expectPoItemsAndQuantitiesVisible(this.lastPoLineItems || gr.lastReceivedLineItems);
  }
);

When('I click Yes on the goods receipt confirmation popup', { timeout: 120000 }, async function () {
  await getGoodsReceiptPage(this).clickYesOnConfirmationPopup();
});

Then(
  'I should see the goods receipt confirmation completed successfully',
  { timeout: 120000 },
  async function () {
    await getGoodsReceiptPage(this).expectConfirmationCompleted();
  }
);

Then(
  'I should see the goods receipt under the inventory group {string}',
  { timeout: 180000 },
  async function (groupName) {
    const gr = getGoodsReceiptPage(this);
    const name =
      this.lastCreatedInventoryGroupName ||
      gr.lastCreatedGroupName ||
      groupName;
    gr.lastCreatedGroupName = name;
    await gr.expectGoodsReceiptUnderGroup(name);
  }
);

Then(
  'I should see the goods receipt under the last created inventory group',
  { timeout: 360000 },
  async function () {
    const gr = getGoodsReceiptPage(this);
    const name =
      this.lastCreatedInventoryGroupName || gr.lastCreatedGroupName || '';
    if (!name) throw new Error('No last created inventory group name on world');
    gr.lastCreatedGroupName = name;
    await gr.expectGoodsReceiptUnderGroup(name);
  }
);

// ---------------------------------------------------------------------------
// TC-02 — Request Item(s) → Item Requests → Add to Group
// ---------------------------------------------------------------------------

When('I start an inventory item request', { timeout: 180000 }, async function () {
  const req = getInventoryRequestPage(this);
  await req.startInventoryItemRequest();
});

When(
  'I add a request product with name {string} quantity {string} unit {string} unit cost {string} status {string}',
  { timeout: 180000 },
  async function (name, quantity, unit, unitCost, status) {
    const req = getInventoryRequestPage(this);
    await req.addRequestProduct({ name, quantity, unit, unitCost, status });
    this.lastRequestedProducts = req.lastRequestedProducts;
  }
);

When('I submit the inventory item request', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).submitInventoryItemRequest();
});

Then(
  'I should see the requested items created successfully with status {string}',
  { timeout: 180000 },
  async function (status) {
    await getInventoryRequestPage(this).expectRequestedItemsCreatedWithStatus(status);
  }
);

When('I click Request again on inventory', { timeout: 120000 }, async function () {
  await getInventoryRequestPage(this).clickRequestAgain();
});

When('I navigate back to the inventory module', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).navigateBackToInventoryModule();
});

When('I open the Requested Products section in inventory', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).openRequestedProductsSection();
});

When('I open the Approved tab in Item Requests', { timeout: 120000 }, async function () {
  await getInventoryRequestPage(this).selectItemRequestsStatusFilter('Approved');
  await getInventoryRequestPage(this).clearItemRequestsSearch();
});

When('I locate the last requested product in Requested Products', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).locateLastRequestedProduct();
});

When('I open the three-dot menu for the requested product', { timeout: 120000 }, async function () {
  await getInventoryRequestPage(this).openThreeDotMenuForRequestedProduct();
});

When('I select Add to Group from the requested product menu', { timeout: 120000 }, async function () {
  await getInventoryRequestPage(this).selectAddToGroupFromMenu();
});

Then('I should see the Add to Group popup', { timeout: 120000 }, async function () {
  await getInventoryRequestPage(this).expectAddToGroupPopupVisible();
});

When('I fill the Add to Group form with valid required information', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).fillAddToGroupFormValid();
});

When('I click Yes on the Add to Group confirmation', { timeout: 120000 }, async function () {
  await getInventoryRequestPage(this).clickYesOnAddToGroupConfirmation();
});

Then(
  'the requested product should be added to the Request Items inventory group successfully',
  { timeout: 180000 },
  async function () {
    await getInventoryRequestPage(this).expectRequestedProductAddedToGroupSuccess();
  }
);

Then(
  'I should see the requested product in the inventory group with correct details and quantity',
  { timeout: 240000 },
  async function () {
    const req = getInventoryRequestPage(this);
    if (this.lastCreatedInventoryGroupName) {
      req.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
    }
    await req.expectRequestedProductInGroupWithDetails();
  }
);

// ---------------------------------------------------------------------------
// TC-03 — Inventory → Goods Receipts → Preview accepted PO
// ---------------------------------------------------------------------------

When('I open the Goods Receipts module in inventory', { timeout: 180000 }, async function () {
  const gr = getGoodsReceiptPage(this);
  if (this.lastPoTitle) gr.lastPoTitle = this.lastPoTitle;
  await gr.openGoodsReceiptsModule();
});

Then('I should see the Goods Receipts module', { timeout: 120000 }, async function () {
  await getGoodsReceiptPage(this).expectGoodsReceiptsModuleVisible();
});

When(
  'I locate the accepted purchase order {string} in Goods Receipts',
  { timeout: 180000 },
  async function (titleHint) {
    const gr = getGoodsReceiptPage(this);
    // Prefer the unique title created in this run (Accept prerequisite).
    const hint = String(this.lastPoTitle || titleHint || 'New PO FOR Goods Receipt').trim();
    gr.lastPoTitle = this.lastPoTitle || hint;
    await gr.locateAcceptedPurchaseOrderInGoodsReceipts(hint);
  }
);

When(
  'I click Preview for the accepted purchase order in Goods Receipts',
  { timeout: 180000 },
  async function () {
    await getGoodsReceiptPage(this).clickPreviewForAcceptedPurchaseOrderInGoodsReceipts();
  }
);

Then(
  'I should see the purchase order preview from Goods Receipts',
  { timeout: 180000 },
  async function () {
    await getGoodsReceiptPage(this).expectPurchaseOrderPreviewFromGoodsReceipts();
  }
);

// ---------------------------------------------------------------------------
// TC-04 — Preview → Action/More → Download GR document
// ---------------------------------------------------------------------------

When('I open the Action menu on the Goods Receipt preview', { timeout: 120000 }, async function () {
  await getGoodsReceiptPage(this).openActionMenuOnGoodsReceiptPreview();
});

When(
  'I click Download on the Goods Receipt preview action menu',
  { timeout: 180000 },
  async function () {
    const gr = getGoodsReceiptPage(this);
    const filePath = await gr.clickDownloadOnGoodsReceiptPreviewActionMenu();
    this.lastDownloadedGoodsReceiptPath = filePath;
    this.lastDownloadedGoodsReceiptName = gr.lastDownloadedGoodsReceiptName;
  }
);

Then('the Goods Receipt document should be downloaded successfully', { timeout: 120000 }, async function () {
  const gr = getGoodsReceiptPage(this);
  if (this.lastDownloadedGoodsReceiptPath) {
    gr.lastDownloadedGoodsReceiptPath = this.lastDownloadedGoodsReceiptPath;
  }
  await gr.expectGoodsReceiptDocumentDownloaded();
});

Then(
  'the downloaded Goods Receipt file should open and contain the correct details',
  { timeout: 120000 },
  async function () {
    const gr = getGoodsReceiptPage(this);
    if (this.lastDownloadedGoodsReceiptPath) {
      gr.lastDownloadedGoodsReceiptPath = this.lastDownloadedGoodsReceiptPath;
    }
    await gr.expectDownloadedGoodsReceiptFileContainsCorrectDetails();
  }
);
