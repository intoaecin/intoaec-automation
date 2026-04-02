const BasePage = require('../../BasePage');
const { expect } = require('@playwright/test');

class ProposalPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.proposalCard = page.locator('p').filter({ hasText: /^Proposal$/ }).first();
    this.chooseProposalButton = page.getByRole('button', { name: 'Choose Proposal' });
    this.proposalSelect = page.locator('.MuiSelect-select').nth(1);
    this.proceedButton = page.getByRole('button', { name: 'Proceed' });
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.skipButton = page.getByRole('button', { name: /skip/i });
    this.previewSendButton = page.getByRole('button', { name: 'Send' }).first();
    this.emailOption = page.getByText(/^Email$/).first();
    this.channelSendButton = page.getByRole('button', { name: 'Send' }).last();
    this.composeEmailTitle = page.getByText(/Compose email/i).first();
    this.autoExpiryText = page.getByText(/Auto Expiry set to/i).first();
    this.sendEmailButton = page.locator('button').filter({ hasText: /^Send Email$/ }).first();
    this.successToast = page.getByText(/Proposal sent successfully/i).first();
  }

  async waitForProjectsTable() {
    const projectRows = this.page.locator('tbody tr');
    await expect(async () => {
      const count = await projectRows.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
  }

  async openProposalTab() {
    await expect(this.proposalCard).toBeVisible({ timeout: this.defaultTimeout });
    await this.proposalCard.click();
    await this.page.waitForURL(/tab=Proposal/, { timeout: this.defaultTimeout });
    await expect(this.chooseProposalButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  async chooseDefaultProposal() {
    await this.chooseProposalButton.click();
    await expect(this.proposalSelect).toBeVisible({ timeout: this.defaultTimeout });
    await this.proposalSelect.click();

    const defaultProposalOption = this.page.getByRole('option', {
      name: 'Modern Villa Design Proposal'
    });
    await expect(defaultProposalOption).toBeVisible({ timeout: this.defaultTimeout });
    await defaultProposalOption.click();

    await expect(this.proceedButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.proceedButton.click();
    await this.page.waitForURL(/proposal\/edit/, { timeout: this.defaultTimeout });
  }

  async openPreview() {
    await expect(this.nextButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.nextButton.click();
    await expect(this.skipButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.skipButton.click();
    await expect(this.previewSendButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  async sendViaEmail() {
    await this.previewSendButton.click();
    await expect(this.emailOption).toBeVisible({ timeout: this.defaultTimeout });
    await this.emailOption.click();

    await expect(async () => {
      const isDisabled = await this.channelSendButton.isDisabled();
      expect(isDisabled).toBeFalsy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });

    await this.channelSendButton.click({ force: true });
    try {
      await expect(this.composeEmailTitle).toBeVisible({ timeout: 15000 });
    } catch {
      await this.channelSendButton.click({ force: true });
      await expect(this.composeEmailTitle).toBeVisible({ timeout: this.defaultTimeout });
    }

    await expect(this.sendEmailButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.autoExpiryText).toBeVisible({ timeout: this.defaultTimeout });
    await this.sendEmailButton.click({ force: true });
  }

  async verifyProposalSent() {
    await expect(this.successToast).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.page.getByText(/Sent/i).first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async sendProposalForSelectedProject() {
    try {
      await this.waitForProjectsTable();
      await this.openProposalTab();
      await this.chooseDefaultProposal();
      await this.openPreview();
      await this.sendViaEmail();
      await this.verifyProposalSent();
    } catch (error) {
      throw new Error(`Send proposal flow failed: ${error.message}`);
    }
  }
}

module.exports = ProposalPage;
