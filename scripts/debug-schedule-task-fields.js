/**
 * Debug: dump visible buttons/labels in Add Schedule drawer after expanding Additional Details.
 * Run: node scripts/debug-schedule-task-fields.js
 */
const { chromium } = require('playwright');
const testData = require('../utils/testData');
const SchedulePage = require('../pages/admin/projects/management/Schedule/SchedulePage');
const LoginPage = require('../pages/admin/auth/LoginPage');
const ProjectNavigationPage = require('../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../pages/admin/projects/ProjectProfilePage');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const login = new LoginPage(page);
  await login.ensureAuthenticated(testData.admin.validUser.email, testData.admin.validUser.password);

  const nav = new ProjectNavigationPage(page);
  await nav.navigateToProjects();
  await page.locator('tbody tr').first().click();
  await page.waitForLoadState('domcontentloaded');
  const profile = new ProjectProfilePage(page);
  const { expect } = require('@playwright/test');
  await expect(profile.projectManagementHeading).toBeVisible({ timeout: 60000 });
  await profile.selectHeading('Project Management');
  await profile.clickModuleCard('Schedule');

  const schedule = new SchedulePage(page);
  await schedule.waitForModuleToLoad();
  await schedule.switchToGanttView();
  await schedule.openCreateSchedulePanel();
  await schedule.fillScheduleOrMilestoneName('DEBUG-TASK-FORM');
  await schedule.expandScheduleCreateFormAdditionalDetails();
  const addTaskBtn = await schedule._findScheduleCreateFormAddTaskButton();
  await addTaskBtn.click({ force: true });
  await schedule._scrollScheduleCreateFormToBottom();
  await schedule._wheelScrollScheduleDrawer(12);

  const drawer = schedule._scheduleCreateFormDrawer();
  const panel = schedule.formPanel();
  const taskInput = panel.getByLabel(/task/i).or(panel.getByPlaceholder(/task/i)).first();
  if (await taskInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await taskInput.fill('DEBUG-TASK-NAME');
  }

  const buttons = await drawer.locator('button').allInnerTexts();
  const labels = await drawer.locator('label, .MuiFormLabel-root, .fw-500').allInnerTexts();
  console.log('--- buttons ---');
  buttons.forEach((t, i) => console.log(i, JSON.stringify(t.trim())));
  console.log('--- labels ---');
  labels.forEach((t, i) => console.log(i, JSON.stringify(t.trim())));

  await page.screenshot({ path: 'screenshots/debug-schedule-task-fields.png', fullPage: true });
  console.log('Screenshot: screenshots/debug-schedule-task-fields.png');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
