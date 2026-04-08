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
    const text = new RegExp(`^\\s*${escaped}\\s*$`, 'i');

    // Prefer clicking inside the main content area to avoid hidden sidebar duplicates.
    const main = this.page.locator('main, [role="main"]').first();
    const scope = (await main.isVisible({ timeout: 1500 }).catch(() => false)) ? main : this.page;

    const label = scope.getByText(text).first();
    await label.scrollIntoViewIfNeeded();
    await expect(label).toBeVisible({ timeout: 60000 });

    // Click the closest clickable ancestor (card/button/link) rather than the text span itself.
    const clickable = label.locator('xpath=ancestor-or-self::*[self::button or self::a or @role="button"][1]');
    if (await clickable.isVisible({ timeout: 1500 }).catch(() => false)) {
      await clickable.click();
    } else {
      await label.click();
    }
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = ProjectProfilePage;
