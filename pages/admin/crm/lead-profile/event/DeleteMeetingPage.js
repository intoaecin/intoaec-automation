const { expect } = require('@playwright/test');
const EventPage = require('./EventPage');

class DeleteMeetingPage extends EventPage {
  deleteReasonInput() {
    return this.confirmDialog
      .getByPlaceholder(/enter your reason|type reason|reason/i)
      .or(this.confirmDialog.getByRole('textbox'))
      .first();
  }

  confirmNoInDialog() {
    return this.confirmDialog
      .getByRole('button', { name: /^(no|cancel)$/i })
      .or(this.confirmCancelButton)
      .first();
  }

  confirmYesInDialog() {
    return this.confirmDialog
      .getByRole('button', { name: /^yes$|^delete$|^confirm$|^ok$/i })
      .or(this.confirmYesButton)
      .first();
  }

  async createMeetingForDeletion() {
    await this.createOfflineMeetingForLifecycleAction();
  }

  async openDeleteFromMeetingActionMenu() {
    const title = this.meetingData?.title;
    if (!title) {
      throw new Error('[DeleteMeetingPage] No created meeting title found. Run createMeetingForDeletion first.');
    }

    console.log(`[DeleteMeetingPage] Opening delete menu for meeting: ${title}`);
    await this.openMeetingActionMenuForTitle(title, this.getActiveMeetingTab());

    await expect(this.deleteMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.hideChatWidget();
    await this.deleteMenuItem.click();
  }

  async expectDeleteConfirmationPopupVisible() {
    console.log('[DeleteMeetingPage] Expecting delete confirmation popup');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });

    await expect(
      this.confirmDialog.getByText(/are you sure|cancel the meeting|delete/i).first()
    ).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.confirmYesInDialog()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.confirmNoInDialog()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.deleteReasonInput()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async fillDeleteReason() {
    const reason = this.deleteReasonInput();
    await expect(reason).toBeVisible({ timeout: this.defaultTimeout });
    await reason.fill(`Automation delete ${Date.now().toString().slice(-6)}`);
  }

  async confirmMeetingDeletion() {
    console.log('[DeleteMeetingPage] Confirming meeting deletion');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });
    await this.fillDeleteReason();

    const yesButton = this.confirmYesInDialog();

    await expect(yesButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(yesButton).toBeEnabled({ timeout: this.defaultTimeout });

    const deleteResponse = this.page.waitForResponse(
      (response) => this.isMeetingDeleteRequest(response),
      { timeout: this.defaultTimeout }
    );

    await yesButton.click();

    const response = await deleteResponse.catch(() => null);
    this.lastDeleteStatus = response?.status() ?? null;
    this.deleteSucceeded = response ? response.status() >= 200 && response.status() < 300 : null;

    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      throw new Error(`[DeleteMeetingPage] Meeting delete API failed (${response.status()}): ${body.slice(0, 500)}`);
    }

    if (!response) {
      console.warn('[DeleteMeetingPage] Meeting delete API response was not captured');
    } else {
      console.log(`[DeleteMeetingPage] Meeting delete API responded with status ${response.status()}`);
    }

    await expect(this.confirmDialog).toBeHidden({ timeout: this.defaultTimeout });
    await this.dismissOpenMenus();
  }

  async cancelMeetingDeletion() {
    console.log('[DeleteMeetingPage] Cancelling meeting deletion');
    await expect(this.confirmDialog).toBeVisible({ timeout: this.defaultTimeout });

    const cancelButton = this.confirmNoInDialog();

    await expect(cancelButton).toBeVisible({ timeout: this.defaultTimeout });
    await cancelButton.click();
    await expect(this.confirmDialog).toBeHidden({ timeout: this.defaultTimeout });
    await this.dismissOpenMenus();
  }

  async verifyMeetingDeletedSuccessfully() {
    const title = this.meetingData?.title;
    if (!title) {
      throw new Error('[DeleteMeetingPage] Missing meeting title data for delete verification');
    }

    if (this.deleteSucceeded === false) {
      throw new Error('[DeleteMeetingPage] Meeting delete API did not succeed');
    }

    console.log(`[DeleteMeetingPage] Verifying meeting deleted successfully: ${title}`);

    await expect(async () => {
      const toastVisible = await this.meetingDeletedToast().isVisible().catch(() => false);
      await this.verifyMeetingNotVisibleInEventsTab(title, this.getActiveMeetingTab()).catch(() => {
        if (!toastVisible) {
          throw new Error(`Meeting "${title}" is still visible after delete`);
        }
      });

      if (toastVisible) {
        return;
      }

      const cardVisible = await this.getMeetingCard(title).isVisible().catch(() => false);
      const textVisible = await this.page.getByText(title, { exact: false }).first().isVisible().catch(() => false);
      expect(cardVisible || textVisible).toBeFalsy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [2000, 3000, 5000] });
  }

  async verifyMeetingStillPresentInEventsTab() {
    const title = this.meetingData?.title;
    if (!title) {
      throw new Error('[DeleteMeetingPage] Missing meeting title data for presence verification');
    }

    console.log(`[DeleteMeetingPage] Verifying meeting still present: ${title}`);
    await this.verifyMeetingVisibleByTitle(title, this.getActiveMeetingTab());
  }
}

module.exports = DeleteMeetingPage;
