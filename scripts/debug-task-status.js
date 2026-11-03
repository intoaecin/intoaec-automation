/**
 * Dump task-row controls after Add Task + fill name (Additional Details).
 * Run: node scripts/debug-task-status.js
 */
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const testData = require('../utils/testData');
const LoginPage = require('../pages/admin/auth/LoginPage');
const ProjectNavigationPage = require('../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../pages/admin/projects/ProjectProfilePage');
const SchedulePage = require('../pages/admin/projects/management/Schedule/SchedulePage');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const login = new LoginPage(page);
  await login.ensureAuthenticated(testData.admin.validUser.email, testData.admin.validUser.password);

  const nav = new ProjectNavigationPage(page);
  await nav.navigateToProjects();
  await nav.clickFirstProject();
  await page.waitForLoadState('domcontentloaded');
  const profile = new ProjectProfilePage(page);
  await expect(async () => {
    expect(await profile.isInsideProjectProfile()).toBeTruthy();
  }).toPass({ timeout: 90000 });
  await profile.selectHeading('Project Management');
  await profile.clickModuleCard('Schedule');

  const schedule = new SchedulePage(page);
  await schedule.waitForModuleToLoad();
  await schedule.switchToGanttView();
  await schedule.openCreateSchedulePanel();
  await schedule.fillScheduleOrMilestoneName('DEBUG-STATUS');
  await schedule.pickRandomWeekdayStartDateTimeOnScheduleCreateForm().catch(() => {});
  await schedule.pickRandomWeekdayEndDateTimeAfterStartOnScheduleCreateForm().catch(() => {});
  await schedule.expandScheduleCreateFormAdditionalDetails();
  const addTaskBtn = await schedule._findScheduleCreateFormAddTaskButton();
  await addTaskBtn.click({ force: true });
  await schedule._scrollScheduleCreateFormToBottom();
  await schedule._wheelScrollScheduleDrawer(12);
  const taskInput = await schedule._scheduleCreateFormNewTaskNameInput();
  await taskInput.fill('DEBUG-TASK-STATUS');

  const drawer = schedule._scheduleCreateFormDrawer();
  const details = drawer
    .locator('.MuiAccordion-root')
    .filter({ has: drawer.getByText(/additional\s*details/i) })
    .first()
    .locator('.MuiAccordionDetails-root')
    .first();

  const labels = await details.locator('label, .MuiFormLabel-root, .fw-500, p, span').allInnerTexts();
  const combos = await details.locator('[role="combobox"], .MuiSelect-select').allInnerTexts();
  const buttons = await details.locator('button').allInnerTexts();
  console.log('--- labels ---');
  labels.forEach((t, i) => console.log(i, JSON.stringify(t.trim())));
  console.log('--- combobox/select ---');
  combos.forEach((t, i) => console.log(i, JSON.stringify(t.trim())));
  console.log('--- buttons ---');
  buttons.forEach((t, i) => console.log(i, JSON.stringify(t.trim())));

  await page.screenshot({ path: 'screenshots/debug-task-status.png', fullPage: true });
  console.log('Screenshot: screenshots/debug-task-status.png');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
