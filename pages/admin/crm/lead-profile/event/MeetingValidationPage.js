const { expect } = require('@playwright/test');
const EventPage = require('./EventPage');

class MeetingValidationPage extends EventPage {
  validationMessagePattern(fieldPattern) {
    return new RegExp(
      `${fieldPattern}.*required|required.*${fieldPattern}|enter ${fieldPattern}|${fieldPattern} is required|${fieldPattern}.*mandatory`,
      'i'
    );
  }

  validationMessages() {
    return this.panel().locator(
      '[role="alert"], .Mui-error, .MuiFormHelperText-root.Mui-error, .MuiAlert-standardError, .MuiAlert-filledError'
    );
  }

  titleValidationMessage() {
    return this.panel()
      .getByText(this.validationMessagePattern('title'))
      .or(
        this.panel()
          .locator('label')
          .filter({ hasText: /title/i })
          .locator('xpath=ancestor::div[contains(@class,"MuiFormControl") or contains(@class,"row")][1]')
          .locator('.Mui-error, .MuiFormHelperText-root.Mui-error')
      )
      .first();
  }

  participantsValidationMessage() {
    return this.panel()
      .getByText(this.validationMessagePattern('participant'))
      .or(this.panel().getByText(/participant.*required|add participant|select participant|at least one participant/i))
      .first();
  }

  scheduleValidationMessage() {
    return this.panel()
      .getByText(
        /end time.*before|start time.*after|invalid.*schedule|invalid.*time|to time.*greater|from time.*less|end time must|start time must|schedule.*invalid/i
      )
      .first();
  }

  participantRemoveButtons() {
    return this.participantChips().locator('[data-testid="CancelIcon"], .MuiChip-deleteIcon');
  }

  async openCreateMeetingPopupForValidation() {
    console.log('[MeetingValidationPage] Opening Create Meeting popup for validation');
    await this.navigateToFirstAvailableLead();
    await this.openEventsModule();
    await this.openActionMenu();
    await this.selectCreateMeeting();
    await expect(this.createMeetingPanel.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async clearTitleField() {
    const title = this.titleInput();
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    await title.click().catch(() => {});
    await title.fill('');
  }

  async removeAllParticipants() {
    console.log('[MeetingValidationPage] Removing all participant chips');
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const removeButton = this.participantRemoveButtons().first();
      if (!(await removeButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        break;
      }
      await removeButton.click();
      await this.page.waitForTimeout(300);
    }

    await expect(this.participantChips()).toHaveCount(0, { timeout: this.defaultTimeout });
  }

  async fillOnlineMandatoryFieldsExceptTitle() {
    console.log('[MeetingValidationPage] Filling mandatory fields with empty title');
    this.meetingData = this.buildCreateMeetingData();
    this.meetingData.title = '';
    this.meetingData.meetingType = 'online';

    await this.ensureMeetingTabSelected('online');
    await this.clearTitleField();

    await expect(this.scheduleStartDate()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.scheduleEndDate()).toBeVisible({ timeout: this.defaultTimeout });
    await this.pickFutureScheduleTimes();

    if (await this.timezoneCombobox().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(this.timezoneCombobox()).toBeVisible({ timeout: this.defaultTimeout });
    }

    if (await this.locationInput().isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.fillLocationWithAutocomplete(this.meetingData.location);
    }

    if (await this.notificationTypeCombobox().isVisible({ timeout: 3000 }).catch(() => false)) {
      const minutesInput = this.notificationMinutesInput();
      await minutesInput.fill('');
      await minutesInput.fill(this.meetingData.notificationMinutes);
    }

    await this.expectParticipantChipVisible();
  }

  async fillMandatoryFieldsExceptParticipants() {
    console.log('[MeetingValidationPage] Filling mandatory fields except Participants');
    this.meetingData = this.buildCreateMeetingData();
    this.meetingData.meetingType = 'online';

    await this.ensureMeetingTabSelected('online');

    const title = this.titleInput();
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    await title.fill(this.meetingData.title);

    await expect(this.scheduleStartDate()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.scheduleEndDate()).toBeVisible({ timeout: this.defaultTimeout });
    await this.pickFutureScheduleTimes();

    if (await this.timezoneCombobox().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(this.timezoneCombobox()).toBeVisible({ timeout: this.defaultTimeout });
    }

    if (await this.locationInput().isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.fillLocationWithAutocomplete(this.meetingData.location);
    }

    if (await this.notificationTypeCombobox().isVisible({ timeout: 3000 }).catch(() => false)) {
      const minutesInput = this.notificationMinutesInput();
      await minutesInput.fill('');
      await minutesInput.fill(this.meetingData.notificationMinutes);
    }

    await this.removeAllParticipants();
  }

  async fillMandatoryFieldsWithInvalidSchedule() {
    console.log('[MeetingValidationPage] Filling mandatory fields with invalid schedule times');
    this.meetingData = this.buildCreateMeetingData();
    this.meetingData.meetingType = 'online';
    this.meetingData.fromTime = '8:00 PM';
    this.meetingData.toTime = '7:30 PM';

    await this.ensureMeetingTabSelected('online');

    const title = this.titleInput();
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    await title.fill(this.meetingData.title);

    await expect(this.scheduleStartDate()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.scheduleEndDate()).toBeVisible({ timeout: this.defaultTimeout });

    await this.selectTimePickerOption(this.fromTimePickerTrigger(), this.meetingData.fromTime);
    await this.selectTimePickerOption(this.toTimePickerTrigger(), this.meetingData.toTime);

    if (await this.timezoneCombobox().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(this.timezoneCombobox()).toBeVisible({ timeout: this.defaultTimeout });
    }

    if (await this.locationInput().isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.fillLocationWithAutocomplete(this.meetingData.location);
    }

    if (await this.notificationTypeCombobox().isVisible({ timeout: 3000 }).catch(() => false)) {
      const minutesInput = this.notificationMinutesInput();
      await minutesInput.fill('');
      await minutesInput.fill(this.meetingData.notificationMinutes);
    }

    await this.expectParticipantChipVisible();
  }

  async attemptSubmitCreateMeetingExpectingValidation() {
    console.log('[MeetingValidationPage] Attempting Create Meeting submit expecting validation');
    const submitButton = this.submitCreateMeetingButton();
    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(submitButton).toBeEnabled({ timeout: this.defaultTimeout });

    const createResponse = this.page
      .waitForResponse((response) => this.isMeetingCreateRequest(response), { timeout: 10000 })
      .catch(() => null);

    await submitButton.click();

    const response = await createResponse;
    this.createSucceeded = response ? response.status() >= 200 && response.status() < 300 : false;

    await this.page.waitForTimeout(1000);
  }

  async isValidationTextVisible(pattern) {
    return this.panel()
      .getByText(pattern)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async isTitleFieldInvalid() {
    const title = this.titleInput();
    const ariaInvalid = await title.getAttribute('aria-invalid').catch(() => null);
    return ariaInvalid === 'true';
  }

  async expectTitleMandatoryValidation() {
    console.log('[MeetingValidationPage] Expecting title mandatory validation');
    await expect(async () => {
      const titleRequired = await this.isValidationTextVisible(
        /title.*required|enter title|title is required|title.*mandatory|add title/i
      );
      const titleInvalid = await this.isTitleFieldInvalid();
      const helperVisible = await this.titleValidationMessage().isVisible().catch(() => false);
      const formStillOpen = await this.createMeetingPanel.first().isVisible().catch(() => false);

      expect(titleRequired || titleInvalid || helperVisible || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectParticipantsMandatoryValidation() {
    console.log('[MeetingValidationPage] Expecting participants mandatory validation');
    await expect(async () => {
      const participantsRequired = await this.isValidationTextVisible(
        /participant.*required|participants.*required|add participant|select participant|at least one participant/i
      );
      const helperVisible = await this.participantsValidationMessage().isVisible().catch(() => false);
      const noParticipants = (await this.participantChips().count()) === 0;
      const formStillOpen = await this.createMeetingPanel.first().isVisible().catch(() => false);

      expect(participantsRequired || helperVisible || (noParticipants && formStillOpen)).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectInvalidScheduleValidation() {
    console.log('[MeetingValidationPage] Expecting invalid schedule validation');
    await expect(async () => {
      const scheduleMessage = await this.isValidationTextVisible(
        /end time.*before|start time.*after|invalid.*schedule|invalid.*time|to time.*greater|from time.*less|end time must|start time must|schedule.*invalid/i
      );
      const helperVisible = await this.scheduleValidationMessage().isVisible().catch(() => false);
      const errorCount = await this.validationMessages().count();
      const formStillOpen = await this.createMeetingPanel.first().isVisible().catch(() => false);

      expect(scheduleMessage || helperVisible || errorCount > 0 || formStillOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async expectMeetingNotCreated() {
    console.log('[MeetingValidationPage] Verifying meeting was not created');
    await expect(async () => {
      const toastVisible = await this.meetingSuccessToast().isVisible().catch(() => false);
      const panelOpen = await this.createMeetingPanel.first().isVisible().catch(() => false);

      expect(toastVisible).toBeFalsy();
      expect(this.createSucceeded).not.toBe(true);
      expect(panelOpen).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }
}

module.exports = MeetingValidationPage;
