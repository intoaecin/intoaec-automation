const { expect } = require('@playwright/test');
const EventPage = require('./EventPage');

class LeadEventsPage extends EventPage {
  connectGoogleMeetButton() {
    return this.panel().getByRole('button', { name: /^connect google meet$/i });
  }

  connectCalendarHeading() {
    return this.panel().getByText(/connect your calendar/i);
  }

  connectCalendarDescription() {
    return this.panel().getByText(/schedule appointments online/i);
  }

  async openCreateMeetingFromEvents() {
    console.log('[LeadEventsPage] Opening Create Meeting from Events');
    await this.navigateToFirstAvailableLead();
    await this.openEventsModule();
    await this.openActionMenu();
    await this.selectCreateMeeting();
    await expect(this.createMeetingPanel.first()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async clickOnlineMeetingTab() {
    console.log('[LeadEventsPage] Clicking Online meeting tab');
    const onlineTab = this.meetingTypeTab('online');
    if (await onlineTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await onlineTab.click({ force: true });
      await this.page.waitForTimeout(500);
      return;
    }

    await this.clickMeetingTab('online');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async clickMeetingTab(tabName) {
    await this.ensureMeetingTabSelected(String(tabName).toLowerCase());
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  async isConnectGoogleMeetScreenVisible() {
    const connectButtonVisible = await this.connectGoogleMeetButton()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const headingVisible = await this.connectCalendarHeading()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    return connectButtonVisible || headingVisible;
  }

  async isOnlineMeetingFormVisible() {
    const titleVisible = await this.titleInput().isVisible({ timeout: 3000 }).catch(() => false);
    const fromTimeVisible = await this.fromTimePickerTrigger()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const connectVisible = await this.isConnectGoogleMeetScreenVisible();
    return (titleVisible || fromTimeVisible) && !connectVisible;
  }

  async isGoogleCalendarConnected() {
    return this.isOnlineMeetingFormVisible();
  }

  async expectGoogleCalendarConnected() {
    console.log('[LeadEventsPage] Verifying Google Calendar is connected');
    await expect(async () => {
      expect(await this.isGoogleCalendarConnected()).toBe(true);
    }).toPass({ timeout: this.defaultTimeout, intervals: [1000, 2000, 3000] });
    await this.expectConnectGoogleMeetScreenNotDisplayed();
  }

  async expectGoogleCalendarNotConnected() {
    console.log('[LeadEventsPage] Verifying Google Calendar is not connected');
    expect(await this.isGoogleCalendarConnected()).toBe(false);
    await this.expectConnectGoogleMeetScreenDisplayed();
  }

  async expectConnectGoogleMeetScreenDisplayed() {
    console.log('[LeadEventsPage] Verifying Connect Google Meet screen is displayed');
    await expect(this.connectGoogleMeetButton()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.connectCalendarHeading()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.connectCalendarDescription()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectConnectGoogleMeetScreenNotDisplayed() {
    console.log('[LeadEventsPage] Verifying Connect Google Meet screen is not displayed');
    await expect(this.connectGoogleMeetButton()).toBeHidden({ timeout: this.defaultTimeout });
    await expect(this.connectCalendarHeading()).toBeHidden({ timeout: this.defaultTimeout });
  }

  async expectOnlineMeetingFormDisplayed() {
    console.log('[LeadEventsPage] Verifying Online meeting form is displayed');
    await this.expectMeetingTabSelected('online');
    await expect(this.titleInput()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.fromTimePickerTrigger()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.toTimePickerTrigger()).toBeVisible({ timeout: this.defaultTimeout });
    await this.expectConnectGoogleMeetScreenNotDisplayed();
  }

  async expectMeetingTabSelected(tabName) {
    const normalizedTab = String(tabName).toLowerCase();
    const tab = normalizedTab === 'offline' ? this.offlineTab() : this.onlineTab();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: this.defaultTimeout });
  }

  async reopenCreateMeetingOnlineTab() {
    console.log('[LeadEventsPage] Reopening Create Meeting Online tab after integration');
    await this.openCreateMeetingFromEvents();
    await this.clickOnlineMeetingTab();
  }

  async expectCanProceedToCreateOnlineMeeting() {
    await this.expectOnlineMeetingFormDisplayed();
    await expect(this.submitCreateMeetingButton()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.submitCreateMeetingButton()).toBeEnabled({ timeout: this.defaultTimeout });
  }
}

module.exports = LeadEventsPage;
