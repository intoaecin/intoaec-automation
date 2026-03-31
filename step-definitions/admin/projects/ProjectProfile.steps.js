// step-definitions/admin/projects/ProjectProfile.steps.js
const { When } = require('@cucumber/cucumber');
const ProjectNavigationPage = require('../../../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../../../pages/admin/projects/ProjectProfilePage');

When('I navigate to the Projects page', { timeout: 120000 }, async function () {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.navigateToProjects();
});

When('I click on the first project in the list', { timeout: 120000 }, async function () {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickFirstProject();
});

When('I select the {string} heading', { timeout: 120000 }, async function (headingName) {
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.selectHeading(headingName);
});

When('I click the {string} module card', { timeout: 120000 }, async function (moduleName) {
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.clickModuleCard(moduleName);
});
