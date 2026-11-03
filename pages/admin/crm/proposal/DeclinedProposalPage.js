const { expect } = require('@playwright/test');
const AcceptedProposalPage = require('./AcceptedProposalPage');

class DeclinedProposalPage extends AcceptedProposalPage {
  constructor(page) {
    super(page);
    this.declinedStatusText = page.getByText(/declined/i).first();
  }




  async fillClientBasicsAndContinue() {
    await expect(this.clientNameInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.fillIfVisible(this.clientNameInput, this.clientData.name);
    await this.confirmTypedClientName().catch(() => {});
    
    await this.fillFieldWithScrollFallback(this.clientPhoneInput, this.clientData.phone);
    await this.fillFieldWithScrollFallback(this.clientEmailInput, this.clientData.email);
    
    // Fill only mechanically required text inputs and skip all optional fields, comboboxes, and country flags
    await this.fillVisibleRequiredTextInputs();

    await expect(this.clientNameInput).toHaveValue(this.clientData.name, { timeout: 10000 });
    await expect(async () => {
      const currentEmail = await this.clientEmailInput.inputValue().catch(() => '');
      expect(currentEmail.toLowerCase()).toContain('@yopmail.com');
    }).toPass({ timeout: 10000, intervals: [500, 1000] });

    await expect(this.nextButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.nextButton).toBeEnabled({ timeout: this.defaultTimeout });
    await this.nextButton.click();
  }

  async declineProposal() {
    const page = this.proposalPreviewPage;
    
    // Click the Decline button
    const declineButton = page
      .getByRole('button', { name: /decline/i })
      .or(page.getByText(/^decline$/i))
      .first();
      
    await expect(declineButton).toBeVisible({ timeout: this.defaultTimeout });
    await declineButton.click();

    // From user prompt: "choose any one of the option why declined and declineed the propisal"
    // Usually this opens a modal or a form. We'll wait for the radio/checkbox or select options to show up.
    
    // Let's find first radio or option
    const reasonOption = page.locator('input[type="radio"], [role="radio"], select, [role="option"], li, [role="button"]').filter({ hasText: /too expensive|timing|budget|competitor|other|reason/i }).first()
      .or(page.locator('input[type="radio"]').first())
      .or(page.locator('[role="radio"]').first());

    if (await reasonOption.isVisible({ timeout: 10000 }).catch(() => false)) {
      await reasonOption.click({ force: true });
    } else {
      // Maybe it's a generic dropdown or text area
      const reasonTextArea = page.locator('textarea').first();
      if (await reasonTextArea.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reasonTextArea.fill('Automation testing decline reason');
      }
    }

    // Submit the decline action
    const submitDecline = page
      .getByRole('button', { name: /submit|decline|confirm|save/i })
      .or(page.locator('button').filter({ hasText: /submit|decline|confirm|save/i }))
      .last();
      
    await expect(submitDecline).toBeVisible({ timeout: this.defaultTimeout });
    await submitDecline.click();
    
    // Optionally wait for a success toast or network idle
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async verifyProposalDeclinedStatusInApp() {
    await this.page.bringToFront();
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.proposalPage.verifyProposalTabLoaded();
    await expect(this.declinedStatusText).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = DeclinedProposalPage;
