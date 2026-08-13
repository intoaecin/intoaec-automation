const { expect } = require('@playwright/test');
const BasePage = require('../../../../BasePage');
const NavigationPage = require('../../../common/NavigationPage');

class EventPage extends BasePage {
  constructor(page) {
    super(page);
    this.defaultTimeout = 120000;
    this.navigationPage = new NavigationPage(page);

    this.selectFeaturesInput = page.getByRole('textbox', { name: /select feature\(s\)/i });
    this.eventsMenuItem = page.getByRole('menuitem', { name: /^events?$/i });
    this.eventsTab = page.getByRole('tab', { name: /^events?$/i });
    this.actionButton = page.getByRole('button', { name: /^choose action$/i });
    this.createMeetingMenuItem = page.getByRole('menuitem', { name: /^create meeting$/i });
    this.createMeetingPanel = page
      .getByRole('dialog')
      .filter({ hasText: /create meeting|edit meeting|update meeting/i })
      .or(page.locator('.MuiDrawer-paper').filter({ hasText: /create meeting|edit meeting|update meeting/i }));
    this.createMeetingHeading = this.createMeetingPanel.getByText(/create meeting|edit meeting|update meeting/i).first();
    this.requiredFieldLabels = this.createMeetingPanel.locator('label').filter({ hasText: /\*/ });
    this.createMeetingActionButtons = this.createMeetingPanel.getByRole('button', {
      name: /^(create meeting|create|save|cancel|close)$/i,
    });
    this.createMeetingErrors = this.createMeetingPanel.locator(
      '[role="alert"], .Mui-error, .MuiAlert-standardError, .MuiAlert-filledError'
    );
    this.actionMenu = page.locator('[role="menu"]').filter({ visible: true }).first();
    this.editMenuItem = page
      .getByRole('menuitem', { name: /^edit$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^edit$/i }))
      .first();
    this.deleteMenuItem = page
      .getByRole('menuitem', { name: /^delete$/i })
      .or(page.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /^delete$/i }))
      .first();
    this.confirmDialog = page
      .getByRole('dialog')
      .filter({ hasText: /delete|confirm|remove|meeting/i })
      .first();
    this.confirmYesButton = page
      .getByRole('button', { name: /^yes$|^delete$|^confirm$|^ok$/i })
      .or(page.locator('button').filter({ hasText: /^yes$/i }))
      .first();
    this.confirmCancelButton = page
      .getByRole('button', { name: /^cancel$/i })
      .or(page.locator('button').filter({ hasText: /^cancel$/i }))
      .first();
  }

  panel() {
    return this.createMeetingPanel.first();
  }

  onlineTab() {
    return this.panel().getByRole('tab', { name: /^online$/i });
  }

  offlineTab() {
    return this.panel().getByRole('tab', { name: /^offline$/i });
  }

  eventsMeetingTypeTablist() {
    return this.page.getByRole('tablist', { name: /tabs as buttons/i });
  }

  eventsMeetingTypeTab(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    return this.eventsMeetingTypeTablist().getByRole('tab', {
      name: new RegExp(`^${normalizedTab}$`, 'i'),
    });
  }

  titleInput() {
    return this.panel()
      .getByPlaceholder(/add title/i)
      .or(
        this.panel()
          .locator('label')
          .filter({ hasText: /^title$/i })
          .first()
          .locator('xpath=following::input[1]')
      )
      .first();
  }

  scheduleDateInputs() {
    return this.panel().locator('input[placeholder="DD MMMM YYYY"]');
  }

  scheduleStartDate() {
    return this.scheduleDateInputs().first();
  }

  scheduleEndDate() {
    return this.scheduleDateInputs().nth(1);
  }

  fromTimePicker() {
    return this.panel().locator('#from-time-picker');
  }

  toTimePicker() {
    return this.panel().locator('#to-time-picker');
  }

  timePickerTrigger(pickerId) {
    const formControl = this.panel()
      .locator(`#${pickerId}`)
      .locator('xpath=ancestor::div[contains(@class,"MuiFormControl") or contains(@class,"MuiInputBase-root")][1]');

    return formControl
      .getByRole('combobox')
      .or(formControl.locator('.MuiSelect-select'))
      .or(this.panel().locator(`#${pickerId}`))
      .first();
  }

  fromTimePickerTrigger() {
    return this.timePickerTrigger('from-time-picker');
  }

  toTimePickerTrigger() {
    return this.timePickerTrigger('to-time-picker');
  }

  timezoneCombobox() {
    return this.panel()
      .locator('label')
      .filter({ hasText: /^timezone$/i })
      .first()
      .locator('..')
      .getByRole('combobox')
      .first();
  }

  locationInput() {
    return this.panel()
      .locator('label')
      .filter({ hasText: /^location$/i })
      .first()
      .locator('..')
      .locator('input.pac-target-input, input[type="text"]')
      .first()
      .or(this.panel().getByPlaceholder(/enter your location/i));
  }

  notificationTypeCombobox() {
    return this.panel()
      .locator('label')
      .filter({ hasText: /notification type/i })
      .first()
      .locator('..')
      .getByRole('combobox')
      .first();
  }

  notificationMinutesInput() {
    return this.panel().locator('input[type="number"]').first();
  }

  notificationUnitCombobox() {
    return this.panel()
      .locator('label')
      .filter({ hasText: /notification type/i })
      .locator('xpath=ancestor::div[contains(@class,"row")]')
      .getByRole('combobox')
      .last();
  }

  participantChips() {
    return this.panel().locator('.MuiAutocomplete-tag, .MuiChip-root');
  }

  agendaInput() {
    return this.panel().getByPlaceholder(/^agenda$/i);
  }

  submitCreateMeetingButton() {
    return this.panel().getByRole('button', { name: /^create meeting$/i });
  }

  submitUpdateMeetingButton() {
    return this.panel()
      .getByRole('button', { name: /^update meeting$|^save$|^update$/i })
      .filter({ visible: true })
      .last();
  }

  meetingSuccessToast() {
    return this.page.getByText(/meeting created successfully|created successfully|event created/i);
  }

  meetingUpdatedToast() {
    return this.page.getByText(/meeting updated successfully|updated successfully|meeting saved/i);
  }

  meetingDeletedToast() {
    return this.page.getByText(/meeting deleted successfully|deleted successfully|removed successfully/i);
  }

  buildCreateMeetingData() {
    const suffix = Date.now().toString().slice(-6);
    const { fromTime, toTime } = this.buildFutureScheduleTimes();
    return {
      title: `AutoMeeting_${suffix}`,
      location: 'Chennai, Tamil Nadu, India',
      agenda: `Automation agenda ${suffix}`,
      fromTime,
      toTime,
      notificationMinutes: '15',
    };
  }

  buildFutureScheduleTimes(offsetMinutes = 90, durationMinutes = 30) {
    const roundToHalfHour = (date) => {
      const copy = new Date(date);
      const minutes = copy.getMinutes();

      if (minutes === 0 || minutes === 30) {
        copy.setSeconds(0, 0);
        return copy;
      }

      if (minutes < 30) {
        copy.setMinutes(30, 0, 0);
      } else {
        copy.setHours(copy.getHours() + 1, 0, 0, 0);
      }

      return copy;
    };
    const format12Hour = (date) => {
      const hours = date.getHours() % 12 || 12;
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const meridiem = date.getHours() >= 12 ? 'PM' : 'AM';
      return `${hours}:${minutes} ${meridiem}`;
    };

    const fromDate = roundToHalfHour(new Date(Date.now() + offsetMinutes * 60000));
    const toDate = roundToHalfHour(new Date(fromDate.getTime() + durationMinutes * 60000));
    return {
      fromTime: format12Hour(fromDate),
      toTime: format12Hour(toDate),
    };
  }

  shouldMockMeetingApi() {
    return process.env.MEETING_API_MOCK === 'true';
  }

  isMeetingCreateRequest(response) {
    const url = response.url();
    const postData = response.request().postData() || '';

    return (
      response.request().method() === 'POST' &&
      (/meetandnote/i.test(url) ||
        /CREATE_MEETING|createMeeting|create_meeting|MEETING_CREATE/i.test(postData))
    );
  }

  isMeetingUpdateRequest(response) {
    const url = response.url();
    const postData = response.request().postData() || '';

    return (
      response.request().method() === 'POST' &&
      (/meetandnote/i.test(url) ||
        /UPDATE_MEETING|EDIT_MEETING|updateMeeting|edit_meeting|SAVE_MEETING|saveMeeting/i.test(postData))
    );
  }

  isMeetingDeleteRequest(response) {
    const url = response.url();
    const postData = response.request().postData() || '';

    return (
      response.request().method() === 'POST' &&
      (/meetandnote/i.test(url) ||
        /DELETE_MEETING|deleteMeeting|delete_meeting|REMOVE_MEETING|removeMeeting/i.test(postData))
    );
  }

  async installMeetingCreateRouteMock() {
    if (!this.shouldMockMeetingApi() || this.meetingCreateRouteMockInstalled) {
      return;
    }

    console.log('[EventPage] Installing meetandnote create route mock (MEETING_API_MOCK=true)');
    await this.page.route('**/meetandnote.aecplayhouse.com/create', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUCCESS',
          message: 'Meeting created successfully',
          body: { meetingId: 'automation-mock-meeting-id' },
        }),
      });
    });
    this.meetingCreateRouteMockInstalled = true;
  }

  pageErrorToast() {
    return this.page.getByText(/request failed with status code|something went wrong|failed/i);
  }

  async dismissOpenMenus() {
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(200);
  }

  getMeetingCard(title) {
    return this.page.locator('.MuiCard-root').filter({ hasText: title }).first();
  }

  eventsMeetingsTableBody() {
    return this.page.locator('tbody');
  }

  getMeetingTableRow(title) {
    return this.eventsMeetingsTableBody().locator('tr').filter({ hasText: title }).first();
  }

  getMeetingRowMenuButton(row) {
    return row
      .locator('button[id^="row-menu-button-"]')
      .or(row.locator('button:has([data-testid="MoreVertIcon"]), button:has([data-testid="MoreHorizIcon"])'))
      .first();
  }

  async hoverMeetingTableRow(row) {
    const firstCell = row.locator('td').first();
    await expect(firstCell).toBeVisible({ timeout: 15000 });
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.hover();
    await firstCell.hover();

    const menuButton = this.getMeetingRowMenuButton(row);
    if (!(await menuButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      await row.hover({ force: true });
      await firstCell.hover({ force: true });
    }
  }

  async openMeetingTableRowActionMenuOnce(title) {
    await this.dismissOpenMenus();

    const row = this.getMeetingTableRow(title);
    await expect(row).toBeVisible({ timeout: 10000 });
    await this.hoverMeetingTableRow(row);

    const menuButton = this.getMeetingRowMenuButton(row);
    await expect(menuButton).toBeVisible({ timeout: 10000 });
    await menuButton.click({ timeout: 10000 });

    if (!(await this.actionMenu.isVisible({ timeout: 5000 }).catch(() => false))) {
      throw new Error(`Action menu did not open for meeting "${title}"`);
    }
  }

  async openMeetingTableRowActionMenu(title) {
    console.log(`[EventPage] Opening table row action menu for: ${title}`);

    await expect(async () => {
      await this.openMeetingTableRowActionMenuOnce(title);
    }).toPass({ timeout: 45000, intervals: [1000, 2000, 3000] });
  }

  getMeetingCardActionButton(card) {
    return card
      .locator('button:has([data-testid="MoreVertIcon"]), button:has([data-testid="MoreHorizIcon"])')
      .or(card.getByRole('button', { name: /more|action|options|menu/i }))
      .first();
  }

  getActiveMeetingTitle() {
    return this.editedMeetingData?.title || this.meetingData?.title;
  }

  getActiveMeetingTab() {
    return this.meetingData?.meetingType || 'offline';
  }

  async openMeetingActionMenuForTitle(title, tabName = 'offline') {
    console.log(`[EventPage] Opening meeting action menu for: ${title}`);
    await this.openEventsMeetingTypeTab(tabName);
    await this.dismissOpenMenus();

    const card = this.getMeetingCard(title);
    await expect(card).toBeVisible({ timeout: this.defaultTimeout });
    await card.scrollIntoViewIfNeeded().catch(() => {});

    const actionButton = this.getMeetingCardActionButton(card);
    await expect(actionButton).toBeVisible({ timeout: this.defaultTimeout });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt > 0) {
        await this.dismissOpenMenus();
      }

      await actionButton.click({ timeout: 15000, force: attempt > 0 });
      await this.page.waitForTimeout(300);

      if (await this.actionMenu.isVisible({ timeout: 4000 }).catch(() => false)) {
        return;
      }
    }

    throw new Error(`[EventPage] Row action menu did not open for meeting: ${title}`);
  }

  async createOfflineMeetingForLifecycleAction() {
    console.log('[EventPage] Creating offline meeting for edit/delete flow');
    await this.navigateToFirstAvailableLead();
    await this.openEventsModule();
    await this.openActionMenu();
    await this.selectCreateMeeting();
    await this.fillCreateMeetingOfflineFormWithoutOptionalFields();
    await this.submitCreateMeetingForm();
    await this.verifyMeetingCreatedSuccessfully();
    await this.verifyMeetingVisibleInEventsTab('offline');
  }

  async verifyMeetingNotVisibleInEventsTab(title, tabName = 'offline') {
    console.log(`[EventPage] Verifying meeting "${title}" is not listed under Events ${tabName} tab`);

    await expect(async () => {
      await this.openEventsMeetingTypeTab(tabName);
      const cardVisible = await this.getMeetingCard(title).isVisible().catch(() => false);
      const textVisible = await this.page.getByText(title, { exact: false }).first().isVisible().catch(() => false);
      expect(cardVisible || textVisible).toBeFalsy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [2000, 3000, 5000] });
  }

  async verifyMeetingVisibleByTitle(title, tabName = 'offline') {
    this.meetingData = this.meetingData || {};
    this.meetingData.title = title;
    this.meetingData.meetingType = tabName;
    await this.verifyMeetingVisibleInEventsTab(tabName);
  }

  async dismissCreateMeetingPanel() {
    const panel = this.createMeetingPanel.first();
    const panelVisible = await panel.isVisible({ timeout: 2000 }).catch(() => false);
    if (!panelVisible) {
      return;
    }

    console.log('[EventPage] Dismissing Create Meeting popup via close icon');
    const closeButton = panel
      .locator('button:has(svg.lucide-x)')
      .or(panel.locator('button:has(svg[data-testid="CloseIcon"])'))
      .or(panel.getByRole('button', { name: /^close$|×/i }))
      .first();

    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click({ force: true }).catch(() => {});
      await expect(panel).toBeHidden({ timeout: 10000 }).catch(() => {});
      return;
    }

    await expect(panel).toBeHidden({ timeout: 10000 }).catch(() => {});
  }

  async navigateToFirstAvailableLead() {
    console.log('[EventPage] Navigating to the first available lead');
    await this.dismissCreateMeetingPanel();

    if (/leadmanager\/profile/i.test(this.page.url())) {
      console.log('[EventPage] Already on lead profile — skipping Lead Manager navigation');
      return;
    }

    await this.navigationPage.clickCrmDropdown();
    await this.navigationPage.clickLeadManager();
    await this.navigationPage.clickFirstLeadFromTable();
  }

  async openEventsModule() {
    console.log('[EventPage] Opening Events module');
    await this.dismissCreateMeetingPanel();

    if (await this.actionButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[EventPage] Events module already open');
      return;
    }

    if (/leadmanager\/profile/i.test(this.page.url())) {
      console.log('[EventPage] Refreshing lead profile to reset Events module state');
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await this.dismissCreateMeetingPanel();

      if (await this.actionButton.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[EventPage] Events module ready after refresh');
        return;
      }
    }

    if (await this.eventsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.eventsTab.click();
      await expect(this.actionButton.first()).toBeVisible({ timeout: this.defaultTimeout });
      return;
    }

    const featureSelector = this.selectFeaturesInput.first();
    await expect(featureSelector).toBeVisible({ timeout: this.defaultTimeout });
    await featureSelector.click();

    const featureSearch = this.selectFeaturesInput.nth(1);
    await expect(featureSearch).toBeVisible({ timeout: this.defaultTimeout });
    await featureSearch.fill('event');

    await expect(this.eventsMenuItem.first()).toBeVisible({ timeout: this.defaultTimeout });
    await this.eventsMenuItem.first().click();
    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await expect(this.actionButton.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async openActionMenu() {
    console.log('[EventPage] Opening Events action menu');
    const actionButton = this.actionButton.first();
    await expect(actionButton).toBeVisible({ timeout: this.defaultTimeout });
    await actionButton.click();
  }

  async selectCreateMeeting() {
    console.log('[EventPage] Selecting Create Meeting');
    const createMeeting = this.createMeetingMenuItem.first();
    await expect(createMeeting).toBeVisible({ timeout: this.defaultTimeout });
    await createMeeting.click();
    await expect(this.createMeetingPanel.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectCreateMeetingPanelOpen() {
    console.log('[EventPage] Verifying Create Meeting panel is open');
    await expect(this.createMeetingPanel.first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.createMeetingHeading).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectMandatoryFieldsAndActionButtonsVisible() {
    console.log('[EventPage] Verifying Create Meeting mandatory fields and actions');
    await expect(this.requiredFieldLabels.first()).toBeVisible({ timeout: this.defaultTimeout });

    const requiredFieldCount = await this.requiredFieldLabels.count();
    expect(requiredFieldCount).toBeGreaterThan(0);
    for (let index = 0; index < requiredFieldCount; index += 1) {
      await expect(this.requiredFieldLabels.nth(index)).toBeVisible({ timeout: this.defaultTimeout });
    }

    await expect(this.createMeetingActionButtons.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectCreateMeetingScreenWithoutErrors() {
    console.log('[EventPage] Verifying Create Meeting screen remains open without errors');
    await expect(this.createMeetingPanel.first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.createMeetingErrors).toHaveCount(0);
  }

  async ensureMeetingTabSelected(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    const tab = normalizedTab === 'offline' ? this.offlineTab() : this.onlineTab();
    console.log(`[EventPage] Ensuring ${normalizedTab} tab is selected`);
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });
    const isSelected = await tab.getAttribute('aria-selected');
    if (isSelected !== 'true') {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: this.defaultTimeout });
    }
  }

  async ensureOnlineTabSelected() {
    await this.ensureMeetingTabSelected('online');
  }

  async ensureOfflineTabSelected() {
    await this.ensureMeetingTabSelected('offline');
  }

  async selectTimePickerOption(pickerTrigger, timeValue) {
    const normalizedTime = String(timeValue).trim();
    console.log(`[EventPage] Selecting time picker option: ${normalizedTime}`);

    await expect(pickerTrigger).toBeVisible({ timeout: 15000 });
    await pickerTrigger.click();

    const listbox = this.page.getByRole('listbox').filter({ visible: true }).last();
    await expect(listbox).toBeVisible({ timeout: 15000 });

    const escapedTime = normalizedTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const optionByValue = listbox.locator(`[role="option"][data-value="${normalizedTime}"]`).first();
    const optionByText = listbox.getByRole('option', {
      name: new RegExp(`^\\s*${escapedTime}\\s*$`, 'i'),
    }).first();
    const optionByMenuItem = this.page
      .locator('.MuiMenu-paper [role="option"]')
      .filter({ hasText: new RegExp(`^\\s*${escapedTime}\\s*$`, 'i') })
      .first();

    let option = optionByValue;
    if ((await option.count()) === 0) {
      option = optionByText;
    }
    if ((await option.count()) === 0) {
      option = optionByMenuItem;
    }

    await option.scrollIntoViewIfNeeded();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async selectMuiComboboxOption(combobox, optionText) {
    const optionPattern =
      optionText instanceof RegExp ? optionText : new RegExp(`^\\s*${String(optionText).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');

    await expect(combobox).toBeVisible({ timeout: 15000 });
    await combobox.click();

    const listbox = this.page.getByRole('listbox').last();
    await expect(listbox).toBeVisible({ timeout: 15000 });

    const option = listbox.getByRole('option', { name: optionPattern }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async expectParticipantChipVisible() {
    console.log('[EventPage] Verifying participant chip is present');
    const chips = this.participantChips();
    await expect(chips.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async fillLocationWithAutocomplete(locationText) {
    const location = this.locationInput();
    await location.fill(locationText);
    const suggestion = this.page.locator('.pac-container .pac-item').first();
    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click();
      console.log('[EventPage] Selected location autocomplete suggestion');
      return;
    }
    console.log('[EventPage] No location autocomplete suggestion — using typed location');
  }

  async pickFutureScheduleTimes() {
    const { fromTime, toTime } = this.buildFutureScheduleTimes();
    this.meetingData.fromTime = fromTime;
    this.meetingData.toTime = toTime;
    console.log(`[EventPage] Selecting future schedule times: ${fromTime} to ${toTime}`);
    await this.selectTimePickerOption(this.fromTimePickerTrigger(), fromTime);
    await this.selectTimePickerOption(this.toTimePickerTrigger(), toTime);
  }

  async fillCreateMeetingFormDetails(meetingType = 'online', data, options = {}) {
    const { includeLocation = true, includeAgenda = true } = options;

    this.meetingData = data || this.buildCreateMeetingData();
    const normalizedType = String(meetingType).toLowerCase();
    this.meetingData.meetingType = normalizedType;
    console.log(`[EventPage] Filling Create Meeting ${normalizedType} form: ${this.meetingData.title}`);

    await this.ensureMeetingTabSelected(normalizedType);

    const title = this.titleInput();
    await expect(title).toBeVisible({ timeout: this.defaultTimeout });
    await title.fill(this.meetingData.title);

    await expect(this.scheduleStartDate()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.scheduleEndDate()).toBeVisible({ timeout: this.defaultTimeout });

    await expect(this.fromTimePickerTrigger()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.toTimePickerTrigger()).toBeVisible({ timeout: this.defaultTimeout });

    try {
      await this.pickFutureScheduleTimes();
    } catch (error) {
      console.log(`[EventPage] Unable to set schedule times: ${error.message}`);
      throw error;
    }

    const timezone = this.timezoneCombobox();
    if (await timezone.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(timezone).toBeVisible({ timeout: this.defaultTimeout });
    }

    const location = this.locationInput();
    if (await location.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (includeLocation) {
        await this.fillLocationWithAutocomplete(this.meetingData.location);
      } else {
        console.log('[EventPage] Leaving location empty');
        await expect(location).toHaveValue('');
      }
    }

    const notificationType = this.notificationTypeCombobox();
    if (await notificationType.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(notificationType).toBeVisible({ timeout: this.defaultTimeout });

      const minutesInput = this.notificationMinutesInput();
      await expect(minutesInput).toBeVisible({ timeout: this.defaultTimeout });
      await minutesInput.fill('');
      await minutesInput.fill(this.meetingData.notificationMinutes);
    }

    await this.expectParticipantChipVisible();

    const agenda = this.agendaInput();
    if (await agenda.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (includeAgenda) {
        await agenda.fill(this.meetingData.agenda);
      } else {
        console.log('[EventPage] Leaving agenda empty');
        await expect(agenda).toHaveValue('');
      }
    }
  }

  async fillCreateMeetingOnlineForm(data) {
    await this.fillCreateMeetingFormDetails('online', data);
  }

  async fillCreateMeetingOfflineForm(data) {
    await this.fillCreateMeetingFormDetails('offline', data);
  }

  async fillCreateMeetingOfflineFormWithoutOptionalFields(data) {
    await this.fillCreateMeetingFormDetails('offline', data, {
      includeLocation: false,
      includeAgenda: false,
    });
  }

  async submitCreateMeetingForm() {
    if (this.shouldMockMeetingApi()) {
      await this.installMeetingCreateRouteMock();
    }

    console.log('[EventPage] Submitting Create Meeting form');
    const submitButton = this.submitCreateMeetingButton();
    await expect(submitButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(submitButton).toBeEnabled({ timeout: this.defaultTimeout });

    const createResponse = this.page.waitForResponse(
      (response) => this.isMeetingCreateRequest(response),
      { timeout: this.defaultTimeout }
    );

    await submitButton.click();

    const response = await createResponse.catch(() => null);
    this.lastCreateStatus = response?.status() ?? null;
    this.createSucceeded = response
      ? response.status() >= 200 && response.status() < 300
      : null;

    if (response && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      const ipRejected = /"ip"\s*is\s*not\s*allowed/i.test(body);
      throw new Error(
        `[EventPage] Meeting create API failed (${response.status()})${
          ipRejected ? ' — meetandnote API rejects the "ip" field (backend issue)' : ''
        }: ${body.slice(0, 500)}`
      );
    }

    if (!response) {
      console.warn('[EventPage] Meeting create API response was not captured');
    } else {
      console.log(`[EventPage] Meeting create API responded with status ${response.status()}`);
    }

    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await expect(this.createMeetingPanel.first()).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
  }

  async openEventsMeetingTypeTab(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    console.log(`[EventPage] Opening Events ${normalizedTab} tab`);

    await this.dismissCreateMeetingPanel();
    await expect(this.actionButton.first()).toBeVisible({ timeout: this.defaultTimeout });

    const tab = this.eventsMeetingTypeTab(normalizedTab);
    await expect(tab).toBeVisible({ timeout: this.defaultTimeout });

    const isSelected = await tab.getAttribute('aria-selected');
    if (isSelected !== 'true') {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: this.defaultTimeout });
    }

    await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }

  async verifyMeetingVisibleInEventsTab(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    const title = this.meetingData?.title;

    if (!title) {
      throw new Error('Meeting title not set — fill the Create Meeting form before verifying in Events');
    }

    if (this.createSucceeded === false) {
      throw new Error('[EventPage] Meeting create API did not succeed; Events list verification skipped');
    }

    console.log(`[EventPage] Verifying meeting "${title}" is listed under Events ${normalizedTab} tab`);

    await expect(async () => {
      await this.openEventsMeetingTypeTab(normalizedTab);

      const meetingEntry = this.page.getByText(title, { exact: false }).first();
      const visible = await meetingEntry.isVisible().catch(() => false);
      if (!visible) {
        throw new Error(`Meeting "${title}" not yet visible in Events ${normalizedTab} tab`);
      }
    }).toPass({ timeout: this.defaultTimeout, intervals: [2000, 3000, 5000] });

    console.log(`[EventPage] Meeting "${title}" found in Events ${normalizedTab} tab`);
  }

  async verifyMeetingCreatedInRespectiveEventsTab() {
    const meetingType = this.meetingData?.meetingType;
    if (!meetingType) {
      throw new Error('Meeting type not set — fill the Create Meeting form before verifying in Events');
    }

    await this.verifyMeetingVisibleInEventsTab(meetingType);
  }

  async verifyMeetingCreatedSuccessfully() {
    console.log('[EventPage] Verifying meeting created successfully');
    const title = this.meetingData?.title;

    if (this.createSucceeded === false) {
      throw new Error('[EventPage] Meeting create API did not succeed');
    }

    await expect(async () => {
      const errorToastVisible = await this.pageErrorToast().isVisible().catch(() => false);
      if (errorToastVisible) {
        const errorText = await this.pageErrorToast().first().innerText().catch(() => 'unknown error');
        throw new Error(`Create Meeting failed: ${errorText}`);
      }

      const toastVisible = await this.meetingSuccessToast().isVisible().catch(() => false);
      const dialogClosed = !(await this.createMeetingPanel.first().isVisible().catch(() => false));
      const titleInList = title
        ? await this.page.getByText(title, { exact: false }).first().isVisible().catch(() => false)
        : false;

      if (this.createSucceeded && dialogClosed) {
        console.log('[EventPage] Meeting created — API succeeded and dialog closed');
        await this.dismissCreateMeetingPanel();
        return;
      }

      if (toastVisible && (this.createSucceeded || this.shouldMockMeetingApi())) {
        console.log('[EventPage] Meeting created — toast visible');
        expect(toastVisible).toBeTruthy();
        await this.dismissCreateMeetingPanel();
        return;
      }

      if (titleInList) {
        console.log('[EventPage] Meeting created — title visible in list');
        expect(titleInList).toBeTruthy();
        await this.dismissCreateMeetingPanel();
        return;
      }

      const errorCount = await this.createMeetingErrors.count();
      if (errorCount > 0) {
        const errorText = await this.createMeetingErrors.first().innerText().catch(() => 'unknown error');
        throw new Error(`Create Meeting failed with error: ${errorText}`);
      }

      throw new Error('Meeting creation success signal not detected yet');
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
  }
}

module.exports = EventPage;
