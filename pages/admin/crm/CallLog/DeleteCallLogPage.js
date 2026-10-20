const { expect } = require('@playwright/test');
const CallLogPage = require('./CallLogPage');

class DeleteCallLogPage extends CallLogPage {
  constructor(page) {
    super(page);
  }

  confirmYesInDialog() {
    return this.confirmDialog
      .getByRole('button', { name: /^yes$|^delete$|^confirm$|^ok$/i })
      .or(this.confirmYesButton)
      .first();
  }

  confirmNoInDialog() {
    return this.confirmDialog
      .getByRole('button', { name: /^(no|cancel)$/i })
      .or(this.confirmCancelButton)
      .first();
  }

  deleteReasonInput() {
    return this.confirmDialog
      .getByRole('textbox', { name: /reason/i })
      .or(this.confirmDialog.getByLabel(/reason/i))
      .first();
  }

  async createCallLogForDeletion() {
    console.log('[DeleteCallLogPage] Creating call log ready for deletion');
    await this.navigateToCallLogForm();
    await this.fillMandatoryCallLogFields();
    await this.submitCreateCallLog();
    await this.verifyCallLogCreatedSuccessfully();
  }

  async openDeleteFromRowActionMenu() {
    const purpose = this.callLogData?.callPurpose;
    if (!purpose) {
      throw new Error('[DeleteCallLogPage] No created call log purpose found. Run createCallLogForDeletion first.');
    }

    console.log(`[DeleteCallLogPage] Opening delete menu for call log: ${purpose}`);
    await this.openRowActionMenuForCallLog(purpose);

    await expect(this.deleteMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.deleteMenuItem.click();
  }

  async expectDeleteConfirmationPopupVisible() {
    console.log('[DeleteCallLogPage] Expecting delete confirmation popup');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    await expect(
      this.confirmDialog.getByText(/are you sure you want to delete call log|delete call log/i).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.confirmYesInDialog()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.confirmNoInDialog()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.deleteReasonInput()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async confirmCallLogDeletion() {
    console.log('[DeleteCallLogPage] Confirming call log deletion');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    const yesButton = this.confirmYesInDialog();

    await expect(yesButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(yesButton).toBeEnabled({ timeout: this.defaultTimeout });

    const deleteResponse = this.page
      .waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /DELETE_CALL_LOG|REMOVE_CALL_LOG/i.test(response.request().postData() || ''),
        { timeout: this.defaultTimeout }
      )
      .catch(() => null);

    await yesButton.click();
    await deleteResponse;

    await expect(this.confirmDialog).toBeHidden({ timeout: 30000 });
  }

  async cancelCallLogDeletion() {
    console.log('[DeleteCallLogPage] Cancelling call log deletion');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    const noButton = this.confirmNoInDialog();
    await expect(noButton).toBeVisible({ timeout: this.defaultTimeout });
    await noButton.click();
    await expect(this.confirmDialog).toBeHidden({ timeout: 30000 });
    await this.dismissOpenMenus();
  }

  async verifyCallLogDeletedSuccessfully() {
    const purpose = this.callLogData?.callPurpose;
    if (!purpose) {
      throw new Error('[DeleteCallLogPage] Missing call purpose data for delete verification');
    }

    console.log(`[DeleteCallLogPage] Verifying call log is no longer in the list: ${purpose}`);
    await this.ensureOnCallLogModuleList();

    await expect(async () => {
      await this.searchForCallLog(purpose);
      const rowVisible = await this.getCallLogRow(purpose).isVisible().catch(() => false);
      expect(rowVisible).toBeFalsy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }

  async verifyCallLogStillPresentInList() {
    const original = this.callLogData;
    if (!original?.callPurpose || !original?.comment) {
      throw new Error('[DeleteCallLogPage] Missing original call log data for presence verification');
    }

    console.log(`[DeleteCallLogPage] Verifying call log still present: ${original.callPurpose}`);
    await this.ensureOnCallLogModuleList();

    await expect(async () => {
      await this.searchForCallLog(original.callPurpose);
      const row = this.getCallLogRow(original.callPurpose);
      await expect(row).toBeVisible();
      await expect(row.getByText(original.callPurpose, { exact: false })).toBeVisible();
      await expect(row.getByText(original.comment, { exact: false })).toBeVisible();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }
}

module.exports = DeleteCallLogPage;
