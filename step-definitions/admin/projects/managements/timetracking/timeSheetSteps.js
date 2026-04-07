const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const TimeTrackingPage = require('../../../../../pages/admin/projects/managements/timetracking/TimeTrackingPage');

let timeTrackingPage;

function ensureTimeTrackingPage(world) {
  if (!timeTrackingPage) {
    timeTrackingPage = new TimeTrackingPage(world.page);
  }
}

Given('I go to Clients section', async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.goToClients();
});

Given('I select the first client', async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.selectFirstClient();
});

Given('I open Time Tracking', async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.openTimeTracking();
});

When('I click Create timesheet', async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.clickCreate();
});

When('I fill mandatory fields for timesheet', async function () {
  ensureTimeTrackingPage(this);
  const pastDays = Number(process.env.TIMESHEET_PAST_DAYS || 0);
  await timeTrackingPage.fillMandatoryFields(undefined, undefined, undefined, pastDays);
});

When('I wait {int} seconds for manual attachment upload', { timeout: 180000 }, async function (seconds) {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
});

When('I submit the timesheet form', async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.submitForm();
});

Then('I verify the timesheet is created successfully', async function () {
  ensureTimeTrackingPage(this);
  const result = await timeTrackingPage.isTimesheetCreatedSuccessfully();
  expect(result).toBeTruthy();
});

When('I open the created timesheet', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.openCreatedTimesheet();
});

When('I click Edit on the timesheet', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.clickEditOnTimesheet();
});

When('I update all prefilled fields on the timesheet', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.updateAllPrefilledFields();
});

When('I add break time with start and end', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.addBreakTimeStartAndEnd();
});

When('I select a random AEC work category', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.selectRandomAecWorkCategory();
});

When('I update cost with a random value', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.updateCostWithRandomValue();
});

When('I enter a random description in the dashboard text area', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.scrollAndEnterRandomDashboardDescription();
});

When('I save the timesheet changes', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.saveTimesheetChanges();
});

Then('I verify the timesheet is updated successfully', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.verifyTimesheetUpdatedSuccessfully();
});
