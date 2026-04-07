// pages/admin/projects/ProjectNavigationPage.js
const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

class ProjectNavigationPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.projectsLink = page.getByLabel('Clients/Projects').first();
    this.firstProject = page.getByRole('rowheader').first();
    this.projectRows = page.locator('tbody tr');
  }

  async navigateToProjects() {
    await expect(this.projectsLink).toBeVisible({ timeout: this.defaultTimeout });
    await this.projectsLink.click();
    await expect(async () => {
      const rowCount = await this.projectRows.count();
      expect(rowCount).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
  }

  async clickFirstProject() {
    await expect(this.firstProject).toBeVisible({ timeout: this.defaultTimeout });
    await this.firstProject.click();
  }
}

module.exports = ProjectNavigationPage;
