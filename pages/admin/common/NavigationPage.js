// pages/admin/common/NavigationPage.js
const { expect } = require('@playwright/test');
const BasePage = require('../../BasePage');

class NavigationPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;

    this.crmSidebarItem = page
      .getByRole('button', { name: /^crm$/i })
      .or(page.locator('.MuiListItemButton-root').filter({ hasText: /^crm$/i }))
      .first();
    this.leadManagerLink = page
      .getByRole('menuitem', { name: /lead manager/i })
      .or(page.locator('.MuiMenuItem-root').filter({ hasText: /^lead manager$/i }))
      .first();
    this.leadRows = page
      .locator('tbody tr')
      .filter({ has: page.locator('span.text-dark, span.text-primary') });

    this.dummyEmailDomain = '@dummytestmaildomain.co';
    this.overviewSidebarItem = page.getByRole('button', { name: /^overview$/i }).first();
    this.leadEditButton = page.getByRole('button', { name: /^edit$/i }).first();
    this.editProjectDialog = page.getByRole('dialog').filter({ hasText: /edit project/i }).last();
    this.leadEmailInput = this.editProjectDialog.locator('input[name="leadEmail"]');
    this.saveChangesButton = this.editProjectDialog.getByRole('button', { name: /^save changes$/i });
    this.cancelEditButton = this.editProjectDialog.getByRole('button', { name: /^cancel$/i });
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
    await expect(this.crmSidebarItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.crmSidebarItem.scrollIntoViewIfNeeded().catch(() => {});
    await this.crmSidebarItem.hover().catch(() => {});
    await this.crmSidebarItem.click({ timeout: 15000 });
    await expect(this.leadManagerLink).toBeVisible({ timeout: 10000 });
  }

  async clickLeadManager() {
    console.log('[NavigationPage] Opening Lead Manager');
    if (!(await this.leadManagerLink.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.clickCrmDropdown();
    }
    await expect(this.leadManagerLink).toBeVisible({ timeout: this.defaultTimeout });
    await this.leadManagerLink.scrollIntoViewIfNeeded().catch(() => {});
    await this.leadManagerLink.click({ force: true, timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page.waitForURL(/leadmanager\/master/i, { timeout: this.defaultTimeout }).catch(() => {});
  }

  getLeadNameCell(leadName) {
    const pattern = new RegExp(`^${this.escapeRegex(leadName)}$`, 'i');
    return this.page
      .locator('tbody tr td')
      .filter({ has: this.page.locator('span.text-dark').filter({ hasText: pattern }) })
      .first()
      .or(this.leadRows.filter({ hasText: pattern }).getByRole('cell').nth(1))
      .or(this.leadRows.filter({ hasText: pattern }).first());
  }

  async clickLeadByName(leadName = this.resolveLeadName()) {
    if (!leadName) {
      throw new Error('[NavigationPage] Lead name is required. Set LEAD_NAME or TEST_LEAD_NAME.');
    }

    console.log(`[NavigationPage] Opening lead by name: ${leadName}`);

    const leadNameCell = this.getLeadNameCell(leadName);
    if (await leadNameCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await leadNameCell.scrollIntoViewIfNeeded().catch(() => {});
      await leadNameCell.click({ force: true, timeout: 15000 });
    } else {
      const leadTile = this.getLeadTileByName(leadName);
      await expect(leadTile).toBeVisible({ timeout: this.defaultTimeout });
      await leadTile.scrollIntoViewIfNeeded().catch(() => {});
      await leadTile.click({ timeout: 15000 });
    }

    await this.page.waitForURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  leadNameInRow(row) {
    return row.locator('span.text-dark, span.text-primary').first();
  }

  async clickFirstLeadFromTable() {
    console.log('[NavigationPage] Opening first lead from Lead Manager table');
    await this.page.locator('#fc_frame').evaluate((el) => {
      el.style.setProperty('display', 'none', 'important');
    }).catch(() => {});
    await this.page.mouse.move(0, 0).catch(() => {});

    await expect(this.page).toHaveURL(/leadmanager\/master/i, { timeout: this.defaultTimeout });
    await expect(this.leadRows.first()).toBeVisible({ timeout: this.defaultTimeout });

    const rowCount = await this.leadRows.count();
    const maxAttempts = Math.min(Math.max(rowCount, 1), 8);

    for (let index = 0; index < maxAttempts; index += 1) {
      if (/leadmanager\/profile/i.test(this.page.url())) {
        break;
      }

      const row = this.leadRows.nth(index);
      await expect(row).toBeVisible({ timeout: this.defaultTimeout });

      const rowText = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (/\bwon\b/i.test(rowText)) {
        console.log(`[NavigationPage] Skipping Won lead in row ${index + 1}`);
        continue;
      }

      const leadName = this.leadNameInRow(row);
      await expect(leadName).toBeVisible({ timeout: this.defaultTimeout });
      await leadName.scrollIntoViewIfNeeded().catch(() => {});
      console.log(`[NavigationPage] Clicking lead name in row ${index + 1}`);
      await leadName.click({ timeout: 15000 });

      const opened = await this.page
        .waitForURL(/leadmanager\/profile/i, { timeout: 20000 })
        .then(() => true)
        .catch(() => false);
      if (opened) {
        break;
      }
    }

    await expect(this.page).toHaveURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout });
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async clickFirstLead() {
    if (/leadmanager\/profile/i.test(this.page.url())) {
      console.log('[NavigationPage] Lead profile already open');
      return;
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.clickFirstLeadFromTable();
  }

  /** Single path: CRM → Lead Manager → first lead in the table. */
  async navigateToFirstLead() {
    if (/leadmanager\/profile/i.test(this.page.url())) {
      console.log('[NavigationPage] Lead profile already open');
      return;
    }

    console.log('[NavigationPage] Navigating CRM → Lead Manager → first lead');
    if (!/leadmanager\/master/i.test(this.page.url())) {
      await this.clickCrmDropdown();
      await this.clickLeadManager();
    }

    await expect(this.leadRows.first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.clickFirstLeadFromTable();
  }

  generateYopmailAddress() {
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    return `qa.lead.${suffix}@yopmail.com`;
  }

  /** Email sends need a real recipient: dummy-domain or empty lead emails get a yopmail address via Overview → Edit. */
  async ensureLeadEmailIsNotDummy() {
    if (!(await this.leadEditButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log('[NavigationPage] Opening lead Overview to check lead email');
      await expect(this.overviewSidebarItem).toBeVisible({ timeout: this.defaultTimeout });
      await this.overviewSidebarItem.click();
      await this.page.waitForURL(/tab=Overview/i, { timeout: this.defaultTimeout }).catch(() => {});
    }

    await expect(this.leadEditButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.leadEditButton.click();
    await expect(this.editProjectDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.leadEmailInput).toBeVisible({ timeout: this.defaultTimeout });

    const currentEmail = (await this.leadEmailInput.inputValue()).trim();
    if (currentEmail && !currentEmail.toLowerCase().includes(this.dummyEmailDomain)) {
      console.log(`[NavigationPage] Lead email is not a dummy email: ${currentEmail}`);
      await this.cancelEditButton.click();
      await expect(this.editProjectDialog).toBeHidden({ timeout: this.defaultTimeout });
      return currentEmail;
    }

    const currentLabel = currentEmail || '(empty)';
    if (await this.leadEmailInput.isDisabled()) {
      throw new Error(`[NavigationPage] Lead email ${currentLabel} cannot receive mail and the field is not editable.`);
    }

    const newEmail = this.generateYopmailAddress();
    console.log(`[NavigationPage] Replacing lead email ${currentLabel} with ${newEmail}`);
    await this.leadEmailInput.fill(newEmail);
    await expect(this.leadEmailInput).toHaveValue(newEmail);
    await expect(this.saveChangesButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.saveChangesButton.click();
    await expect(this.editProjectDialog).toBeHidden({ timeout: this.defaultTimeout });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    return newEmail;
  }
}

module.exports = NavigationPage;
