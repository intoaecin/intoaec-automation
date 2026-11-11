// step-definitions/admin/client/master/ClientManagerStep.js
const { Given, When, Then } = require('@cucumber/cucumber');
const ClientMasterPage = require('../../../../pages/admin/client/master/ClientMasterPage');

function getPage(world) {
  if (!world.clientMasterPage || world.clientMasterPage.page !== world.page) {
    world.clientMasterPage = new ClientMasterPage(world.page);
  }
  return world.clientMasterPage;
}

Given('I open the Client Manager master page', { timeout: 180000 }, async function () {
  await getPage(this).navigateToClientManager();
});

Given('I wait for the Client Manager list to load', { timeout: 180000 }, async function () {
  await getPage(this).waitForListReady();
});

When('I create a disposable Client Manager client', { timeout: 180000 }, async function () {
  this.lastClientManagerClientName = await getPage(this).createDisposableClient('QA CM');
});

When('I create a second disposable Client Manager client', { timeout: 180000 }, async function () {
  this.lastClientManagerClientName2 = await getPage(this).createDisposableClient('QA CM');
});

When('I search Client Manager for the created client', { timeout: 120000 }, async function () {
  const name = this.lastClientManagerClientName || getPage(this).lastClientName;
  await getPage(this).searchClient(name);
});

When('I search Client Manager for {string}', { timeout: 120000 }, async function (query) {
  await getPage(this).searchClient(query);
});

Then('I should see the created client in the Client Manager list', { timeout: 120000 }, async function () {
  const name = this.lastClientManagerClientName || getPage(this).lastClientName;
  await getPage(this).expectClientVisibleInList(name);
});

Then('Client Manager search should show no matching clients', { timeout: 120000 }, async function () {
  await getPage(this).expectNoClientMatch('ZZZ-NO-MATCH-CLIENT-999');
});

When('I open the Client Manager row actions for the created client', { timeout: 120000 }, async function () {
  const name = this.lastClientManagerClientName || getPage(this).lastClientName;
  await getPage(this).openRowActionsMenu(name);
});

When('I choose the Client Manager row action {string}', { timeout: 120000 }, async function (action) {
  await getPage(this).chooseRowAction(action);
});

Then('the Client Manager row action {string} should be visible', { timeout: 60000 }, async function (action) {
  await getPage(this).expectRowActionVisible(action, true);
});

Then('the Client Manager row kebab should be hidden', { timeout: 60000 }, async function () {
  await getPage(this).expectNoRowKebabOnCompleted();
});

When('I select the created client in Client Manager', { timeout: 120000 }, async function () {
  const name = this.lastClientManagerClientName || getPage(this).lastClientName;
  await getPage(this).selectClientRow(name);
});

When('I select the second created client in Client Manager', { timeout: 120000 }, async function () {
  const name = this.lastClientManagerClientName2 || getPage(this).lastClientNames.slice(-1)[0];
  await getPage(this).selectClientRow(name);
});

Then('the Client Manager bulk actions should be available', { timeout: 120000 }, async function () {
  await getPage(this).expectBulkActionsVisible(true);
});

When('I choose the Client Manager bulk action {string}', { timeout: 120000 }, async function (action) {
  await getPage(this).chooseBulkAction(action);
});

Then('I should still be on the Client Manager list', { timeout: 120000 }, async function () {
  await getPage(this).expectStillOnClientList();
});

Then('I should be on the Client Manager overview', { timeout: 120000 }, async function () {
  await getPage(this).expectOnClientOverview();
});

Then('I should be navigated to the Client Manager profile page', { timeout: 120000 }, async function () {
  await getPage(this).expectNavigatedToClientProfile();
});

Then('I should be on the Client Manager Completed tab', { timeout: 120000 }, async function () {
  await getPage(this).expectOnCompletedTab();
});

When('I open the Client Manager {string} tab', { timeout: 120000 }, async function (tab) {
  await getPage(this).openStatusTab(tab);
});

When('I confirm the Client Manager dialog', { timeout: 120000 }, async function () {
  await getPage(this).confirmDialogYes();
});

When('I cancel the Client Manager dialog', { timeout: 120000 }, async function () {
  await getPage(this).cancelDialog();
});

Then('I should see a Client Manager toast matching {string}', { timeout: 120000 }, async function (pattern) {
  await getPage(this).expectToastMatching(new RegExp(pattern, 'i'));
});

When('I copy the Client Manager project id for the created client', { timeout: 120000 }, async function () {
  const name = this.lastClientManagerClientName || getPage(this).lastClientName;
  await getPage(this).copyProjectIdFromRow(name);
});

When('I open Client Manager Manage Columns', { timeout: 120000 }, async function () {
  await getPage(this).openManageColumns();
});

When('I show the Client Manager column {string}', { timeout: 120000 }, async function (label) {
  await getPage(this).toggleManageColumn(label, true);
});

When('I hide the Client Manager column {string}', { timeout: 120000 }, async function (label) {
  await getPage(this).toggleManageColumn(label, false);
});

When('I save Client Manager Manage Columns', { timeout: 120000 }, async function () {
  await getPage(this).saveManageColumns();
});

When('I cancel Client Manager Manage Columns', { timeout: 120000 }, async function () {
  await getPage(this).cancelManageColumns();
});

When('I reset Client Manager Manage Columns', { timeout: 120000 }, async function () {
  await getPage(this).resetManageColumns();
});

When('I open Client Manager Transfer Users', { timeout: 120000 }, async function () {
  await getPage(this).openTransferUsers();
});

When('I fill Client Manager Transfer Users as Reporter', { timeout: 120000 }, async function () {
  await getPage(this).fillTransferUsers({ role: 'Reporter', fromIndex: 0, toIndex: 1 });
});

When('I fill Client Manager Transfer Users as Assignee', { timeout: 120000 }, async function () {
  await getPage(this).fillTransferUsers({ role: 'Assignee', fromIndex: 0, toIndex: 1 });
});

When('I confirm Client Manager Transfer Users', { timeout: 120000 }, async function () {
  await getPage(this).confirmTransferUsers();
});

When('I cancel Client Manager Transfer Users', { timeout: 120000 }, async function () {
  await getPage(this).cancelTransferUsers();
});

When('I open Client Manager filters', { timeout: 120000 }, async function () {
  await getPage(this).openFilters();
});

When('I clear Client Manager filters', { timeout: 120000 }, async function () {
  await getPage(this).clearFilters();
});

When('I sort Client Manager by column {string}', { timeout: 120000 }, async function (header) {
  await getPage(this).sortByHeader(header);
});

When('I set Client Manager rows per page to {int}', { timeout: 120000 }, async function (count) {
  await getPage(this).setRowsPerPage(count);
});

When('I go to the next Client Manager page if available', { timeout: 120000 }, async function () {
  await getPage(this).goToNextPage();
});
