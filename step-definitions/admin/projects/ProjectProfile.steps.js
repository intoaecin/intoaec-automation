// step-definitions/admin/projects/ProjectProfile.steps.js
const { When, And } = require('@cucumber/cucumber');
const ProjectNavigationPage = require('../../../../pages/admin/projects/ProjectNavigationPage');
const ProjectProfilePage = require('../../../../pages/admin/projects/ProjectProfilePage');

When('I navigate to the Projects page', async function () {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickProjects();
});

And('I click on the first project in the list', async function () {
  const projectNavigationPage = new ProjectNavigationPage(this.page);
  await projectNavigationPage.clickFirst.click();
});

And('I select the {string} heading', async function (headingName) {
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.selectHeading(headingName);
});

And('I click the {string} module card', async function (moduleName) {
  const projectProfilePage = new ProjectProfilePage(this.page);
  await projectProfilePage.clickModuleCard(moduleName);
});
