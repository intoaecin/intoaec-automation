const { Before, When, Then } = require('@cucumber/cucumber');
const ClientReportPage = require('../../../../../pages/admin/projects/communication/client-report/client-report.page');
const ProjectProfilePage = require('../../../../../pages/admin/projects/ProjectProfilePage');
const ProjectNavigationPage = require('../../../../../pages/admin/projects/ProjectNavigationPage');

const CLIENT_REPORT_TEST_CASE_LOG = {
  TC01: 'TC-01 — Create client report successfully',
  TC02: 'TC-02 — Create client report with notes edit and random site process update title',
  TC03: 'TC-03 — Create client report with notes, attachment upload, and manual Enter gate',
  TC04: 'TC-04 — Create client report with notes, attachment, weather condition, and Create',
  TC05: 'TC-05 — Create schedule in Gantt then client report with weather condition and Create',
  TC06: 'TC-06 — Create schedule in Gantt then client report with weather and unselect two schedules',
  TC07: 'TC-07 — Create three quick tasks in To Do then client report with weather and select task',
  TC08: 'TC-08 — Create three quick tasks then client report with weather and unselect one task',
  TC09: 'TC-09 — Create two shifts then client report with notes and weather condition',
  TC10: 'TC-10 — Create two shifts then client report with weather and unselect one worker shift',
  TC11: 'TC-11 — Create inventory group item then client report with notes and weather condition',
};

function logClientReportTestCaseStart(pickle) {
  const tagNames = (pickle.tags || []).map((t) => String(t.name || '').replace(/^@/, ''));
  const tcTag = tagNames.find((name) => /^TC\d{2}$/i.test(name));
  if (!tcTag) return;

  const label = CLIENT_REPORT_TEST_CASE_LOG[tcTag.toUpperCase()] || tcTag;
  console.log(`\n========== ${label} ==========\n`);
}

Before({ tags: '@client-report' }, async function (scenario) {
  logClientReportTestCaseStart(scenario.pickle);

  if (!this.page || this.page.isClosed()) {
    return;
  }

  const profile = new ProjectProfilePage(this.page);
  if (await profile.isInsideProjectProfile()) {
    return;
  }

  const url = this.page.url();
  if (!url || url === 'about:blank' || url.includes('signIn')) {
    return;
  }

  const nav = new ProjectNavigationPage(this.page);
  const returned = await nav.returnToProjectProfile().catch(() => false);
  if (!returned && !(await profile.isInsideProjectProfile())) {
    await nav.navigateToProjects().catch(() => {});
  }
});

function getClientReportPage(world) {
  if (!world.clientReportPage) {
    world.clientReportPage = new ClientReportPage(world.page);
  }
  return world.clientReportPage;
}

When('I navigate to the client report module', { timeout: 180000 }, async function () {
  await getClientReportPage(this).navigateToClientReportModule();
});

When('I complete the client report create flow with three create clicks', { timeout: 180000 }, async function () {
  await getClientReportPage(this).completeClientReportCreateWithThreeCreateClicks();
});

When('I open the client report create page via popup', { timeout: 180000 }, async function () {
  await getClientReportPage(this).openClientReportCreatePageViaPopup();
});

When('I click Create on the client report list page', { timeout: 120000 }, async function () {
  await getClientReportPage(this).clickCreateOnClientReportListPage();
});

Then('I should see the create client report popup', { timeout: 60000 }, async function () {
  await getClientReportPage(this).expectClientReportCreatePopupVisible();
});

When('I click Create in the create client report popup', { timeout: 120000 }, async function () {
  await getClientReportPage(this).clickCreateInClientReportPopup();
});

Then('I should see the client report list page', { timeout: 60000 }, async function () {
  await getClientReportPage(this).expectClientReportListPage();
});

Then('I should see the client report create form page', { timeout: 60000 }, async function () {
  await getClientReportPage(this).expectClientReportCreateFormPage();
});

When(
  'I select a weather condition from the client report weather dropdown',
  { timeout: 120000 },
  async function () {
    await getClientReportPage(this).selectWeatherConditionFromDropdown();
  }
);

When(
  'I unselect two selected schedule checkboxes on the client report create page',
  { timeout: 120000 },
  async function () {
    await getClientReportPage(this).unselectSelectedScheduleCheckboxes(2);
  }
);

When(
  'I select five unselected schedule checkboxes on the client report create page',
  { timeout: 120000 },
  async function () {
    await getClientReportPage(this).unselectSelectedScheduleCheckboxes(2);
  }
);

When('I open the client report schedule section edit icon', { timeout: 120000 }, async function () {
  await getClientReportPage(this).clickScheduleSectionEditIcon();
});

When('I open the client report task section edit icon', { timeout: 120000 }, async function () {
  await getClientReportPage(this).clickTaskSectionEditIcon();
});

When('I open the client report workers section edit icon', { timeout: 120000 }, async function () {
  await getClientReportPage(this).clickWorkersSectionEditIcon();
});

When(
  'I unselect one selected workers checkbox on the client report create page',
  { timeout: 120000 },
  async function () {
    await getClientReportPage(this).unselectSelectedWorkersCheckboxes(1);
  }
);

When('I click Save on the client report workers selection panel', { timeout: 120000 }, async function () {
  await getClientReportPage(this).clickSaveOnWorkersSelectionPanel();
});

When(
  'I unselect one selected task checkbox on the client report create page',
  { timeout: 120000 },
  async function () {
    await getClientReportPage(this).unselectSelectedTaskCheckboxes(1);
  }
);

When('I click Save on the client report task selection panel', { timeout: 120000 }, async function () {
  await getClientReportPage(this).clickSaveOnTaskSelectionPanel();
});

When(
  'I select the created schedule on the client report create page',
  { timeout: 120000 },
  async function () {
    const page = getClientReportPage(this);
    const scheduleName = this.lastCreatedScheduleName || page.lastCreatedScheduleName;
    await page.selectCreatedScheduleOnCreateForm(scheduleName);
  }
);

When(
  'I select the created task on the client report create page',
  { timeout: 120000 },
  async function () {
    const page = getClientReportPage(this);
    const taskName = this.lastCreatedTaskName || page.lastCreatedTaskName || 'Quick Task';
    await page.selectCreatedTaskOnCreateForm(taskName);
  }
);

When(
  'I select the created shift on the client report create page',
  { timeout: 120000 },
  async function () {
    const page = getClientReportPage(this);
    const shiftName = this.lastCreatedShiftName || page.lastCreatedShiftName;
    await page.selectCreatedShiftOnCreateForm(shiftName);
  }
);

When(
  'I select the created inventory item on the client report create page',
  { timeout: 120000 },
  async function () {
    const page = getClientReportPage(this);
    const itemName =
      this.lastAddedInventoryItemName ||
      (this.inventoryPage && this.inventoryPage.lastAddedInventoryItemName) ||
      page.lastAddedInventoryItemName;
    if (itemName) {
      page.lastAddedInventoryItemName = itemName;
    }
    await page.selectCreatedInventoryItemOnCreateForm(itemName);
  }
);

When('I open the client report create page', { timeout: 180000 }, async function () {
  await getClientReportPage(this).openClientReportCreatePage();
});

When('I edit client report notes with random text from the notes edit popup', { timeout: 180000 }, async function () {
  await getClientReportPage(this).editClientReportNotesWithRandomText();
});

When('I replace the client report title with a random site process update title', { timeout: 120000 }, async function () {
  await getClientReportPage(this).replaceReportTitleWithRandomSiteProcessUpdate();
});

When('I click Create on the client report create page', { timeout: 60000 }, async function () {
  await getClientReportPage(this).clickCreateOnClientReportCreatePage();
});

When('I click the client report attachment icon to upload a file', { timeout: 600000 }, async function () {
  await getClientReportPage(this).clickClientReportAttachmentIconForUpload();
});

When(
  'I press Enter in the terminal after the client report attachment is uploaded',
  { timeout: 600000 },
  async function () {
    await getClientReportPage(this).waitForClientReportAttachmentUploadEnterGate();
  }
);

When(
  'I edit client report weather condition with weather affecting work toggle and random notes',
  { timeout: 180000 },
  async function () {
    await getClientReportPage(this).editClientReportWeatherConditionWithRandomNotes();
  }
);

When(
  'I complete the client report create journey with notes edit and random title',
  { timeout: 360000 },
  async function () {
    await getClientReportPage(this).completeClientReportCreateWithNotesAndTitleJourney();
  }
);

Then('I should see the client report created successfully', { timeout: 30000 }, async function () {
  await getClientReportPage(this).expectClientReportCreatedSuccessfully();
});
