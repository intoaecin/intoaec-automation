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

When('I navigate to the workers module from project profile', { timeout: 120000 }, async function () {
  await getWorkersPage(this).clickWorkersInProject();
});

When('I wait for the workers module to load', { timeout: 120000 }, async function () {
  await getWorkersPage(this).waitForModuleToLoad();
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
  await getWorkersPage(this).selectSecondCheckboxInAddShiftForm();
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
