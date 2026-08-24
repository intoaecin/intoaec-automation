const { expect } = require('@playwright/test');
const EventPage = require('./EventPage');

class MeetingUIPage extends EventPage {
  constructor(page) {
    super(page);

    this.createPopupTitle = this.panel().getByText(/^create meeting$/i).first();
    this.meetingTypeTablist = this.panel().getByRole('tablist').first();
    this.createButton = this.panel().getByRole('button', { name: /^create meeting$/i });
  }

  closeIconButton() {
    return this.panel()
      .locator('button:has(svg.lucide-x)')
      .or(this.panel().locator('button:has(svg[data-testid="CloseIcon"])'))
      .or(this.panel().getByRole('button', { name: /^close$|×/i }))
      .first();
  }

  async expectCreateMeetingPopupDisplayed() {
    console.log('[MeetingUIPage] Verifying Create Meeting popup is displayed');
    await expect(this.createMeetingPanel.first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.panel()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectPopupTitleCorrect() {
    console.log('[MeetingUIPage] Verifying Create Meeting popup title');
    await expect(this.createPopupTitle).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.createPopupTitle).toHaveText(/create meeting/i);
  }

  async expectOnlineAndOfflineTabsVisible() {
    console.log('[MeetingUIPage] Verifying Online and Offline tabs are visible');
    await expect(this.meetingTypeTablist).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.onlineTab()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.offlineTab()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectCloseIconVisibleAndClickable() {
    console.log('[MeetingUIPage] Verifying close icon is visible and clickable');
    const closeIcon = this.closeIconButton();
    await expect(closeIcon).toBeVisible({ timeout: this.defaultTimeout });
    await expect(closeIcon).toBeEnabled({ timeout: this.defaultTimeout });
  }

  async expectMandatoryFieldsDisplayed() {
    console.log('[MeetingUIPage] Verifying mandatory fields are displayed');
    await expect(this.requiredFieldLabels.first()).toBeVisible({ timeout: this.defaultTimeout });

    const requiredFieldCount = await this.requiredFieldLabels.count();
    expect(requiredFieldCount).toBeGreaterThan(0);

    for (let index = 0; index < requiredFieldCount; index += 1) {
      await expect(this.requiredFieldLabels.nth(index)).toBeVisible({ timeout: this.defaultTimeout });
    }

    await expect(this.titleInput()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectCreateMeetingButtonDisplayed() {
    console.log('[MeetingUIPage] Verifying Create Meeting button is displayed');
    await expect(this.createButton).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.createButton).toBeEnabled({ timeout: this.defaultTimeout });
  }

  isWithinPanelBounds(controlBox, panelBox, tolerance = 8) {
    return (
      controlBox.x >= panelBox.x - tolerance &&
      controlBox.y >= panelBox.y - tolerance &&
      controlBox.x + controlBox.width <= panelBox.x + panelBox.width + tolerance &&
      controlBox.y + controlBox.height <= panelBox.y + panelBox.height + tolerance
    );
  }

  async expectControlsProperlyAligned() {
    console.log('[MeetingUIPage] Verifying Create Meeting popup controls are properly aligned');
    const panel = this.panel();
    await expect(panel).toBeVisible({ timeout: this.defaultTimeout });

    const panelBox = await panel.boundingBox();
    if (!panelBox) {
      throw new Error('[MeetingUIPage] Create Meeting popup bounding box is not available');
    }

    const headerControls = [
      { name: 'title', locator: this.createPopupTitle },
      { name: 'online tab', locator: this.onlineTab() },
      { name: 'offline tab', locator: this.offlineTab() },
      { name: 'close icon', locator: this.closeIconButton() },
    ];

    for (const control of headerControls) {
      await expect(control.locator).toBeVisible({ timeout: this.defaultTimeout });
      const controlBox = await control.locator.boundingBox();
      expect(controlBox, `[MeetingUIPage] ${control.name} bounding box is missing`).toBeTruthy();

      if (control.name === 'close icon') {
        expect(controlBox.y).toBeGreaterThanOrEqual(panelBox.y - 8);
        expect(controlBox.x + controlBox.width).toBeLessThanOrEqual(panelBox.x + panelBox.width + 8);
        continue;
      }

      expect(
        this.isWithinPanelBounds(controlBox, panelBox, 16),
        `[MeetingUIPage] ${control.name} is outside popup bounds`
      ).toBeTruthy();
    }

    await expect(this.titleInput()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.createButton).toBeVisible({ timeout: this.defaultTimeout });
    await this.createButton.scrollIntoViewIfNeeded().catch(() => {});

    const onlineBox = await this.onlineTab().boundingBox();
    const offlineBox = await this.offlineTab().boundingBox();
    expect(onlineBox && offlineBox).toBeTruthy();
    expect(onlineBox.x).toBeLessThan(offlineBox.x);
    expect(Math.abs(onlineBox.y - offlineBox.y)).toBeLessThanOrEqual(20);
  }

  async expectCreateMeetingPopupUI() {
    await this.expectCreateMeetingScreenWithoutErrors();
    await this.expectCreateMeetingPopupDisplayed();
    await this.expectPopupTitleCorrect();
    await this.expectOnlineAndOfflineTabsVisible();
    await this.expectCloseIconVisibleAndClickable();
    await this.expectMandatoryFieldsDisplayed();
    await this.expectCreateMeetingButtonDisplayed();
    await this.expectControlsProperlyAligned();
  }

  async openCreateMeetingPopup() {
    console.log('[MeetingUIPage] Opening Create Meeting popup');
    await this.navigateToFirstAvailableLead();
    await this.openEventsModule();
    await this.openActionMenu();
    await this.selectCreateMeeting();
    await this.expectCreateMeetingPopupDisplayed();
  }

  async clickMeetingTab(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    console.log(`[MeetingUIPage] Clicking ${normalizedTab} tab`);
    await this.ensureMeetingTabSelected(normalizedTab);
  }

  async expectMeetingTabSelected(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    const tab = normalizedTab === 'offline' ? this.offlineTab() : this.onlineTab();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: this.defaultTimeout });
  }

  async expectSharedMeetingFormFieldsVisible() {
    await expect(this.titleInput()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.scheduleStartDate()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.scheduleEndDate()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.fromTimePickerTrigger()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.toTimePickerTrigger()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.participantChips().first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.createButton).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectOnlineMeetingFormDisplayed() {
    console.log('[MeetingUIPage] Verifying Online meeting form is displayed');
    await this.expectMeetingTabSelected('online');
    await this.expectSharedMeetingFormFieldsVisible();
    await expect(this.timezoneCombobox()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.notificationTypeCombobox()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.locationInput()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.createMeetingErrors).toHaveCount(0);
  }

  async expectOfflineMeetingFormDisplayed() {
    console.log('[MeetingUIPage] Verifying Offline meeting form is displayed');
    await this.expectMeetingTabSelected('offline');
    await this.expectSharedMeetingFormFieldsVisible();
    await expect(this.locationInput()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.agendaInput()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.timezoneCombobox()).toBeHidden({ timeout: 5000 });
    await expect(this.notificationTypeCombobox()).toBeHidden({ timeout: 5000 });
    await expect(this.createMeetingErrors).toHaveCount(0);
  }

  async expectTabSwitchingWithoutUiIssues() {
    console.log('[MeetingUIPage] Verifying tab switching without UI issues');
    await this.expectCreateMeetingPopupDisplayed();
    await this.expectOnlineAndOfflineTabsVisible();
    await this.expectCloseIconVisibleAndClickable();
    await expect(this.createMeetingErrors).toHaveCount(0);

    const onlineBox = await this.onlineTab().boundingBox();
    const offlineBox = await this.offlineTab().boundingBox();
    expect(onlineBox && offlineBox).toBeTruthy();
    expect(onlineBox.x).toBeLessThan(offlineBox.x);
    expect(Math.abs(onlineBox.y - offlineBox.y)).toBeLessThanOrEqual(20);
  }

  async clickCloseIcon() {
    console.log('[MeetingUIPage] Clicking Create Meeting close icon');
    await this.expectCloseIconVisibleAndClickable();
    await this.closeIconButton().click();
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async expectCreateMeetingPopupClosed() {
    console.log('[MeetingUIPage] Verifying Create Meeting popup is closed');
    await expect(this.createMeetingPanel.first()).toBeHidden({ timeout: this.defaultTimeout });
  }

  async expectUserReturnedToEventsPage() {
    console.log('[MeetingUIPage] Verifying user returned to Events page');
    await this.expectCreateMeetingPopupClosed();
    await expect(this.actionButton.first()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.eventsMeetingTypeTablist()).toBeVisible({ timeout: this.defaultTimeout });
  }
}

module.exports = MeetingUIPage;
