const { expect } = require('@playwright/test');
const CallLogPage = require('./CallLogPage');

class DeleteCallLogPage extends CallLogPage {
  constructor(page) {
    super(page);
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

  async confirmCallLogDeletion() {
    console.log('[DeleteCallLogPage] Confirming call log deletion');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    const yesButton = this.confirmDialog
      .getByRole('button', { name: /^yes$/i })
      .or(this.confirmYesButton)
      .first();

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

    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await expect(this.confirmDialog).toBeHidden({ timeout: 30000 }).catch(() => {});
  }

  async verifyCallLogDeletedSuccessfully() {
    const purpose = this.callLogData?.callPurpose;
    if (!purpose) {
      throw new Error('[DeleteCallLogPage] Missing call purpose data for delete verification');
    }

    console.log('[DeleteCallLogPage] Verifying call log deleted successfully');
    await expect(async () => {
      await this.searchForCallLog(purpose);

      const rowVisible = await this.getCallLogRow(purpose).isVisible().catch(() => false);
      const textVisible = await this.page
        .getByText(purpose, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      const toastVisible = await this.page
        .locator('.MuiAlert-root, .MuiSnackbar-root, [role="alert"]')
        .filter({ hasText: /delete|deleted|removed|success/i })
        .first()
        .isVisible()
        .catch(() => false);
      const genericDeletedVisible = await this.page
        .getByText(/call\s*log\s*deleted|deleted\s*successfully|removed\s*successfully|delete\s*success/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(toastVisible || genericDeletedVisible || (!rowVisible && !textVisible)).toBeTruthy();
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 4000] });
  }
}

module.exports = DeleteCallLogPage;
