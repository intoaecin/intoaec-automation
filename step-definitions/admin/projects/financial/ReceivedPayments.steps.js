const { Given, When, Then } = require('@cucumber/cucumber');
const ReceivedPaymentsPage = require('../../../../pages/admin/projects/financial/ReceivedPaymentsPage');

function getPage(world) {
  if (!world.receivedPaymentsPage) {
    world.receivedPaymentsPage = new ReceivedPaymentsPage(world.page);
  }
  return world.receivedPaymentsPage;
}

Given('I open a project with Received Payments available', { timeout: 180000 }, async function () {
  await getPage(this).openProjectWithReceivedPayments();
});

When('I wait for the Received Payments module to load', { timeout: 120000 }, async function () {
  await getPage(this).waitForModuleReady();
});

Then('I should see the Received Payments module ready', { timeout: 60000 }, async function () {
  await getPage(this).waitForModuleReady();
});

When('I click Add Received Payment', { timeout: 120000 }, async function () {
  await getPage(this).clickAddPayment();
});

When('I fill the received payment form with unique details', { timeout: 120000 }, async function () {
  const result = await getPage(this).fillPaymentForm();
  this.lastPaymentMarker = result.marker;
});

When('I submit the Received Payments create form', { timeout: 120000 }, async function () {
  await getPage(this).submitCreate();
});

Then('the received payment should be created successfully', { timeout: 120000 }, async function () {
  await getPage(this).expectCreateSuccess();
  await getPage(this).expectPaymentByMarker(this.lastPaymentMarker || getPage(this).lastPaymentMarker);
});

When('I open the created received payment', { timeout: 120000 }, async function () {
  await getPage(this).openRowByMarker(this.lastPaymentMarker || getPage(this).lastPaymentMarker);
});

Then('I should see the received payment in read-only view', { timeout: 120000 }, async function () {
  await getPage(this).expectReadOnlyPaymentView();
});

When('I submit the Received Payments create form without required fields', { timeout: 60000 }, async function () {
  await getPage(this).submitEmptyCreate();
});

Then('I should see a Received Payments validation message', { timeout: 60000 }, async function () {
  await getPage(this).expectValidationMessage();
});

When('I search Received Payments for the created payment', { timeout: 60000 }, async function () {
  await getPage(this).searchInModule(this.lastPaymentMarker || getPage(this).lastPaymentMarker);
});

Then('I should see the created payment in the search results', { timeout: 60000 }, async function () {
  await getPage(this).expectPaymentByMarker(this.lastPaymentMarker || getPage(this).lastPaymentMarker);
});
