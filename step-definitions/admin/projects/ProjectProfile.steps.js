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

When('I click on the first project in the list', { timeout: 120000 }, async function () {
  const projectProfilePage = new ProjectProfilePage(this.page);
  if (await projectProfilePage.isInsideProjectProfile()) {
    console.log('Already on project profile — skipping project selection');
    return;
  }
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickFirstProject();
});

When('I select the {string} heading', { timeout: 120000 }, async function (headingName) {
  const projectProfilePage = new ProjectProfilePage(this.page);
  const schedulePage = new SchedulePage(this.page);

  // Being inside the project profile does NOT mean this heading is active
  // (e.g. Design & Estimates may still be selected). Always select the requested heading
  // so Schedule / Daily Report / etc. cards come from the correct section.
  if (await schedulePage.isOnScheduleModule()) {
    const projectNavigationPage = new ProjectNavigationPage(this.page);
    await projectNavigationPage.returnToProjectProfile();
  }

  await projectProfilePage.selectHeading(headingName);
  console.log(`Selected "${headingName}" heading`);
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
