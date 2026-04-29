const { When, Then } = require('@cucumber/cucumber');
const TimeTrackingPage = require('../../../../../pages/admin/projects/managements/timetracking/TimeTrackingPage');

let timeTrackingPage;

function ensureTimeTrackingPage(world) {
  if (!timeTrackingPage) {
    timeTrackingPage = new TimeTrackingPage(world.page);
  }
}

When('I click Delete on the timesheet', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.clickDeleteOnTimesheet();
});

When('I confirm the timesheet deletion', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.confirmTimesheetDeletion();
});

Then('I verify the timesheet is deleted successfully', { timeout: 120000 }, async function () {
  ensureTimeTrackingPage(this);
  await timeTrackingPage.verifyTimesheetDeletedSuccessfully();
});
