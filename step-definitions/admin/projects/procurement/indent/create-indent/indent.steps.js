const { When, Then } = require('@cucumber/cucumber');
const IndentPage = require('../../../../../../pages/admin/projects/procurement/indent/create-indent/indent.page');

function getIndentPage(world) {
  if (!world.indentPage) {
    world.indentPage = new IndentPage(world.page);
  }
  return world.indentPage;
}

When(
  'I navigate to the indent module for the first project',
  { timeout: 180000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.navigateToIndentModuleForFirstProject();
  }
);

When(
  'I click create indent on the indent list',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.clickCreateIndentListButton();
  }
);

Then(
  'I should see the select indent type popup',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.expectSelectIndentTypeDialogVisible();
  }
);

When(
  'I select material indent and proceed on the indent type popup',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.selectMaterialIndentAndProceed();
  }
);

Then(
  'I should see the create indent form displayed',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.expectIndentCreateFormDisplayed();
  }
);

When(
  'I fill indent title with {string}',
  { timeout: 120000 },
  async function (title) {
    const indent = getIndentPage(this);
    await indent.fillIndentTitle(title);
  }
);

When(
  'I add an indent manual line item with name {string} and quantity {string}',
  { timeout: 120000 },
  async function (lineItem, quantity) {
    const indent = getIndentPage(this);
    await indent.addIndentLineItemManually({ lineItem, quantity });
  }
);

When(
  'I select the first available unit on the indent line item',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.selectFirstIndentLineItemUnit();
  }
);

When(
  'I click create on the indent form',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.clickCreateIndentOnForm();
  }
);

When(
  'I complete the material indent create journey with title {string} line item {string} and quantity {string}',
  { timeout: 360000 },
  async function (title, lineItem, quantity) {
    const indent = getIndentPage(this);
    await indent.completeMaterialIndentCreateJourney({ title, lineItem, quantity });
  }
);

When(
  'I complete the work indent create journey with title {string} line item {string} and quantity {string}',
  { timeout: 360000 },
  async function (title, lineItem, quantity) {
    const indent = getIndentPage(this);
    await indent.completeWorkIndentCreateJourney({ title, lineItem, quantity });
  }
);

When(
  'I select the first approver on the indent create form',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.selectFirstIndentApprover();
  }
);

When(
  'I complete the material indent create journey with approver title {string} line item {string} and quantity {string}',
  { timeout: 360000 },
  async function (title, lineItem, quantity) {
    const indent = getIndentPage(this);
    await indent.completeMaterialIndentCreateWithApproverJourney({
      title,
      lineItem,
      quantity,
    });
  }
);

Then(
  'I should see the indent created successfully',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.expectIndentCreatedSuccessfully();
  }
);

When(
  'I open the three dot menu on the first indent card',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.openThreeDotMenuOnFirstIndentCard();
  }
);

When(
  'I click preview in the indent card menu',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.clickPreviewInIndentCardMenu();
  }
);

Then(
  'I should see the indent preview page',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.expectIndentPreviewVisible();
  }
);

When(
  'I click edit in the indent card menu',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.clickEditInIndentCardMenu();
  }
);

Then(
  'I should see the indent edit form displayed',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.expectIndentEditFormDisplayed();
  }
);

When(
  'I click add manually on the indent form',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.clickAddManuallyOnIndentForm();
  }
);

When(
  'I click convert indent on the first indent card',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.clickConvertIndentOnFirstIndentCard();
  }
);

When(
  'I select PO from the convert indent options',
  { timeout: 180000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.selectPoFromConvertIndentOptions();
  }
);

When(
  'I add vendor details with the first vendor on the purchase order from indent',
  { timeout: 180000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.addFirstVendorDetailsOnPurchaseOrderFromIndent();
  }
);

When(
  'I fill rate {string} on the first purchase order line item from indent',
  { timeout: 120000 },
  async function (rate) {
    const indent = getIndentPage(this);
    await indent.fillRateOnFirstPurchaseOrderLineItemFromIndent(rate);
  }
);

When(
  'I open compose email on the purchase order from indent',
  { timeout: 180000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.openComposeEmailOnPurchaseOrderFromIndent();
  }
);

When(
  'I send the purchase order email from the indent convert compose dialog',
  { timeout: 180000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.sendComposeEmailOnPurchaseOrderFromIndent();
  }
);

Then(
  'I should see the purchase order email sent successfully from indent convert',
  { timeout: 120000 },
  async function () {
    const indent = getIndentPage(this);
    await indent.expectPurchaseOrderEmailSentFromIndentConvert();
  }
);
