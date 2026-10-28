const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const WorkersPage = require('../../../../pages/admin/projects/management/WorkersPage');

setDefaultTimeout(120000);

function getWorkersPage(world) {
  if (!world.workersPage) {
    world.workersPage = new WorkersPage(world.page);
  }
  return world.workersPage;
}

Before({ tags: '@workers' }, async function (scenario) {
  const tagNames = (scenario.pickle.tags || []).map((t) => String(t.name || '').replace(/^@/, ''));
  const tcTag = tagNames.find((name) => /^TC\d{2}$/i.test(name));
  if (tcTag) {
    console.log(`\n========== Workers flow — ${tcTag} ==========\n`);
  }
});

When('I click Workers in the project', { timeout: 120000 }, async function () {
  await getWorkersPage(this).clickWorkersInProject();
});

When('I open a project with Worker Management available', { timeout: 300000 }, async function () {
  await getWorkersPage(this).openProjectWithWorkersModule();
});

When('I navigate to the workers module from project profile', { timeout: 120000 }, async function () {
  await getWorkersPage(this).clickWorkersInProject();
});

When('I wait for the workers module to load', { timeout: 180000 }, async function () {
  const page = getWorkersPage(this);
  try {
    await page.waitForModuleToLoad();
  } catch (err) {
    await page.clickWorkersInProject();
    await page.waitForModuleToLoad();
  }
});

When('I click the Add Shift button in workers', { timeout: 120000 }, async function () {
  await getWorkersPage(this).clickAddShift();
});

Then('I should see the add shift form or popup', { timeout: 120000 }, async function () {
  await getWorkersPage(this).expectAddShiftFormVisible();
});

When('I enter a random shift name in the add shift form', { timeout: 120000 }, async function () {
  const name = await getWorkersPage(this).enterRandomShiftName();
  this.lastCreatedShiftName = name;
});

When('I select the second checkbox in the add shift form', { timeout: 120000 }, async function () {
  const workerName =
    this.workerContext?.individualName ||
    this.workerContext?.contractorName ||
    this.workerContext?.orgUserName ||
    '';
  if (workerName) {
    await getWorkersPage(this).selectWorkerForShiftByName(workerName);
  } else {
    await getWorkersPage(this).selectSecondCheckboxInAddShiftForm();
  }
});

When('I select today as the start date in the add shift form', { timeout: 120000 }, async function () {
  await getWorkersPage(this).selectTodayAsStartDate();
});

When('I enter start and end time in the add shift form', { timeout: 120000 }, async function () {
  await getWorkersPage(this).enterStartAndEndTimeInAddShiftForm();
});

When('I click Create on the add shift form', { timeout: 120000 }, async function () {
  await getWorkersPage(this).clickCreateOnAddShiftForm();
});

Then('the created shift should be visible in worker management', { timeout: 120000 }, async function () {
  await getWorkersPage(this).expectCreatedShiftVisibleInWorkerManagement();
});

When('I select the shift worker tab {string}', { timeout: 60000 }, async function (workerType) {
  await getWorkersPage(this).selectShiftWorkerTab(workerType);
});

When('I open the created shift in worker management', { timeout: 120000 }, async function () {
  await getWorkersPage(this).openShiftByName(this.lastCreatedShiftName);
});

When('I update the opened shift name', { timeout: 120000 }, async function () {
  const name = await getWorkersPage(this).editOpenedShiftName();
  this.lastCreatedShiftName = name;
});

When('I save the shift edits', { timeout: 120000 }, async function () {
  await getWorkersPage(this).saveShiftEdits();
});

When('I delete the opened shift', { timeout: 120000 }, async function () {
  await getWorkersPage(this).deleteOpenedShift();
});

Then('the created shift should be removed from worker management', { timeout: 120000 }, async function () {
  await getWorkersPage(this).expectShiftRemoved(this.lastCreatedShiftName);
});

When(
  'I configure a basic recurring shift ending after 3 occurrences',
  { timeout: 120000 },
  async function () {
    await getWorkersPage(this).enableRecurringShiftAndSaveBasic();
  }
);

When('I submit the add shift form without required fields', { timeout: 60000 }, async function () {
  await getWorkersPage(this).submitAddShiftWithoutRequiredFields();
});

Then('I should see a shift validation message', { timeout: 60000 }, async function () {
  await getWorkersPage(this).expectShiftValidationMessage();
});

When('I open attendance in worker management', { timeout: 120000 }, async function () {
  await getWorkersPage(this).openAttendanceForCurrentView();
});

When('I mark the first individual worker as present', { timeout: 120000 }, async function () {
  await getWorkersPage(this).markFirstIndividualPresent();
});

Then('I should see present attendance status', { timeout: 60000 }, async function () {
  await getWorkersPage(this).expectAttendancePresentVisible();
});

When('I open the Wage Details tab in worker management', { timeout: 120000 }, async function () {
  await getWorkersPage(this).openWageDetailsTab();
});

Then('the Wage Details table should be ready', { timeout: 120000 }, async function () {
  await getWorkersPage(this).expectWageDetailsTableReady();
});

When('I open Add to Expenses for the first wage row', { timeout: 120000 }, async function () {
  await getWorkersPage(this).openAddToExpensesForFirstWageRow();
});

When('I select the wage expense payment method {string}', { timeout: 60000 }, async function (method) {
  await getWorkersPage(this).selectExpensePaymentMethod(method);
});

When('I confirm convert wage to expense', { timeout: 120000 }, async function () {
  await getWorkersPage(this).confirmConvertWageToExpense();
});

Then('the wage should be converted to an expense successfully', { timeout: 120000 }, async function () {
  await getWorkersPage(this).expectWageConvertedToExpense();
});

Then('I should see the payment method required toast', { timeout: 60000 }, async function () {
  await getWorkersPage(this).expectPaymentMethodRequiredToast();
});
