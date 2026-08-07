const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const DailyReportPage = require('../../../../../pages/admin/projects/management/DailyReport/DailyReportPage');
const TimeTrackingPage = require('../../../../../pages/admin/projects/managements/timetracking/TimeTrackingPage');
const SchedulePage = require('../../../../../pages/admin/projects/management/Schedule/SchedulePage');
const TaskManagementPage = require('../../../../../pages/admin/projects/management/TaskManagement/TaskManagementPage');

setDefaultTimeout(120000);

const DAILY_REPORT_TEST_CASE_LOG = {
  TC01: 'TC-01 — Create daily report successfully',
  TC02: 'TC-02 — Create daily report with notes edit popup',
  TC03: 'TC-03 — Create daily report with attachments upload and Enter gate',
  TC04: 'TC-04 — Create daily report with weather condition toggle and notes',
  TC05: 'TC-05 — Created timesheet appears under Time Log on Daily Report create page',
  TC06: 'TC-06 — Created schedule appears on Daily Report create page',
  TC07: 'TC-07 — Three schedules in Schedule Progress unselect one Save and Create',
  TC08: 'TC-08 — Created task appears on Daily Report create page',
  TC09: 'TC-09 — Three tasks in Task Progress unselect one Save and Create',
};

function logDailyReportTestCaseStart(pickle) {
  const tagNames = (pickle.tags || []).map((t) => String(t.name || '').replace(/^@/, ''));
  const tcTag = tagNames.find((name) => /^TC\d{2}$/i.test(name));
  if (!tcTag) return;

  const label = DAILY_REPORT_TEST_CASE_LOG[tcTag.toUpperCase()] || tcTag;
  console.log(`\n========== ${label} ==========\n`);
}

function getDailyReportPage(world) {
  if (!world.dailyReportPage) {
    world.dailyReportPage = new DailyReportPage(world.page);
  }
  return world.dailyReportPage;
}

function getTimeTrackingPage(world) {
  if (!world.timeTrackingPage) {
    world.timeTrackingPage = new TimeTrackingPage(world.page);
  }
  return world.timeTrackingPage;
}

function getSchedulePage(world) {
  if (!world.schedulePage) {
    world.schedulePage = new SchedulePage(world.page);
  }
  return world.schedulePage;
}

function getTaskManagementPage(world) {
  if (!world.taskManagementPage) {
    world.taskManagementPage = new TaskManagementPage(world.page);
  }
  return world.taskManagementPage;
}

Before({ tags: '@daily-report' }, async function (scenario) {
  logDailyReportTestCaseStart(scenario.pickle);
});

When('I navigate to the daily report module', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).navigateToDailyReportModule();
});

Then('I should see the daily report list page', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).expectDailyReportListPage();
});

When('I click Create on the daily report list page', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickCreateOnDailyReportListPage();
});

Then('I should see the create daily report popup', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).expectDailyReportCreatePopupVisible();
});

When('I click Create in the create daily report popup', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickCreateInDailyReportPopup();
});

Then('I should see the create daily report page', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).expectDailyReportCreateFormPage();
});

When('I click Create on the daily report create page', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickCreateOnDailyReportCreatePage();
});

When('I complete the daily report create flow with three create clicks', { timeout: 180000 }, async function () {
  await getDailyReportPage(this).completeDailyReportCreateWithThreeCreateClicks();
});

Then('I should see the daily report created successfully', { timeout: 30000 }, async function () {
  await getDailyReportPage(this).expectDailyReportCreatedSuccessfully();
});

When('I click the daily report notes edit icon', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickDailyReportNotesEditIcon();
});

Then('I should see the daily report notes popup', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).expectDailyReportNotesPopupVisible();
});

When('I enter random content in the daily report notes field', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).enterRandomContentInDailyReportNotesField();
});

When('I click Save on the daily report notes popup', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickSaveOnDailyReportNotesPopup();
});

Then('the daily report notes popup should be closed and the notes should be saved', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).expectDailyReportNotesSavedAndPopupClosed();
});

When('I click the daily report attachments icon', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickDailyReportAttachmentsIcon();
});

Then('I should see the daily report attachments popup', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).expectDailyReportAttachmentsPopupVisible();
});

When('I add the required attachments on the daily report attachments popup', { timeout: 600000 }, async function () {
  await getDailyReportPage(this).addRequiredAttachmentsOnDailyReportPopup();
});

When('I press Enter in the terminal after adding the daily report attachment', { timeout: 600000 }, async function () {
  await getDailyReportPage(this).waitForDailyReportAttachmentEnterGate();
});

When('I click Upload on the daily report attachments popup', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickUploadOnDailyReportAttachmentsPopup();
});

When('I click the daily report weather condition edit icon', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickDailyReportWeatherConditionEditIcon();
});

When('I enable the daily report weather affecting work toggle', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).enableDailyReportWeatherAffectingWorkToggle();
});

When('I enter random text in the daily report weather condition notes field', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).enterRandomTextInDailyReportWeatherConditionNotes();
});

When('I click Save on the daily report weather condition popup', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickSaveOnDailyReportWeatherConditionPopup();
});

// --- TC-05: Time Tracking → Daily Report Time Log -----------------------------

When('I navigate to the time tracking module', { timeout: 180000 }, async function () {
  await getTimeTrackingPage(this).navigateToTimeTrackingModule();
});

When('I click Create Timesheet to open the get started popup', { timeout: 120000 }, async function () {
  await getTimeTrackingPage(this).clickCreateTimesheetOpenGetStarted();
});

When('I select Start from Scratch and proceed on time tracking', { timeout: 120000 }, async function () {
  await getTimeTrackingPage(this).selectStartFromScratchAndProceed();
});

When(
  'I fill timesheet with first user, today, start 10:00 AM, end 6:00 PM and enable chargeable',
  { timeout: 180000 },
  async function () {
    await getTimeTrackingPage(this).fillTimesheetForDailyReportTimeLog();
  }
);

When('I submit the timesheet for the daily report time log', { timeout: 120000 }, async function () {
  await getTimeTrackingPage(this).submitTimesheetForDailyReport();
});

Then('I should see the timesheet created successfully for the daily report', { timeout: 120000 }, async function () {
  await getTimeTrackingPage(this).expectTimesheetCreatedSuccessfullyForDailyReport();
});

Then('I should see the created timesheet under the Time Log section', { timeout: 120000 }, async function () {
  const tt = getTimeTrackingPage(this);
  await getDailyReportPage(this).expectCreatedTimesheetUnderTimeLogSection({
    user: tt.lastTimesheetUser,
    date: tt.lastTimesheetDate,
    dateIso: tt.lastTimesheetDateIso,
    start: tt.lastTimesheetStart,
    end: tt.lastTimesheetEnd,
  });
});

// --- TC-06: Schedule → Daily Report lists schedule -----------------------------

When(
  'I create a schedule for daily report with random name first assignee and dates',
  { timeout: 180000 },
  async function () {
    const name = await getSchedulePage(this).createScheduleForDailyReportTc06();
    this.lastDailyReportScheduleName = name;
  }
);

Then('I should see the schedule created for the daily report', { timeout: 120000 }, async function () {
  const schedulePage = getSchedulePage(this);
  const name = this.lastDailyReportScheduleName || schedulePage.lastDailyReportScheduleName;
  await schedulePage.expectScheduleCreatedForDailyReport(name);
});

Then('I should see the created schedule listed on the daily report create page', { timeout: 120000 }, async function () {
  const schedulePage = getSchedulePage(this);
  const name = this.lastDailyReportScheduleName || schedulePage.lastDailyReportScheduleName;
  await getDailyReportPage(this).expectCreatedScheduleOnDailyReportCreatePage(name);
});

When(
  'I create {int} schedules for daily report with random names assignees and dates',
  { timeout: 360000 },
  async function (count) {
    const names = await getSchedulePage(this).createSchedulesForDailyReportTc07(count);
    this.lastDailyReportScheduleNames = names;
    this.lastDailyReportScheduleName = names[names.length - 1];
    const dailyReportPage = getDailyReportPage(this);
    dailyReportPage.lastDailyReportScheduleNames = names;
    dailyReportPage.lastDailyReportScheduleName = names[names.length - 1];
  }
);

Then('{int} schedules should be created for the daily report', { timeout: 180000 }, async function (count) {
  const schedulePage = getSchedulePage(this);
  const names =
    this.lastDailyReportScheduleNames ||
    schedulePage.lastDailyReportScheduleNames ||
    [];
  await schedulePage.expectSchedulesCreatedForDailyReport(names.slice(0, count));
});

When('I click the daily report schedule progress edit icon', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickScheduleProgressEditIcon();
});

Then(
  'all created schedules should be displayed and selected in schedule progress',
  { timeout: 120000 },
  async function () {
    const schedulePage = getSchedulePage(this);
    const names =
      this.lastDailyReportScheduleNames ||
      schedulePage.lastDailyReportScheduleNames ||
      getDailyReportPage(this).lastDailyReportScheduleNames ||
      [];
    await getDailyReportPage(this).expectCreatedSchedulesDisplayedAndSelectedInScheduleProgress(names);
  }
);

When('I unselect one selected schedule in the daily report schedule progress panel', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).unselectOneSelectedScheduleInScheduleProgressPanel();
});

When('I click Save on the daily report schedule progress panel', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickSaveOnScheduleProgressPanel();
});

// --- TC-08: Task → Daily Report lists task -----------------------------------

When('I create a task for daily report with random name today dates and first assignee', { timeout: 240000 }, async function () {
  const name = await getTaskManagementPage(this).createTaskForDailyReportTc08();
  this.lastDailyReportTaskName = name;
});

Then('I should see the task created for the daily report', { timeout: 120000 }, async function () {
  const taskPage = getTaskManagementPage(this);
  const name = this.lastDailyReportTaskName || taskPage.lastDailyReportTaskName;
  await taskPage.expectTaskCreatedForDailyReport(name);
});

Then('I should see the created task listed on the daily report create page', { timeout: 120000 }, async function () {
  const taskPage = getTaskManagementPage(this);
  const name = this.lastDailyReportTaskName || taskPage.lastDailyReportTaskName;
  await getDailyReportPage(this).expectCreatedTaskOnDailyReportCreatePage(name);
});

// --- TC-09: Task (×3) → Daily Report Task Progress edit → unselect 1 → Create -

When(
  'I create {int} tasks for daily report with random names today dates and first assignee',
  { timeout: 480000 },
  async function (count) {
    const names = await getTaskManagementPage(this).createTasksForDailyReportTc09(count);
    this.lastDailyReportTaskNames = names;
    this.lastDailyReportTaskName = names[names.length - 1];
    const dailyReportPage = getDailyReportPage(this);
    dailyReportPage.lastDailyReportTaskNames = names;
    dailyReportPage.lastDailyReportTaskName = names[names.length - 1];
  }
);

Then('{int} tasks should be created for the daily report', { timeout: 180000 }, async function (count) {
  const taskPage = getTaskManagementPage(this);
  const names =
    this.lastDailyReportTaskNames ||
    taskPage.lastDailyReportTaskNames ||
    [];
  await taskPage.expectTasksCreatedForDailyReport(names.slice(0, count));
});

When('I click the daily report task progress edit icon', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickTaskProgressEditIcon();
});

Then(
  'all created tasks should be displayed and selected in task progress',
  { timeout: 120000 },
  async function () {
    const taskPage = getTaskManagementPage(this);
    const names =
      this.lastDailyReportTaskNames ||
      taskPage.lastDailyReportTaskNames ||
      getDailyReportPage(this).lastDailyReportTaskNames ||
      [];
    await getDailyReportPage(this).expectCreatedTasksDisplayedAndSelectedInTaskProgress(names);
  }
);

When('I unselect one selected task in the daily report task progress panel', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).unselectOneSelectedTaskInTaskProgressPanel();
});

When('I click Save on the daily report task progress panel', { timeout: 120000 }, async function () {
  await getDailyReportPage(this).clickSaveOnTaskProgressPanel();
});
