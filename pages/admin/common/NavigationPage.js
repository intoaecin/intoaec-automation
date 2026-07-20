// pages/admin/common/NavigationPage.js
const { expect } = require('@playwright/test');
const BasePage = require('../../BasePage');

class NavigationPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;

    this.crmDropdown = page.locator('button').filter({ hasText: 'CRM' }).locator('#template-center-header');
    this.leadManagerLink = page.getByLabel('Lead Manager').getByRole('button', { name: 'Lead Manager' });
    this.leadRows = page.locator('tbody tr');
  }

  resolveLeadName() {
    return String(process.env.LEAD_NAME || process.env.TEST_LEAD_NAME || 'sick').trim();
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getLeadTileByName(leadName) {
    const pattern = new RegExp(`^${this.escapeRegex(leadName)}$`, 'i');
    return this.page.locator('div, span, p, a, button').filter({ hasText: pattern }).first();
  }

  async clickCrmDropdown() {
    console.log('[NavigationPage] Opening CRM menu');
    await expect(this.crmDropdown).toBeVisible({ timeout: this.defaultTimeout });
    await this.crmDropdown.click();
  }

  async clickLeadManager() {
    console.log('[NavigationPage] Opening Lead Manager');
    await expect(this.leadManagerLink).toBeVisible({ timeout: this.defaultTimeout });
    await this.leadManagerLink.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForURL(/leadmanager\/master/i, { timeout: this.defaultTimeout }).catch(() => {});
  }

  async clickLeadByName(leadName = this.resolveLeadName()) {
    if (!leadName) {
      throw new Error('[NavigationPage] Lead name is required. Set LEAD_NAME or TEST_LEAD_NAME.');
    }

    console.log(`[NavigationPage] Opening lead by name: ${leadName}`);
    const leadTile = this.getLeadTileByName(leadName);
    await expect(leadTile).toBeVisible({ timeout: this.defaultTimeout });
    await leadTile.scrollIntoViewIfNeeded().catch(() => {});
    await leadTile.click({ timeout: 15000 });

    await this.page.waitForURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async clickFirstLeadFromTable() {
    console.log('[NavigationPage] Opening first lead from Lead Manager table');
    const firstRow = this.leadRows.first();
    await expect(firstRow).toBeVisible({ timeout: this.defaultTimeout });

    const nameCell = firstRow.getByRole('cell').nth(1);
    await expect(nameCell).toBeVisible({ timeout: this.defaultTimeout });
    await nameCell.click({ timeout: 15000 });

    await this.page.waitForURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async clickFirstLead() {
    const leadName = this.resolveLeadName();

    if (/leadmanager\/profile/i.test(this.page.url())) {
      console.log('[NavigationPage] Lead profile already open');
      return;
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const leadTile = this.getLeadTileByName(leadName);
    if (await leadTile.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickLeadByName(leadName);
      return;
    }

    if ((await this.leadRows.count()) > 0) {
      await this.clickFirstLeadFromTable();
      return;
    }

    await this.clickLeadByName(leadName);
  }
}

module.exports = NavigationPage;
