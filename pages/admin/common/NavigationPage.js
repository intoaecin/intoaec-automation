// pages/admin/common/NavigationPage.js
const BasePage = require('../../BasePage');

class NavigationPage extends BasePage {
  constructor(page) {
    super(page);
    
    // 1. Locators updated directly from Playwright Codegen!
    this.crmDropdown = page.locator('button').filter({ hasText: 'CRM' }).locator('#template-center-header');
    this.leadManagerLink = page.getByLabel('Lead Manager').getByRole('button', { name: 'Lead Manager' });
    
    // Made dynamic: Clicks the first rowheader regardless of what the lead's name is
    this.firstLeadName = page.getByRole('rowheader').first();
  }

  // 2. Actions
  async clickCrmDropdown() {
    await this.crmDropdown.click();
  }

  async clickLeadManager() {
    await this.leadManagerLink.click();
  }

  async clickFirstLead() {
    // Wait for the row to actually be visible on the screen before clicking
    await this.firstLeadName.waitFor({ state: 'visible' });
    await this.firstLeadName.click();
  }
}

module.exports = NavigationPage;