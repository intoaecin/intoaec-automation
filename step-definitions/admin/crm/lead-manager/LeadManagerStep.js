// step-definitions/admin/crm/lead-manager/LeadManagerStep.js
const { Given, When, Then } = require('@cucumber/cucumber');
const LeadMasterPage = require('../../../../pages/admin/crm/lead-manager/LeadMasterPage');

function getPage(world) {
  if (!world.leadMasterPage || world.leadMasterPage.page !== world.page) {
    world.leadMasterPage = new LeadMasterPage(world.page);
  }
  return world.leadMasterPage;
}

Given('I open the Lead Manager master page', { timeout: 180000 }, async function () {
  await getPage(this).navigateToLeadManager();
});

Given('I wait for the Lead Manager list to load', { timeout: 180000 }, async function () {
  await getPage(this).waitForListReady();
});

When('I create a disposable Lead Manager lead', { timeout: 180000 }, async function () {
  this.lastLeadManagerLeadName = await getPage(this).createDisposableLead('QA LM');
});

When('I create a second disposable Lead Manager lead', { timeout: 180000 }, async function () {
  this.lastLeadManagerLeadName2 = await getPage(this).createDisposableLead('QA LM');
});

When('I search Lead Manager for the created lead', { timeout: 120000 }, async function () {
  const name = this.lastLeadManagerLeadName || getPage(this).lastLeadName;
  await getPage(this).searchLead(name);
});

When('I search Lead Manager for {string}', { timeout: 120000 }, async function (query) {
  await getPage(this).searchLead(query);
});

Then('I should see the created lead in the Lead Manager list', { timeout: 120000 }, async function () {
  const name = this.lastLeadManagerLeadName || getPage(this).lastLeadName;
  await getPage(this).expectLeadVisibleInList(name);
});

Then('Lead Manager search should show no matching leads', { timeout: 120000 }, async function () {
  await getPage(this).expectNoLeadMatch('ZZZ-NO-MATCH-LEAD-999');
});

When('I open the Lead Manager row actions for the created lead', { timeout: 120000 }, async function () {
  const name = this.lastLeadManagerLeadName || getPage(this).lastLeadName;
  await getPage(this).openRowActionsMenu(name);
});

When('I choose the Lead Manager row action {string}', { timeout: 120000 }, async function (action) {
  await getPage(this).chooseRowAction(action);
});

Then('the Lead Manager row action {string} should be visible', { timeout: 60000 }, async function (action) {
  await getPage(this).expectRowActionVisible(action, true);
});

Then('the Lead Manager row action {string} should not be visible', { timeout: 60000 }, async function (action) {
  await getPage(this).expectRowActionVisible(action, false);
});

When('I select the created lead in Lead Manager', { timeout: 120000 }, async function () {
  const name = this.lastLeadManagerLeadName || getPage(this).lastLeadName;
  await getPage(this).selectLeadRow(name);
});

When('I select the second created lead in Lead Manager', { timeout: 120000 }, async function () {
  const name = this.lastLeadManagerLeadName2 || getPage(this).lastLeadNames.slice(-1)[0];
  await getPage(this).selectLeadRow(name);
});

Then('the Lead Manager bulk actions should be available', { timeout: 120000 }, async function () {
  await getPage(this).expectBulkActionsVisible(true);
});

When('I choose the Lead Manager bulk action {string}', { timeout: 120000 }, async function (action) {
  await getPage(this).chooseBulkAction(action);
});

When('I switch Lead Manager to Kanban view', { timeout: 120000 }, async function () {
  await getPage(this).switchToKanbanView();
});

When('I switch Lead Manager to List view', { timeout: 120000 }, async function () {
  await getPage(this).switchToListView();
});

Then('the Lead Manager Kanban board should be visible', { timeout: 120000 }, async function () {
  await getPage(this).expectKanbanBoardVisible();
});

Then('the Lead Manager export control should be hidden on Kanban', { timeout: 60000 }, async function () {
  await getPage(this).expectExportHiddenOnKanban();
});

Then('I should still be on the Lead Manager list', { timeout: 120000 }, async function () {
  await getPage(this).expectStillOnLeadList();
});

Then('I should be on the Lead Manager profile', { timeout: 120000 }, async function () {
  await getPage(this).expectOnLeadProfile();
});

Then('I should be navigated to the Lead Manager profile page', { timeout: 120000 }, async function () {
  await getPage(this).expectNavigatedToLeadProfile();
});

When('I open the Lead Manager {string} tab', { timeout: 120000 }, async function (tab) {
  await getPage(this).openStatusTab(tab);
});

When('I confirm the Lead Manager dialog', { timeout: 120000 }, async function () {
  await getPage(this).confirmDialogYes();
});

When('I cancel the Lead Manager dialog', { timeout: 120000 }, async function () {
  await getPage(this).cancelDialog();
});

When('I fill a future Lead Manager snooze date if prompted', { timeout: 120000 }, async function () {
  await getPage(this).fillSnoozeDateIfPresent();
});

Then('I should see a Lead Manager toast matching {string}', { timeout: 120000 }, async function (pattern) {
  await getPage(this).expectToastMatching(new RegExp(pattern, 'i'));
});

When('I copy the Lead Manager project id for the created lead', { timeout: 120000 }, async function () {
  const name = this.lastLeadManagerLeadName || getPage(this).lastLeadName;
  await getPage(this).copyProjectIdFromRow(name);
});

When('I open Lead Manager Manage Columns', { timeout: 120000 }, async function () {
  await getPage(this).openManageColumns();
});

When('I hide the Lead Manager column {string}', { timeout: 120000 }, async function (label) {
  await getPage(this).toggleManageColumn(label, false);
});

When('I show the Lead Manager column {string}', { timeout: 120000 }, async function (label) {
  await getPage(this).toggleManageColumn(label, true);
});

When('I save Lead Manager Manage Columns', { timeout: 120000 }, async function () {
  await getPage(this).saveManageColumns();
});

When('I cancel Lead Manager Manage Columns', { timeout: 120000 }, async function () {
  await getPage(this).cancelManageColumns();
});

When('I reset Lead Manager Manage Columns', { timeout: 120000 }, async function () {
  await getPage(this).resetManageColumns();
});

When('I open Lead Manager Transfer Users', { timeout: 120000 }, async function () {
  await getPage(this).openTransferUsers();
});

When('I fill Lead Manager Transfer Users as Reporter', { timeout: 120000 }, async function () {
  await getPage(this).fillTransferUsers({ role: 'Reporter', fromIndex: 0, toIndex: 1 });
});

When('I fill Lead Manager Transfer Users as Assignee', { timeout: 120000 }, async function () {
  await getPage(this).fillTransferUsers({ role: 'Assignee', fromIndex: 0, toIndex: 1 });
});

When('I confirm Lead Manager Transfer Users', { timeout: 120000 }, async function () {
  await getPage(this).confirmTransferUsers();
});

When('I cancel Lead Manager Transfer Users', { timeout: 120000 }, async function () {
  await getPage(this).cancelTransferUsers();
});

When('I open Lead Manager filters', { timeout: 120000 }, async function () {
  await getPage(this).openFilters();
});

When('I clear Lead Manager filters', { timeout: 120000 }, async function () {
  await getPage(this).clearFilters();
});

When('I sort Lead Manager by column {string}', { timeout: 120000 }, async function (header) {
  await getPage(this).sortByHeader(header);
});

When('I set Lead Manager rows per page to {int}', { timeout: 120000 }, async function (count) {
  await getPage(this).setRowsPerPage(count);
});

When('I go to the next Lead Manager page if available', { timeout: 120000 }, async function () {
  await getPage(this).goToNextPage();
});

Then('the created lead should be visible on the Kanban board', { timeout: 120000 }, async function () {
  const name = this.lastLeadManagerLeadName || getPage(this).lastLeadName;
  await getPage(this).expectKanbanCardVisible(name);
});

When('I open the Kanban card menu for the created lead', { timeout: 120000 }, async function () {
  const name = this.lastLeadManagerLeadName || getPage(this).lastLeadName;
  await getPage(this).searchLead(name);
  await getPage(this).openKanbanCardMenu(name);
});

When('I drag the created lead Kanban card to stage {string}', { timeout: 180000 }, async function (stage) {
  const name = this.lastLeadManagerLeadName || getPage(this).lastLeadName;
  await getPage(this).dragKanbanCardToColumn(name, stage);
});
