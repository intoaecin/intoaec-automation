/**
 * Dump MUI :r ids and data-value options after Add Task on schedule create form.
 * Run: node scripts/debug-tc11-status.js
 */
const { chromium } = require('playwright');
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
  const { expect } = require('@playwright/test');
  await expect(async () => {
    expect(await profile.isInsideProjectProfile()).toBeTruthy();
  }).toPass({ timeout: 90000 });

  await profile.selectHeading('Project Management');
  await profile.clickModuleCard('Schedule');

  const schedule = new SchedulePage(page);
  await schedule.waitForModuleToLoad();
  await schedule.switchToGanttView();
  await schedule.openCreateSchedulePanel();
  await schedule.fillScheduleOrMilestoneName('DEBUG-TC11');
  await schedule.openScheduleCreateFormAssigneesDropdown();
  await schedule.selectUpToTwoAssigneesOnScheduleCreateForm(2);
  await schedule.selectScheduleFormPriority(/^high$/i);
  await schedule.fillRandomCompletionPercentOnScheduleCreateForm(0, 100);
  await schedule.fillRandomHexColorCodeOnScheduleCreateForm();
  await schedule.pickRandomStartDateTimeOnScheduleCreateForm();
  await schedule.pickRandomEndDateTimeAfterStartOnScheduleCreateForm();
  await schedule.fillRandomDescriptionOnScheduleCreateForm();
  await schedule.expandScheduleCreateFormAdditionalDetails();
  await schedule.addNewTaskOnScheduleCreateFormNamed('DEBUG-TASK-11');

  const dump = await page.evaluate(() => {
    const surfaces = [
      ...document.querySelectorAll('.MuiDrawer-paper'),
      ...document.querySelectorAll('.offcanvas.show, aside.offcanvas.show'),
    ].filter((el) => el.getBoundingClientRect().height > 0);
    const root = surfaces[surfaces.length - 1] || document.body;

    const rIds = [...root.querySelectorAll('[id^=":r"]')].map((el) => ({
      id: el.id,
      tag: el.tagName,
      class: (el.className || '').toString().slice(0, 80),
      text: (el.textContent || '').trim().slice(0, 60),
      role: el.getAttribute('role') || '',
      visible: el.getBoundingClientRect().height > 0,
    }));

    const dataValues = [...document.querySelectorAll('[data-value]')].map((el) => ({
      value: el.getAttribute('data-value'),
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 40),
      visible: el.getBoundingClientRect().height > 0,
    }));

    const selects = [...root.querySelectorAll('.MuiSelect-select')].map((el) => ({
      id: el.id,
      text: (el.textContent || '').trim().slice(0, 40),
      visible: el.getBoundingClientRect().height > 0,
    }));

    return { rIds, dataValues, selects };
  });

  console.log('--- MuiSelect-select in drawer ---');
  dump.selects.forEach((s, i) => console.log(i, JSON.stringify(s)));
  console.log('--- [id^=":r"] in drawer ---');
  dump.rIds.forEach((s, i) => console.log(i, JSON.stringify(s)));
  console.log('--- [data-value] on page ---');
  dump.dataValues.forEach((s, i) => console.log(i, JSON.stringify(s)));

  await page.screenshot({ path: 'screenshots/debug-tc11-status.png', fullPage: true });
  console.log('Screenshot: screenshots/debug-tc11-status.png');
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
