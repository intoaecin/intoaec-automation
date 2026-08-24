// step-definitions/admin/projects/ProjectProfile.steps.js
const { When } = require('@cucumber/cucumber');
const ProjectNavigationPage = require('../../../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../../../pages/admin/projects/ProjectProfilePage');

function getSchedulePage(page) {
  const SchedulePage = require('../../../pages/admin/projects/management/Schedule/SchedulePage');
  return new SchedulePage(page);
}

When('I navigate to the Projects page', { timeout: 120000 }, async function () {
  const projectProfilePage = new ProjectProfilePage(this.page);
  if (await projectProfilePage.isInsideProjectProfile()) {
    console.log('Already on project profile — skipping Projects navigation');
    return;
  }
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.navigateToProjects();
  console.log('Opened Clients/Projects list');
});

When('I click on the first project in the list', { timeout: 120000 }, async function () {
  const projectProfilePage = new ProjectProfilePage(this.page);
  if (await projectProfilePage.isInsideProjectProfile()) {
    console.log('Already on project profile — skipping project selection');
    return;
  }
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickFirstProject();
  console.log('Opened first client/project from Clients/Projects list');
});

When('I select the {string} heading', { timeout: 120000 }, async function (headingName) {
  const projectProfilePage = new ProjectProfilePage(this.page);

  if (/schedule/i.test(this.page.url())) {
    const schedulePage = getSchedulePage(this.page);
    if (await schedulePage.isOnScheduleModule()) {
      const projectNavigationPage = new ProjectNavigationPage(this.page);
      await projectNavigationPage.returnToProjectProfile();
    }
  }

  await projectProfilePage.selectHeading(headingName);
  console.log(`Selected "${headingName}" heading`);
});

When('I click the {string} module card', { timeout: 120000 }, async function (moduleName) {
  if (
    (moduleName || '').trim().toLowerCase() === 'schedule' &&
    /schedule/i.test(this.page.url())
  ) {
    const schedulePage = getSchedulePage(this.page);
    if (await schedulePage.isOnScheduleModule()) {
      console.log('Already on Schedule module — skipping Schedule module card');
      return;
    }
  }
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.clickModuleCard(moduleName);
});
