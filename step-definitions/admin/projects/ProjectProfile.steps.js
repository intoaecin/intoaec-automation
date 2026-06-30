// step-definitions/admin/projects/ProjectProfile.steps.js
const { When } = require('@cucumber/cucumber');
const ProjectNavigationPage = require('../../../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../../../pages/admin/projects/ProjectProfilePage');
const SchedulePage = require('../../../pages/admin/projects/management/Schedule/SchedulePage');

When('I navigate to the Projects page', { timeout: 120000 }, async function () {
  const schedulePage = new SchedulePage(this.page);
  if (await schedulePage.isOnScheduleModule()) {
    console.log('Already on Schedule module — skipping Projects navigation');
    return;
  }
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.navigateToProjects();
});

When('I click on the first project in the list', { timeout: 120000 }, async function () {
  const schedulePage = new SchedulePage(this.page);
  if (await schedulePage.isOnScheduleModule()) {
    console.log('Already on Schedule module — skipping project selection');
    return;
  }
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickFirstProject();
});

When('I select the {string} heading', { timeout: 120000 }, async function (headingName) {
  const schedulePage = new SchedulePage(this.page);
  if (await schedulePage.isOnScheduleModule()) {
    console.log(`Already on Schedule module — skipping "${headingName}" heading`);
    return;
  }
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.selectHeading(headingName);
});

When('I click the {string} module card', { timeout: 120000 }, async function (moduleName) {
  const schedulePage = new SchedulePage(this.page);
  if ((moduleName || '').trim().toLowerCase() === 'schedule' && (await schedulePage.isOnScheduleModule())) {
    console.log('Already on Schedule module — skipping Schedule module card');
    return;
  }
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.clickModuleCard(moduleName);
});
