// pages/admin/projects/ProjectNavigationPage.js
const BasePage = require('../../BasePage');

class ProjectNavigationPage extends BasePage {
  constructor(page) {
    super(page);
    this.projectsLink = page.getByLabel('Clients/Projects').first();
    this.firstProject = page.getByRole('rowheader').first();
  }

  async navigateToProjects() {
    await this.projectsLink.click();
  }

  async clickFirstProject() {
    await this.firstProject.click();
  }
}

module.exports = ProjectNavigationPage;
