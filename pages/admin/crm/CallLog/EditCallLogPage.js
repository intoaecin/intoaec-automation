const { expect } = require('@playwright/test');
const CallLogPage = require('./CallLogPage');
const callLogValidationData = require('../../../../fixtures/callLogValidationData');

class EditCallLogPage extends CallLogPage {
  constructor(page) {
    super(page);

    this.updateLogButton = this.callLogDialog
      .getByRole('button', { name: /^update log$/i })
      .or(this.callLogDialog.locator('button').filter({ hasText: /^update log$/i }))
      .last();
  }

  updateLogSubmitButton() {
    return this.updateLogButton
      .or(this.page.getByRole('button', { name: /^update log$/i }).filter({ visible: true }).last())
      .or(this.page.locator('button').filter({ hasText: /^update log$/i }).filter({ visible: true }).last());
  }

  buildEditCallLogData() {
    const suffix = this.buildRandomSuffix();
    return {
      callPurpose: `Edited Call Purpose ${suffix}`,
      callOutcome: this.callLogData?.callOutcome || 'Good Discussion',
      comment: `Edited call log comment ${suffix}`,
    };
  }

  async createCallLogForEditing() {
    console.log('[EditCallLogPage] Creating call log ready for editing');
    await this.closeCallLogFormIfOpen().catch(() => {});
    await this.navigateToCallLogForm();
    await this.fillMandatoryCallLogFields();
    await this.submitCreateCallLog();
    await this.verifyCallLogCreatedSuccessfully({ timeout: 60000 });
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
    console.log(`[EditCallLogPage] Editing call purpose and comments to: ${this.editedCallLogData.callPurpose}`);

    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.callPurposeInput.click();
    await this.callPurposeInput.press('Control+A').catch(() => {});
    await this.callPurposeInput.fill(this.editedCallLogData.callPurpose);

    await expect(this.commentInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.commentInput.click();
    await this.commentInput.press('Control+A').catch(() => {});
    await this.commentInput.fill(this.editedCallLogData.comment);
  }

  async submitCallLogUpdate() {
    console.log('[EditCallLogPage] Submitting call log update');
    const submitButton = this.updateLogSubmitButton();

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
    this.updateSucceeded = Boolean(response && response.status() >= 200 && response.status() < 300);

    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `[EditCallLogPage] Call log update failed (${response.status()}): ${body.slice(0, 500)}`
      );
    }

    await expect(this.callLogDialog).toBeHidden({ timeout: 30000 });
    await this.ensureOnCallLogModuleList();
  }

  async waitForEditedCallLogInList({ timeout = 60000 } = {}) {
    const edited = this.editedCallLogData;
    if (!edited?.callPurpose || !edited?.comment) {
      throw new Error('[EditCallLogPage] Missing edited Call Purpose or Comments for list verification');
    }

    await this.ensureOnCallLogModuleList();

    await expect(async () => {
      await this.searchForCallLog(edited.callPurpose);
      const row = this.getCallLogRow(edited.callPurpose);
      await expect(row).toBeVisible();
      await expect(row.getByText(edited.callPurpose, { exact: false })).toBeVisible();
      await expect(row.getByText(edited.comment, { exact: false })).toBeVisible();
    }).toPass({ timeout, intervals: [1000, 2000, 4000] });
  }

  async verifyCallLogUpdatedSuccessfully() {
    console.log('[EditCallLogPage] Verifying updated Call Purpose and Comments in the list');
    await this.waitForEditedCallLogInList({ timeout: 60000 });
  }

  async refreshCallLogPage() {
    console.log('[EditCallLogPage] Refreshing Call Log page');
    let targetUrl = this.page.url();
    try {
      const url = new URL(targetUrl);
      url.searchParams.set('tab', 'CallLog');
      targetUrl = url.toString();
    } catch {
      /* keep current URL */
    }

    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeout });
    await this.waitForCallLogModuleReady();
  }

  async verifyEditedCallLogPersistsAfterRefresh() {
    console.log('[EditCallLogPage] Verifying edited call log persists after refresh');
    await this.waitForEditedCallLogInList({ timeout: 90000 });
  }

  async clearMandatoryEditFieldsAndAttemptSave() {
    console.log('[EditCallLogPage] Clearing mandatory Call Purpose and Comments, then attempting save');
    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.callPurposeInput.click();
    await this.callPurposeInput.press('Control+A').catch(() => {});
    await this.callPurposeInput.fill('');

    await expect(this.commentInput).toBeVisible({ timeout: this.defaultTimeout });
    await this.commentInput.click();
    await this.commentInput.press('Control+A').catch(() => {});
    await this.commentInput.fill('');

    const submitButton = this.updateLogSubmitButton();
    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });

    // Empty required fields may disable Update Log — do not wait 120s for enabled.
    const enabled = await submitButton.isEnabled().catch(() => false);
    if (!enabled) {
      console.log('[EditCallLogPage] Update Log disabled with empty required fields (client-side block)');
      this.updateSucceeded = false;
      return;
    }

    const updateResponsePromise = this.page
      .waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /UPDATE_CALL_LOG|EDIT_CALL_LOG|CREATE_CALL_LOG/i.test(response.request().postData() || ''),
        { timeout: 3000 }
      )
      .catch(() => null);

    await submitButton.click();

    await expect(async () => {
      const toastVisible = await this.page
        .locator('.Toastify__toast, .MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
        .filter({ hasText: callLogValidationData.mandatoryValidationPattern })
        .first()
        .isVisible()
        .catch(() => false);
      const toastTextVisible = await this.page
        .getByText(callLogValidationData.mandatoryValidationPattern)
        .first()
        .isVisible()
        .catch(() => false);
      expect(toastVisible || toastTextVisible).toBeTruthy();
    }).toPass({ timeout: 15000, intervals: [200, 400, 800] });

    const response = await updateResponsePromise;
    this.updateSucceeded = Boolean(response && response.status() >= 200 && response.status() < 300);
  }

  async expectCallLogEditMandatoryValidation() {
    console.log('[EditCallLogPage] Verifying edit form stayed open after mandatory validation');
    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.commentInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.updateLogSubmitButton()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.callPurposeInput).toHaveValue('');
    await expect(this.commentInput).toHaveValue('');
  }

  async expectCallLogNotUpdated() {
    console.log('[EditCallLogPage] Verifying original call log was not updated');
    expect(this.updateSucceeded).not.toBe(true);
    await expect(this.callPurposeInput).toBeVisible({ timeout: this.defaultTimeout });

    const original = this.callLogData;
    if (!original?.callPurpose || !original?.comment) {
      throw new Error('[EditCallLogPage] Missing original call log data for not-updated verification');
    }

    await this.closeCallLogFormIfOpen();
    await this.ensureOnCallLogModuleList();
    await this.searchForCallLog(original.callPurpose);

    const row = this.getCallLogRow(original.callPurpose);
    await expect(row).toBeVisible({ timeout: this.defaultTimeout });
    await expect(row.getByText(original.callPurpose, { exact: false })).toBeVisible();
    await expect(row.getByText(original.comment, { exact: false })).toBeVisible();
  }
}

module.exports = EditCallLogPage;
