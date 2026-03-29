// pages/admin/projects/ProjectProfilePage.js
const BasePage = require('../../BasePage');

class ProjectProfilePage extends BasePage {
  constructor(page) {
    super(page);
    // Headings
    this.designEstimatesHeading = page.getByRole('button', { name: 'Design & Estimates' });
    this.procurementHeading = page.getByRole('button', { name: 'Procurement' });
    this.financialHeading = page.getByRole('button', { name: 'Financial' });
    this.projectManagementHeading = page.getByRole('button', { name: 'Project Management' });
    this.communicationDocsHeading = page.getByRole('button', { name: 'Communication & Docs' });
  }

  async selectHeading(name) {
    await this.page.getByRole('button', { name }).click();
  }

  async clickModuleCard(name) {
    await this.page.getByText(name, { exact: true }).click();
  }
}

module.exports = ProjectProfilePage;
