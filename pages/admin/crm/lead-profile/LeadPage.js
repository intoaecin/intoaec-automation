// pages/admin/crm/lead-profile/LeadPage.js
const { expect } = require('@playwright/test');
const BasePage = require('../../../BasePage');
const NavigationPage = require('../../common/NavigationPage');

class LeadPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.navigationPage = new NavigationPage(page);

    this.createLeadButton = page.getByRole('button', { name: /^create lead$/i }).first();
    this.addNewButton = page.getByRole('button', { name: /^add new$/i }).first();

    this.leadNameInput = page.getByRole('combobox', { name: /lead name/i }).first();
    this.activeStepLabel = page.locator('.MuiStepLabel-label.Mui-active').first();
    this.nextButton = page.getByRole('button', { name: /^next$/i }).first();
    this.submitCreateLeadButton = page.getByRole('button', { name: /^create lead$/i }).last();

    this.leadAddedToast = page
      .locator('.Toastify__toast, [role="alert"]')
      .filter({ hasText: /lead added successfully/i })
      .first();

    this.leadSearch = page.getByRole('search').first();
    this.leadSearchTrigger = this.leadSearch.getByRole('button').first();
    this.leadSearchInput = this.leadSearch.getByRole('textbox').first();
    this.leadRows = page.locator('tbody tr');

    this.createdLeadName = null;
    this.leadAddedToastText = null;
  }

  generateLeadName() {
    return `QA Lead ${Date.now().toString(36)}`;
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async openCreateLeadForm() {
    console.log('[LeadPage] Opening Create Lead form from Lead Manager');
    await this.navigationPage.clickCrmDropdown();
    await this.navigationPage.clickLeadManager();
    await expect(this.page).toHaveURL(/leadmanager\/master/i, { timeout: this.defaultTimeout });

    await expect(this.createLeadButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.createLeadButton.click();
    await expect(this.page).toHaveURL(/leadmanager\/initial/i, { timeout: this.defaultTimeout });

    await expect(this.addNewButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.addNewButton.click();
    await expect(this.page).toHaveURL(/leadmanager\/create/i, { timeout: this.defaultTimeout });

    await expect(this.leadNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.expectActiveStep('Lead');
  }

  async expectActiveStep(stepLabel) {
    await expect(this.activeStepLabel).toHaveText(new RegExp(`^\\s*${this.escapeRegex(stepLabel)}\\s*$`, 'i'), {
      timeout: this.defaultTimeout,
    });
  }

  /** Lead name is a freeSolo Autocomplete: the value only commits when an option is chosen. */
  async enterLeadName(leadName = this.generateLeadName()) {
    console.log(`[LeadPage] Entering lead name: ${leadName}`);
    this.createdLeadName = leadName;

    await this.leadNameInput.click();
    await this.leadNameInput.pressSequentially(leadName, { delay: 30 });

    const leadNameOption = this.page
      .getByRole('option')
      .filter({ hasText: new RegExp(`${this.escapeRegex(leadName)}\\s*$`, 'i') })
      .last();
    await expect(leadNameOption).toBeVisible({ timeout: this.defaultTimeout });
    await leadNameOption.click();

    await expect(this.leadNameInput).toHaveValue(leadName, { timeout: this.defaultTimeout });
    await expect(this.nextButton).toBeEnabled({ timeout: this.defaultTimeout });
    return leadName;
  }

  async leaveLeadNameEmpty() {
    console.log('[LeadPage] Leaving lead name empty');
    await expect(this.leadNameInput).toHaveValue('', { timeout: this.defaultTimeout });
  }

  async goToNextStep(expectedStepLabel) {
    console.log(`[LeadPage] Clicking Next to reach the ${expectedStepLabel} step`);
    await expect(this.nextButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.nextButton.click();
    await this.expectActiveStep(expectedStepLabel);
  }

  async goThroughLeadAndProjectSteps() {
    await this.goToNextStep('Project');
    await this.goToNextStep('Success');
  }

  /** Toast auto-closes after 2s and the app redirects 2s later, so it is captured as part of the submit. */
  async submitCreateLead() {
    console.log('[LeadPage] Submitting Create Lead form');
    await expect(this.submitCreateLeadButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.submitCreateLeadButton.click();

    await expect(this.leadAddedToast).toBeVisible({ timeout: this.defaultTimeout });
    this.leadAddedToastText = (await this.leadAddedToast.innerText()).trim();
    console.log(`[LeadPage] Toast: ${this.leadAddedToastText}`);
  }

  async expectLeadAddedToast() {
    expect(this.leadAddedToastText, 'Lead added toast was not shown after Create Lead').toMatch(
      /lead added successfully/i
    );
  }

  async expectReturnedToLeadList() {
    console.log('[LeadPage] Expecting return to Lead Manager list');
    await expect(this.page).toHaveURL(/leadmanager\/master/i, { timeout: this.defaultTimeout });
    await expect(this.leadRows.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectLeadInList(leadName = this.createdLeadName) {
    if (!leadName) {
      throw new Error('[LeadPage] No created lead name recorded for this scenario.');
    }
    console.log(`[LeadPage] Searching Lead Manager list for: ${leadName}`);

    if (!(await this.leadSearchInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(this.leadSearchTrigger).toBeVisible({ timeout: this.defaultTimeout });
      await this.leadSearchTrigger.click();
    }
    await expect(this.leadSearchInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.leadSearchInput.fill(leadName);

    // The grid truncates long names ("QA Lead mv95..."); the full name is kept in the cell's aria-label.
    const leadRow = this.leadRows.filter({ has: this.page.getByLabel(leadName, { exact: true }) }).first();
    await expect(leadRow).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectNextDisabled() {
    console.log('[LeadPage] Expecting Next to stay disabled');
    await expect(this.nextButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.nextButton).toBeDisabled();
    await this.nextButton.click({ force: true }).catch(() => {});
    await expect(this.nextButton).toBeDisabled();
    await this.expectActiveStep('Lead');
  }

  async expectNoLeadCreated() {
    console.log('[LeadPage] Expecting no lead to be created');
    await expect(this.page).toHaveURL(/leadmanager\/create/i);
    await this.expectActiveStep('Lead');
    await expect(this.page.getByRole('button', { name: /^create lead$/i })).toHaveCount(0);
    await expect(this.leadAddedToast).toBeHidden();
  }
}

module.exports = LeadPage;
