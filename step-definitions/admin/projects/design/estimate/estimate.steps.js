const { When, Then , setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const EstimatePage = require('../../../../../pages/admin/projects/design/estimate/estimate.page');

setDefaultTimeout(60000);

function getEstimatePage(world) {
  if (!world.estimatePage) {
    world.estimatePage = new EstimatePage(world.page);
  }
  return world.estimatePage;
}

When('I wait for estimate module to load', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.waitForModuleToLoad();
});

When('I click Create Estimate', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.clickCreateEstimate();
});

When('I start estimate from scratch and proceed', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.startFromScratchAndProceed();
});

When('I start estimate from template and proceed', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.startFromTemplateAndProceed();
});

When('I select estimate template category {string}', { timeout: 120000 }, async function (category) {
  this._estimateTemplateSelection = { ...(this._estimateTemplateSelection || {}), category };
});

When('I select estimate template sub category {string}', { timeout: 120000 }, async function (subCategory) {
  this._estimateTemplateSelection = { ...(this._estimateTemplateSelection || {}), subCategory };
});

When('I select estimate template {string}', { timeout: 120000 }, async function (template) {
  const estimatePage = getEstimatePage(this);
  const current = this._estimateTemplateSelection || {};
  const category = current.category || 'Commercial';
  const subCategory = current.subCategory || 'Waterproofing';
  await estimatePage.selectTemplateFromPopup({ category, subCategory, template });
  this._estimateTemplateSelection = { category, subCategory, template };
});

When('I confirm estimate template selection', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.confirmTemplateSelectionYes();
});

When('I click back to Estimate page', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.goBackToEstimateMainTab();
});

When('I click Save as draft & Continue', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.clickSaveAsDraftContinue();
});

When('I fill estimate title with {string}', { timeout: 120000 }, async function (title) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.fillEstimateTitleOnly(title);
});

When('I fill estimate title with random 4 letters', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.fillEstimateTitleOnly(estimatePage.randomLetters(4));
});

When('I select random Created on and Valid till dates from calendar', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.pickRandomCreatedOnAndValidTillFromCalendar();
});

When('I fill estimate mandatory details with title {string}', { timeout: 120000 }, async function (title) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.fillMandatoryDetails({ title, createdOffset: 0, validOffset: 7 });
});

When('I fill estimate mandatory details without title', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.fillMandatoryDetails({ createdOffset: 0, validOffset: 7 });
});

When('I fill estimate details with invalid date order and title {string}', { timeout: 120000 }, async function (title) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.fillMandatoryDetails({ title, createdOffset: 0, validOffset: -1 });
});

When('I add estimate section {string}', { timeout: 120000 }, async function (sectionName) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addSection(sectionName);
});

When('I add estimate section with random 6 letter name', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addSection(estimatePage.randomLetters(6));
});

When('I click Add Section button to add another section', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.clickAddSectionButton();
});

When('I fill second section name and add manual item details with random data', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.createSecondSectionAndAddItemRandom();
});

When('I fill Qty Unit Rate Profit and add materials in second section', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.fillSecondSectionItemAndMaterialCostsRandom();
});

When('I add manual estimate item with name {string}', { timeout: 120000 }, async function (itemName) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addManualItem(
    {
      name: itemName,
      description: 'test description',
      qty: 1,
      unit: 'Nos',
      rate: 100,
      profit: 10
    },
    { manualIndex: 0 }
  );
});

When('I add manual estimate item with random 4 letter name', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addManualItem(
    {
      name: estimatePage.randomLetters(4),
      description: 'test description',
      qty: 1,
      unit: 'Nos',
      rate: 100,
      profit: 10
    },
    { manualIndex: 0 }
  );
});

When('I add another manual estimate item with name {string}', { timeout: 120000 }, async function (itemName) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addManualItem(
    {
      name: itemName,
      description: 'test description',
      qty: 1,
      unit: 'Nos',
      rate: 100,
      profit: 10
    },
    { manualIndex: 1 }
  );
});

When('I add another manual estimate item with random 4 letter name', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addManualItem(
    {
      name: estimatePage.randomLetters(4),
      description: 'test description',
      qty: 1,
      unit: 'Nos',
      rate: 100,
      profit: 10
    },
    { manualIndex: 1 }
  );
});

When('I try to add manual estimate item without name', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addManualItem(
    {
      description: 'test description',
      qty: 1,
      unit: 'Nos',
      rate: 100,
      profit: 10
    },
    { manualIndex: 0 }
  );
});

When('I add first item from estimate library', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addFromLibraryFirstItem();
});

When('I add smoke catalog via Add Product Service and library', { timeout: 300000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addSmokeCatalogViaProductServiceAndLibrary();
});

When('I open estimate library and click add without selection', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addFromLibraryWithoutSelection();
});

When('I add estimate charge {string} with value {string}', { timeout: 120000 }, async function (chargeName, value) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addCharge(chargeName, value);
});

When('I fill first other charge with random data', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.fillFirstOtherChargeRandom();
});

When('I add second other charge with random data', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addSecondOtherChargeRandom();
});

When('I click percent toggle for second other charge', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.clickSecondChargePercentToggle();
});

When('I switch estimate charge type to fixed and set value {string}', { timeout: 120000 }, async function (value) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.switchChargeType('Fixed', value);
});

When('I switch estimate charge type to percentage and set value {string}', { timeout: 120000 }, async function (value) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.switchChargeType('%', value);
});

When('I add estimate discount using first option', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addDiscountFirstOption();
});

When('I add estimate tax using first option', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addTaxFirstOption();
});

When('I enable estimate round off', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.enableRoundOff();
});

When('I add estimate terms from first template', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addTermsFromTemplate();
});

When('I enable estimate digital signature', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.enableDigitalSignature();
});

When('I add custom estimate column {string} with type {string}', { timeout: 120000 }, async function (name, type) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addCustomColumn(name, type);
});

When('I add custom estimate column with random name and Link type', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addCustomColumnRandomLink();
});

When('I click estimate action compose email and send', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.composeAndSendEmail();
});

When('I save estimate as draft from action menu', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.saveAsDraftFromActionMenu();
});

When('I open Draft tab in estimate module', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.openDraftTab();
});

When('I open first draft options menu and click Edit', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.openFirstDraftOptionsAndEdit();
});

When('I preview estimate and return to edit page', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.previewEstimateAndReturnToEditPage();
});

When('I preview first drafted estimate and close preview', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.previewFirstDraftAndClose();
});

When('I compose draft estimate email from Draft tab and send', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.composeDraftEmailFromDraftTabAndSend();
});

When('I click estimate action compose email', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.openComposeEmail();
});

When('I attempt to send estimate email', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.attemptSendEstimateEmail();
});

When('I open compose email and clear recipient field', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.openComposeEmail();
  await estimatePage.clearRecipientField();
});

When('I send estimate email from compose popup', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.sendEmailFromPopup();
});

When('I add {int} manual estimate items', { timeout: 180000 }, async function (count) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.addManualItems(count);
});

When('I remove last estimate item', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.removeLastItem();
});

When('I wait for estimate form with slow load handling', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.waitForFormSlowHandling();
});

Then('I should see estimate success toast {string}', { timeout: 120000 }, async function (message) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.isToastVisible(message);
});

Then('I should see estimate validation message', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.expectValidationMessageVisible();
});

Then('I should see at least {int} estimate items in table', { timeout: 120000 }, async function (count) {
  const estimatePage = getEstimatePage(this);
  const itemCount = await estimatePage.getItemCount();
  expect(itemCount).toBeGreaterThanOrEqual(count);
});

Then('estimate charge should be visible', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.expectChargeValueVisible();
});

Then('I should see estimate section {string}', { timeout: 120000 }, async function (sectionName) {
  const estimatePage = getEstimatePage(this);
  await estimatePage.expectSectionVisible(sectionName);
});

Then('I should see no estimate items in table', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  const itemCount = await estimatePage.getItemCount();
  expect(itemCount).toBe(0);
});

Then('estimate form should be visible', { timeout: 120000 }, async function () {
  const estimatePage = getEstimatePage(this);
  await estimatePage.waitForFormSlowHandling();
});

Then('I should see duplicate estimate items with name {string}', { timeout: 120000 }, async function (name) {
  const estimatePage = getEstimatePage(this);
  const duplicateCount = await estimatePage.getDuplicateCount(name);
  expect(duplicateCount).toBeGreaterThanOrEqual(2);
});
