// step-definitions/admin/projects/ProjectProfile.steps.js
const { When } = require('@cucumber/cucumber');
const ProjectNavigationPage = require('../../../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../../../pages/admin/projects/ProjectProfilePage');
const SchedulePage = require('../../../pages/admin/projects/management/Schedule/SchedulePage');

When('I navigate to the Projects page', { timeout: 120000 }, async function () {
  const projectProfilePage = new ProjectProfilePage(this.page);
  if (await projectProfilePage.isInsideProjectProfile()) {
    console.log('Already on project profile — skipping Projects navigation');
    return;
  }
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.navigateToProjects();
});

When('I navigate to the Admin Active Clients list', { timeout: 120000 }, async function () {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.navigateToActiveClientsList();
});

When('I open the project {string} profile directly', { timeout: 120000 }, async function (projectName) {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.openProjectProfileDirect(projectName);
});

When('I ensure the classic project profile UI is shown', { timeout: 120000 }, async function () {
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.ensureClassicProjectUi();
});

When('I click on the first project in the list', { timeout: 120000 }, async function () {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickFirstProject();
});

When('I click on the project {string} in the list', { timeout: 120000 }, async function (projectName) {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickProjectByName(projectName);
});

When('I select the client {string}', { timeout: 120000 }, async function (clientName) {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickProjectByName(clientName);
});

When('I select the {string} heading', { timeout: 120000 }, async function (headingName) {
  const projectProfilePage = new ProjectProfilePage(this.page);
  const schedulePage = new SchedulePage(this.page);
  const projectNavigationPage = new ProjectNavigationPage(this.page);

  // Being inside the project profile does NOT mean this heading is active
  // (e.g. Design & Estimates may still be selected). Always select the requested heading
  // so Schedule / Daily Report / etc. cards come from the correct section.
  if (await schedulePage.isOnScheduleModule()) {
    await projectNavigationPage.returnToProjectProfile();
  } else if (!(await projectProfilePage.isInsideProjectProfile())) {
    await projectNavigationPage.returnToProjectProfile();
  }

  await projectProfilePage.selectHeading(headingName);
  console.log(`Selected "${headingName}" heading`);
});

When('I click the {string} module card', { timeout: 120000 }, async function (moduleName) {
  const schedulePage = new SchedulePage(this.page);
  if ((moduleName || '').trim().toLowerCase() === 'schedule' && (await schedulePage.isOnScheduleModule())) {
    // Only skip when Gantt + List are both present (Budget-only view is not enough).
    const ganttVisible = await schedulePage.ganttTab.isVisible({ timeout: 1500 }).catch(() => false);
    const listVisible = await schedulePage.listTab.isVisible({ timeout: 1500 }).catch(() => false);
    if (ganttVisible && listVisible) {
      console.log('Already on Schedule module — skipping Schedule module card');
      return;
    }
    console.log('Schedule/Budget without both Gantt+List — re-opening Schedule module card');
  }
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.clickModuleCard(moduleName);
});
