const { Before, Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const InventoryPage = require('../../../../pages/admin/projects/procurement/InventoryPage');
const InventoryRequestPage = require('../../../../pages/admin/projects/procurement/InventoryRequestPage');
const GoodsReceiptPage = require('../../../../pages/admin/projects/procurement/GoodsReceiptPage');

setDefaultTimeout(120000);

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
  if (
    world.lastCreatedInventoryGroupName &&
    !world.inventoryPage.lastCreatedGroupName
  ) {
    world.inventoryPage.lastCreatedGroupName = world.lastCreatedInventoryGroupName;
  }
  return world.inventoryPage;
}

function getInventoryRequestPage(world) {
  if (!world.inventoryRequestPage || world.inventoryRequestPage.page !== world.page) {
    world.inventoryRequestPage = new InventoryRequestPage(world.page);
  }
  const req = world.inventoryRequestPage;
  req.page = world.page;
  if (world.lastCreatedInventoryGroupName) {
    req.lastCreatedGroupName = world.lastCreatedInventoryGroupName;
  } else if (world.inventoryPage?.lastCreatedGroupName) {
    req.lastCreatedGroupName = world.inventoryPage.lastCreatedGroupName;
  }
  // Keep InventoryPage world pointer in sync when request page owns group name.
  if (req.lastCreatedGroupName) {
    world.lastCreatedInventoryGroupName = req.lastCreatedGroupName;
    const inv = getInventoryPage(world);
    inv.lastCreatedGroupName = req.lastCreatedGroupName;
  }
  return req;
}

Before({ tags: '@inventory' }, async function (scenario) {
  const tagNames = (scenario.pickle.tags || []).map((t) => String(t.name || '').replace(/^@/, ''));
  const tcTag = tagNames.find((name) => /^TC\d{2}$/i.test(name));
  if (tcTag) {
    console.log(`\n========== Inventory flow — ${tcTag} ==========\n`);
  }
});

// ---------------------------------------------------------------------------
// Navigation / module ready
// ---------------------------------------------------------------------------

When('I click Inventory in the project', { timeout: 120000 }, async function () {
  await getInventoryPage(this).clickInventoryInProject();
});

When('I navigate to the inventory module from project profile', { timeout: 120000 }, async function () {
  await getInventoryPage(this).clickInventoryInProject();
});

When('I wait for the inventory module to load', { timeout: 120000 }, async function () {
  await getInventoryPage(this).waitForModuleToLoad();
});

Then('I should see the inventory page', { timeout: 120000 }, async function () {
  await getInventoryPage(this).waitForModuleToLoad();
});

Then('the Inventory module should be ready', { timeout: 120000 }, async function () {
  await getInventoryPage(this).waitForModuleToLoad();
});

// ---------------------------------------------------------------------------
// Create group
// ---------------------------------------------------------------------------

When('I click the Create Group button in inventory', { timeout: 120000 }, async function () {
  await getInventoryPage(this).clickCreateGroup();
});

Then('I should see the create inventory item group popup', { timeout: 120000 }, async function () {
  await getInventoryPage(this).expectCreateGroupPopupVisible();
});

When('I enter a random group name in the create inventory group popup', { timeout: 120000 }, async function () {
  const name = await getInventoryPage(this).enterRandomGroupName();
  this.lastCreatedInventoryGroupName = name;
});

When('I click Create on the create inventory group popup', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  await inv.clickCreateOnGroupPopup();
  if (inv.lastOpenedInventoryGroupId) {
    this.lastOpenedInventoryGroupId = inv.lastOpenedInventoryGroupId;
  }
});

Then('the created inventory group should be visible', { timeout: 180000 }, async function () {
  await getInventoryPage(this).expectCreatedGroupVisible();
});

When('I open the newly created inventory group', { timeout: 180000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  if (this.lastOpenedInventoryGroupId) {
    inv.lastOpenedInventoryGroupId = this.lastOpenedInventoryGroupId;
  }
  if (this.inventoryRequestPage) {
    this.inventoryRequestPage.lastCreatedGroupName =
      this.lastCreatedInventoryGroupName || inv.lastCreatedGroupName;
    this.inventoryRequestPage.lastOpenedInventoryGroupId =
      this.lastOpenedInventoryGroupId || inv.lastOpenedInventoryGroupId;
    this.inventoryRequestPage.page = this.page;
    await this.inventoryRequestPage.openCreatedInventoryGroup();
    if (this.inventoryRequestPage.lastOpenedInventoryGroupId) {
      this.lastOpenedInventoryGroupId = this.inventoryRequestPage.lastOpenedInventoryGroupId;
    }
    return;
  }
  await inv.openCreatedInventoryGroup();
  if (inv.lastOpenedInventoryGroupId) {
    this.lastOpenedInventoryGroupId = inv.lastOpenedInventoryGroupId;
  }
});

When('I create a new inventory group quickly', { timeout: 180000 }, async function () {
  const inv = getInventoryPage(this);
  await inv.ensureOnInventoryGroupsList();
  await inv.clickCreateGroup();
  await inv.expectCreateGroupPopupVisible();
  const name = await inv.enterRandomGroupName();
  this.lastCreatedInventoryGroupName = name;
  await inv.clickCreateOnGroupPopup();
  if (inv.lastOpenedInventoryGroupId) {
    this.lastOpenedInventoryGroupId = inv.lastOpenedInventoryGroupId;
  }
  await inv.expectCreatedGroupVisible();
});

// ---------------------------------------------------------------------------
// Search / rename / delete
// ---------------------------------------------------------------------------

When('I search inventory groups for the created group name', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  await inv.searchInventoryGroupsByName(inv.lastCreatedGroupName);
});

Then('I should see the created inventory group in the list', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  await inv.expectInventoryGroupVisibleInList();
});

When('I clear the inventory group search', { timeout: 60000 }, async function () {
  await getInventoryPage(this).clearInventoryGroupSearch();
});

When('I rename the created inventory group', { timeout: 180000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  await inv.startRenameCreatedInventoryGroup();
  this.previousInventoryGroupName = inv._renamePreviousGroupName || inv.lastCreatedGroupName;
  const newName = await inv.enterRenamedInventoryGroupName();
  await inv.confirmInventoryGroupRename();
  this.lastCreatedInventoryGroupName = inv.lastCreatedGroupName || newName;
});

Then('the renamed inventory group should be visible', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  if (this.previousInventoryGroupName) {
    inv._renamePreviousGroupName = this.previousInventoryGroupName;
  }
  await inv.expectRenamedInventoryGroupVisible();
});

When('I delete the created inventory group', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  await inv.deleteCreatedInventoryGroup();
  this.lastDeleteGroupToast = inv._lastDeleteGroupToast || '';
});

Then('the created inventory group should be deleted', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  if (this.lastDeleteGroupToast) {
    inv._lastDeleteGroupToast = this.lastDeleteGroupToast;
  }
  await inv.expectInventoryGroupDeleted();
});

Then('I should see that the inventory group cannot be deleted with items', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastDeleteGroupToast) {
    inv._lastDeleteGroupToast = this.lastDeleteGroupToast;
  }
  await inv.expectCannotDeleteGroupWithItemsToast();
});

// ---------------------------------------------------------------------------
// Add items — warehouse / PO / workshop
// ---------------------------------------------------------------------------

When('I click the Add Item button in inventory group', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  await inv.clickAddItem();
});

Then('I should see the add item options', { timeout: 120000 }, async function () {
  await getInventoryPage(this).expectAddItemOptionsVisible();
});

When('I select Add from Warehouse in inventory', { timeout: 120000 }, async function () {
  await getInventoryPage(this).selectAddFromWarehouse();
});

When('I select Add from Barcode Reader in inventory', { timeout: 120000 }, async function () {
  await getInventoryPage(this).selectAddFromWarehouse();
});

When('I select Add from PO menu in inventory', { timeout: 120000 }, async function () {
  await getInventoryPage(this).selectAddFromPurchaseOrder();
});

When('I select Add from Workshop in inventory', { timeout: 120000 }, async function () {
  await getInventoryPage(this).selectAddFromWorkshop();
});

Then('I should see the workshop selection panel', { timeout: 120000 }, async function () {
  await getInventoryPage(this).expectWorkshopSelectionVisible();
});

When('I receive the first workshop dispatch into the inventory group', { timeout: 180000 }, async function () {
  await getInventoryPage(this).selectFirstWorkshopDispatchAndReceive();
});

When(
  'I receive from workshop or assert no dispatched workshop material',
  { timeout: 180000 },
  async function () {
    const inv = getInventoryPage(this);
    const result = await inv.receiveFromWorkshopOrAssertEmpty();
    this.lastWorkshopPickerMode = result.mode || inv.lastWorkshopPickerMode || 'empty';
    console.log(`[Inventory] Workshop path mode: ${this.lastWorkshopPickerMode}`);
  }
);

Then('the inventory Add from Workshop outcome should be recorded', { timeout: 60000 }, async function () {
  const mode = this.lastWorkshopPickerMode || getInventoryPage(this).lastWorkshopPickerMode;
  if (mode !== 'empty' && mode !== 'hasData') {
    throw new Error(`Expected workshop mode empty|hasData, got: ${mode}`);
  }
  console.log(`[Inventory] Workshop outcome OK (${mode})`);
});

When(
  'I complete goods receipt from accepted PO or assert no accepted PO with notes {string}',
  { timeout: 360000 },
  async function (notes) {
    const gr = getGoodsReceiptPage(this);
    const inv = getInventoryPage(this);
    gr.lastCreatedGroupName =
      this.lastCreatedInventoryGroupName ||
      inv.lastCreatedGroupName ||
      gr.lastCreatedGroupName ||
      '';
    if (this.lastPoNumber) gr.lastPoNumber = this.lastPoNumber;
    const result = await gr.completeGoodsReceiptFromAcceptedPoOrAssertEmpty({
      poTitle: this.lastPoTitle,
      lineItems: this.lastPoLineItems || [{ name: 'Wires', quantity: '10' }],
      notes: notes || `GR auto notes ${String(Date.now()).slice(-6)}`,
      preferredVendorName: '',
      pickAnyAcceptedPo: true,
      openGroupAndAddItems: false,
    });
    this.lastPoPickerMode = result.mode || gr.lastPoPickerMode || 'empty';
    this.goodsReceiptAddCompleted = !!gr.goodsReceiptAddCompleted;
    if (gr.lastSelectedGrPoTitle) this.lastSelectedGrPoTitle = gr.lastSelectedGrPoTitle;
    if (gr.lastPoNumber) this.lastPoNumber = gr.lastPoNumber;
    console.log(`[Inventory] PO path mode: ${this.lastPoPickerMode}`);
  }
);

Then('the inventory Add from PO outcome should be recorded', { timeout: 120000 }, async function () {
  const mode = this.lastPoPickerMode || getGoodsReceiptPage(this).lastPoPickerMode;
  if (mode !== 'empty' && mode !== 'hasData') {
    throw new Error(`Expected PO mode empty|hasData, got: ${mode}`);
  }
  if (mode === 'hasData') {
    // Mirror GR success soft-check when receive path ran.
    const gr = getGoodsReceiptPage(this);
    if (!gr.goodsReceiptAddCompleted && !this.goodsReceiptAddCompleted) {
      // Still accept if group detail is showing (receive may have completed without flag).
      await getInventoryPage(this).expectInventoryItemAddedToGroup().catch(() => {
        throw new Error('PO hasData path did not complete goods receipt');
      });
    }
  }
  console.log(`[Inventory] PO outcome OK (${mode})`);
});

When('I select the first checkbox from the inventory list', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  const mode = await inv.detectWarehousePickerState();
  this.lastWarehousePickerMode = mode;
  if (mode === 'empty') {
    await inv.expectNoWarehouseProductsAvailable();
    return;
  }
  await inv.selectFirstInventoryListCheckbox();
});

When('I click Next on the inventory selection', { timeout: 120000 }, async function () {
  await getInventoryPage(this).clickNextOnInventorySelection();
});

Then('I should see the inventory off-canvas page', { timeout: 120000 }, async function () {
  await getInventoryPage(this).expectInventoryOffCanvasVisible();
});

When('I enter {string} in the required quantity field', { timeout: 120000 }, async function (qty) {
  await getInventoryPage(this).enterRequiredQuantity(qty);
});

When('I click Add on the inventory off-canvas', { timeout: 120000 }, async function () {
  await getInventoryPage(this).clickAddOnInventoryOffCanvas();
  this.lastAddedInventoryItemName = getInventoryPage(this).lastAddedInventoryItemName;
});

Then('the selected inventory item should be displayed in the inventory group', { timeout: 120000 }, async function () {
  await getInventoryPage(this).expectInventoryItemAddedToGroup();
  this.lastAddedInventoryItemName = getInventoryPage(this).lastAddedInventoryItemName;
});

When('I add an item from warehouse into the current inventory group', { timeout: 180000 }, async function () {
  const inv = getInventoryPage(this);
  const result = await inv.addFromWarehouseOrAssertEmpty('1');
  this.lastWarehousePickerMode = result.mode || inv.lastWarehousePickerMode || 'empty';
  this.lastAddedInventoryItemName = inv.lastAddedInventoryItemName;
  console.log(`[Inventory] Warehouse path mode: ${this.lastWarehousePickerMode}`);
});

When(
  'I ensure the current inventory group has at least one item',
  { timeout: 360000 },
  async function () {
    const inv = getInventoryPage(this);
    // Prefer warehouse; if empty, seed via Approved request + Add to Group.
    const wh = await inv.addFromWarehouseOrAssertEmpty('1');
    this.lastWarehousePickerMode = wh.mode;
    this.lastAddedInventoryItemName = inv.lastAddedInventoryItemName;
    if (wh.mode === 'hasData') {
      console.log('[Inventory] Group seeded via warehouse');
      return;
    }

    const req = getInventoryRequestPage(this);
    await req.startInventoryItemRequest();
    await req.addRequestProduct({
      name: 'E2E Seed Item',
      quantity: '1',
      unit: 'Nos',
      unitCost: '10',
      status: 'Approved',
    });
    this.lastRequestedProducts = req.lastRequestedProducts;
    this.lastAddToGroupProductName =
      req.lastRequestedProducts[req.lastRequestedProducts.length - 1]?.name || null;
    await req.submitInventoryItemRequest({ forceStatus: 'Approved' });
    await req.navigateBackToInventoryModule();
    await req.openRequestedProductsSection();
    await req.selectItemRequestsStatusFilter('Approved');
    await req.locateLastRequestedProduct();
    await req.openThreeDotMenuForRequestedProduct();
    await req.selectAddToGroupFromMenu();
    await req.expectAddToGroupPopupVisible();
    await req.fillAddToGroupFormValid();
    await req.clickYesOnAddToGroupConfirmation();
    await req.expectRequestedProductAddedToGroupSuccess();
    if (this.lastCreatedInventoryGroupName) {
      req.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
      inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
    }
    // Prefer staying on / returning to group detail without a flaky reopen when possible.
    const addItems = inv.addItemsControl();
    if (!(await addItems.isVisible({ timeout: 5000 }).catch(() => false))) {
      await req.navigateBackToInventoryModule();
      await inv.openCreatedInventoryGroup();
    }
    this.lastAddedInventoryItemName =
      this.lastAddToGroupProductName || this.lastAddedInventoryItemName || 'E2E Seed Item';
    console.log('[Inventory] Group seeded via request Add to Group (warehouse empty)');
  }
);

Then('the inventory Add from Warehouse outcome should be recorded', { timeout: 60000 }, async function () {
  const mode = this.lastWarehousePickerMode || getInventoryPage(this).lastWarehousePickerMode;
  if (mode !== 'empty' && mode !== 'hasData') {
    throw new Error(`Expected warehouse mode empty|hasData, got: ${mode}`);
  }
  console.log(`[Inventory] Warehouse outcome OK (${mode})`);
});

// ---------------------------------------------------------------------------
// In-group item management
// ---------------------------------------------------------------------------

When('I search inventory items for the last added item', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  await inv.searchInventoryItemsByName(this.lastAddedInventoryItemName || inv.lastAddedInventoryItemName);
});

Then('I should see an inventory item row in the group', { timeout: 120000 }, async function () {
  const inv = getInventoryPage(this);
  await inv.expectInventoryItemRowVisible(this.lastAddedInventoryItemName || inv.lastAddedInventoryItemName);
});

When('I edit the used quantity on the first inventory item to {string}', { timeout: 120000 }, async function (qty) {
  await getInventoryPage(this).editUsedQuantityOnFirstItem(qty);
});

When('I open the actions menu for the first inventory item', { timeout: 120000 }, async function () {
  await getInventoryPage(this).openFirstItemActionsMenu();
});

When('I choose inventory item action {string}', { timeout: 120000 }, async function (action) {
  await getInventoryPage(this).selectItemActionFromMenu(action);
});

When('I confirm delete inventory item with reason {string}', { timeout: 120000 }, async function (reason) {
  await getInventoryPage(this).confirmDeleteInventoryItem(reason);
});

When('I complete move to warehouse if prompted', { timeout: 120000 }, async function () {
  await getInventoryPage(this).completeMoveToWarehouseIfPrompted('1');
});

When('I select the first inventory item checkbox', { timeout: 120000 }, async function () {
  await getInventoryPage(this).selectFirstInventoryItemCheckbox();
});

When('I click Link to Schedule in inventory', { timeout: 120000 }, async function () {
  await getInventoryPage(this).clickLinkToSchedule();
});

When('I complete schedule binding if prompted', { timeout: 120000 }, async function () {
  await getInventoryPage(this).completeScheduleBindingIfPrompted();
});

// ---------------------------------------------------------------------------
// Validation / dashboard
// ---------------------------------------------------------------------------

When('I try to create an inventory group without a name', { timeout: 120000 }, async function () {
  await getInventoryPage(this).submitCreateGroupWithoutName();
});

Then('I should see the create inventory group validation error', { timeout: 120000 }, async function () {
  await getInventoryPage(this).expectCreateGroupValidationError();
});

Then('I should see the inventory dashboard cards', { timeout: 120000 }, async function () {
  await getInventoryPage(this).expectInventoryDashboardCardsVisible();
});

// ---------------------------------------------------------------------------
// Request items form
// ---------------------------------------------------------------------------

When('I start an inventory item request from the group', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).startInventoryItemRequest();
});

When(
  'I add a pending request product with name {string} quantity {string} unit {string} unit cost {string}',
  { timeout: 180000 },
  async function (name, quantity, unit, unitCost) {
    const req = getInventoryRequestPage(this);
    await req.addRequestProduct({
      name,
      quantity,
      unit,
      unitCost,
      status: 'Pending Approval',
    });
    this.lastRequestedProducts = req.lastRequestedProducts;
    this.lastAddToGroupProductName =
      req.lastRequestedProducts[req.lastRequestedProducts.length - 1]?.name || null;
  }
);

When(
  'I add an approved request product with name {string} quantity {string} unit {string} unit cost {string}',
  { timeout: 180000 },
  async function (name, quantity, unit, unitCost) {
    const req = getInventoryRequestPage(this);
    await req.addRequestProduct({
      name,
      quantity,
      unit,
      unitCost,
      status: 'Approved',
    });
    this.lastRequestedProducts = req.lastRequestedProducts;
    this.lastAddToGroupProductName =
      req.lastRequestedProducts[req.lastRequestedProducts.length - 1]?.name || null;
  }
);

When('I submit the inventory item request keeping status', { timeout: 180000 }, async function () {
  const req = getInventoryRequestPage(this);
  await req.submitInventoryItemRequestKeepingStatus();
  this.lastRequestedProducts = req.lastRequestedProducts;
});

When('I submit the inventory item request as approved', { timeout: 180000 }, async function () {
  const req = getInventoryRequestPage(this);
  await req.submitInventoryItemRequest({ forceStatus: 'Approved' });
  this.lastRequestedProducts = req.lastRequestedProducts;
});

// ---------------------------------------------------------------------------
// Item Requests tab
// ---------------------------------------------------------------------------

When('I open Item Requests from inventory home', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).openItemRequestsFromHome();
});

Then('the Item Requests page should be ready', { timeout: 120000 }, async function () {
  await getInventoryRequestPage(this).expectItemRequestsPageReady();
});

When('I go back from Item Requests to Inventory', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).goBackFromItemRequestsToInventory();
});

When('I open the Item Requests tab {string}', { timeout: 120000 }, async function (tab) {
  await getInventoryRequestPage(this).selectItemRequestsStatusFilter(tab);
});

Then('the Item Requests tab {string} should be ready', { timeout: 120000 }, async function (tab) {
  await getInventoryRequestPage(this).expectItemRequestsTabReady(tab);
});

When('I approve the last pending inventory request', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).approveLastRequestedProduct();
});

When('I reject the last pending inventory request', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).rejectLastRequestedProduct();
});

When('I cancel the last pending inventory request', { timeout: 180000 }, async function () {
  await getInventoryRequestPage(this).cancelLastRequestedProduct();
});

When('I select the first {int} Item Requests rows', { timeout: 120000 }, async function (count) {
  await getInventoryRequestPage(this).selectFirstNItemRequestRows(count);
});

When('I click Item Requests bulk action {string}', { timeout: 180000 }, async function (action) {
  await getInventoryRequestPage(this).clickItemRequestsBulkAction(action);
});

When('I convert the last inventory request to {string}', { timeout: 180000 }, async function (target) {
  await getInventoryRequestPage(this).convertLastRequestedProductTo(target);
});

When('I smoke test Item Requests pagination', { timeout: 60000 }, async function () {
  await getInventoryRequestPage(this).smokeItemRequestsPagination();
});

Given('I am on Inventory ready for automation', { timeout: 240000 }, async function () {
  // Relies on shared login + project open steps already run in the scenario,
  // or callers include them. This helper only ensures Inventory module is ready.
  await getInventoryPage(this).waitForModuleToLoad();
});
