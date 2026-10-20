const { expect } = require('@playwright/test');
const EventPage = require('./EventPage');

class LeadEventsPage extends EventPage {
  connectCalendarButton() {
    return this.panel().getByRole('button', { name: /^connect calendar$/i });
  }

  connectCalendarHeading() {
    return this.panel().getByText(/connect your calendar/i);
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
    await this.clickMeetingTab('online');
  }

  async clickMeetingTab(tabName) {
    await this.ensureMeetingTabSelected(String(tabName).toLowerCase());
  }

  async isConnectCalendarScreenVisible() {
    const connectButtonVisible = await this.connectCalendarButton().isVisible().catch(() => false);
    const headingVisible = await this.connectCalendarHeading().isVisible().catch(() => false);
    return connectButtonVisible || headingVisible;
  }

  async isOnlineMeetingFormVisible() {
    const titleVisible = await this.titleInput().isVisible().catch(() => false);
    const fromTimeVisible = await this.fromTimePickerTrigger().isVisible().catch(() => false);
    const connectVisible = await this.isConnectCalendarScreenVisible();
    return (titleVisible || fromTimeVisible) && !connectVisible;
  }

  // Any connected calendar (Google or Outlook) unlocks the online meeting form.
  async isGoogleCalendarConnected() {
    await expect(this.titleInput().or(this.connectCalendarButton()).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
    return this.isOnlineMeetingFormVisible();
  }

  async expectGoogleCalendarConnected() {
    console.log('[LeadEventsPage] Verifying a calendar (Google or Outlook) is connected');
    expect(await this.isGoogleCalendarConnected()).toBe(true);
    await this.expectConnectGoogleMeetScreenNotDisplayed();
  }

  async expectGoogleCalendarNotConnected() {
    console.log('[LeadEventsPage] Verifying no calendar is connected');
    expect(await this.isGoogleCalendarConnected()).toBe(false);
    await this.expectConnectGoogleMeetScreenDisplayed();
  }

  async expectConnectGoogleMeetScreenDisplayed() {
    console.log('[LeadEventsPage] Verifying Connect your calendar screen is displayed');
    await expect(this.connectCalendarHeading()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.connectCalendarButton()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async expectConnectGoogleMeetScreenNotDisplayed() {
    console.log('[LeadEventsPage] Verifying Connect your calendar screen is not displayed');
    await expect(this.connectCalendarButton()).toBeHidden({ timeout: this.defaultTimeout });
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
