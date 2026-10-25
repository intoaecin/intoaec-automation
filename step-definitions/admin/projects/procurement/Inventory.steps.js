const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const InventoryPage = require('../../../../pages/admin/projects/procurement/InventoryPage');

setDefaultTimeout(120000);

function getInventoryPage(world) {
  if (!world.inventoryPage || world.inventoryPage.page !== world.page) {
    world.inventoryPage = new InventoryPage(world.page);
  }
  // Keep group name set by Goods Receipt / other modules.
  if (
    world.lastCreatedInventoryGroupName &&
    !world.inventoryPage.lastCreatedGroupName
  ) {
    world.inventoryPage.lastCreatedGroupName = world.lastCreatedInventoryGroupName;
  }
  return world.inventoryPage;
}

Before({ tags: '@inventory' }, async function (scenario) {
  const tagNames = (scenario.pickle.tags || []).map((t) => String(t.name || '').replace(/^@/, ''));
  const tcTag = tagNames.find((name) => /^TC\d{2}$/i.test(name));
  if (tcTag) {
    console.log(`\n========== Inventory flow — ${tcTag} ==========\n`);
  }
});

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
  await getInventoryPage(this).clickCreateOnGroupPopup();
});

Then('the created inventory group should be visible', { timeout: 180000 }, async function () {
  await getInventoryPage(this).expectCreatedGroupVisible();
});

When('I open the newly created inventory group', { timeout: 180000 }, async function () {
  const inv = getInventoryPage(this);
  if (this.lastCreatedInventoryGroupName) {
    inv.lastCreatedGroupName = this.lastCreatedInventoryGroupName;
  }
  // Prefer InventoryRequestPage when present (has Item Requests → groups list navigation).
  if (this.inventoryRequestPage) {
    this.inventoryRequestPage.lastCreatedGroupName =
      this.lastCreatedInventoryGroupName || inv.lastCreatedGroupName;
    this.inventoryRequestPage.page = this.page;
    await this.inventoryRequestPage.openCreatedInventoryGroup();
    return;
  }
  await inv.openCreatedInventoryGroup();
});

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

When('I select the first checkbox from the inventory list', { timeout: 120000 }, async function () {
  await getInventoryPage(this).selectFirstInventoryListCheckbox();
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
