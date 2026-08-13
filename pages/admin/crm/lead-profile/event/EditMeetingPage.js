const { expect } = require('@playwright/test');
const EventPage = require('./EventPage');

class EditMeetingPage extends EventPage {
  buildEditedMeetingData() {
    const suffix = Date.now().toString().slice(-6);
    return {
      title: `EditedMeeting_${suffix}`,
      agenda: `Edited meeting agenda ${suffix}`,
    };
  }

  async createMeetingForEditing() {
    await this.createOfflineMeetingForLifecycleAction();
  }

  async openEditForCreatedMeeting() {
    const title = this.meetingData?.title;
    if (!title) {
      throw new Error('[EditMeetingPage] No created meeting title found. Run createMeetingForEditing first.');
    }

    console.log(`[EditMeetingPage] Opening edit for meeting: ${title}`);
    await this.openMeetingActionMenuForTitle(title, this.getActiveMeetingTab());

    await expect(this.editMenuItem).toBeVisible({ timeout: this.defaultTimeout });
    await this.editMenuItem.click();
    await expect(this.panel()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.titleInput()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async editMeetingTitleAndAgenda() {
    this.editedMeetingData = this.buildEditedMeetingData();
    console.log(`[EditMeetingPage] Editing meeting to: ${this.editedMeetingData.title}`);

    const title = this.titleInput();
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    await title.click().catch(() => {});
    await title.fill(this.editedMeetingData.title);

    const agenda = this.agendaInput();
    if (await agenda.isVisible({ timeout: 3000 }).catch(() => false)) {
      await agenda.fill(this.editedMeetingData.agenda);
    }
  }

  async submitMeetingUpdate() {
    console.log('[EditMeetingPage] Saving meeting update');
    const saveButton = this.submitUpdateMeetingButton();
    await expect(saveButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(saveButton).toBeEnabled({ timeout: this.defaultTimeout });

    const updateResponse = this.page.waitForResponse(
      (response) => this.isMeetingUpdateRequest(response),
      { timeout: this.defaultTimeout }
    );

    await saveButton.click();

    const response = await updateResponse.catch(() => null);
    this.lastUpdateStatus = response?.status() ?? null;
    this.updateSucceeded = response ? response.status() >= 200 && response.status() < 300 : null;

    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      throw new Error(`[EditMeetingPage] Meeting update API failed (${response.status()}): ${body.slice(0, 500)}`);
    }

    if (!response) {
      console.warn('[EditMeetingPage] Meeting update API response was not captured');
    } else {
      console.log(`[EditMeetingPage] Meeting update API responded with status ${response.status()}`);
    }

    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await expect(this.panel()).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
  }

  async verifyMeetingUpdatedSuccessfully() {
    const editedTitle = this.editedMeetingData?.title;
    if (!editedTitle) {
      throw new Error('[EditMeetingPage] Missing edited meeting data for verification');
    }

    if (this.updateSucceeded === false) {
      throw new Error('[EditMeetingPage] Meeting update API did not succeed');
    }

    console.log('[EditMeetingPage] Verifying meeting updated successfully');
    await this.verifyMeetingVisibleByTitle(editedTitle, this.getActiveMeetingTab());
  }
}

module.exports = EditMeetingPage;
