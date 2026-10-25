const { expect } = require('@playwright/test');
const LeadEventsPage = require('./LeadEventsPage');
const GoogleIntegrationStorage = require('../../../../support/googleIntegrationStorage');

class GoogleIntegrationPage extends LeadEventsPage {
  configureGoogleAccountHeading() {
    return this.page.getByRole('heading', { name: /configure google account/i }).or(
      this.page.getByText(/^configure google account$/i)
    ).first();
  }

  googleIntegrationCard() {
    return this.page
      .locator('.MuiCardContent-root, .MuiCard-root')
      .filter({ has: this.page.getByText(/^Google$/i) })
      .filter({ hasText: /Google Calendar|Google Sheets|Google services/i })
      .first();
  }

  googleConnectStep() {
    return this.googleIntegrationCard()
      .locator('.MuiPaper-root')
      .filter({ hasText: /^Connect$/i })
      .first();
  }

  integrationStepsSection() {
    return this.page.getByText(/^steps$/i).first();
  }

  configureButton() {
    return this.page.getByRole('button', { name: /^configure$/i });
  }

  async clickConnectGoogleMeet() {
    console.log('[GoogleIntegrationPage] Clicking Connect calendar');
    const connectButton = this.connectCalendarButton();
    await expect(connectButton).toBeVisible({ timeout: this.defaultTimeout });
    await connectButton.click();
    await expect(connectButton).toBeHidden({ timeout: this.defaultTimeout });
  }

  async expectConfigureGoogleAccountPageOpen() {
    console.log('[GoogleIntegrationPage] Verifying Configure Google Account page is open');
    await expect(this.configureGoogleAccountHeading()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.page).toHaveURL(/configure.*google|google.*account|integration/i, {
      timeout: this.defaultTimeout,
    }).catch(async () => {
      await expect(this.configureGoogleAccountHeading()).toBeVisible({ timeout: this.defaultTimeout });
    });
  }

  async expectGoogleIntegrationCardDisplayed() {
    console.log('[GoogleIntegrationPage] Verifying Google integration card is displayed');
    await expect(this.googleIntegrationCard()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.googleIntegrationCard().getByText(/^Google$/i)).toBeVisible({
      timeout: this.defaultTimeout,
    });
    await expect(this.googleConnectStep()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async clickGoogleIntegrationCard() {
    console.log('[GoogleIntegrationPage] Clicking Google integration card');
    await this.expectGoogleIntegrationCardDisplayed();

    const connectStep = this.googleConnectStep();
    await expect(connectStep).toBeVisible({ timeout: this.defaultTimeout });
    await connectStep.click();
    await expect(this.configureButton()).toBeVisible({ timeout: this.defaultTimeout });
  }

  async ensureGoogleIntegrationCardSelected() {
    if (await this.configureButton().isVisible({ timeout: 2000 }).catch(() => false)) {
      return;
    }

    await this.clickGoogleIntegrationCard();
  }

  async expectConfigureButtonDisplayed() {
    console.log('[GoogleIntegrationPage] Verifying Configure button is displayed');
    await this.ensureGoogleIntegrationCardSelected();
    await expect(this.configureButton()).toBeVisible({ timeout: this.defaultTimeout });
    await expect(this.configureButton()).toBeEnabled({ timeout: this.defaultTimeout });
  }

  async clickConfigure() {
    console.log('[GoogleIntegrationPage] Clicking Configure');
    await this.ensureGoogleIntegrationCardSelected();
    await this.expectConfigureButtonDisplayed();
    await this.configureButton().click();
  }

  async waitForGoogleOAuthPopup() {
    return this.page.context().waitForEvent('page', { timeout: this.defaultTimeout });
  }

  async completeGoogleCalendarIntegrationManually() {
    console.log('[GoogleIntegrationPage] Waiting for manual Google Calendar integration');
    const popupPromise = this.waitForGoogleOAuthPopup().catch(() => null);
    await this.clickConfigure();

    await this.waitForEnterInTerminal(
      'Complete Google sign-in and grant Calendar permissions in the browser popup, then press ENTER here. Do not automate Google login pages.'
    );

    const popup = await popupPromise;
    if (popup && !popup.isClosed()) {
      await popup.waitForEvent('close', { timeout: 30000 }).catch(() => {
        popup.close().catch(() => {});
      });
    }
  }

  async navigateBackToLeadEventsCreateMeeting() {
    console.log('[GoogleIntegrationPage] Navigating back to Lead Events Create Meeting');
    if (await this.configureGoogleAccountHeading().isVisible().catch(() => false)) {
      await this.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await expect(this.configureGoogleAccountHeading()).toBeHidden({ timeout: this.defaultTimeout });
    }

    await this.reopenCreateMeetingOnlineTab();
  }

  async cancelGoogleAuthenticationPopup() {
    console.log('[GoogleIntegrationPage] Closing Google authentication popup without signing in');
    const popupPromise = this.waitForGoogleOAuthPopup().catch(() => null);

    const popup = await popupPromise;
    if (popup) {
      await popup.close().catch(() => {});
    } else {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }

  async expectRemainsOnConfigureGoogleAccountPage() {
    console.log('[GoogleIntegrationPage] Verifying user remains on Configure Google Account page');
    await expect(this.configureGoogleAccountHeading()).toBeVisible({ timeout: this.defaultTimeout });
    await this.expectConfigureButtonDisplayed();
  }

  async expectOnlineMeetingBlockedUntilIntegration() {
    console.log('[GoogleIntegrationPage] Verifying Online Meeting cannot be created without integration');
    await this.expectConnectGoogleMeetScreenDisplayed();
    await expect(this.titleInput()).toBeHidden({ timeout: this.defaultTimeout });
    await expect(this.submitCreateMeetingButton()).toBeHidden({ timeout: this.defaultTimeout });
  }

  async ensureGoogleCalendarIntegrationConfigured() {
    console.log('[GoogleIntegrationPage] Ensuring Google Calendar integration is configured');
    await this.openCreateMeetingFromEvents();
    await this.clickOnlineMeetingTab();

    if (await this.isGoogleCalendarConnected()) {
      await this.dismissCreateMeetingPanel();
      return;
    }

    const defaultPath = GoogleIntegrationStorage.getDefaultPath();
    throw new Error(
      [
        'No calendar (Google or Outlook) is connected for this session.',
        'Complete one-time setup:',
        '  npm run setup:google-integration',
        'Then run connected scenarios with:',
        `  GOOGLE_INTEGRATION_STORAGE_STATE=${defaultPath}`,
      ].join('\n')
    );
  }
}

module.exports = GoogleIntegrationPage;
