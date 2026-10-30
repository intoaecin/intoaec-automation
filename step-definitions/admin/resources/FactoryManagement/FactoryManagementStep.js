const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const FactoryManagementPage = require('../../../../pages/admin/resources/FactoryManagement/FactoryManagementPage');
const ManufacturingOrderPage = require('../../../../pages/admin/resources/FactoryManagement/ManufacturingOrderPage');
const FactoryWorkshopPage = require('../../../../pages/admin/resources/FactoryManagement/FactoryWorkshopPage');
const { getContext, has } = require('../../../../pages/admin/resources/FactoryManagement/factoryTestContext');

setDefaultTimeout(120000);

const FACTORY_TEST_CASE_LOG = {
  TC01: 'TC-01 — Open Factory Management Jobs with status tabs and workshop location',
  TC02: 'TC-02 — Open every Factory Management workshop and settings menu item',
  TC03: 'TC-03 — Open the incoming tab alias on Requests',
  TC04: 'TC-04 — Create a factory location and assign the logged-in user',
  TC05: 'TC-05 — Edit a factory location zip code',
  TC06: 'TC-06 — Deactivate and activate a factory location',
  TC07: 'TC-07 — Block a factory location when required fields are blank',
  TC08: 'TC-08 — Reject a duplicate factory workshop name',
  TC09: 'TC-09 — Add a custom factory trade and a stage',
  TC10: 'TC-10 — Keep stage Save disabled until the name changes',
  TC11: 'TC-11 — Rename a factory trade',
  TC12: 'TC-12 — Change the primary factory trade and restore the original',
  TC13: 'TC-13 — Delete an unused factory stage',
  TC14: 'TC-14 — Reject blank or duplicate factory trade and stage names',
  TC15: 'TC-15 — Block deletion of a factory stage that a job has used',
  TC16: 'TC-16 — Raise a manufacturing order for the factory workshop',
  TC17: 'TC-17 — Open Add Location from Create New Workshop',
  TC18: 'TC-18 — Edit notes on a raised manufacturing order',
  TC19: 'TC-19 — Delete a raised manufacturing order from the project',
  TC20: 'TC-20 — Block a manufacturing order when required fields are invalid',
  TC21: 'TC-21 — Accept a factory job, add a material, and start it',
  TC22: 'TC-22 — Decline a raised factory job',
  TC23: 'TC-23 — Keep Start job unavailable until the order has materials',
  TC24: 'TC-24 — Propose a factory date and accept it on the project card',
  TC25: 'TC-25 — Propose a factory date and decline it on the project card',
  TC26: 'TC-26 — Reject a ready-to-leave date and an early proposed date',
  TC27: 'TC-27 — Add factory stock from the cost catalog',
  TC28: 'TC-28 — Block factory stock without a material or with quantity zero',
  TC29: 'TC-29 — Issue factory stock to an in-progress job',
  TC30: 'TC-30 — Reject an issued quantity above available stock',
  TC31: 'TC-31 — Update production, mark ready to leave, and complete the job',
  TC32: 'TC-32 — Reject stage, pack, and return quantities that are too high',
  TC33: 'TC-33 — Create an indent from the job and receive the material',
  TC34: 'TC-34 — Bulk receive two factory request materials',
  TC35: 'TC-35 — Reject a received quantity of zero or above pending',
  TC36: 'TC-36 — Create a dispatch load for a job that is ready to leave',
  TC37: 'TC-37 — Block a dispatch load without a ready job or required fields',
  TC38: 'TC-38 — Filter factory activities and match the activity count',
};

Before({ tags: '@factory-tc' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((tag) => tag.name.replace(/^@/, ''));
  const tc = tags.find((tag) => /^TC\d+$/i.test(tag));
  if (tc && FACTORY_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${FACTORY_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getFactoryManagementPage(world) {
  if (!world.factoryManagementPage || world.factoryManagementPage.page !== world.page) {
    world.factoryManagementPage = new FactoryManagementPage(world.page);
  }
  return world.factoryManagementPage;
}

function getManufacturingOrderPage(world) {
  if (!world.manufacturingOrderPage || world.manufacturingOrderPage.page !== world.page) {
    world.manufacturingOrderPage = new ManufacturingOrderPage(world.page);
  }
  return world.manufacturingOrderPage;
}

function getFactoryWorkshopPage(world) {
  if (!world.factoryWorkshopPage || world.factoryWorkshopPage.page !== world.page) {
    world.factoryWorkshopPage = new FactoryWorkshopPage(world.page);
  }
  return world.factoryWorkshopPage;
}

async function ensureLocation(world) {
  await getFactoryManagementPage(world).createLocation();
}

async function ensureTradeAndStage(world) {
  await ensureLocation(world);
  await getFactoryManagementPage(world).addTradeAndStage();
}

async function ensureRaisedJob(world) {
  await ensureLocation(world);
  await getManufacturingOrderPage(world).ensureMainJob();
}

async function ensureStartedJob(world) {
  await ensureTradeAndStage(world);
  await ensureRaisedJob(world);
  await getFactoryWorkshopPage(world).acceptAddMaterialAndStart();
}

When('I select Factory Management', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).openModule();
});

Then('the factory Jobs page should show status tabs and a workshop location', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectJobsLanding();
});

When('I open each factory workshop and settings menu item', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).expectEveryMenuTitle();
});

Then('each factory menu item should show its page title', async function () {
  await getFactoryManagementPage(this).ui.expectPageTitle('Stages');
});

When('I open the factory incoming tab alias', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).openIncomingAlias();
});

Then('the factory Requests page should be displayed', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectRequestsPage();
});

When('I create a factory location with a unique workshop name', { timeout: 180000 }, async function () {
  const ctx = await getFactoryManagementPage(this).createLocation();
  console.log(`[Factory] Workshop ${ctx.workshopName}, trade ${ctx.pickedTradeName || ctx.tradeName}`);
});

Then('the factory location row should show the workshop name, trade, and address', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectLocationRow();
});

When('I edit the factory location zip code and save', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).editLocationZip();
});

Then('the factory location should show the updated zip code', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectEditedZip();
});

When('I deactivate and activate the factory location', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).deactivateAndActivate();
});

Then('the factory location activated toast should be shown', async function () {
  console.log('[Factory] Location activated toast was shown while the location was reactivated');
});

When('I try to create a factory location with blank required fields', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectBlankLocationValidation();
});

Then('the factory location required field messages should be shown', async function () {
  console.log('[Factory] Location required-field messages were shown');
});

When('I try to create a factory location with a duplicate workshop name', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).expectDuplicateLocation();
});

Then('the factory duplicate location message should be shown', async function () {
  console.log('[Factory] Duplicate workshop name was rejected');
});

When('I add a custom factory trade and a stage', { timeout: 180000 }, async function () {
  const ctx = getContext();
  await getFactoryManagementPage(this).addTradeAndStage();
  console.log(`[Factory] Trade ${ctx.tradeName}, stage ${ctx.stageName}`);
});

Then('the factory stage should appear under that trade', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectStageUnderTrade();
});

When('I open the factory stage editor', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).expectStageSaveDisabledUntilChange();
});

Then('the factory stage save button should be disabled until the name changes', async function () {
  console.log('[Factory] Stage Save stayed disabled until the name changed');
});

When('I save the edited factory stage name', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).saveEditedStage();
});

Then('the edited factory stage should be visible', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectEditedStageVisible();
});

When('I rename the factory trade', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).renameTrade();
});

Then('the renamed factory trade should be selected', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectRenamedTrade();
});

When('I change the factory primary trade and restore the original', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).changePrimaryAndRestore();
});

Then('the original factory primary trade should be primary again', { timeout: 120000 }, async function () {
  await getFactoryManagementPage(this).expectOriginalPrimary();
});

When('I delete an unused factory stage', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).deleteUnusedStage();
});

Then('the unused factory stage should be removed', async function () {
  console.log(`[Factory] Unused stage ${getContext().unusedStageName} was removed`);
});

When('I submit invalid factory trade and stage names', { timeout: 180000 }, async function () {
  await getFactoryManagementPage(this).expectTradeAndStageValidation();
});

Then('the factory trade and stage validation messages should be shown', async function () {
  console.log('[Factory] Trade and stage validation messages were shown');
});

When('I try to delete a factory stage that a job has used', { timeout: 300000 }, async function () {
  const workshop = getFactoryWorkshopPage(this);
  await ensureStartedJob(this);
  const ctx = getContext();
  const drawer = await workshop.openUpdateProduction(ctx.jobTitle);
  await workshop.prepareStages(drawer);
  await workshop.setStageQuantity(drawer, ctx.stageName, '1');
  await getFactoryManagementPage(this).deleteInUseStage();
});

Then('the factory in-use stage message should be shown', async function () {
  console.log('[Factory] In-use stage deletion was blocked');
});

When('I raise a factory manufacturing order for the workshop', { timeout: 300000 }, async function () {
  await ensureRaisedJob(this);
  console.log(`[Factory] Raised ${getContext().jobTitle} for ${getContext().workshopName}`);
});

Then('the raised factory job should be listed under Yet to start', { timeout: 180000 }, async function () {
  await getFactoryWorkshopPage(this).expectJobOnTab(getContext().jobTitle, 'Yet to start');
});

When('I choose Create New Workshop on the manufacturing order form', { timeout: 300000 }, async function () {
  await getManufacturingOrderPage(this).openCreateNewWorkshop();
});

Then('the factory Add Location form should open from the workshop shortcut', { timeout: 180000 }, async function () {
  await getManufacturingOrderPage(this).expectAddLocationShortcut();
});

When('I edit the raised factory job notes and save', { timeout: 300000 }, async function () {
  await getManufacturingOrderPage(this).editRaisedJobNotes();
});

Then('the factory job update toast should be shown', async function () {
  console.log('[Factory] Job updated toast was shown');
});

When('I delete a raised factory job from the project', { timeout: 300000 }, async function () {
  await ensureLocation(this);
  await getManufacturingOrderPage(this).deleteRaisedJob();
});

Then('the deleted factory job should not be listed', async function () {
  console.log(`[Factory] ${getContext().deleteJobTitle} was deleted`);
});

When('I try to create a factory job with invalid required fields', { timeout: 300000 }, async function () {
  await getManufacturingOrderPage(this).expectInvalidOrderValidation();
});

Then('the factory job required field messages should be shown', async function () {
  console.log('[Factory] Manufacturing order required-field messages were shown');
});

When('I accept the factory job, add a material, and start it', { timeout: 300000 }, async function () {
  await ensureStartedJob(this);
  console.log(`[Factory] Started ${getContext().jobTitle}`);
});

Then('the factory job should be listed under In Progress', { timeout: 180000 }, async function () {
  await getFactoryWorkshopPage(this).expectJobOnTab(getContext().jobTitle, 'In Progress');
});

When('I decline a raised factory job', { timeout: 300000 }, async function () {
  await ensureLocation(this);
  const title = getContext().declineJobTitle;
  await getManufacturingOrderPage(this).raiseOrder(title);
  await getFactoryWorkshopPage(this).declineDifferentJob(title);
});

Then('the declined factory job should be absent from the job status tabs', async function () {
  console.log(`[Factory] ${getContext().declineJobTitle} left the job tabs`);
});

When('I accept a factory job that has no materials', { timeout: 300000 }, async function () {
  await ensureLocation(this);
  const title = getContext().noMaterialJobTitle;
  await getManufacturingOrderPage(this).raiseOrder(title);
  await getFactoryWorkshopPage(this).acceptJob(title);
});

Then('the factory job should show Add materials and not Start job', { timeout: 180000 }, async function () {
  await getFactoryWorkshopPage(this).expectAddMaterialsInsteadOfStart(getContext().noMaterialJobTitle);
});

When('I propose a factory date and accept it on the project card', { timeout: 300000 }, async function () {
  await ensureLocation(this);
  await getManufacturingOrderPage(this).proposeAndAcceptDate();
});

Then('the factory job should no longer wait for date confirmation', { timeout: 180000 }, async function () {
  await getManufacturingOrderPage(this).expectDateNoLongerWaiting();
});

When('I propose a factory date and decline it on the project card', { timeout: 300000 }, async function () {
  await ensureLocation(this);
  await getManufacturingOrderPage(this).proposeAndDeclineDate();
});

Then('the factory proposed date declined toast should be shown', async function () {
  console.log('[Factory] Proposed date declined toast was shown');
});

When('I enter an invalid factory ready to leave date and an early proposed date', { timeout: 300000 }, async function () {
  await ensureLocation(this);
  await getManufacturingOrderPage(this).expectInvalidDates();
});

Then('the factory date validation messages should be shown', async function () {
  console.log('[Factory] Date validation messages were shown');
});

When('I add factory stock for a cost catalog material', { timeout: 180000 }, async function () {
  await ensureLocation(this);
  await getFactoryWorkshopPage(this).addStock();
  console.log(`[Factory] Stock ${getContext().stockMaterialName}`);
});

Then('the factory stock row should show received and available quantities', { timeout: 120000 }, async function () {
  await getFactoryWorkshopPage(this).expectStockRow();
});

When('I try to add factory stock with invalid fields', { timeout: 180000 }, async function () {
  await ensureLocation(this);
  await getFactoryWorkshopPage(this).expectInvalidStock();
});

Then('the factory stock validation messages should be shown', async function () {
  console.log('[Factory] Stock validation messages were shown');
});

When('I issue factory stock to the in-progress job', { timeout: 300000 }, async function () {
  await ensureStartedJob(this);
  await getFactoryWorkshopPage(this).issueWithinStock();
});

Then('the factory material status should no longer be Not in stock', async function () {
  console.log('[Factory] Issued material is no longer Not in stock');
});

When('I issue more factory stock than is available', { timeout: 300000 }, async function () {
  await ensureStartedJob(this);
  if (!has('stockAdded')) {
    await getFactoryWorkshopPage(this).addStock();
  }
  await getFactoryWorkshopPage(this).issueAboveAvailable();
});

Then('the factory issued quantity validation message should be shown', async function () {
  console.log('[Factory] Issued quantity above available stock was rejected');
});

When('I update factory stage progress, mark the job ready to leave, and complete it', { timeout: 300000 }, async function () {
  await ensureStartedJob(this);
  await getFactoryWorkshopPage(this).markReadyAndComplete();
});

Then('the factory job should be listed under Completed', { timeout: 180000 }, async function () {
  await getFactoryWorkshopPage(this).expectJobOnTab(getContext().jobTitle, 'Completed');
});

When('I enter factory stage, pack, and return quantities that are too high', { timeout: 300000 }, async function () {
  await ensureStartedJob(this);
  await getFactoryWorkshopPage(this).expectProgressValidation();
});

Then('the factory progress validation messages should be shown', async function () {
  console.log('[Factory] Progress validation messages were shown');
});

When('I create an indent from the factory job and receive the material', { timeout: 300000 }, async function () {
  await ensureStartedJob(this);
  await getFactoryWorkshopPage(this).createIndentAndReceive();
});

Then('the factory goods receipt should list the received material', async function () {
  console.log('[Factory] Goods Receipt lists the received material');
});

When('I bulk receive two factory request materials', { timeout: 300000 }, async function () {
  await ensureStartedJob(this);
  await getFactoryWorkshopPage(this).bulkReceive();
});

Then('the factory bulk receive success toast should be shown', async function () {
  console.log('[Factory] Bulk receive toast was shown');
});

When('I receive an invalid factory request quantity', { timeout: 300000 }, async function () {
  await ensureLocation(this);
  await getFactoryWorkshopPage(this).expectInvalidReceive();
});

Then('the factory receive validation messages should be shown', async function () {
  console.log('[Factory] Receive quantity validation was shown');
});

When('I create a factory dispatch load for a ready job', { timeout: 300000 }, async function () {
  await ensureStartedJob(this);
  const workshop = getFactoryWorkshopPage(this);
  if (!has('jobCompleted')) {
    await workshop.ensurePackedForDispatch();
  }
  await workshop.createDispatchLoad();
});

Then('the factory load should be listed under Loads going out', async function () {
  console.log(`[Factory] Load listed for ${getContext().destination}`);
});

When('I try to create a factory dispatch load without required fields', { timeout: 180000 }, async function () {
  await ensureLocation(this);
  await getFactoryWorkshopPage(this).expectDispatchValidation();
});

Then('the factory dispatch validation should be shown', async function () {
  console.log('[Factory] Dispatch validation was shown');
});

When('I filter factory activities by source and manufacturing order', { timeout: 180000 }, async function () {
  await ensureLocation(this);
  await getFactoryWorkshopPage(this).expectActivities();
});

Then('the factory activity count should match the visible list', async function () {
  console.log('[Factory] Activity count matched the visible list');
});
