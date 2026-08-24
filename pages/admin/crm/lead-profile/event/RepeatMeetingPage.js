const { expect } = require('@playwright/test');
const EventPage = require('./EventPage');

class RepeatMeetingPage extends EventPage {
  repeatMenuItem() {
    return this.page
      .getByRole('menuitem', { name: /^repeat$/i })
      .or(this.page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^repeat$/i }))
      .first();
  }

  editMeetingHeading() {
    return this.page
      .getByRole('heading', { name: /edit meeting/i })
      .or(this.page.getByText(/^edit meeting$/i).first());
  }

  async isEditMeetingPageVisible() {
    const checks = await Promise.all([
      this.saveMeetingButton().isVisible({ timeout: 3000 }).catch(() => false),
      this.editMeetingTitleInput().isVisible({ timeout: 3000 }).catch(() => false),
      this.editMeetingHeading().isVisible({ timeout: 3000 }).catch(() => false),
      this.page.getByText(/meeting list\s*\/\s*edit meeting/i).isVisible({ timeout: 3000 }).catch(() => false),
    ]);
    return checks.some(Boolean);
  }

  async dismissEditMeetingOverlays() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page
      .locator('.MuiPickersPopper-root')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});
    await this.page
      .locator('.MuiMenu-paper')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});
  }

  editMeetingFormRoot() {
    return this.page.locator('div').filter({ has: this.page.getByRole('button', { name: /^save meeting$/i }) });
  }

  editMeetingOfflineBadge() {
    return this.page.getByRole('button', { name: /^offline$/i });
  }

  saveMeetingButton() {
    return this.page.getByRole('button', { name: /^save meeting$/i });
  }

  cancelMeetingButton() {
    return this.page.getByRole('button', { name: /^cancel$/i });
  }

  editMeetingTitleInput() {
    return this.page
      .getByLabel(/^title$/i)
      .or(this.page.getByPlaceholder(/add title/i))
      .or(
        this.page
          .locator('label')
          .filter({ hasText: /^title$/i })
          .first()
          .locator('xpath=following::input[1]')
      )
      .first();
  }

  editPageScheduleDateInputs() {
    return this.page.locator('input[placeholder="DD MMMM YYYY"]');
  }

  editPageScheduleStartDate() {
    return this.editPageScheduleDateInputs().first();
  }

  editPageScheduleEndDate() {
    return this.editPageScheduleDateInputs().nth(1);
  }

  editPageTimePickerTrigger(pickerId) {
    return this.page.locator(`#${pickerId}`).first();
  }

  editPageFromTimePickerTrigger() {
    return this.page.locator('#from-time-picker[role="combobox"]');
  }

  editPageToTimePickerTrigger() {
    return this.page.locator('#to-time-picker[role="combobox"]');
  }

  editPageLocationInput() {
    return this.page.locator('input.pac-target-input').first();
  }

  editPageParticipantsSection() {
    return this.page
      .locator('label')
      .filter({ hasText: /^participants$/i })
      .first()
      .locator('xpath=ancestor::div[1]');
  }

  editPageAgendaInput() {
    return this.page.getByPlaceholder(/^agenda$/i);
  }

  meetingSavedToast() {
    return this.page.getByText(/meeting saved successfully|meeting created successfully|saved successfully|updated successfully/i);
  }

  formatMeetingDisplayDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  buildPastScheduleTimesForToday(durationMinutes = 30) {
    const now = new Date();
    const roundDownToHalfHour = (date) => {
      const copy = new Date(date);
      const minutes = copy.getMinutes();
      if (minutes >= 30) {
        copy.setMinutes(30, 0, 0);
      } else {
        copy.setMinutes(0, 0, 0);
      }
      return copy;
    };

    const format12Hour = (date) => {
      const hours = date.getHours() % 12 || 12;
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const meridiem = date.getHours() >= 12 ? 'PM' : 'AM';
      return `${hours}:${minutes} ${meridiem}`;
    };

    let toDate = roundDownToHalfHour(new Date(now.getTime() - 30 * 60000));
    let fromDate = new Date(toDate.getTime() - durationMinutes * 60000);

    if (fromDate.getDate() !== now.getDate() || toDate.getHours() < 1) {
      fromDate = new Date(now);
      fromDate.setHours(8, 0, 0, 0);
      toDate = new Date(fromDate.getTime() + durationMinutes * 60000);
    }

    return {
      fromTime: format12Hour(fromDate),
      toTime: format12Hour(toDate),
      startDate: this.formatMeetingDisplayDate(now),
      endDate: this.formatMeetingDisplayDate(now),
    };
  }

  buildBackdatedOfflineMeetingData() {
    const suffix = Date.now().toString().slice(-6);
    const schedule = this.buildPastScheduleTimesForToday();

    return {
      title: `AutoRepeatPast_${suffix}`,
      location: 'Chennai, Tamil Nadu, India',
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      fromTime: schedule.fromTime,
      toTime: schedule.toTime,
      meetingType: 'offline',
    };
  }

  buildFutureScheduleTimes15Min(offsetMinutes = 120, durationMinutes = 30) {
    const roundToQuarterHour = (date) => {
      const copy = new Date(date);
      const minutes = copy.getMinutes();
      const remainder = minutes % 15;

      if (remainder === 0) {
        copy.setSeconds(0, 0);
        return copy;
      }

      copy.setMinutes(minutes + (15 - remainder), 0, 0);
      return copy;
    };

    const format12Hour = (date) => {
      const hours = date.getHours() % 12 || 12;
      const minuteValue = String(date.getMinutes()).padStart(2, '0');
      const meridiem = date.getHours() >= 12 ? 'PM' : 'AM';
      return `${hours}:${minuteValue} ${meridiem}`;
    };

    const fromDate = roundToQuarterHour(new Date(Date.now() + offsetMinutes * 60000));
    const toDate = roundToQuarterHour(new Date(fromDate.getTime() + durationMinutes * 60000));

    return {
      fromTime: format12Hour(fromDate),
      toTime: format12Hour(toDate),
    };
  }

  buildRepeatedMeetingSchedule(daysInFuture = 1) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysInFuture);
    const { fromTime, toTime } = this.buildFutureScheduleTimes15Min(120, 30);

    this.repeatedMeetingData = {
      startDate: this.formatMeetingDisplayDate(futureDate),
      endDate: this.formatMeetingDisplayDate(futureDate),
      fromTime,
      toTime,
    };

    return this.repeatedMeetingData;
  }

  parseDisplayDate(displayDate) {
    const monthMap = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const parts = String(displayDate).trim().split(/\s+/);
    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1]];
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  parseCalendarHeaderLabel(label) {
    const monthMap = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11,
    };
    const match = String(label).trim().match(/([A-Za-z]+)\s+(\d{4})/);
    if (!match) {
      return null;
    }
    const month = monthMap[match[1].toLowerCase()];
    if (month === undefined) {
      return null;
    }
    return { month, year: parseInt(match[2], 10) };
  }

  getDateCalendarButton(dateInput) {
    return dateInput
      .locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")][1]')
      .getByRole('button', { name: /choose date/i });
  }

  async selectScheduleDateViaCalendar(dateInput, displayDate) {
    await this.dismissEditMeetingOverlays();

    await expect(async () => {
      try {
        await this.selectScheduleDateViaCalendarOnce(dateInput, displayDate);
      } catch (error) {
        await this.dismissEditMeetingOverlays();
        throw error;
      }
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 3000] });
  }

  async selectScheduleDateViaCalendarOnce(dateInput, displayDate) {
    const targetDate = this.parseDisplayDate(displayDate);
    const targetDay = targetDate.getDate();
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    console.log(`[RepeatMeetingPage] Selecting schedule date via calendar: ${displayDate}`);
    await expect(dateInput).toBeVisible({ timeout: 15000 });
    await dateInput.scrollIntoViewIfNeeded().catch(() => {});

    const calendarButton = this.getDateCalendarButton(dateInput);
    await expect(calendarButton).toBeVisible({ timeout: 15000 });
    await calendarButton.click();

    const popper = this.page.locator('.MuiPickersPopper-root').filter({ visible: true }).last();
    await expect(popper).toBeVisible({ timeout: 15000 });

    const daySelector =
      'button[role="gridcell"].MuiPickersDay-root:not(.Mui-disabled):not([aria-disabled="true"]):not(.MuiPickersDay-hiddenDaySpacingFiller)';

    let dayButton = popper
      .locator(daySelector)
      .filter({ hasText: new RegExp(`^\\s*${targetDay}\\s*$`) })
      .first();

    if (!(await dayButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const headerLabel = await popper.locator('.MuiPickersCalendarHeader-label').first().innerText();
        const current = this.parseCalendarHeaderLabel(headerLabel);
        if (current && current.month === targetMonth && current.year === targetYear) {
          break;
        }

        const navigateForward =
          !current ||
          current.year < targetYear ||
          (current.year === targetYear && current.month < targetMonth);

        const navButton = navigateForward
          ? popper.locator('.MuiPickersArrowSwitcher-nextIconButton').first()
          : popper.locator('.MuiPickersArrowSwitcher-previousIconButton').first();

        await expect(navButton).toBeVisible({ timeout: 5000 });
        await navButton.click();
      }

      dayButton = popper
        .locator(daySelector)
        .filter({ hasText: new RegExp(`^\\s*${targetDay}\\s*$`) })
        .first();
    }

    await dayButton.scrollIntoViewIfNeeded();
    await expect(dayButton).toBeEnabled({ timeout: 15000 });
    await dayButton.click();
    await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const value = (await dateInput.inputValue()).replace(/\s+/g, ' ').trim();
    if (!value.match(new RegExp(String(targetDay))) || !value.match(new RegExp(displayDate.split(/\s+/)[1], 'i'))) {
      throw new Error(`Schedule date not updated. Expected ${displayDate}, got ${value}`);
    }
  }

  editPageTimeListbox(pickerId) {
    return this.page.locator(`ul[role="listbox"][aria-labelledby="${pickerId}-label"]`);
  }

  async selectEditPageTimePickerOption(pickerId, timeValue) {
    const normalizedTime = String(timeValue).trim();
    console.log(`[RepeatMeetingPage] Selecting ${pickerId} time on Edit page: ${normalizedTime}`);

    await expect(async () => {
      await this.dismissEditMeetingOverlays();

      const pickerTrigger = this.page.locator(`#${pickerId}[role="combobox"]`);
      await pickerTrigger.scrollIntoViewIfNeeded().catch(() => {});
      await expect(pickerTrigger).toBeVisible({ timeout: 10000 });
      await pickerTrigger.click();

      const listbox = this.editPageTimeListbox(pickerId);
      await expect(listbox).toBeVisible({ timeout: 10000 });

      const escapedTime = normalizedTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const optionByValue = listbox.locator(`[role="option"][data-value="${normalizedTime}"]`).first();
      const optionByText = listbox
        .locator('[role="option"]')
        .filter({ hasText: new RegExp(`^\\s*${escapedTime}\\s*$`, 'i') })
        .first();

      let option = optionByValue;
      if ((await option.count()) === 0) {
        option = optionByText;
      }

      await option.scrollIntoViewIfNeeded();
      await expect(option).toBeVisible({ timeout: 10000 });
      await option.click();
      await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 3000] });
  }

  async readScheduleDateValue(dateInput) {
    await expect(dateInput).toBeVisible({ timeout: this.defaultTimeout });
    return (await dateInput.inputValue()).trim();
  }

  async fillScheduleDateInput(dateInput, dateValue) {
    console.log(`[RepeatMeetingPage] Setting schedule date: ${dateValue}`);
    await expect(dateInput).toBeVisible({ timeout: this.defaultTimeout });
    await dateInput.click();
    await dateInput.fill('');
    await dateInput.fill(dateValue);
    await dateInput.press('Tab');

    await expect(async () => {
      const currentValue = await dateInput.inputValue();
      expect(currentValue.replace(/\s+/g, ' ').trim()).toMatch(
        new RegExp(dateValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      );
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000] });
  }

  async fillBackdatedOfflineMeetingForm(data) {
    this.meetingData = data || this.buildBackdatedOfflineMeetingData();
    console.log(
      `[RepeatMeetingPage] Filling backdated offline meeting form: ${this.meetingData.title} (${this.meetingData.fromTime}-${this.meetingData.toTime})`
    );

    await this.ensureMeetingTabSelected('offline');

    const title = this.titleInput();
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    await title.fill(this.meetingData.title);

    const startDateInput = this.scheduleStartDate();
    const endDateInput = this.scheduleEndDate();
    await expect(startDateInput).toBeVisible({ timeout: this.defaultTimeout });
    await expect(endDateInput).toBeVisible({ timeout: this.defaultTimeout });

    this.meetingData.startDate = await this.readScheduleDateValue(startDateInput);
    this.meetingData.endDate = await this.readScheduleDateValue(endDateInput);
    console.log(
      `[RepeatMeetingPage] Using today's schedule date (${this.meetingData.startDate}) with past times for Past tab`
    );

    await this.selectTimePickerOption(this.fromTimePickerTrigger(), this.meetingData.fromTime);
    await this.selectTimePickerOption(this.toTimePickerTrigger(), this.meetingData.toTime);

    await this.fillLocationWithAutocomplete(this.meetingData.location);
    await this.expectParticipantChipVisible();
  }

  async createBackdatedOfflineMeetingWithLocationAndParticipants() {
    await this.fillBackdatedOfflineMeetingForm();
    await this.submitCreateMeetingForm();
    await this.verifyMeetingCreatedSuccessfully();
  }

  async openEventsScheduleTab(tabName, meetingType = null) {
    const normalizedTab = String(tabName).toLowerCase();
    const normalizedMeetingType = (meetingType || this.meetingData?.meetingType || 'offline').toLowerCase();
    console.log(`[RepeatMeetingPage] Opening Events ${normalizedTab} tab with ${normalizedMeetingType} filter`);

    await this.dismissCreateMeetingPanel();
    await expect(this.actionButton.first()).toBeVisible({ timeout: this.defaultTimeout });

    const tab = this.page.getByRole('tab', { name: new RegExp(`^${normalizedTab}$`, 'i') });
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });

    if ((await tab.getAttribute('aria-selected')) !== 'true') {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: this.defaultTimeout });
    }

    await this.openEventsMeetingTypeTab(normalizedMeetingType);
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }

  async verifyMeetingVisibleInScheduleTab(title, tabName) {
    console.log(`[RepeatMeetingPage] Verifying meeting "${title}" in ${tabName} tab`);

    await expect(async () => {
      await this.openEventsScheduleTab(tabName);
      const row = this.getMeetingTableRow(title);
      const rowVisible = await row.isVisible().catch(() => false);
      const cardVisible = await this.getMeetingCard(title).isVisible().catch(() => false);
      expect(rowVisible || cardVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [2000, 3000, 5000] });
  }

  async openMeetingActionMenuInScheduleTab(title, scheduleTab, meetingType = null) {
    const normalizedMeetingType = (meetingType || this.meetingData?.meetingType || 'offline').toLowerCase();
    console.log(
      `[RepeatMeetingPage] Opening action menu for "${title}" in ${scheduleTab} tab (${normalizedMeetingType})`
    );
    await this.openEventsScheduleTab(scheduleTab, normalizedMeetingType);
    await this.openMeetingTableRowActionMenu(title);
  }

  async openRepeatForCreatedMeeting() {
    const title = this.meetingData?.title;
    if (!title) {
      throw new Error('[RepeatMeetingPage] No meeting title found. Create a meeting before opening Repeat.');
    }

    await this.openEventsScheduleTab('past');

    await expect(async () => {
      await this.openMeetingTableRowActionMenu(title);
      const repeatItem = this.repeatMenuItem();
      await expect(repeatItem).toBeVisible({ timeout: 8000 });

      const navigationPromise = this.page
        .waitForURL(/edit/i, { timeout: 45000 })
        .catch(() => this.page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}));

      await repeatItem.click();
      await navigationPromise;
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

      if (!(await this.isEditMeetingPageVisible())) {
        throw new Error('[RepeatMeetingPage] Edit Meeting page not visible after Repeat');
      }
    }).toPass({ timeout: 90000, intervals: [2000, 3000, 5000] });

    await this.waitForEditMeetingPageReady();
    console.log('[RepeatMeetingPage] Edit Meeting page opened after Repeat');
  }

  async expectEditMeetingPageWithPrefilledDetails() {
    console.log('[RepeatMeetingPage] Verifying Edit Meeting page with prefilled details');
    await this.waitForEditMeetingPageReady();

    await expect(this.editMeetingTitleInput()).toHaveValue(this.meetingData.title);

    this.meetingData.startDate = await this.readScheduleDateValue(this.editPageScheduleStartDate());
    this.meetingData.endDate = await this.readScheduleDateValue(this.editPageScheduleEndDate());
    console.log(
      `[RepeatMeetingPage] Original meeting schedule on Edit page: ${this.meetingData.startDate} ${this.meetingData.fromTime}-${this.meetingData.toTime}`
    );

    await expect(this.editPageLocationInput()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.editPageLocationInput()).not.toHaveValue('');
  }

  async scheduleRepeatedMeetingWithFutureDateAndUpdatedTimes() {
    const schedule = this.buildRepeatedMeetingSchedule();
    console.log(
      `[RepeatMeetingPage] Scheduling repeated meeting for ${schedule.startDate} ${schedule.fromTime}-${schedule.toTime}`
    );

    await this.waitForEditMeetingPageReady();
    await this.selectScheduleDateViaCalendar(this.editPageScheduleStartDate(), schedule.startDate);
    await this.selectScheduleDateViaCalendar(this.editPageScheduleEndDate(), schedule.endDate);
    await this.selectEditPageTimePickerOption('from-time-picker', schedule.fromTime);
    await this.selectEditPageTimePickerOption('to-time-picker', schedule.toTime);

    await expect(async () => {
      const startValue = await this.editPageScheduleStartDate().inputValue();
      const endValue = await this.editPageScheduleEndDate().inputValue();
      expect(startValue).toMatch(new RegExp(schedule.startDate.split(/\s+/)[1], 'i'));
      expect(endValue).toMatch(new RegExp(schedule.endDate.split(/\s+/)[1], 'i'));
      expect(startValue).toContain(String(schedule.startDate.split(/\s+/)[0]).replace(/^0/, ''));
    }).toPass({ timeout: this.defaultTimeout });

    await this.scrollEditMeetingFormToSaveButton();
  }

  async waitForEditMeetingPageReady() {
    console.log('[RepeatMeetingPage] Waiting for Edit Meeting page to be ready');

    await expect(async () => {
      expect(await this.isEditMeetingPageVisible()).toBeTruthy();
    }).toPass({ timeout: 90000, intervals: [2000, 3000, 5000] });

    await expect(this.editMeetingTitleInput()).toBeVisible({ timeout: 30000 });
    await expect(this.saveMeetingButton()).toBeVisible({ timeout: 30000 });
    await expect(this.editPageScheduleStartDate()).toBeVisible({ timeout: 30000 });
    await expect(this.editPageScheduleEndDate()).toBeVisible({ timeout: 30000 });
    await expect(this.editPageFromTimePickerTrigger()).toBeVisible({ timeout: 30000 });
    await expect(this.editPageToTimePickerTrigger()).toBeVisible({ timeout: 30000 });
  }

  async scrollEditMeetingFormToSaveButton() {
    console.log('[RepeatMeetingPage] Scrolling to Save Meeting button');
    await this.waitForEditMeetingPageReady();
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.saveMeetingButton().scrollIntoViewIfNeeded();
    await expect(this.saveMeetingButton()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async submitSaveMeetingForm() {
    console.log('[RepeatMeetingPage] Saving repeated meeting from Edit Meeting page');
    await this.scrollEditMeetingFormToSaveButton();

    const saveButton = this.saveMeetingButton();
    await expect(saveButton).toBeEnabled({ timeout: this.defaultTimeout });

    const saveResponse = this.page.waitForResponse(
      (response) => this.isMeetingCreateRequest(response) || this.isMeetingUpdateRequest(response),
      { timeout: this.defaultTimeout }
    );

    await saveButton.click();

    const response = await saveResponse.catch(() => null);
    this.lastRepeatSaveStatus = response?.status() ?? null;
    this.repeatSaveSucceeded = response ? response.status() >= 200 && response.status() < 300 : null;

    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      throw new Error(`[RepeatMeetingPage] Save meeting API failed (${response.status()}): ${body.slice(0, 500)}`);
    }

    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }

  async verifyRepeatedMeetingSavedSuccessfully() {
    console.log('[RepeatMeetingPage] Verifying repeated meeting saved successfully');

    if (this.repeatSaveSucceeded === false) {
      throw new Error('[RepeatMeetingPage] Repeated meeting save API did not succeed');
    }

    await expect(async () => {
      const toastVisible = await this.meetingSavedToast().isVisible().catch(() => false);
      const editPageClosed = !(await this.editMeetingHeading().isVisible().catch(() => false));

      if (this.repeatSaveSucceeded && (toastVisible || editPageClosed)) {
        return;
      }

      if (toastVisible) {
        return;
      }

      throw new Error('Repeated meeting save success signal not detected yet');
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
  }

  async navigateBackToLeadEvents() {
    console.log('[RepeatMeetingPage] Navigating back to Lead Events');
    await this.openEventsModule();
    await expect(this.actionButton.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async verifyMeetingShowsScheduleInTab(title, tabName, scheduleData) {
    await this.openEventsScheduleTab(tabName);

    const row = this.getMeetingTableRow(title);
    const card = this.getMeetingCard(title);
    const entry = (await row.isVisible().catch(() => false)) ? row : card;

    await expect(entry).toBeVisible({ timeout: this.defaultTimeout });

    const entryText = (await entry.innerText()).replace(/\s+/g, ' ');
    const fromTimePattern = scheduleData.fromTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(entryText).toMatch(new RegExp(fromTimePattern, 'i'));
  }

  async verifyRepeatedMeetingInUpcomingTabWithUpdatedSchedule() {
    const title = this.meetingData?.title;
    if (!title || !this.repeatedMeetingData) {
      throw new Error('[RepeatMeetingPage] Missing repeated meeting data for verification');
    }

    await this.verifyMeetingVisibleInScheduleTab(title, 'upcoming');
    await this.verifyMeetingShowsScheduleInTab(title, 'upcoming', this.repeatedMeetingData);
  }

  async verifyOriginalBackdatedMeetingUnchangedInPastTab() {
    const title = this.meetingData?.title;
    if (!title) {
      throw new Error('[RepeatMeetingPage] Missing original meeting data for verification');
    }

    await this.verifyMeetingVisibleInScheduleTab(title, 'past');
    await this.verifyMeetingShowsScheduleInTab(title, 'past', this.meetingData);
  }
}

module.exports = RepeatMeetingPage;
