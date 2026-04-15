const { When, Then } = require('@cucumber/cucumber');
const ConvertTimesheetExpensePage = require('../../../../../pages/admin/projects/managements/timetracking/ConvertTimesheetExpensePage');

let convertTimesheetExpensePage;

function ensureConvertTimesheetExpensePage(world) {
  if (!convertTimesheetExpensePage) {
    convertTimesheetExpensePage = new ConvertTimesheetExpensePage(world.page);
  }
}

When('I fill mandatory fields with cost for timesheet', { timeout: 120000 }, async function () {
  ensureConvertTimesheetExpensePage(this);
  await convertTimesheetExpensePage.fillMandatoryFieldsWithCost();
});

When('I convert the created timesheet to an expense', { timeout: 120000 }, async function () {
  ensureConvertTimesheetExpensePage(this);
  await convertTimesheetExpensePage.convertCreatedTimesheetToExpense();
});

When('I confirm the timesheet expense conversion', { timeout: 120000 }, async function () {
  ensureConvertTimesheetExpensePage(this);
  await convertTimesheetExpensePage.confirmTimesheetExpenseConversion();
});

When('I open Bills and Expenses', { timeout: 120000 }, async function () {
  ensureConvertTimesheetExpensePage(this);
  await convertTimesheetExpensePage.openBillsAndExpenses();
});

Then('I verify the timesheet is converted to expense successfully', { timeout: 120000 }, async function () {
  ensureConvertTimesheetExpensePage(this);
  await convertTimesheetExpensePage.verifyTimesheetConvertedToExpenseSuccessfully();
});
