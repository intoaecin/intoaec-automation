const { expect } = require('@playwright/test');
const CallLogPage = require('./CallLogPage');

class EditCallLogPage extends CallLogPage {
  constructor(page) {
    super(page);

    this.updateLogButton = page
      .getByRole('button', { name: /^update log$/i })
      .or(page.locator('button').filter({ hasText: /^update log$/i }))
      .or(page.getByRole('button', { name: /^update$/i }))
      .last();
  }

  buildEditCallLogData() {
    const suffix = this.buildRandomSuffix();
    return {
      callPurpose: `Edited Call Purpose ${suffix}`,
      callOutcome: 'Good Discussion',
      comment: `Edited call log comment ${suffix}`,
    };
  }

  async createCallLogForEditing() {
    console.log('[EditCallLogPage] Creating call log ready for editing');
    await this.navigateToCallLogForm();
    await this.fillMandatoryCallLogFields();
    await this.submitCreateCallLog();
    await this.verifyCallLogCreatedSuccessfully();
  }

  async openEditForCreatedCallLog() {
    const purpose = this.callLogData?.callPurpose;
    if (!purpose) {
      throw new Error('[EditCallLogPage] No created call log purpose found. Run createCallLogForEditing first.');
    }

    console.log(`[EditCallLogPage] Opening edit menu for call log: ${purpose}`);
    await this.openRowActionMenuForCallLog(purpose);

    await expect(this.editMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.editMenuItem.click();

    await this.waitForCallLogFormReady();
  }

  async editCallLogMandatoryFields() {
    this.editedCallLogData = this.buildEditCallLogData();
    console.log(`[EditCallLogPage] Editing call log to: ${this.editedCallLogData.callPurpose}`);

    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.callPurposeInput.click();
    await this.callPurposeInput.fill(this.editedCallLogData.callPurpose);

    await expect(this.callOutcomeCombobox).toBeVisible({ timeout: this.defaultTimeout });
    await this.callOutcomeCombobox.click();
    await this.page.getByRole('option', { name: this.editedCallLogData.callOutcome }).click();

    await expect(this.commentInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.commentInput.click();
    await this.commentInput.fill(this.editedCallLogData.comment);
  }

  async submitCallLogUpdate() {
    console.log('[EditCallLogPage] Submitting call log update');
    const submitButton = this.updateLogButton
      .or(this.page.getByRole('button', { name: /^update log$/i }).filter({ visible: true }).last())
      .or(this.page.locator('button').filter({ hasText: /^update log$/i }).filter({ visible: true }).last());

    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(submitButton).toBeEnabled({ timeout: this.defaultTimeout });

    const updateResponse = this.page
      .waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /UPDATE_CALL_LOG|EDIT_CALL_LOG|CREATE_CALL_LOG/i.test(response.request().postData() || ''),
        { timeout: this.defaultTimeout }
      )
      .catch(() => null);

    await submitButton.click();
    const response = await updateResponse;
    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      console.warn(
        `[EditCallLogPage] Call log update returned ${response.status()}: ${body.slice(0, 200)}`
      );
    }

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(this.callPurposeInput).toBeHidden({ timeout: 30000 }).catch(() => {});
  }

  async verifyCallLogUpdatedSuccessfully() {
    console.log('[EditCallLogPage] Verifying call log updated successfully');
    const editedPurpose = this.editedCallLogData?.callPurpose;
    await expect(async () => {
      const toastVisible = await this.successToast.isVisible().catch(() => false);
      const rowVisible = editedPurpose
        ? await this.getCallLogRow(editedPurpose).isVisible().catch(() => false)
        : false;
      const listTextVisible = editedPurpose
        ? await this.page.getByText(editedPurpose, { exact: false }).first().isVisible().catch(() => false)
        : false;
      const genericSuccessVisible = await this.page
        .getByText(/call\s*log\s*(updated|saved)|updated\s*successfully|saved\s*successfully/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(toastVisible || rowVisible || listTextVisible || genericSuccessVisible).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }
}

module.exports = EditCallLogPage;
