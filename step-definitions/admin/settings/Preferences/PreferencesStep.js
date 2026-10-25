const { Before, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const PreferencesPage = require('../../../../pages/admin/settings/Preferences/PreferencesPage');
const {
  CustomerPortalYopmailPage,
  yopmailLocalPart,
} = require('../../../../pages/customer/auth/CustomerPortalYopmailPage');

/** Per AGENTS.md: cucumber timeout aligned with page-object defaultTimeout. */
setDefaultTimeout(60000);

const PREFERENCES_TEST_CASE_LOG = {
  TC01: 'TC-01 — Update Domain Configuration with an available domain name',
  TC02: 'TC-02 — Book Online Meeting via Calendar Availability link and verify on Dashboard',
  TC03: 'TC-03 — Book In-Person Meeting via Calendar Availability link and verify on Dashboard',
  TC04: 'TC-04 — Submit Facebook Lead Capture form and verify lead in Lead Manager',
  TC05: 'TC-05 — Submit Instagram Lead Capture form and verify lead in Lead Manager',
  TC06: 'TC-06 — Submit Website Lead Capture form and verify lead in Lead Manager',
  TC07: 'TC-07 — Submit Twitter Lead Capture form and verify lead in Lead Manager',
  TC08: 'TC-08 — Submit LinkedIn Lead Capture form and verify lead in Lead Manager',
  TC09: 'TC-09 — Submit YouTube Lead Capture form and verify lead in Lead Manager',
  TC10: 'TC-10 — Submit TikTok Lead Capture form and verify lead in Lead Manager',
  TC11: 'TC-11 — Submit WhatsApp Lead Capture form and verify lead in Lead Manager',
  TC12: 'TC-12 — Configure weekly Calendar Availability slots and verify on public link',
  TC13: 'TC-13 — Add date-specific Calendar Availability slot and verify it is bookable',
  TC14: 'TC-14 — Create Project Information Form and verify it in Forms list',
  TC15: 'TC-15 — Create Instant Proposal form with a service and verify it in Forms list',
  TC16: 'TC-16 — Create Feedback Form, verify preview details and Forms list',
  TC17: 'TC-17 — Create Complaint Form, verify preview details and Forms list',
  TC18: 'TC-18 — Create Custom Form with all elements, verify builder, preview and Forms list',
  TC19: 'TC-19 — Add tax in Tax Configuration and verify it in the list',
  TC20: 'TC-20 — Edit and delete tax configuration',
  TC21: 'TC-21 — Add discount in Discount Configuration and verify it in the list',
  TC22: 'TC-22 — Add, edit and delete discount configuration',
  TC23: 'TC-23 — Add public holiday and custom off day in Working Days and save calendar',
  TC24: 'TC-24 — Create Terms and Conditions template and set it as the default in Preferences',
  TC25: 'TC-25 — Add organization location and verify it in the Organization Locations list',
  TC26: 'TC-26 — Edit organization location and verify the updated details in the list',
  TC27: 'TC-27 — Delete organization location and verify it is removed from the list',
};

Before({ tags: '@preferences-tc or @preferences' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && PREFERENCES_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${PREFERENCES_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getPreferencesPage(world) {
  if (!world.preferencesPage || world.preferencesPage.page !== world.page) {
    const previous = world.preferencesPage;
    world.preferencesPage = new PreferencesPage(world.page);
    if (previous?.lastMeeting) {
      world.preferencesPage.lastMeeting = { ...previous.lastMeeting };
    }
    if (previous?.lastCalendarAvailabilityUrl) {
      world.preferencesPage.lastCalendarAvailabilityUrl = previous.lastCalendarAvailabilityUrl;
    }
    if (previous?.lastConfiguredCalendarSlots?.length) {
      world.preferencesPage.lastConfiguredCalendarSlots = [...previous.lastConfiguredCalendarSlots];
    }
    if (previous?.lastDateSpecificSlot) {
      world.preferencesPage.lastDateSpecificSlot = { ...previous.lastDateSpecificSlot };
    }
    if (previous?.lastCreatedForm) {
      world.preferencesPage.lastCreatedForm = { ...previous.lastCreatedForm };
    }
    if (previous?.lastCreatedService) {
      world.preferencesPage.lastCreatedService = { ...previous.lastCreatedService };
    }
    if (previous?.lastCreatedDiscount?.name) {
      world.preferencesPage.lastCreatedDiscount = { ...previous.lastCreatedDiscount };
      world.preferencesPage.currentDiscount = { ...previous.currentDiscount };
      world.preferencesPage.previousDiscount = { ...previous.previousDiscount };
      world.preferencesPage.deletedDiscountName = previous.deletedDiscountName || '';
      world.preferencesPage.lastResultToastMessage = previous.lastResultToastMessage || '';
    }
    if (previous?.lastCreatedTax?.name || previous?.currentTax?.name) {
      world.preferencesPage.lastCreatedTax = { ...previous.lastCreatedTax };
      world.preferencesPage.currentTax = { ...previous.currentTax };
      world.preferencesPage.previousTax = previous.previousTax ? { ...previous.previousTax } : undefined;
      world.preferencesPage.deletedTaxName = previous.deletedTaxName || '';
      world.preferencesPage.lastResultToastMessage = previous.lastResultToastMessage || '';
    }
    if (previous?.lastCreatedLocation?.address || previous?.currentLocation?.address) {
      world.preferencesPage.lastCreatedLocation = { ...previous.lastCreatedLocation };
      world.preferencesPage.currentLocation = { ...previous.currentLocation };
      world.preferencesPage.previousLocation = { ...previous.previousLocation };
      world.preferencesPage.deletedLocationAddress = previous.deletedLocationAddress || '';
      world.preferencesPage.lastResultToastMessage = previous.lastResultToastMessage || '';
    }
    if (previous?.selectedTermsTemplateName) {
      world.preferencesPage.selectedTermsTemplateName = previous.selectedTermsTemplateName;
      world.preferencesPage.lastResultToastMessage = previous.lastResultToastMessage || '';
    }
    if (previous?.workingDaysEntries?.length) {
      world.preferencesPage.workingDaysEntries = previous.workingDaysEntries.map((e) => ({ ...e }));
      world.preferencesPage.lastResultToastMessage = previous.lastResultToastMessage || '';
    }
    if (previous?.lastFacebookLeadCaptureUrl) {
      world.preferencesPage.lastFacebookLeadCaptureUrl = previous.lastFacebookLeadCaptureUrl;
    }
    if (previous?.lastInstagramLeadCaptureUrl) {
      world.preferencesPage.lastInstagramLeadCaptureUrl = previous.lastInstagramLeadCaptureUrl;
    }
    if (previous?.lastWebsiteLeadCaptureUrl) {
      world.preferencesPage.lastWebsiteLeadCaptureUrl = previous.lastWebsiteLeadCaptureUrl;
    }
    if (previous?.lastTwitterLeadCaptureUrl) {
      world.preferencesPage.lastTwitterLeadCaptureUrl = previous.lastTwitterLeadCaptureUrl;
    }
    if (previous?.lastLinkedInLeadCaptureUrl) {
      world.preferencesPage.lastLinkedInLeadCaptureUrl = previous.lastLinkedInLeadCaptureUrl;
    }
    if (previous?.lastYouTubeLeadCaptureUrl) {
      world.preferencesPage.lastYouTubeLeadCaptureUrl = previous.lastYouTubeLeadCaptureUrl;
    }
    if (previous?.lastTikTokLeadCaptureUrl) {
      world.preferencesPage.lastTikTokLeadCaptureUrl = previous.lastTikTokLeadCaptureUrl;
    }
    if (previous?.lastWhatsAppLeadCaptureUrl) {
      world.preferencesPage.lastWhatsAppLeadCaptureUrl = previous.lastWhatsAppLeadCaptureUrl;
    }
    if (previous?.lastLeadCapture) {
      world.preferencesPage.lastLeadCapture = { ...previous.lastLeadCapture };
    }
    if (world.calendarMeetingData) {
      world.preferencesPage.lastMeeting = { ...world.calendarMeetingData };
    }
    if (world.calendarAvailabilityUrl) {
      world.preferencesPage.lastCalendarAvailabilityUrl = world.calendarAvailabilityUrl;
    }
    if (world.configuredCalendarSlots?.length) {
      world.preferencesPage.lastConfiguredCalendarSlots = [...world.configuredCalendarSlots];
    }
    if (world.dateSpecificSlot) {
      world.preferencesPage.lastDateSpecificSlot = { ...world.dateSpecificSlot };
    }
    if (world.createdPreferencesForm) {
      world.preferencesPage.lastCreatedForm = { ...world.createdPreferencesForm };
    }
    if (world.facebookLeadCaptureUrl) {
      world.preferencesPage.lastFacebookLeadCaptureUrl = world.facebookLeadCaptureUrl;
    }
    if (world.instagramLeadCaptureUrl) {
      world.preferencesPage.lastInstagramLeadCaptureUrl = world.instagramLeadCaptureUrl;
    }
    if (world.websiteLeadCaptureUrl) {
      world.preferencesPage.lastWebsiteLeadCaptureUrl = world.websiteLeadCaptureUrl;
    }
    if (world.twitterLeadCaptureUrl) {
      world.preferencesPage.lastTwitterLeadCaptureUrl = world.twitterLeadCaptureUrl;
    }
    if (world.linkedinLeadCaptureUrl) {
      world.preferencesPage.lastLinkedInLeadCaptureUrl = world.linkedinLeadCaptureUrl;
    }
    if (world.youtubeLeadCaptureUrl) {
      world.preferencesPage.lastYouTubeLeadCaptureUrl = world.youtubeLeadCaptureUrl;
    }
    if (world.tiktokLeadCaptureUrl) {
      world.preferencesPage.lastTikTokLeadCaptureUrl = world.tiktokLeadCaptureUrl;
    }
    if (world.whatsappLeadCaptureUrl) {
      world.preferencesPage.lastWhatsAppLeadCaptureUrl = world.whatsappLeadCaptureUrl;
    }
    if (world.leadCaptureData) {
      world.preferencesPage.lastLeadCapture = { ...world.leadCaptureData };
    }
  }
  return world.preferencesPage;
}

When('I navigate to Settings', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToSettings();
});

When('I select Preferences', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectPreferences();
});

When('I select Domain Configuration', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectDomainConfiguration();
});

When('I click Edit on Domain Configuration', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickEditDomainConfiguration();
});

When('I enter the domain name {string}', { timeout: 120000 }, async function (domainName) {
  const preferences = getPreferencesPage(this);
  await preferences.enterDomainName(domainName);
});

Then('I should see whether the domain name is available', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectDomainAvailabilityVisible();
});

When(
  'I enter another available domain name if the current one is unavailable',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.enterAnotherAvailableDomainIfUnavailable();
  }
);

When('I save Domain Configuration', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveDomainConfiguration();
});

Then('I should see the Domain Configuration success toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectDomainConfigurationSuccessToast();
});

Then(
  'the Domain Configuration section should display the updated domain name',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectUpdatedDomainDisplayed();
  }
);

When('I select Calendar Availability', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectCalendarAvailability();
});

When(
  'I add a random upcoming time slot for {string}',
  { timeout: 180000 },
  async function (dayName) {
    const preferences = getPreferencesPage(this);
    await preferences.addRandomUpcomingTimeSlotForDay(dayName);
    this.configuredCalendarSlots = [...(preferences.lastConfiguredCalendarSlots || [])];
  }
);

When('I select Date Specific Slots', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectDateSpecificSlots();
});

When('I add a random upcoming date-specific time slot', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.addRandomUpcomingDateSpecificTimeSlot();
  this.dateSpecificSlot = preferences.lastDateSpecificSlot
    ? { ...preferences.lastDateSpecificSlot }
    : null;
});

Then('the date-specific time slot should be displayed correctly', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectDateSpecificSlotDisplayed(this);
});

Then(
  'the date-specific time slot should be available for booking',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectDateSpecificSlotAvailableForBooking(this);
  }
);

When('I copy the Calendar Availability link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyCalendarAvailabilityLink();
  this.calendarAvailabilityUrl = preferences.lastCalendarAvailabilityUrl;
});

When(
  'I open the copied Calendar Availability link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedCalendarAvailabilityLink(this);
  }
);

When('I select Online Meeting on the Calendar Availability page', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectOnlineMeetingOnBookingPage(this);
});

When('I select In-Person Meeting on the Calendar Availability page', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectInPersonMeetingOnBookingPage(this);
});

When(
  'I select an available time slot on the Calendar Availability page',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.selectAvailableTimeSlotOnBookingPage(this);
  }
);

When('I enter the required Calendar Availability meeting details', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterRequiredMeetingDetailsOnBookingPage(this);
  this.calendarMeetingData = { ...preferences.lastMeeting };
});

When(
  'I enter the Calendar Availability meeting location {string}',
  { timeout: 120000 },
  async function (location) {
    const preferences = getPreferencesPage(this);
    await preferences.enterCalendarAvailabilityMeetingLocation(this, location);
    this.calendarMeetingData = { ...preferences.lastMeeting };
  }
);

When('I click Confirm Booking on the Calendar Availability page', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickConfirmBookingOnBookingPage(this);
});

Then(
  'the Calendar Availability meeting booking should be confirmed successfully',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectCalendarBookingConfirmed(this);
  }
);

Then(
  'the Calendar Availability in-person meeting booking should be confirmed successfully',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectInPersonCalendarBookingConfirmed(this);
  }
);

When('I switch back to the Admin Portal from Calendar Availability', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.switchBackToAdminPortal(this);
});

Then(
  'the configured Calendar Availability time slots should be displayed for their respective days',
  { timeout: 240000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectConfiguredCalendarSlotsOnPublicLink(this);
  }
);

Then(
  'the public Calendar Availability slots should match the configured time slots',
  { timeout: 240000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectPublicCalendarSlotsMatchConfigured(this);
  }
);

When('I select the Meeting Event section on the Dashboard', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectMeetingEventSectionOnDashboard();
});

Then(
  'the booked Calendar Availability meeting should be reflected on the Dashboard',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    const meetingData = this.calendarMeetingData || preferences.lastMeeting || {};
    preferences.lastMeeting = { ...meetingData };
    await preferences.expectBookedMeetingOnDashboard(meetingData);
  }
);

Then(
  'the booked Calendar Availability in-person meeting should be reflected on the Dashboard',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    const meetingData = {
      ...(this.calendarMeetingData || preferences.lastMeeting || {}),
      mode: 'In Person',
    };
    preferences.lastMeeting = { ...meetingData };
    if (this.calendarMeetingCreate) {
      preferences.lastMeetingCreate = this.calendarMeetingCreate;
    }
    this.calendarMeetingData = { ...meetingData };
    await preferences.expectBookedInPersonMeetingOnDashboard(meetingData);
  }
);

// ---------------------------------------------------------------------------
// TC-04 — Facebook Lead Capture
// ---------------------------------------------------------------------------

When('I select Lead Capture', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectLeadCapture();
});

When('I select Forms', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectForms();
});

When('I click Create Form', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickCreateForm();
});

When('I choose the Lead Capture form type', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.chooseLeadCaptureFormType();
});

When('I enter the Form Name {string}', { timeout: 120000 }, async function (name) {
  const preferences = getPreferencesPage(this);
  await preferences.enterFormName(name);
  this.createdPreferencesForm = { ...(preferences.lastCreatedForm || {}) };
});

When('I enter the Form Title {string}', { timeout: 120000 }, async function (title) {
  const preferences = getPreferencesPage(this);
  await preferences.enterFormTitle(title);
  this.createdPreferencesForm = { ...(preferences.lastCreatedForm || {}) };
});

When('I enter a sample Form Description', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterSampleFormDescription();
  this.createdPreferencesForm = { ...(preferences.lastCreatedForm || {}) };
});

When('I navigate to the form Lead Capture section', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToFormLeadCaptureSection();
});

When('I fill the Lead Capture field details with sample data', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.fillLeadCaptureFieldDetailsWithSampleData();
});

When('I navigate to the form Thank You section', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToFormThankYouSection();
});

When('I enter a sample Thank You message', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterSampleThankYouMessage();
  this.createdPreferencesForm = { ...(preferences.lastCreatedForm || {}) };
});

When('I save the Preferences form', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.savePreferencesForm();
  this.createdPreferencesForm = { ...(preferences.lastCreatedForm || {}) };
});

Then('I should see the form created successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectFormCreatedSuccessfullyToast();
});

Then(
  'the Forms list should display the created form {string}',
  { timeout: 180000 },
  async function (expectedName) {
    const preferences = getPreferencesPage(this);
    await preferences.expectCreatedFormDisplayedInFormsList(expectedName);
  }
);

When('I select Instant Proposal', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectInstantProposalFormsFilter();
});

When('I choose the Instant Proposal form type', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.chooseInstantProposalFormType();
});

When('I navigate to the form Service Types section', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToFormServiceTypesSection();
});

When('I click Add Services', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickAddServices();
});

When('I select any available service emoji', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectRandomServiceEmoji();
});

When('I enter a sample service name', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterSampleServiceName();
});

When('I enter a sample service tagline', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterSampleServiceTagline();
});

When('I click Create Services', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickCreateServices();
});

When('I navigate to the form Preview section', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToFormPreviewSection();
});

When('I click form Preview', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickFormPreview();
});

Then('the Instant Proposal form should be displayed correctly in the preview', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectInstantProposalPreviewDisplayed();
});

When('I click Continue in the form preview', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickFormPreviewContinue();
});

Then('the form preview should display the form details correctly', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectFormPreviewLeadCaptureDetailsDisplayed();
});

When('I select Feedback Form', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectFormsTypeFilter('Feedback Form');
});

When('I choose the Feedback Form form type', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.chooseFormType('Feedback Form');
});

When('I navigate to the form Feedback section', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToFormFeedbackSection();
});

Then('the form preview should display the form title and description', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectFormPreviewWelcomeDisplayed();
});

When('I enter the feedback Full Name with sample data', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterFormPreviewFullName();
});

When('I enter the feedback Email Address with a valid email', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterFormPreviewEmailAddress('feedback');
});

When('I select a feedback Rating', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectFeedbackRating();
});

When('I enter the Feedback with sample data', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterFeedbackText();
});

Then('the Feedback Form details should be displayed correctly in the preview', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectFeedbackFormPreviewDetailsDisplayed();
});

When('I select Complaint Form', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectFormsTypeFilter('Complaint Form');
});

When('I choose the Complaint Form form type', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.chooseFormType('Complaint Form');
});

When('I navigate to the form Complaint section', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToFormComplaintSection();
});

When('I enter the complaint Full Name with sample data', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterFormPreviewFullName();
});

When('I enter the complaint Email Address with a valid email', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterFormPreviewEmailAddress('complaint');
});

When('I enter the Complaint with sample data', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterComplaintText();
});

Then('the Complaint Form details should be displayed correctly in the preview', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectComplaintFormPreviewDetailsDisplayed();
});

When('I select Custom Form', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectFormsTypeFilter('Custom Form');
});

When('I choose the Custom Form form type', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.chooseFormType('Custom Form');
});

When('I navigate to the form Custom Form section', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToFormCustomFormSection();
});

When(
  'I add and configure the following Custom Form elements:',
  { timeout: 300000 },
  async function (dataTable) {
    const preferences = getPreferencesPage(this);
    await preferences.addAndConfigureCustomFormElements(dataTable.hashes());
  }
);

Then('all added elements should be displayed correctly in the Custom Form', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectCustomFormElementsDisplayed();
});

When('I select Tax Configuration', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectTaxConfiguration();
});

When('I click Add Tax', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickAddTax();
});

When('I enter a sample Tax Name', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterSampleTaxName();
});

When('I enter a valid Tax Percentage', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterValidTaxPercentage();
});

When('I save the tax', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveTax();
});

Then('I should see the tax created successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectTaxCreatedToast();
});

Then('the created tax should be displayed in the Tax Configuration list', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectCreatedTaxInList();
});

When('I select Discount Configuration', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectDiscountConfiguration();
});

When('I click Add Discount', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickAddDiscount();
});

When('I enter a sample Discount Name', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterSampleDiscountName();
});

When('I enter a valid Discount Percentage', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterValidDiscountPercentage();
});

When('I save the discount', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveDiscount();
});

Then('I should see the discount created successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectDiscountCreatedToast();
});

Then(
  'the created discount should be displayed in the Discount Configuration list',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectCreatedDiscountInList();
  }
);

When('I locate the created tax configuration', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.locateCreatedTaxConfiguration();
});

When('I open the three-dot menu for the tax configuration', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.openTaxConfigurationMenu();
});

When('I select {string} from the tax configuration menu', { timeout: 120000 }, async function (option) {
  const preferences = getPreferencesPage(this);
  await preferences.selectTaxConfigurationMenuOption(option);
});

When('I update the Tax Name and Tax Percentage with valid values', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.updateTaxNameAndPercentage();
});

When('I save the updated tax', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveUpdatedTax();
});

Then('I should see the tax updated successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectTaxUpdatedToast();
});

Then('the updated tax details should be displayed in the Tax Configuration list', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectUpdatedTaxInList();
});

When('I confirm the tax deletion', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.confirmTaxDeletion();
});

Then('I should see the tax deleted successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectTaxDeletedToast();
});

Then('the tax configuration should no longer be displayed in the list', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectDeletedTaxNotInList();
});

When('I open the three-dot menu for the discount configuration', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.openDiscountConfigurationMenu();
});

When('I select {string} from the discount configuration menu', { timeout: 120000 }, async function (option) {
  const preferences = getPreferencesPage(this);
  await preferences.selectDiscountConfigurationMenuOption(option);
});

When('I update the Discount Name and Discount Percentage with valid values', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.updateDiscountNameAndPercentage();
});

When('I save the updated discount', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveUpdatedDiscount();
});

Then('I should see the discount updated successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectDiscountUpdatedToast();
});

Then(
  'the updated discount details should be displayed in the Discount Configuration list',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectUpdatedDiscountInList();
  }
);

When('I confirm the discount deletion', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.confirmDiscountDeletion();
});

Then('I should see the discount deleted successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectDiscountDeletedToast();
});

Then('the discount configuration should no longer be displayed in the list', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectDeletedDiscountNotInList();
});

When('I select Working Days', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectWorkingDays();
});

When('I navigate to the Public Holidays & Custom Off Days section', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToPublicHolidaysSection();
});

When('I add a sample public holiday', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.addSamplePublicHoliday();
});

When('I add a sample custom off day', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.addSampleCustomOffDay();
});

Then(
  'the added holidays and custom off days should be displayed in the Working Days calendar',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectWorkingDaysEntriesDisplayed();
  }
);

When('I click Save Calendar', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveWorkingDaysCalendar();
});

Then('the Working Days calendar should be saved successfully', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectWorkingDaysCalendarSaved();
});

Then('I should see the working calendar saved successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectWorkingCalendarSavedToast();
});

When('I select Terms and Conditions in Preferences', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectTermsAndConditionsPreference();
});

When('I select the created Terms and Conditions template', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectTermsTemplateInPreferences(this.lastCreatedTermsTemplate?.name);
});

When('I save the Terms and Conditions preference', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveTermsTemplatePreference();
});

Then(
  'the selected Terms and Conditions template should be saved successfully',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectTermsTemplatePreferenceSaved();
  }
);

Then('I should see the Terms and Conditions preference saved successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectTermsTemplatePreferenceSavedToast();
});

When('I select Organization Locations', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectOrganizationLocations();
});

When('I click Add Location', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickAddLocation();
});

When('I enter the required organization location details with valid sample data', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterSampleLocationDetails();
});

When('I save the organization location', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveOrganizationLocation();
});

Then('the organization location should be created successfully', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectOrganizationLocationCreated();
});

Then(
  'the created location should be displayed in the Organization Locations list',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectCreatedLocationInList();
  }
);

Then('I should see the organization location created successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectOrganizationLocationCreatedToast();
});

When('I locate the created organization location', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.locateCreatedOrganizationLocation();
});

When('I open the three-dot menu for the organization location', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.openOrganizationLocationMenu();
});

When('I select {string} from the organization location menu', { timeout: 120000 }, async function (option) {
  const preferences = getPreferencesPage(this);
  await preferences.selectOrganizationLocationMenuOption(option);
});

When('I update the organization location details with valid sample data', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.updateOrganizationLocationDetails();
});

When('I save the updated organization location', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.saveUpdatedOrganizationLocation();
});

Then('the organization location should be updated successfully', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectOrganizationLocationUpdated();
});

Then(
  'the updated location details should be displayed in the Organization Locations list',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectUpdatedLocationInList();
  }
);

Then('I should see the organization location updated successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectOrganizationLocationUpdatedToast();
});

When('I confirm the organization location deletion', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.confirmOrganizationLocationDeletion();
});

Then('the organization location should be deleted successfully', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectOrganizationLocationDeleted();
});

Then(
  'the deleted location should no longer be displayed in the Organization Locations list',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectDeletedLocationNotInList();
  }
);

Then('I should see the organization location deleted successfully toast', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectOrganizationLocationDeletedToast();
});

Then(
  'all configured Custom Form elements should be displayed correctly in the preview',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectCustomFormElementsDisplayedInPreview();
  }
);

When('I copy the Facebook Lead Capture link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyFacebookLeadCaptureLink();
  this.facebookLeadCaptureUrl = preferences.lastFacebookLeadCaptureUrl;
});

When('I copy the Instagram Lead Capture link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyInstagramLeadCaptureLink();
  this.instagramLeadCaptureUrl = preferences.lastInstagramLeadCaptureUrl;
});

When('I copy the Website Lead Capture link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyWebsiteLeadCaptureLink();
  this.websiteLeadCaptureUrl = preferences.lastWebsiteLeadCaptureUrl;
});

When('I copy the Twitter Lead Capture link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyTwitterLeadCaptureLink();
  this.twitterLeadCaptureUrl = preferences.lastTwitterLeadCaptureUrl;
});

When('I copy the LinkedIn Lead Capture link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyLinkedInLeadCaptureLink();
  this.linkedinLeadCaptureUrl = preferences.lastLinkedInLeadCaptureUrl;
});

When('I copy the YouTube Lead Capture link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyYouTubeLeadCaptureLink();
  this.youtubeLeadCaptureUrl = preferences.lastYouTubeLeadCaptureUrl;
});

When('I copy the TikTok Lead Capture link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyTikTokLeadCaptureLink();
  this.tiktokLeadCaptureUrl = preferences.lastTikTokLeadCaptureUrl;
});

When('I copy the WhatsApp Lead Capture link', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.copyWhatsAppLeadCaptureLink();
  this.whatsappLeadCaptureUrl = preferences.lastWhatsAppLeadCaptureUrl;
});

When(
  'I open the copied Facebook Lead Capture link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedFacebookLeadCaptureLink(this);
    // Keep world.page on the form tab while filling (same pattern as Customer Portal).
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
  }
);

When(
  'I open the copied Instagram Lead Capture link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedInstagramLeadCaptureLink(this);
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
  }
);

When(
  'I open the copied Website Lead Capture link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedWebsiteLeadCaptureLink(this);
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
  }
);

When(
  'I open the copied Twitter Lead Capture link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedTwitterLeadCaptureLink(this);
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
  }
);

When(
  'I open the copied LinkedIn Lead Capture link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedLinkedInLeadCaptureLink(this);
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
  }
);

When(
  'I open the copied YouTube Lead Capture link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedYouTubeLeadCaptureLink(this);
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
  }
);

When(
  'I open the copied TikTok Lead Capture link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedTikTokLeadCaptureLink(this);
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
  }
);

When(
  'I open the copied WhatsApp Lead Capture link in a new browser tab',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.openCopiedWhatsAppLeadCaptureLink(this);
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
  }
);

When(
  'I select an available project type on the Lead Capture form',
  { timeout: 120000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.selectAvailableProjectTypeOnLeadCaptureForm(this);
    this.leadCaptureData = { ...preferences.lastLeadCapture };
  }
);

When('I enter the Lead Capture name {string}', { timeout: 120000 }, async function (name) {
  const preferences = getPreferencesPage(this);
  await preferences.enterLeadCaptureName(this, name);
  this.leadCaptureData = { ...preferences.lastLeadCapture };
});

When('I enter a unique Lead Capture name', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterUniqueLeadCaptureName(this);
  this.leadCaptureData = { ...preferences.lastLeadCapture };
});

When(
  'I select the Lead Capture project location {string}',
  { timeout: 120000 },
  async function (location) {
    const preferences = getPreferencesPage(this);
    await preferences.selectLeadCaptureProjectLocation(this, location);
    this.leadCaptureData = { ...preferences.lastLeadCapture };
  }
);

When(
  'I select the Lead Capture preferred contact method {string}',
  { timeout: 120000 },
  async function (method) {
    const preferences = getPreferencesPage(this);
    await preferences.selectLeadCapturePreferredContactMethod(this, method);
    this.leadCaptureData = { ...preferences.lastLeadCapture };
  }
);

When('I enter the Lead Capture project area {string}', { timeout: 120000 }, async function (area) {
  const preferences = getPreferencesPage(this);
  await preferences.enterLeadCaptureProjectArea(this, area);
  this.leadCaptureData = { ...preferences.lastLeadCapture };
});

When('I select an available day on the Lead Capture form', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.selectAvailableDayOnLeadCaptureForm(this);
  this.leadCaptureData = { ...preferences.lastLeadCapture };
});

When('I enter the Lead Capture email {string}', { timeout: 120000 }, async function (email) {
  const preferences = getPreferencesPage(this);
  await preferences.enterLeadCaptureEmail(this, email);
  this.leadCaptureData = { ...preferences.lastLeadCapture };
});

When('I enter a unique Lead Capture yopmail email', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterUniqueLeadCaptureYopmail(this, 'leadcap');
  this.leadCaptureData = { ...preferences.lastLeadCapture };
});

When('I enter the Lead Capture phone number {string}', { timeout: 120000 }, async function (phone) {
  const preferences = getPreferencesPage(this);
  await preferences.enterLeadCapturePhoneNumber(this, phone);
  this.leadCaptureData = { ...preferences.lastLeadCapture };
});

When('I enter a unique Lead Capture phone number', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterUniqueLeadCapturePhoneNumber(this);
  this.leadCaptureData = { ...preferences.lastLeadCapture };
});

When(
  'I open Yopmail for the Lead Capture email in a new browser tab',
  { timeout: 120000 },
  async function () {
    const email =
      this.leadCaptureData?.email || getPreferencesPage(this).lastLeadCapture?.email || '';
    if (!email) {
      throw new Error('Lead Capture email is missing — enter email before opening Yopmail.');
    }
    if (!yopmailLocalPart(email)) {
      throw new Error(`Yopmail step requires *@yopmail.com address, got: ${email}`);
    }
    // Keep a handle to the form tab — Yopmail must not replace world.page permanently.
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      this.page = this.leadCaptureFormPage;
    }
    this.yopmailPage = await this.context.newPage();
    const yp = new CustomerPortalYopmailPage(this.yopmailPage);
    await yp.gotoInbox(email);
    this.yopmailBaseline = await yp.snapshotInboxBaseline();
    console.log('[Preferences] Yopmail tab opened for Lead Capture OTP');
    if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
      await this.leadCaptureFormPage.bringToFront().catch(() => {});
      this.page = this.leadCaptureFormPage;
    }
  }
);

When('I click Get OTP on the Lead Capture form', { timeout: 120000 }, async function () {
  if (this.leadCaptureFormPage && !this.leadCaptureFormPage.isClosed()) {
    await this.leadCaptureFormPage.bringToFront().catch(() => {});
  }
  const preferences = getPreferencesPage(this);
  await preferences.clickGetOtpOnLeadCaptureForm(this);
});

When(
  'I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP',
  { timeout: 720000 },
  async function () {
    if (!this.yopmailPage) {
      throw new Error('Yopmail tab missing — open Yopmail for the Lead Capture email first.');
    }
    await this.yopmailPage.bringToFront().catch(() => {});
    const yp = new CustomerPortalYopmailPage(this.yopmailPage);
    yp.inboxBaseline = this.yopmailBaseline;
    const otp = await yp.refreshOnceAndRetrieveOtp({
      baseline: this.yopmailBaseline,
      onPageReopened: (page) => {
        this.yopmailPage = page;
      },
      onStillWaiting: async () => {
        if (!this.leadCaptureFormPage || this.leadCaptureFormPage.isClosed()) return;
        await this.leadCaptureFormPage.bringToFront().catch(() => {});
        const preferences = getPreferencesPage(this);
        const reVerify = this.leadCaptureFormPage
          .getByRole('button', { name: /^(get\s*otp|verify|re-?verify|send\s*otp)$/i })
          .first();
        if (await reVerify.isVisible({ timeout: 2000 }).catch(() => false)) {
          await reVerify.click({ force: true }).catch(() => {});
          preferences.logStep('Re-clicked Verify/Get OTP while waiting for Lead Capture OTP email');
        }
      },
    });
    this.leadCaptureOtp = otp;
    await yp.expectOtpRetrieved();
  }
);

When('I switch back to the Lead Capture form tab', { timeout: 60000 }, async function () {
  if (!this.leadCaptureFormPage || this.leadCaptureFormPage.isClosed()) {
    throw new Error('Lead Capture form tab missing');
  }
  await this.leadCaptureFormPage.bringToFront();
  this.page = this.leadCaptureFormPage;
});

When('I enter the received OTP on the Lead Capture form', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.enterReceivedOtpOnLeadCaptureForm(this, this.leadCaptureOtp);
});

Then('the Lead Capture OTP should be accepted successfully', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectLeadCaptureOtpAccepted(this);
});

When('I click Submit on the Lead Capture form', { timeout: 600000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickSubmitOnLeadCaptureForm(this);
});

Then('the Lead Capture form should be submitted successfully', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectLeadCaptureFormSubmitted(this);
});

When('I switch back to the Admin Portal from Lead Capture', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.switchBackToAdminPortalFromLeadCapture(this);
});

When('I navigate to Lead Manager', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToLeadManager();
});

When('I locate the newly submitted Lead Capture lead', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.locateNewlySubmittedLeadCaptureLead(this);
});

Then('the newly submitted lead should be displayed in Lead Manager', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectNewlySubmittedLeadDisplayedInLeadManager(this);
});

When('I open the newly submitted Lead Capture lead', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.openNewlySubmittedLeadCaptureLead(this);
});

When('I navigate to the Form module on the lead profile', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.navigateToFormModuleOnLeadProfile(this);
});

When('I click View Response on the lead Form', { timeout: 120000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.clickViewResponseOnLeadForm();
});

Then('the Lead Capture form response should be visible', { timeout: 180000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.expectLeadCaptureFormResponseVisible(this);
});

When('I close the Lead Capture form response', { timeout: 60000 }, async function () {
  const preferences = getPreferencesPage(this);
  await preferences.closeLeadCaptureFormResponse();
});

Then(
  'the Lead Manager lead details should match the submitted Lead Capture form',
  { timeout: 180000 },
  async function () {
    const preferences = getPreferencesPage(this);
    await preferences.expectLeadManagerDetailsMatchLeadCaptureForm(this);
  }
);
