const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const TaskManagementPage = require('../../../../../pages/admin/projects/management/TaskManagement/TaskManagementPage');

/** Per `AGENTS.md`: cucumber timeout aligned with heavy module loads; steps stay thin. */
setDefaultTimeout(120000);

/** Display names for terminal logs — TS-01 … TS-12 (@TC01 … @TC52). */
const TASK_TEST_CASE_LOG = {
  TC01: 'TC-01 — Add task in To Do',
  TC02: 'TC-02 — Add task in In Progress',
  TC03: 'TC-03 — Add task in Completed',
  TC04: 'TC-04 — Add column (default Column 1)',
  TC05: 'TC-05 — Add column named followup',
  TC06: 'TC-06 — Add column named pending with colour',
  TC07: 'TC-07 — Add task in followup column',
  TC08: 'TC-08 — Add quick task in To Do',
  TC09: 'TC-09 — Add quick task in In Progress',
  TC10: 'TC-10 — Add quick task in Completed',
  TC11: 'TC-11 — Add quick task in Column 1',
  TC12: 'TC-12 — Add quick task in pending',
  TC13: 'TC-13 — Add task with High priority',
  TC14: 'TC-14 — Add task with Low priority',
  TC15: 'TC-15 — Add task with description',
  TC16: 'TC-16 — Add task with assignees',
  TC17: 'TC-17 — Add task with reporter',
  TC18: 'TC-18 — Add task with reminder',
  TC19: 'TC-19 — Add task with checklist',
  TC20: 'TC-20 — Add task with checklist and assignee',
  TC21: 'TC-21 — Add task with all optional fields',
  TC22: 'TC-22 — Edit task name on kanban card',
  TC23: 'TC-23 — Edit task description from list view',
  TC24: 'TC-24 — Edit task reminder from list view',
  TC25: 'TC-25 — Edit checklist assignee from list view',
  TC26: 'TC-26 — Add comment on kanban view task panel',
  TC27: 'TC-27 — Edit task start and end dates from list view',
  TC28: 'TC-28 — Edit assignee on kanban card',
  TC29: 'TC-29 — Edit task status from list view',
  TC30: 'TC-30 — Edit task priority from list view',
  TC31: 'TC-31 — Edit task reporter from list view',
  TC32: 'TC-32 — Edit comment on kanban view task panel',
  TC33: 'TC-33 — Edit task completion percent from list view',
  TC34: 'TC-34 — Rename kanban column',
  TC35: 'TC-35 — Change kanban column colour',
  TC36: 'TC-36 — Duplicate kanban task card',
  TC37: 'TC-37 — Remove task description',
  TC38: 'TC-38 — Remove task reminder',
  TC39: 'TC-39 — Remove checklist item',
  TC40: 'TC-40 — Remove task comment',
  TC41: 'TC-41 — Remove all assignees on kanban card',
  TC42: 'TC-42 — Delete quick task in To Do',
  TC43: 'TC-43 — Delete quick task in pending',
  TC44: 'TC-44 — Delete followup column with task migration',
  TC45: 'TC-45 — Delete empty followup column',
  TC46: 'TC-46 — Toggle checklist and verify progress',
  TC47: 'TC-47 — Filter kanban by status',
  TC48: 'TC-48 — Filter kanban by assignee',
  TC49: 'TC-49 — Filter kanban by priority',
  TC50: 'TC-50 — Filter kanban by tags',
  TC51: 'TC-51 — Search task by name',
  TC52: 'TC-52 — Add task by template',
};

function logTaskTestCaseStart(pickle) {
  const tagNames = (pickle.tags || []).map((t) => String(t.name || '').replace(/^@/, ''));
  const tcTag = tagNames.find((name) => /^TC\d{2}$/i.test(name));
  if (!tcTag) return;

  const label = TASK_TEST_CASE_LOG[tcTag.toUpperCase()] || tcTag;
  const line = `========== ${label} ==========`;
  console.log(`\n${line}\n`);
}

Before({ tags: '@task' }, async function (scenario) {
  logTaskTestCaseStart(scenario.pickle);
});

function getTaskManagementPage(world) {
  if (!world.taskManagementPage) {
    world.taskManagementPage = new TaskManagementPage(world.page);
  }
  return world.taskManagementPage;
}

When('I navigate to the task management module', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.navigateToTaskModule();
});

When('I wait for the task management module to load', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.waitForModuleToLoad();
});

When('I switch task management to kanban view', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.switchToKanbanView();
});

When('I switch task management to list view', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.switchToListView();
});

When('I open the task create offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.openCreateTaskModal();
});

Then('the task create offcanvas should be open', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectCreateTaskModalOpen();
});

When('I fill the task create form with name {string}', async function (name) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.fillTaskNameOnCreateForm(name);
});

When('I choose task status {string} in the task create form', async function (status) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.selectTaskStatusOnCreateForm(status);
});

When('I pick a random weekday start datetime in the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.pickRandomStartDateTimeOnCreateTaskForm();
});

When('I pick a random weekday end datetime after start in the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.pickRandomEndDateTimeAfterStartOnCreateTaskForm();
});

When('I submit the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.submitCreateTaskForm();
});

Then('task {string} should be visible in kanban column {string}', async function (taskName, columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectTaskCardInKanbanColumn(columnName, taskName);
});

When('I scroll the kanban board to the last column', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.scrollKanbanHorizontallyToEnd();
});

When('I open the add kanban column dialog', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.openAddColumnDialog();
});

When('I confirm add kanban column with default name', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.confirmAddKanbanColumn();
});

When('I set add kanban column name to {string}', async function (name) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.setAddColumnName(name);
});

When('I pick a random color in the add kanban column dialog', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.pickRandomColorInAddColumnDialog();
});

When('I confirm add kanban column', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.confirmAddKanbanColumn();
});

Then('kanban column {string} should be visible', async function (columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectKanbanColumnVisible(columnName);
});

When('I add a quick task in kanban column {string}', async function (columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.addQuickTaskInColumn(columnName);
});

Then('quick task card should be visible in kanban column {string}', async function (columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectQuickTaskCardInKanbanColumn(columnName);
});

Then('the task management module should be open', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.waitForModuleToLoad();
});

When('I choose task priority {string} in the task create form', async function (priority) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.selectTaskPriorityOnCreateForm(priority);
});

When('I enter a random description on the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.fillRandomDescriptionOnCreateTaskForm();
});

When('I add user and vendor assignees on the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.addUserAndVendorAssigneesOnCreateTaskForm();
});

When('I add a random reporter on the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.addRandomReporterOnCreateTaskForm();
});

When('I add a random reminder on the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.addRandomReminderOnCreateTaskForm();
});

When('I add a random checklist item on the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.addRandomChecklistItemOnCreateTaskForm();
});

When('I add a checklist assignee on the task create form', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.addChecklistAssigneeOnCreateTaskForm();
});

When('I fill the task create form with all optional fields named {string}', async function (name) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.fillTaskCreateFormWithAllOptionalFields(name);
});

Then('task {string} should be visible in list view', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectTaskVisibleInListView(taskName);
});

Then('task {string} should show priority {string} in list view', async function (taskName, priority) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectTaskPriorityInListView(taskName, priority);
});

When('I open view task for {string} from list row menu', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.openViewTaskFromList(taskName);
});

When('I open view task for {string} from kanban card', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.openViewTaskFromKanban(taskName);
});

When('I close the view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.closeViewTaskModal();
});

When('I rename kanban task {string} to {string}', async function (oldName, newName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.renameTaskOnKanbanCard(oldName, newName);
});

When('I update the task description in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.updateDescriptionInViewTaskModal(`Updated description ${Date.now()}`);
});

When('I clear the task description in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.clearDescriptionInViewTaskModal();
});

When('I update the task reminder in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.updateReminderInViewTaskModal();
});

When('I remove the task reminder in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.removeReminderInViewTaskModal();
});

When('I swap the checklist assignee in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.swapChecklistAssigneeInViewTaskModal();
});

When('I remove the checklist item in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.removeChecklistItemInViewTaskModal();
});

When('I add comment {string} in view task offcanvas', async function (comment) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.addCommentInViewTaskModal(comment);
});

Then('comment {string} should be visible in view task offcanvas', async function (comment) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectCommentVisibleInViewTaskModal(comment);
});

When('I edit the latest comment to {string} in view task offcanvas', async function (comment) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.editLatestCommentInViewTaskModal(comment);
});

When('I remove the comment in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.removeCommentInViewTaskModal();
});

When('I update task start and end dates in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.updateTaskDatesInViewTaskModal();
});

When('I update assignees on kanban task card {string}', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.updateAssigneesOnKanbanCard(taskName);
});

When('I remove all assignees on kanban task card {string}', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.removeAllAssigneesOnKanbanCard(taskName);
});

When('I update task status to {string} in view task offcanvas', async function (status) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.updateTaskStatusInViewTaskModal(status);
});

When('I update task priority to {string} in view task offcanvas', async function (priority) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.updateTaskPriorityInViewTaskModal(priority);
});

When('I update task reporter in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.updateTaskReporterInViewTaskModal();
});

Then('quick task should not be visible in kanban column {string}', async function (columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectQuickTaskNotInKanbanColumn(columnName);
});

When('I delete quick task from kanban column {string}', async function (columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.deleteQuickTaskFromKanbanColumn(columnName);
});

When('I set task progress to {int}% in view task offcanvas', async function (percent) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.setTaskProgressPercentInViewTaskModal(percent);
});

When('I set a random task progress percent in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.setRandomTaskProgressPercentInViewTaskModal();
});

Then('task progress should show {int}% in view task offcanvas', async function (percent) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectTaskProgressPercentInViewTaskModal(percent);
});

When('I rename kanban column {string} to {string}', async function (oldName, newName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.renameKanbanColumn(oldName, newName);
});

When('I change colour of kanban column {string}', async function (columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.changeKanbanColumnColor(columnName);
});

When('I duplicate kanban task {string} from card menu', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.duplicateTaskFromKanbanMenu(taskName);
});

Then('a duplicate of task {string} should be visible on kanban', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectDuplicateTaskVisible(taskName);
});

When('I delete kanban task {string} from card menu', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.deleteTaskFromKanbanMenu(taskName);
});

Then('task {string} should not be visible on kanban', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectTaskNotVisibleInKanban(taskName);
});

When('I delete kanban column {string} migrating tasks to {string}', async function (columnName, status) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.deleteKanbanColumn(columnName, status);
});

When('I delete kanban column {string}', async function (columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.deleteKanbanColumn(columnName);
});

Then('kanban column {string} should not be visible', async function (columnName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectKanbanColumnNotVisible(columnName);
});

When('I check the first checklist item in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.toggleChecklistItemInViewTaskModal(true);
});

When('I uncheck the first checklist item in view task offcanvas', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.toggleChecklistItemInViewTaskModal(false);
});

When('I open the task filter menu', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.openTaskFilterMenu();
});

When('I clear task filters', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.clearTaskFilters();
});

When('I apply task filter status {string}', async function (status) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.applyTaskFilterField('status', new RegExp(status, 'i'));
});

When('I apply task filter assignee with first available option', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.applyTaskFilterField('assignee', /.+/);
});

When('I apply task filter priority {string}', async function (priority) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.applyTaskFilterField('priority', new RegExp(priority, 'i'));
});

When('I apply task filter tags with first available option', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.applyTaskFilterField('tags', /.+/);
});

Then('filtered kanban should show results for status {string}', async function (status) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectFilteredKanbanShowsOnlyColumn(status);
});

Then('filtered kanban results should be visible', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectFilteredKanbanShowsOnlyColumn('To Do');
});

When('I search tasks for {string}', async function (query) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.searchTasksInToolbar(query);
});

When('I clear the task search field', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.clearTaskSearchInToolbar();
});

Then('search should show task {string} on kanban', async function (taskName) {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectSearchShowsOnlyTask(taskName);
});

When('I apply a random task template', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.applyRandomTaskTemplate();
});

Then('a new task from template should appear on kanban', async function () {
  const taskPage = getTaskManagementPage(this);
  await taskPage.expectNewTaskFromTemplateInKanban();
});

