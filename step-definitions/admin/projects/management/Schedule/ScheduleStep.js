const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const SchedulePage = require('../../../../../pages/admin/projects/management/Schedule/SchedulePage');
const TaskPage = require('../../../../../pages/admin/projects/management/TaskPage');

/** Per `AGENTS.md`: cucumber timeout aligned with SchedulePage heavy loads; steps stay thin and delegate here. */
setDefaultTimeout(120000);

/** Display names for terminal logs — keyed by Cucumber tag (@TC01 … @TC17). */
const SCHEDULE_TEST_CASE_LOG = {
  TC01: 'TC-01 — Add schedule in gantt off tab',
  TC02: 'TC-02 — add schedule through create button in gantt view, with mandatory fields only',
  TC03: 'TC-03 — add schedule through create button in list view, with mandatory fields only',
  TC04: 'TC-04 — create schedule with adding assignee',
  TC05: 'TC-05 — create schedule with adding status',
  TC06: 'TC-06 — create schedule with completion adding %',
  TC07: 'TC-07 — create schedule with adding Schedule Color',
  TC08: 'TC-08 — create schedule with adding Schedule Color Hex Color Code Input',
  TC09: 'TC-09 — create schedule with adding discription',
  TC10: 'TC-10 — create schedule with adding new task',
  TC11: 'TC-11 — create schedule with adding new task, with in progress status',
  TC12: 'TC-12 — create schedule with adding new task, with completed status',
  TC13: 'TC-13 — create schedule with adding existing task',
  TC14: 'TC-14 — create schedule with adding reminder',
  TC15: 'TC-15 — create schedule with adding reminder for weeks',
  TC16: 'TC-16 — create schedule with adding phase',
  TC17: 'TC-17 - update schedule name',
  TC18: 'TC-18 - update schedule phase',
  TC19: 'TC-19 - add schedule phase in edit',
  TC20: 'TC-20 - update schedule assignee',
  TC21: 'TC-21 - update schedule priority',
  TC22: 'TC-22 - update schedule status',
  TC23: 'TC-23 - update schedule completion percent',
  TC24: 'TC-24 - update schedule start date',
  TC25: 'TC-25 - update schedule duration',
  TC26: 'TC-26 - update schedule description',
  TC27: 'TC-27 - update schedule add task',
  TC28: 'TC-28 - update schedule add reminder',
  TC29: 'TC-29 - update schedule with all fields at once',
};

function logScheduleTestCaseStart(pickle) {
  const tagNames = (pickle.tags || []).map((t) => String(t.name || '').replace(/^@/, ''));
  const tcTag = tagNames.find((name) => /^TC\d{2}$/i.test(name));
  if (!tcTag) return;

  const label = SCHEDULE_TEST_CASE_LOG[tcTag.toUpperCase()] || tcTag;
  const line = `========== ${label} ==========`;
  console.log(`\n${line}\n`);
}

Before(
  {
    tags:
      '@TC01 or @TC02 or @TC03 or @TC04 or @TC05 or @TC06 or @TC07 or @TC08 or @TC09 or @TC10 or @TC11 or @TC12 or @TC13 or @TC14 or @TC15 or @TC16 or @TC17 or @TC18 or @TC19 or @TC20 or @TC21 or @TC22 or @TC23 or @TC24 or @TC25 or @TC26 or @TC27 or @TC28 or @TC29',
  },
  async function (scenario) {
    logScheduleTestCaseStart(scenario.pickle);
  }
);

function getSchedulePage(world) {
  if (!world.schedulePage) {
    world.schedulePage = new SchedulePage(world.page);
  }
  return world.schedulePage;
}

function getTaskPage(world) {
  if (!world.taskPage) {
    world.taskPage = new TaskPage(world.page);
  }
  return world.taskPage;
}

When('I wait for the schedule module to load', async function () {
  const schedulePage = getSchedulePage(this);
  if (await schedulePage.isOnScheduleModule()) {
    await schedulePage.logStep('Schedule module already loaded — continuing in same tab');
    return;
  }
  await schedulePage.logStep('Schedule module loaded');
  await schedulePage.waitForModuleToLoad();
});

When('I switch schedule to gantt view', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Switched to Gantt view');
  await schedulePage.switchToGanttView();
});

When('I switch schedule to list view', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Switched to list view');
  await schedulePage.switchToListView();
});

When('I open the create schedule panel', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Opened create schedule panel');
  await schedulePage.openCreateSchedulePanel();
});

When('I open the create milestone panel', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('openCreateMilestonePanel');
  await schedulePage.openCreateMilestonePanel();
});

When('I close the schedule form panel without saving', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('closePanelWithoutSaving');
  await schedulePage.closePanelWithoutSaving();
});

When(
  'I create a schedule with mandatory fields named {string} in list view',
  async function (name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`createScheduleMandatory list ${name}`);
    await schedulePage.createScheduleMandatory(name, { useListView: true });
  }
);

When(
  'I create a schedule with mandatory fields named {string} in gantt view',
  async function (name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`createScheduleMandatory gantt ${name}`);
    await schedulePage.createScheduleMandatory(name, { useListView: false });
  }
);

When(
  'I create a milestone with mandatory fields named {string} in list view',
  async function (name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`createMilestoneMandatory list ${name}`);
    await schedulePage.createMilestoneMandatory(name, { useListView: true });
  }
);

When(
  'I create a milestone with mandatory fields named {string} in gantt view',
  async function (name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`createMilestoneMandatory gantt ${name}`);
    await schedulePage.createMilestoneMandatory(name, { useListView: false });
  }
);

When('I create a schedule with all common optional fields named {string}', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`createScheduleWithAllCommonOptionals ${name}`);
  await schedulePage.createScheduleWithAllCommonOptionals(name);
});

When('I open edit for schedule named {string}', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`openEditForNamedItem ${name}`);
  await schedulePage.switchToListView();
  await schedulePage.openEditForNamedItem(name);
});

When('I update schedule named {string} to name {string}', async function (oldName, newName) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`updateName ${oldName} -> ${newName}`);
  await schedulePage.switchToListView();
  await schedulePage.openEditForNamedItem(oldName);
  await schedulePage.updateNameInOpenPanel(newName);
});

When(
  'I update schedule {string} to {string} from the gantt sidebar row menu',
  async function (oldName, newName) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`Update schedule from Gantt sidebar: ${oldName} -> ${newName}`);
    await schedulePage.updateScheduleNameFromGanttSidebar(oldName, newName);
  }
);

When('I update schedule {string} phase from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Update phase from list row menu: ${name}`);
  await schedulePage.updateSchedulePhaseFromListRowMenu(name);
});

When('I search for schedule {string} in the schedule list', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Search schedule in list: ${name}`);
  await schedulePage.searchListTabScheduleIfAvailable(name);
});

When('I open the edit option for schedule {string} from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Open edit option from list row menu: ${name}`);
  await schedulePage.openEditForListSchedule(name);
});

Then('the edit schedule off canvas should be open', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Edit schedule off canvas is open');
  await schedulePage.expectEditScheduleOffCanvasOpen();
});

When('I replace the open schedule name with {string}', async function (newName) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Replace open schedule name with: ${newName}`);
  await schedulePage.fillScheduleNameInOpenPanel(newName);
});

When('I select another phase on the schedule form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Selected another phase on schedule form');
  await schedulePage.selectRandomPhaseOnScheduleCreateForm();
});

When('I add or change schedule {string} phase from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Add/change phase from list row menu: ${name}`);
  await schedulePage.updateSchedulePhaseFromListRowMenu(name);
});

When('I update schedule {string} assignee from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Update assignee from list row menu: ${name}`);
  await schedulePage.updateScheduleAssigneeFromListRowMenu(name);
});

When('I update schedule {string} priority to Low from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Update priority to Low from list row menu: ${name}`);
  await schedulePage.updateSchedulePriorityFromListRowMenu(name, /^low$/i);
});

When('I update schedule {string} status to Completed from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Update status to Completed from list row menu: ${name}`);
  await schedulePage.updateScheduleStatusFromListRowMenu(name, /^completed$/i);
});

When(
  'I update schedule {string} completion percent from {int} to {int} from the list row menu',
  async function (name, min, max) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`Update completion percent from list row menu: ${name}`);
    await schedulePage.updateScheduleCompletionFromListRowMenu(name, min, max);
  }
);

When('I update a random schedule start date from the list row menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Update random schedule start date from list row menu');
  await schedulePage.updateRandomScheduleStartDateFromListRowMenu();
});

When('I update a random schedule duration from the list row menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Update random schedule duration from list row menu');
  await schedulePage.updateRandomScheduleDurationFromListRowMenu();
});

When('I update a random schedule description from the list row menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Update random schedule description from list row menu');
  await schedulePage.updateRandomScheduleDescriptionFromListRowMenu();
});

When('I add a random task to a random schedule from the list row menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Add random task to random schedule from list row menu');
  await schedulePage.updateRandomScheduleTaskFromListRowMenu();
});

When('I add a random reminder to a random schedule from the list row menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Add random reminder to random schedule from list row menu');
  await schedulePage.updateRandomScheduleReminderFromListRowMenu();
});

When('I update schedule {string} to {string} with all fields from the list row menu', async function (oldName, newName) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Update all schedule fields from list row menu: ${oldName} -> ${newName}`);
  await schedulePage.updateScheduleAllFieldsFromListRowMenu(oldName, newName);
});

When('I delete schedule or milestone named {string} from list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`deleteNamedItemViaRowMenu ${name}`);
  await schedulePage.switchToListView();
  await schedulePage.deleteNamedItemViaRowMenu(name);
});

When('I delete a random schedule from the gantt sidebar list row menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Delete random schedule from gantt sidebar list row menu');
  this.lastDeletedScheduleName = await schedulePage.deleteRandomScheduleFromGanttSidebarListMenu();
});

When('I delete a random schedule from the gantt chart context menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Delete random schedule from gantt chart context menu');
  this.lastDeletedScheduleName = await schedulePage.deleteRandomScheduleFromGanttChartContextMenu();
});

When('I delete a random schedule from the list row menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Delete random schedule from list row menu');
  this.lastDeletedScheduleName = await schedulePage.deleteRandomScheduleFromListRowMenu();
});

Then('the last deleted schedule should no longer be visible in the schedule UI', async function () {
  const schedulePage = getSchedulePage(this);
  const name = this.lastDeletedScheduleName;
  if (!name) {
    throw new Error('No schedule was deleted in this scenario.');
  }
  await schedulePage.logStep(`Expect schedule removed from UI: ${name}`);
  await schedulePage.expectScheduleNotVisibleInUi(name);
});

When('I click the schedule today button', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('clickScheduleToday');
  await schedulePage.clickScheduleToday();
});

When('I set gantt timeline to {string} view', async function (mode) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`setTimelineView ${mode}`);
  await schedulePage.switchToGanttView();
  await schedulePage.setTimelineView(mode);
});

When('I download from the schedule toolbar if available', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('downloadCurrentGanttView');
  await schedulePage.downloadCurrentGanttView();
});

When('I set critical path to {string}', async function (onOff) {
  const schedulePage = getSchedulePage(this);
  const enable = String(onOff).toLowerCase() === 'on' || String(onOff).toLowerCase() === 'true';
  await schedulePage.logStep(`toggleCriticalPath ${enable}`);
  await schedulePage.toggleCriticalPath(enable);
});

When('I apply schedule filter type {string} then clear', async function (typeLabel) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`applyFilterByTypeAndClear ${typeLabel}`);
  await schedulePage.applyFilterByTypeAndClear(typeLabel);
});

When(
  'I add a child schedule named {string} under parent {string}',
  async function (childName, parentName) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`addChildScheduleMandatory ${parentName} -> ${childName}`);
    await schedulePage.addChildScheduleMandatory(parentName, childName);
  }
);

When('I pause schedule {string} from gantt context menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`pause ${name}`);
  await schedulePage.setPausedFromGanttMenu(name, true);
});

When('I resume schedule {string} from gantt context menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`resume ${name}`);
  await schedulePage.setPausedFromGanttMenu(name, false);
});

When('I mark schedule {string} completed from gantt context menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`completed ${name}`);
  await schedulePage.setCompletedFromGanttMenu(name, true);
});

When('I mark schedule {string} incompleted from gantt context menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`incompleted ${name}`);
  await schedulePage.setCompletedFromGanttMenu(name, false);
});

When('I add baseline named {string} if baseline UI is available', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`addBaselineNamed ${name}`);
  await schedulePage.addBaselineNamed(name);
});

When(
  'I add dependency type {string} on schedule {string} when dependency UI is available',
  async function (depType, name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`addDependencyType ${depType} on ${name}`);
    await schedulePage.openDependencyUiForNamed(name);
    await schedulePage.addDependencyType(depType);
  }
);

When('I remove assignee on open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('removeAssigneeInEdit');
  await schedulePage.removeAssigneeInEdit();
});

Then('the schedule create form assignees field should be empty', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectAssigneesEmptyInEdit();
});

When('I open the edit option for a random schedule from the list row menu', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Open edit option for random list schedule');
  await schedulePage.openEditForRandomListSchedule();
});

When('I clear the description on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.clearDescriptionInEdit();
});

Then('the schedule create form description field should be empty', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectDescriptionEmptyInEdit();
});

When('I remove the first task on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.removeFirstTaskInEdit();
});

When('I remove all tasks on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('removeAllTasksInEdit');
  await schedulePage.removeAllTasksInEdit();
});

Then('the first task should be removed on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectTaskRemovedInEdit();
});

Then('all tasks should be removed on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectAllTasksRemovedInEdit();
});

When('I remove the first reminder on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.removeFirstReminderInEdit();
});

When('I remove all reminders on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('removeAllRemindersInEdit');
  await schedulePage.removeAllRemindersInEdit();
});

Then('the first reminder should be removed on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectReminderRemovedInEdit();
});

Then('all reminders should be removed on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectAllRemindersRemovedInEdit();
});

When('I clear the phase on the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.clearPhaseInEdit();
});

Then('the schedule create form phase field should be empty', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectPhaseEmptyInEdit();
});

When('I save the open schedule edit form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('submitPanelPrimary');
  await schedulePage.submitPanelPrimary();
});

Then('I should see schedule or milestone {string} in the UI', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Schedule or milestone "${name}" visible in UI`);
  await schedulePage.expectRowOrToastContains(name);
});

Then('the schedule form panel should be closed', async function () {
  const schedulePage = getSchedulePage(this);
  const panel = schedulePage.formPanel();
  await expect(panel).toBeHidden({ timeout: 30000 });
});

When('I open quick add schedule from the gantt sidebar', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Opened quick add schedule from Gantt sidebar');
  await schedulePage.clickGanttSidebarAddSchedule();
});

Then('the gantt sidebar quick add name field should be visible', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Add Schedule Field Visible');
  await schedulePage.expectQuickAddScheduleFieldVisible();
});

When('I enter schedule name quick add field with {string}', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Added name: ${name}`);
  await schedulePage.fillGanttSidebarQuickAddName(name);
});

When('I confirm quick add schedule with tick in gantt sidebar', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Clicked on tick icon');
  await schedulePage.confirmGanttSidebarQuickAddWithTick();
});

Then('I should see schedule {string} in the gantt sidebar list', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Displaying in Gantt sidebar: ${name}`);
  await schedulePage.expectScheduleInGanttSidebarList(name);
});

Then(
  'in gantt sidebar list schedule {string} start and end calendar dates match',
  async function (name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`Start date = end date (${name})`);
    await schedulePage.expectGanttSidebarScheduleStartSameEndCalendar(name);
  }
);

Then(
  'in gantt sidebar list schedule {string} completion displays {int}%',
  async function (name, pct) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`Completion = ${pct}% (${name})`);
    await schedulePage.expectGanttSidebarScheduleCompletionPercent(name, pct);
  }
);

Then('schedule name {string} should be visible in the gantt chart area', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Displaying in Gantt chart: ${name}`);
  await schedulePage.expectScheduleNameVisibleInGanttTimeline(name);
});

Then(
  'in list tab schedule {string} start, end, and created on calendar dates match',
  async function (name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`Start date = End date = CreatedOn date in list view (${name})`);
    await schedulePage.expectListTabScheduleStartEndCreatedOnSameCalendar(name);
  }
);

Then(
  'in list tab schedule {string} start and end calendar dates match',
  async function (name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`Start date = end date in list view (${name})`);
    await schedulePage.expectListTabScheduleStartEndCreatedOnSameCalendar(name);
  }
);

Then('in list tab schedule {string} duration shows one working day', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Verify list duration (${name})`);
  await schedulePage.expectListTabScheduleDurationIndicatesOneWorkingDay(name);
});

Then(
  'in list tab schedule {string} completion displays {int}%',
  async function (name, pct) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`Completion = ${pct}% in list view (${name})`);
    await schedulePage.expectListTabScheduleCompletionShows(name, pct);
  }
);

Then('in list tab schedule {string} assignee shows Unassigned', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Assignee = unassigned (${name})`);
  await schedulePage.expectListTabAssignToShowsUnassigned(name);
});

Then(
  'in list tab schedule {string} created on calendar date matches start date',
  async function (name) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.logStep(`Created on date matches start date (${name})`);
    await schedulePage.expectListTabScheduleStartEndCreatedOnSameCalendar(name);
  }
);

Then('the add schedule off canvas should be open', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Add schedule off canvas is open');
  await schedulePage.expectAddScheduleOffCanvasOpen();
});

When('I fill the schedule create form with name {string}', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Added schedule name: ${name}`);
  await schedulePage.fillScheduleOrMilestoneName(name);
});

When('I select a random phase on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.selectRandomPhaseOnScheduleCreateForm();
});

When('I choose priority High in the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Selected priority: High');
  await schedulePage.selectScheduleFormPriority(/^high$/i);
});

When('I choose priority Low in the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Selected priority: Low');
  await schedulePage.selectScheduleFormPriority(/^low$/i);
});

When('I choose status In Progress in the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Selected status: In Progress');
  await schedulePage.selectScheduleFormStatus(/in\s*progress/i);
});

When('I choose status Completed in the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Selected status: Completed');
  await schedulePage.selectScheduleFormStatus(/completed/i);
});

Then('the schedule create form completion should display {int}%', async function (pct) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Completion displays ${pct}%`);
  await schedulePage.expectScheduleCreateFormCompletionPercent(pct);
});

When(
  'I enter a random completion percent from {int} to {int} on the schedule create form',
  async function (min, max) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.fillRandomCompletionPercentOnScheduleCreateForm(min, max);
  }
);

When('I pick a random schedule color on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.pickRandomScheduleColorOnScheduleCreateForm();
});

When('I enter a random hex color code on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.fillRandomHexColorCodeOnScheduleCreateForm();
});

When('I enter a random description on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.fillRandomDescriptionOnScheduleCreateForm();
});

When('I enter a random duration on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.fillRandomDurationOnScheduleForm();
});

When('I pick a random weekday start datetime in the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Picked random weekday start date time');
  await schedulePage.pickRandomStartDateTimeOnScheduleCreateForm();
});

When('I pick a random weekday end datetime after start in the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Picked random weekday end date time after start');
  await schedulePage.pickRandomEndDateTimeAfterStartOnScheduleCreateForm();
});

When('I submit the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Submitted schedule create form');
  await schedulePage.submitScheduleCreateForm();
});

When('I open the assignees dropdown on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Opened assignees dropdown');
  await schedulePage.openScheduleCreateFormAssigneesDropdown();
});

Then('the schedule create form assignees list should be visible', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Assignees list is visible');
  await schedulePage.expectScheduleCreateFormAssigneesListVisible();
});

When('I select up to 2 assignees on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep('Selected up to 2 assignees');
  await schedulePage.selectUpToTwoAssigneesOnScheduleCreateForm(2);
});

When('I expand additional details on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expandScheduleCreateFormAdditionalDetails();
});

When('I scroll down on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.scrollScheduleCreateFormDown();
});

When('I add a new task named {string} on the schedule create form', async function (taskName) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`Adding new task: ${taskName}`);
  await schedulePage.addNewTaskOnScheduleCreateFormNamed(taskName);
});

When('I set the schedule create form task status to In Progress', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.setScheduleCreateFormTaskStatus(/in\s*progress/i);
});

When('I set the schedule create form task status to Completed', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.setScheduleCreateFormTaskStatus(/completed/i);
});

When('I select one assignee on the schedule create form task', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.selectOneAssigneeOnScheduleCreateFormTask();
});

When('I pick a random weekday end datetime on the schedule create form task', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.pickRandomEndDateTimeOnScheduleCreateFormTask();
});

When('I select a random existing task on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  const name = await schedulePage.selectRandomExistingTaskOnScheduleCreateForm();
  this.lastSelectedExistingTaskName = name;
});

When('I add a random reminder on the schedule create form', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.addRandomReminderOnScheduleCreateForm(1, 30);
});

When('I set the schedule create form reminder unit to weeks', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.setScheduleCreateFormReminderUnitToWeeks();
});

When('I click back from the project module', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.clickBackFromProjectModule();
});

When('I open the Task module from project management', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.openTaskModuleFromProjectManagement();
});

Then('task {string} should be visible in the todo kanban', async function (taskName) {
  const taskPage = getTaskPage(this);
  await taskPage.expectTaskVisibleInTodoKanban(taskName);
});

Then(
  'the selected existing task kanban card should link to schedule {string}',
  async function (scheduleName) {
    const taskPage = getTaskPage(this);
    const taskName = this.lastSelectedExistingTaskName;
    if (!taskName) {
      throw new Error('No existing task was recorded — run select random existing task first.');
    }
    await taskPage.expectScheduleLinkedOnTaskKanbanCard(taskName, scheduleName);
  }
);

When('I open quick add milestone from the gantt sidebar', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.clickGanttSidebarAddMilestone();
});

Then('the gantt sidebar quick add milestone field should be visible', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectQuickAddMilestoneFieldVisible();
});

When('I enter milestone name quick add field with {string}', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.fillGanttSidebarQuickAddMilestoneName(name);
});

When('I confirm quick add milestone with tick in gantt sidebar', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.confirmGanttSidebarQuickAddMilestoneWithTick();
});

Then('the add milestone off canvas should be open', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectAddMilestoneOffCanvasOpen();
});

When('I select phase {string} on the schedule create form', async function (phaseName) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.selectPhaseNamedOnScheduleCreateForm(phaseName);
});

When(
  'I update schedule {string} phase to {string} from the list row menu',
  async function (scheduleName, phaseName) {
    const schedulePage = getSchedulePage(this);
    await schedulePage.updateSchedulePhaseToNamedFromListRowMenu(scheduleName, phaseName);
  }
);

When('I update schedule {string} start date from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.updateNamedScheduleStartDateFromListRowMenu(name);
});

When('I update schedule {string} description from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.updateNamedScheduleDescriptionFromListRowMenu(name);
});

When('I add an existing task to schedule {string} from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.addExistingTaskToNamedScheduleFromListRowMenu(name);
});

When('I add a reminder to schedule {string} from the list row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.addReminderToNamedScheduleFromListRowMenu(name);
});

When('I delete schedule or milestone named {string} from the gantt sidebar row menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.deleteNamedItemFromGanttSidebarMenu(name);
});

When('I delete schedule or milestone named {string} from the gantt chart context menu', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.logStep(`deleteNamedItemFromGanttChartContextMenu ${name}`);
  await schedulePage.deleteNamedItemFromGanttChartContextMenu(name);
});

Then('schedule or milestone {string} should not be visible in the schedule UI', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectScheduleNotVisibleInUi(name);
});

When('I enable the schedule live mode toggle', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.enableScheduleLiveModeToggle();
});

When('I open Activity Tracker from the sidebar', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.openActivityTrackerFromSidebar();
});

Then('the activity log should contain {string}', async function (text) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectActivityLogContains(text);
});

When('I open the working calendar dialog', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.openWorkingCalendarDialog();
});

When('I toggle working calendar days {string} and {string}', async function (day1, day2) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.toggleWorkingCalendarDays([day1, day2]);
});

When('I toggle working calendar day {string}', async function (day) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.toggleWorkingCalendarDays([day]);
});

When('I save the working calendar dialog', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.saveWorkingCalendarDialog();
});

Then('the working calendar updated toast should appear', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectWorkingCalendarUpdatedToast();
});

When('I add a public holiday named {string} in the working calendar dialog', async function (name) {
  const schedulePage = getSchedulePage(this);
  await schedulePage.addWorkingCalendarPublicHoliday(name);
});

When('I remove the first public holiday in the working calendar dialog', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.removeFirstWorkingCalendarPublicHoliday();
});

When('I set working calendar start time to AM hours', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.setWorkingCalendarStartTimeToAm();
});

When('I set working calendar end time to PM hours', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.setWorkingCalendarEndTimeToPm();
});

Then('the today indicator should be visible in the gantt chart', async function () {
  const schedulePage = getSchedulePage(this);
  await schedulePage.expectTodayIndicatorVisibleInGanttChart();
});
