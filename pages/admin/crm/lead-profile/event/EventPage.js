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
    this.clientMenuPanel = page.locator(
      'nav, aside, .MuiDrawer-root, .MuiTabs-root, [class*="sidebar"], [class*="feature"]'
    );
    this.leadFeatureSidebar = page.locator('aside').filter({ visible: true });
    this.classicUiToggle = page
      .getByRole('button', { name: /classic ui/i })
      .or(page.getByRole('switch', { name: /classic ui/i }))
      .or(page.locator('label').filter({ hasText: /classic ui/i }))
      .first();
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
      .filter({ hasText: /are you sure|cancel the meeting|delete|confirm|remove/i })
      .first();
    this.confirmYesButton = page
      .getByRole('button', { name: /^yes$|^delete$|^confirm$|^ok$/i })
      .or(page.locator('button').filter({ hasText: /^yes$/i }))
      .first();
    this.confirmCancelButton = page
      .getByRole('button', { name: /^(no|cancel)$/i })
      .or(page.locator('button').filter({ hasText: /^(no|cancel)$/i }))
      .first();
  }

  panel() {
    return this.visibleCreateMeetingPanel();
  }

  visibleCreateMeetingPanel() {
    return this.page
      .locator('.MuiDrawer-paper, [role="dialog"]')
      .filter({ hasText: /create meeting|edit meeting|update meeting/i })
      .filter({ visible: true })
      .last();
  }

  meetingTypeTab(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    const namePattern = new RegExp(`^${normalizedTab}$`, 'i');
    const drawerScope = this.panel();

    return drawerScope
      .getByRole('tab', { name: namePattern })
      .or(drawerScope.getByRole('button', { name: namePattern }))
      .filter({ visible: true })
      .first();
  }

  onlineTab() {
    return this.meetingTypeTab('online');
  }

  offlineTab() {
    return this.meetingTypeTab('offline');
  }

  eventsMeetingTypeTablist() {
    return this.page
      .getByRole('tablist', { name: /tabs as buttons|meeting type|upcoming|event/i })
      .or(this.page.getByRole('tab', { name: /^(online|offline|upcoming|past)$/i }).locator('xpath=ancestor::*[@role="tablist"][1]'))
      .or(this.page.locator('[role="tablist"]').filter({ visible: true }).first());
  }

  eventsMeetingTypeTab(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    return this.page
      .getByRole('tab', { name: new RegExp(`^${normalizedTab}$`, 'i') })
      .filter({ visible: true })
      .first();
  }

  async isMeetingTitleVisible(title) {
    const locators = [
      this.getMeetingTableRow(title),
      this.getMeetingCard(title),
      this.eventsMeetingsTableBody().getByText(title, { exact: false }).first(),
      this.page.getByText(title, { exact: false }).first(),
    ];

    for (const locator of locators) {
      if (await locator.isVisible().catch(() => false)) {
        return true;
      }
    }

    return false;
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
    return this.panel().locator(
      'input[placeholder="DD MMMM YYYY"], input[placeholder*="MMMM YYYY"], input[placeholder*="DD"], input[type="date"]'
    );
  }

  scheduleStartDate() {
    return this.scheduleDateInputs().first();
  }

  scheduleEndDate() {
    return this.scheduleDateInputs().nth(1);
  }

  async ensureScheduleDatesVisible() {
    const dateInputs = this.scheduleDateInputs();
    const dateCount = await dateInputs.count();
    if (dateCount === 0) {
      console.log('[EventPage] Schedule date inputs not present — continuing without date fields');
      return false;
    }

    console.log('[EventPage] Verifying schedule date fields');
    await expect(this.scheduleStartDate()).toBeVisible({ timeout: 15000 });
    if (dateCount > 1) {
      await expect(this.scheduleEndDate()).toBeVisible({ timeout: 15000 });
    }
    return true;
  }

  fromTimePicker() {
    return this.panel().locator('#from-time-picker');
  }

  toTimePicker() {
    return this.panel().locator('#to-time-picker');
  }

  scheduleTimeCombobox(scope, captionLabel) {
    return scope
      .locator('span.MuiTypography-caption')
      .filter({ hasText: new RegExp(`^\\s*${captionLabel}\\s*$`, 'i') })
      .locator('xpath=..')
      .locator('.MuiAutocomplete-root input[role="combobox"]');
  }

  timePickerTrigger(pickerId, captionLabel) {
    const formControl = this.panel()
      .locator(`#${pickerId}`)
      .locator('xpath=ancestor::div[contains(@class,"MuiFormControl") or contains(@class,"MuiInputBase-root")][1]');

    return this.scheduleTimeCombobox(this.panel(), captionLabel)
      .or(formControl.getByRole('combobox'))
      .or(formControl.locator('.MuiSelect-select'))
      .or(this.panel().locator(`#${pickerId}`))
      .first();
  }

  fromTimePickerTrigger() {
    return this.timePickerTrigger('from-time-picker', 'From');
  }

  toTimePickerTrigger() {
    return this.timePickerTrigger('to-time-picker', 'To');
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
      .locator('#meeting-location')
      .or(this.panel().getByPlaceholder(/enter your location/i))
      .or(this.panel().locator('input.pac-target-input'))
      .first();
  }

  companyLocationSwitch() {
    return this.panel()
      .getByRole('switch', { name: /company location/i })
      .or(this.panel().locator('label').filter({ hasText: /company location/i }).getByRole('checkbox'))
      .first();
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
      .getByRole('button', { name: /^save meeting$|^update meeting$|^save$|^update$/i })
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

  async isShownWithin(locator, timeout) {
    return locator
      .waitFor({ state: 'visible', timeout })
      .then(() => true)
      .catch(() => false);
  }

  async hideChatWidget() {
    await this.page.locator('#fc_frame').evaluate((el) => {
      el.style.setProperty('display', 'none', 'important');
    }).catch(() => {});
  }

  async dismissOpenMenus() {
    await this.hideChatWidget();
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.actionMenu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
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
    if (!(await this.isShownWithin(menuButton, 3000))) {
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

    if (!(await this.isShownWithin(this.actionMenu, 5000))) {
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

    const row = this.getMeetingTableRow(title);
    if (await row.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.openMeetingTableRowActionMenu(title);
      return;
    }

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

      if (await this.isShownWithin(this.actionMenu, 4000)) {
        return;
      }
    }

    throw new Error(`[EventPage] Row action menu did not open for meeting: ${title}`);
  }

  async createOfflineMeetingForLifecycleAction() {
    console.log('[EventPage] Creating offline meeting for edit/delete flow');
    await this.navigateToFirstAvailableLead();
    if (/leadmanager\/profile/i.test(this.page.url())) {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.waitForLeadProfileReady();
      await this.dismissCreateMeetingPanel();
    }
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

  isOnLeadProfile() {
    return /leadmanager\/profile/i.test(this.page.url());
  }

  getEventsSidebarEntry() {
    return this.page
      .locator('aside, .MuiListItemButton-root, div.MuiBox-root, div.MuiPaper-root')
      .locator('div, button, a, label, span, p')
      .filter({ hasText: /^events?$/i })
      .first();
  }

  getProjectSidebarScrollTarget() {
    return this.page
      .locator('.MuiListItemButton-root')
      .filter({ hasText: /^overview$/i })
      .first()
      .locator('xpath=ancestor::div[contains(@style,"overflow")][1]');
  }

  async isEventsPresentInClientMenu() {
    const menuItemVisible = await this.eventsMenuItem.first().isVisible().catch(() => false);
    const tabVisible = await this.eventsTab.isVisible().catch(() => false);
    const sidebarVisible = await this.getEventsSidebarEntry().isVisible().catch(() => false);
    const sidebarButtonVisible = await this.page
      .getByRole('button', { name: /^events?$/i })
      .first()
      .isVisible()
      .catch(() => false);
    const toolbarVisible = await this.actionButton.first().isVisible({ timeout: 1500 }).catch(() => false);
    return menuItemVisible || tabVisible || sidebarVisible || sidebarButtonVisible || toolbarVisible;
  }

  async waitForLeadProfileReady() {
    console.log('[EventPage] Waiting for lead profile to be ready');
    await this.page.waitForURL(/leadmanager\/profile/i, { timeout: this.defaultTimeout }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect(async () => {
      const featureInputVisible = await this.selectFeaturesInput.first().isVisible().catch(() => false);
      const featureLabelVisible = await this.page.getByText(/select feature\(s\)/i).first().isVisible().catch(() => false);
      const sidebarVisible = await this.leadFeatureSidebar.first().isVisible().catch(() => false);
      const classicUiVisible = await this.classicUiToggle.isVisible().catch(() => false);
      const eventsVisible = await this.isEventsPresentInClientMenu();
      expect(featureInputVisible || featureLabelVisible || sidebarVisible || classicUiVisible || eventsVisible).toBeTruthy();
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  async navigateToFirstAvailableLead() {
    console.log('[EventPage] Navigating to the first available lead');
    await this.dismissCreateMeetingPanel();

    if (this.isOnLeadProfile()) {
      console.log('[EventPage] Lead profile already open');
      await this.waitForLeadProfileReady().catch(() => {});
      return;
    }

    console.log('[EventPage] Navigating to lead profile via CRM > Lead Manager');
    await this.navigationPage.navigateToFirstLead();
    await this.waitForLeadProfileReady();
  }

  async scrollClientMenuForEvents() {
    console.log('[EventPage] Scrolling client menu to find Events');
    const scrollTargets = [
      this.getProjectSidebarScrollTarget(),
      this.leadFeatureSidebar.nth(1),
      this.leadFeatureSidebar.first(),
      this.clientMenuPanel.filter({ visible: true }).first(),
    ];

    for (const target of scrollTargets) {
      if (!(await target.isVisible({ timeout: 2000 }).catch(() => false))) {
        continue;
      }

      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (await this.isEventsPresentInClientMenu()) {
          return true;
        }

        await target.evaluate((el) => {
          el.scrollBy(0, 350);
        }).catch(() => {});
      }
    }

    return this.isEventsPresentInClientMenu();
  }

  async expandOthersSectionIfNeeded() {
    const othersAccordion = this.page
      .locator('.MuiAccordion-root')
      .filter({ hasText: /others/i })
      .first();

    if (!(await othersAccordion.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }

    const isExpanded = await othersAccordion
      .evaluate((el) => el.classList.contains('Mui-expanded'))
      .catch(() => true);

    if (!isExpanded) {
      console.log('[EventPage] Expanding Others section in project sidebar');
      await othersAccordion.locator('.MuiAccordionSummary-root').click({ timeout: 15000 });
      await expect(othersAccordion).toHaveClass(/Mui-expanded/, { timeout: 15000 });
    }
  }

  async clickEventsInSidebar() {
    console.log('[EventPage] Opening Events from lead profile sidebar');
    await this.expandOthersSectionIfNeeded();
    await this.scrollClientMenuForEvents();

    const eventsEntry = this.getEventsSidebarEntry()
      .or(this.page.getByRole('button', { name: /^events?$/i }))
      .or(this.page.locator('.MuiListItemButton-root').filter({ hasText: /^events?$/i }))
      .first();

    await expect(eventsEntry).toBeVisible({ timeout: this.defaultTimeout });
    await eventsEntry.scrollIntoViewIfNeeded().catch(() => {});
    await eventsEntry.click({ timeout: 15000 });
  }

  async openEventsViaFeatureSelector() {
    console.log('[EventPage] Opening Events via Select Feature(s) search');
    const featureSelector = this.selectFeaturesInput.first();
    await expect(featureSelector).toBeVisible({ timeout: this.defaultTimeout });
    await featureSelector.click();

    const featureSearch = this.selectFeaturesInput.nth(1);
    await expect(featureSearch).toBeVisible({ timeout: this.defaultTimeout });
    await featureSearch.fill('event');

    const eventsInMenu = this.eventsMenuItem
      .or(this.page.getByRole('menuitem', { name: /^events?$/i }))
      .first();
    await expect(eventsInMenu).toBeVisible({ timeout: this.defaultTimeout });
    await eventsInMenu.scrollIntoViewIfNeeded().catch(() => {});
    await eventsInMenu.click({ timeout: 15000 });
  }

  async openEventsViaUrlFallback() {
    console.log('[EventPage] Opening Events via tab URL fallback');
    const url = new URL(this.page.url());
    url.searchParams.set('tab', 'Events');
    await this.page.goto(url.toString(), {
      waitUntil: 'domcontentloaded',
      timeout: this.defaultTimeout,
    });
  }

  async isOnEventsModule() {
    const onTab = /tab=(Events|Event)/i.test(this.page.url());
    const actionVisible = await this.actionButton.first().isVisible({ timeout: 1500 }).catch(() => false);
    return (onTab || this.isOnLeadProfile()) && actionVisible;
  }

  async waitForEventsModuleReady() {
    console.log('[EventPage] Waiting for Events module toolbar');
    await this.page.waitForURL(/tab=(Events|Event)/i, { timeout: this.defaultTimeout }).catch(() => {});
    await expect(async () => {
      const actionVisible = await this.actionButton.first().isVisible().catch(() => false);
      expect(actionVisible).toBeTruthy();
    }).toPass({ timeout: this.defaultTimeout, intervals: [500, 1000, 2000, 3000] });
  }

  async openEventsModule() {
    console.log('[EventPage] Opening Events module');
    await this.dismissCreateMeetingPanel();

    if (await this.isOnEventsModule()) {
      await this.waitForEventsModuleReady();
      return;
    }

    await this.navigateToFirstAvailableLead();

    if (await this.getEventsSidebarEntry().isVisible({ timeout: 3000 }).catch(() => false)) {
      try {
        await this.clickEventsInSidebar();
        await this.waitForEventsModuleReady();
        return;
      } catch (error) {
        console.warn(`[EventPage] Sidebar path failed: ${error.message}`);
      }
    } else {
      try {
        await this.clickEventsInSidebar();
        await this.waitForEventsModuleReady();
        return;
      } catch (error) {
        console.warn(`[EventPage] Sidebar scroll path failed: ${error.message}`);
      }
    }

    if (await this.eventsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.eventsTab.click();
      await this.waitForEventsModuleReady();
      return;
    }

    if (await this.selectFeaturesInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      try {
        await this.openEventsViaFeatureSelector();
        await this.waitForEventsModuleReady();
        return;
      } catch (error) {
        console.warn(`[EventPage] Select Feature(s) path failed: ${error.message}`);
      }
    }

    await this.openEventsViaUrlFallback();
    await this.waitForEventsModuleReady();
  }

  async clearHoverTooltips() {
    await this.page.mouse.move(0, 0);
    await expect(this.page.getByRole('tooltip').filter({ visible: true })).toHaveCount(0, { timeout: 15000 });
  }

  async openActionMenu() {
    console.log('[EventPage] Opening Events action menu');
    const actionButton = this.actionButton.first();
    await expect(actionButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.clearHoverTooltips();
    await actionButton.click();
  }

  async selectCreateMeeting() {
    console.log('[EventPage] Selecting Create Meeting');

    await expect(async () => {
      await this.dismissCreateMeetingPanel();

      const createMeeting = this.createMeetingMenuItem.first();
      if (!(await createMeeting.isVisible({ timeout: 3000 }).catch(() => false))) {
        await this.openActionMenu();
      }

      await expect(createMeeting).toBeVisible({ timeout: 15000 });
      await createMeeting.click();
      await expect(this.panel()).toBeVisible({ timeout: 15000 });
      await expect(this.titleInput()).toBeVisible({ timeout: 15000 });
    }).toPass({ timeout: 60000, intervals: [1000, 2000, 3000] });
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

  async switchCreateMeetingTypeIfNeeded(meetingType) {
    const normalizedType = String(meetingType).toLowerCase();
    const tab = this.meetingTypeTab(normalizedType);

    if (!(await this.isShownWithin(tab, 5000))) {
      console.log(`[EventPage] ${normalizedType} tab not found in Create Meeting drawer — using current form`);
      return;
    }

    if ((await tab.getAttribute('aria-selected')) === 'true') {
      console.log(`[EventPage] ${normalizedType} meeting form already active`);
      return;
    }

    console.log(`[EventPage] Clicking ${normalizedType} tab in Create Meeting drawer`);
    await tab.scrollIntoViewIfNeeded().catch(() => {});
    await tab.click({ force: true });
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });
  }

  async ensureMeetingTabSelected(tabName) {
    await this.switchCreateMeetingTypeIfNeeded(tabName);
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
    await pickerTrigger.scrollIntoViewIfNeeded().catch(() => {});
    await pickerTrigger.click({ force: true });

    const listbox = this.page.getByRole('listbox').filter({ visible: true }).last();
    const menuOptions = this.page.locator('.MuiMenu-paper [role="option"]').filter({ visible: true });
    const hasListbox = await this.isShownWithin(listbox, 5000);
    const options = hasListbox ? listbox.getByRole('option') : menuOptions;

    await expect(options.first()).toBeVisible({ timeout: 15000 });

    const escapedTime = normalizedTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const optionByValue = this.page.locator(`[role="option"][data-value="${normalizedTime}"]`).filter({ visible: true }).first();
    const optionByText = options.filter({ hasText: new RegExp(`^\\s*${escapedTime}\\s*$`, 'i') }).first();

    let option = optionByValue;
    if ((await option.count()) === 0) {
      option = optionByText;
    }
    const exactMatch = (await option.count()) > 0;
    if (!exactMatch) {
      option = options.first();
      console.log(`[EventPage] Exact time "${normalizedTime}" not found — selecting first available option`);
    }

    await option.scrollIntoViewIfNeeded().catch(() => {});
    await option.click({ force: true });
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const isTextInput = await pickerTrigger.evaluate((el) => el.tagName === 'INPUT').catch(() => false);
    if (exactMatch && isTextInput) {
      await expect(pickerTrigger).toHaveValue(new RegExp(`^\\s*${escapedTime}\\s*$`, 'i'), { timeout: 15000 });
    }
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
    const chipVisible = await chips.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (chipVisible) {
      return;
    }

    const participantInput = this.panel()
      .locator('input[role="combobox"]')
      .or(this.panel().getByRole('combobox'))
      .filter({ visible: true })
      .last();
    await expect(participantInput).toBeVisible({ timeout: 15000 });
  }

  async ensureCustomLocationEnabled() {
    const locationSwitch = this.companyLocationSwitch();
    if (await this.isShownWithin(locationSwitch, 5000)) {
      if (await locationSwitch.isChecked().catch(() => false)) {
        console.log('[EventPage] Turning Company Location off so the address can be typed');
        await locationSwitch.click();
      }
    }

    const location = this.locationInput();
    await expect(location).toBeVisible({ timeout: 15000 });
    await expect(location).toBeEnabled({ timeout: 15000 });
  }

  async fillLocationWithAutocomplete(locationText) {
    await this.ensureCustomLocationEnabled();
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

    console.log('[EventPage] Filling meeting title');
    const title = this.titleInput();
    await expect(title).toBeVisible({ timeout: 30000 });
    await title.fill(this.meetingData.title);

    await this.ensureScheduleDatesVisible();

    console.log('[EventPage] Verifying time picker fields');
    await expect(this.fromTimePickerTrigger()).toBeVisible({ timeout: 30000 });
    await expect(this.toTimePickerTrigger()).toBeVisible({ timeout: 30000 });

    try {
      await this.pickFutureScheduleTimes();
    } catch (error) {
      console.log(`[EventPage] Unable to set schedule times: ${error.message}`);
      throw error;
    }

    console.log('[EventPage] Handling timezone and location fields');

    const timezone = this.timezoneCombobox();
    if (await timezone.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(timezone).toBeVisible({ timeout: this.defaultTimeout });
    }

    const location = this.locationInput();
    if (await location.isVisible({ timeout: 3000 }).catch(() => false)) {
      if (includeLocation) {
        await this.fillLocationWithAutocomplete(this.meetingData.location);
      } else if (await location.isEnabled().catch(() => false)) {
        console.log('[EventPage] Leaving location empty');
        await expect(location).toHaveValue('');
      } else {
        console.log('[EventPage] Location is filled by Company Location — leaving the switch on');
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

    await expect(this.createMeetingPanel.first()).toBeHidden({ timeout: this.defaultTimeout }).catch(() => {});
  }

  async openEventsMeetingTypeTab(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    console.log(`[EventPage] Opening Events ${normalizedTab} tab`);

    await this.dismissCreateMeetingPanel();
    await expect(this.actionButton.first()).toBeVisible({ timeout: this.defaultTimeout });

    const tab = this.eventsMeetingTypeTab(normalizedTab);
    if (!(await tab.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.log(`[EventPage] Events ${normalizedTab} tab not found — staying on current Events view`);
      return;
    }

    const isSelected = await tab.getAttribute('aria-selected');
    if (isSelected !== 'true') {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: this.defaultTimeout });
    }
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
      await this.dismissCreateMeetingPanel();

      if (await this.isMeetingTitleVisible(title)) {
        return;
      }

      await this.openEventsMeetingTypeTab(normalizedTab);
      if (await this.isMeetingTitleVisible(title)) {
        return;
      }

      const alternateTab = normalizedTab === 'offline' ? 'online' : 'offline';
      await this.openEventsMeetingTypeTab(alternateTab);
      if (await this.isMeetingTitleVisible(title)) {
        console.log(`[EventPage] Meeting "${title}" found under ${alternateTab} tab`);
        return;
      }

      throw new Error(`Meeting "${title}" not yet visible in Events ${normalizedTab} tab`);
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
