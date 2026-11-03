const { When, Then } = require('@cucumber/cucumber');
const CustomerScheduleMeetingPage = require('../../../pages/customer/meeting/CustomerScheduleMeetingPage');
const AdminClientMeetingPage = require('../../../pages/admin/client/AdminClientMeetingPage');

function getCustomerScheduleMeetingPage(world) {
  const page = world.customerPortalPage || world.page;
  if (!world.customerScheduleMeetingPage || world.customerScheduleMeetingPage.page !== page) {
    world.customerScheduleMeetingPage = new CustomerScheduleMeetingPage(page);
  }
  return world.customerScheduleMeetingPage;
}

function getAdminClientMeetingPage(world) {
  if (!world.adminClientMeetingPage || world.adminClientMeetingPage.page !== world.page) {
    world.adminClientMeetingPage = new AdminClientMeetingPage(world.page);
  }
  return world.adminClientMeetingPage;
}

function getMeetingData(world) {
  return (
    world.customerMeetingData ||
    (world.customerScheduleMeetingPage && world.customerScheduleMeetingPage.getMeetingData()) ||
    {}
  );
}

function getMeetingPurpose(world, fallback = '') {
  return world.customerMeetingPurpose || getMeetingData(world).purpose || fallback;
}

When('I navigate to Schedule Meeting on the customer portal', { timeout: 120000 }, async function () {
  if (this.customerPortalPage && !this.customerPortalPage.isClosed()) {
    await this.customerPortalPage.bringToFront().catch(() => {});
    this.page = this.customerPortalPage;
  }
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.navigateToScheduleMeeting();
});

When('I click Create on the customer Schedule Meeting page', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.clickCreate();
});

When('I select Offline Meeting on the customer portal', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.selectOfflineMeeting();
});

Then('the customer Preferred Mode of Contact should be Offline', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.expectPreferredModeOffline();
});

When('I enter or select the customer meeting location {string}', { timeout: 120000 }, async function (location) {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.enterMeetingLocation(location);
});

When('I enter or select the required customer meeting location', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  const testData = require('../../../utils/testData');
  const location = testData.client?.meeting?.offlineLocation || 'Chennai, Tamil Nadu, India';
  await customerScheduleMeetingPage.enterMeetingLocation(location);
});

When('I select Online Meeting on the customer portal', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.selectOnlineMeeting();
});

Then('the customer Preferred Mode of Contact should be Online', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.expectPreferredModeOnline();
});

When('I select an available day on the customer meeting form', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.selectAvailableDay();
});

When('I select an available time on the customer meeting form', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.selectAvailableTime();
});

When('I select meeting frequency {string} on the customer portal', { timeout: 120000 }, async function (frequency) {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.selectMeetingFrequency(frequency);
});

When('I enter the customer meeting purpose {string}', { timeout: 120000 }, async function (purpose) {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.enterMeetingPurpose(purpose);
  this.customerMeetingPurpose = purpose;
});

Then('all entered customer meeting details should be displayed', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.expectEnteredMeetingDetailsDisplayed();
  this.customerMeetingData = customerScheduleMeetingPage.getMeetingData();
});

When('I click Confirm Booking on the customer portal', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.clickConfirmBooking();
});

Then('the customer meeting should be created successfully', { timeout: 180000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.expectMeetingCreatedSuccessfully();
  this.customerMeetingData = customerScheduleMeetingPage.getMeetingData();
});

Then('I should see customer meeting success toast', { timeout: 120000 }, async function () {
  const customerScheduleMeetingPage = getCustomerScheduleMeetingPage(this);
  await customerScheduleMeetingPage.expectSuccessToast();
});

When(/^I navigate to the (?:Admin |Lead )?Dashboard$/, { timeout: 180000 }, async function () {
  const adminClientMeetingPage = getAdminClientMeetingPage(this);
  await adminClientMeetingPage.navigateToAdminDashboard();
});

Then(/^the newly created (?:offline )?customer meeting should be reflected on the (?:Admin |Lead )?Dashboard$/, { timeout: 180000 }, async function () {
  const adminClientMeetingPage = getAdminClientMeetingPage(this);
  await adminClientMeetingPage.expectMeetingReflectedOnDashboard(getMeetingData(this));
});

When('I open the admin project {string} for client meeting verification', { timeout: 180000 }, async function (projectName) {
  const adminClientMeetingPage = getAdminClientMeetingPage(this);
  await adminClientMeetingPage.openProjectForClientMeetingVerification(
    projectName,
    ['Hari', 'kumarorganization', 'kumar'],
    this.adminClientMeetingProfileUrl || ''
  );
});

When('I open the same admin lead for client meeting verification', { timeout: 180000 }, async function () {
  const adminClientMeetingPage = getAdminClientMeetingPage(this);
  await adminClientMeetingPage.openProjectForClientMeetingVerification(
    'kumarorganization',
    ['Hari', 'kumarorganization', 'kumar'],
    this.adminClientMeetingProfileUrl || ''
  );
});

When('I navigate to the admin project Event section', { timeout: 180000 }, async function () {
  const adminClientMeetingPage = getAdminClientMeetingPage(this);
  adminClientMeetingPage.lastProjectHubUrl = this.adminClientMeetingProfileUrl || '';
  await adminClientMeetingPage.navigateToEventSection(
    getMeetingData(this),
    this.adminClientMeetingProfileUrl || ''
  );
});

Then(/^the newly created (?:offline )?customer meeting should be reflected in the admin Event list$/, { timeout: 180000 }, async function () {
  const adminClientMeetingPage = getAdminClientMeetingPage(this);
  await adminClientMeetingPage.expectMeetingInEventList(getMeetingData(this));
});

When('I open the admin customer meeting from the Event list', { timeout: 180000 }, async function () {
  const adminClientMeetingPage = getAdminClientMeetingPage(this);
  await adminClientMeetingPage.openMeetingFromEventList(getMeetingData(this));
});

Then('the admin meeting details should match the customer portal meeting details', { timeout: 180000 }, async function () {
  const adminClientMeetingPage = getAdminClientMeetingPage(this);
  await adminClientMeetingPage.expectMeetingDetailsMatchCustomerPortal(getMeetingData(this));
});
