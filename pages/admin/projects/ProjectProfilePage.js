// pages/admin/projects/ProjectProfilePage.js
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

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
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const label = this.page
      .getByText(new RegExp(`^\\s*${escaped}\\s*$`, 'i'))
      .first();
    await label.scrollIntoViewIfNeeded();
    await expect(label).toBeVisible({ timeout: 60000 });
    await label.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = ProjectProfilePage;
