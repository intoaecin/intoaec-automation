const { Before, Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const AdminClientPage = require('../../../pages/admin/client/AdminClientPage');
const CustomerLoginPage = require('../../../pages/customer/auth/CustomerLoginPage');
const CustomerProfilePage = require('../../../pages/customer/profile/CustomerProfilePage');
const {
  CustomerPortalYopmailPage,
  yopmailLocalPart,
} = require('../../../pages/customer/auth/CustomerPortalYopmailPage');
const testData = require('../../../utils/testData');
const { getCustomerPortalUrl } = require('../../../config/customerPortal');

setDefaultTimeout(120000);

const CUSTOMER_TEST_CASE_LOG = {
  TC01: 'TC-01 — Customer portal OTP login using vasanth project client email from Admin',
  TC02: 'TC-02 — Edit customer My Profile and verify changes in Admin Portal',
  TC03: 'TC-03 — Create My Folder for kumarorganization client and verify in Admin Document',
  TC04: 'TC-04 — Upload folder in Customer My Folder and verify in Admin Document',
  TC05: 'TC-05 — Schedule Online Meeting in Customer Portal and verify in Admin Dashboard and Event',
  TC06: 'TC-06 — Schedule Offline Meeting in Customer Portal and verify in Admin Dashboard and Event',
};

Before({ tags: '@customer-login' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && CUSTOMER_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${CUSTOMER_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
  console.log(`[Customer] Portal URL: ${getCustomerPortalUrl()}`);
  this.adminPage = this.page;
});

function getAdminClientPage(world) {
  if (!world.adminClientPage || world.adminClientPage.page !== world.page) {
    world.adminClientPage = new AdminClientPage(world.page);
  }
  return world.adminClientPage;
}

function getCustomerLoginPage(world) {
  const page = world.customerPortalPage || world.page;
  if (!world.customerLoginPage || world.customerLoginPage.page !== page) {
    world.customerLoginPage = new CustomerLoginPage(page);
  }
  return world.customerLoginPage;
}

function getCustomerYopmailPage(world) {
  const page = world.yopmailPage;
  const email = world.capturedClientEmail || '';
  if (
    !world.customerYopmailPage ||
    world.customerYopmailPage.page !== page ||
    (page && page.isClosed())
  ) {
    world.customerYopmailPage = new CustomerPortalYopmailPage(page);
  }
  const yp = world.customerYopmailPage;
  yp.bindInbox(email);
  yp.inboxBaseline = world.yopmailBaseline || yp.inboxBaseline;
  return yp;
}

function yopmailOtpWaitOpts(world) {
  return {
    baseline: world.yopmailBaseline,
    email: world.capturedClientEmail,
    context: world.context,
    onPageReopened: (page) => {
      world.yopmailPage = page;
      if (world.customerYopmailPage) world.customerYopmailPage.page = page;
    },
    onStillWaiting: async () => {
      if (!world.customerPortalPage || world.customerPortalPage.isClosed()) return;
      await world.customerPortalPage.bringToFront().catch(() => {});
      world.page = world.customerPortalPage;
      await getCustomerLoginPage(world).clickResendOtpIfVisible();
    },
  };
}

function getCustomerProfilePage(world) {
  const page = world.customerPortalPage || world.page;
  if (!world.customerProfilePage || world.customerProfilePage.page !== page) {
    world.customerProfilePage = new CustomerProfilePage(page);
  }
  return world.customerProfilePage;
}

async function performCustomerPortalOtpLogin(world, email) {
  const loginEmail =
    email ||
    world.capturedClientEmail ||
    testData.client?.portalUser?.email ||
    'bhavani123@yopmail.com';
  if (!yopmailLocalPart(loginEmail)) {
    throw new Error(`Customer portal OTP login requires *@yopmail.com, got: ${loginEmail}`);
  }

  await ensureCustomerPortalPage(world);
  const customerLoginPage = getCustomerLoginPage(world);

  if (await customerLoginPage.isLoggedIn()) {
    console.log('[Customer] Previous Customer Portal session is still open — logging out before OTP login');
    await customerLoginPage.ensureOnLoginPage();
  }

  await customerLoginPage.navigateToLoginPage();
  await customerLoginPage.fillEmail(loginEmail);

  world.yopmailPage = await world.context.newPage();
  const yp = new CustomerPortalYopmailPage(world.yopmailPage);
  await yp.gotoInbox(loginEmail);
  world.yopmailBaseline = await yp.snapshotInboxBaseline();

  await customerLoginPage.clickLoginOrContinue();
  await customerLoginPage.expectOtpVerificationPage();

  const otp = await yp.refreshOnceAndRetrieveOtp({
    baseline: world.yopmailBaseline,
    onPageReopened: (page) => {
      world.yopmailPage = page;
    },
    onStillWaiting: async () => {
      if (!world.customerPortalPage || world.customerPortalPage.isClosed()) return;
      await world.customerPortalPage.bringToFront().catch(() => {});
      world.page = world.customerPortalPage;
      await getCustomerLoginPage(world).clickResendOtpIfVisible();
    },
  });
  world.customerPortalOtp = otp;

  await world.customerPortalPage.bringToFront();
  world.page = world.customerPortalPage;
  await customerLoginPage.enterOtp(otp);
  await customerLoginPage.clickVerifyOrLogin();
  await customerLoginPage.expectLoggedInSuccessfully();
  world.capturedClientEmail = loginEmail;
}

async function ensureCustomerPortalPage(world) {
  if (!world.customerPortalPage || world.customerPortalPage.isClosed()) {
    world.customerPortalPage = await world.context.newPage();
  }
  world.page = world.customerPortalPage;
  return world.customerPortalPage;
}

Then('the Admin Portal login should be successful', async function () {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectAdminLoginSuccessful();
});

When('I navigate to the project Client section', { timeout: 120000 }, async function () {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.navigateToClientSection();
});

When('I open the client {string} details', { timeout: 120000 }, async function (clientName) {
  const adminClientPage = getAdminClientPage(this);
  const testData = require('../../../utils/testData');
  const resolved = await adminClientPage.openClientDetailsAny([
    clientName,
    'vasanth',
    'kumarorganization',
    'kumar',
    'Hari',
    'john',
    'John',
    testData.client?.portalUser?.updatedName,
    testData.client?.mvb?.contactName,
    testData.client?.mvb?.clientName,
  ]);
  this.adminClientDisplayName = resolved;
});

When('I capture the client email for contact {string}', { timeout: 120000 }, async function (contactName) {
  const adminClientPage = getAdminClientPage(this);
  const email = await adminClientPage.captureClientEmailForContact(contactName, [
    this.adminClientDisplayName,
    testData.client?.portalUser?.updatedName,
    'vasanth',
    'Hari',
  ]);
  this.capturedClientEmail = email;
  if (!this.adminPage || this.adminPage.isClosed()) {
    this.adminPage = this.page;
  }
});

When('I capture the registered customer email from the admin client project', { timeout: 120000 }, async function () {
  const adminClientPage = getAdminClientPage(this);
  const email = await adminClientPage.captureRegisteredCustomerEmail(['Hari', 'kumarorganization', 'kumar', 'Bhavani M']);
  this.capturedClientEmail = email;
  if (!this.adminPage || this.adminPage.isClosed()) {
    this.adminPage = this.page;
  }
  console.log(`[Customer] Registered email captured — paste "${email}" on Customer Portal and use the same inbox in Yopmail`);
});

When('I navigate to the Customer Portal login page', { timeout: 120000 }, async function () {
  if (!this.adminPage || this.adminPage.isClosed()) {
    this.adminPage = this.page;
  }
  await ensureCustomerPortalPage(this);
  const customerLoginPage = getCustomerLoginPage(this);
  await customerLoginPage.navigateToLoginPage();
});

Then('the Customer Portal Login page should be displayed', async function () {
  const customerLoginPage = getCustomerLoginPage(this);
  await customerLoginPage.expectLoginPageDisplayed();
});

When('I enter the captured client email on the Customer Portal', async function () {
  const email = this.capturedClientEmail;
  if (!email) {
    throw new Error('Captured client email is missing — run the Admin client email capture step first.');
  }
  const customerLoginPage = getCustomerLoginPage(this);
  await customerLoginPage.fillEmail(email);
});

When('I click Login or Continue on the Customer Portal', async function () {
  const customerLoginPage = getCustomerLoginPage(this);
  await customerLoginPage.clickLoginOrContinue();
});

Then('the Customer Portal OTP verification page should be displayed', async function () {
  const customerLoginPage = getCustomerLoginPage(this);
  await customerLoginPage.expectOtpVerificationPage();
});

When('I open Yopmail for the captured client email in a new browser tab', { timeout: 120000 }, async function () {
  const email = this.capturedClientEmail;
  if (!email) {
    throw new Error('Captured client email is missing.');
  }
  if (!yopmailLocalPart(email)) {
    throw new Error(`Yopmail step requires *@yopmail.com address, got: ${email}`);
  }
  this.yopmailPage = await this.context.newPage();
  const yp = getCustomerYopmailPage(this);
  yp.page = this.yopmailPage;
  await yp.gotoInbox(email);
  this.customerYopmailPage = yp;
  this.yopmailBaseline = await yp.snapshotInboxBaseline();
  console.log('[Customer] Yopmail tab opened — solve CAPTCHA once when prompted, then inbox loads automatically');
});

When(
  'I refresh Yopmail once and retrieve the Customer Portal OTP',
  { timeout: 720000 },
  async function () {
    if (!this.yopmailPage && !this.capturedClientEmail) {
      throw new Error('Yopmail tab missing — open Yopmail for the captured client email first.');
    }
    const yp = getCustomerYopmailPage(this);
    if (this.yopmailPage && !this.yopmailPage.isClosed()) {
      await this.yopmailPage.bringToFront().catch(() => {});
    }
    const otp = await yp.refreshOnceAndRetrieveOtp(yopmailOtpWaitOpts(this));
    this.customerPortalOtp = otp;
    await yp.expectOtpRetrieved();
  }
);

When(
  'I wait for the Customer Portal OTP email in Yopmail and retrieve the OTP',
  { timeout: 720000 },
  async function () {
    if (!this.yopmailPage && !this.capturedClientEmail) {
      throw new Error('Yopmail tab missing — open Yopmail for the captured client email first.');
    }
    const yp = getCustomerYopmailPage(this);
    const otp = await yp.refreshOnceAndRetrieveOtp(yopmailOtpWaitOpts(this));
    this.customerPortalOtp = otp;
    await yp.expectOtpRetrieved();
  }
);

When('I switch back to the Customer Portal tab', async function () {
  if (!this.customerPortalPage || this.customerPortalPage.isClosed()) {
    throw new Error('Customer Portal tab missing — navigate to the Customer Portal login page first.');
  }
  await this.customerPortalPage.bringToFront();
  this.page = this.customerPortalPage;
});

When('I enter the received OTP on the Customer Portal', async function () {
  const otp = this.customerPortalOtp;
  if (!otp) {
    throw new Error('OTP missing — retrieve it from Yopmail first.');
  }
  const customerLoginPage = getCustomerLoginPage(this);
  await customerLoginPage.enterOtp(otp);
});

When('I click Verify or Login on the Customer Portal', async function () {
  const customerLoginPage = getCustomerLoginPage(this);
  await customerLoginPage.clickVerifyOrLogin();
});

Then('I should be logged in to the Customer Portal successfully', { timeout: 120000 }, async function () {
  const customerLoginPage = getCustomerLoginPage(this);
  await customerLoginPage.expectLoggedInSuccessfully();
});

Given('I am logged in to the customer portal', { timeout: 720000 }, async function () {
  await performCustomerPortalOtpLogin(this);
});

When('I navigate to the customer My Profile page', async function () {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.navigateToMyProfile();
});

Then('the customer My Profile page should be displayed', async function () {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.expectMyProfilePageDisplayed();
});

When('I click the customer profile Edit button', async function () {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.clickEdit();
});

Then('the customer profile edit page should be displayed', async function () {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.expectEditProfilePageDisplayed();
});

When('I fill the customer profile name with {string}', async function (value) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.fillName(value);
});

Then('the customer profile email should display as {string}', async function (email) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.expectEmailDisplayed(email);
});

Then('the customer profile email should display the captured client email', async function () {
  const email = this.capturedClientEmail;
  if (!email) {
    throw new Error('Captured client email is missing — capture the kumarorganization client email from Admin Client first.');
  }
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.expectEmailDisplayed(email);
});

When('I fill the customer profile mobile number with {string}', async function (value) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.fillMobileNumber(value);
});

When('I fill the customer profile address with {string}', async function (value) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.fillAddress(value);
});

When('I fill the customer profile city with {string}', async function (value) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.fillCity(value);
});

When('I select the customer profile state {string}', async function (value) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.selectState(value);
});

When('I select the customer profile country {string}', async function (value) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.selectCountry(value);
});

When('I fill the customer profile zip code with {string}', async function (value) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.fillZipCode(value);
});

When('I click the customer profile Save or Update button', async function () {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.clickSaveOrUpdate();
});

Then('I should see customer profile success toast {string}', async function (message) {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.expectSuccessToast(message);
});

Then('the updated customer profile details should be displayed correctly', async function () {
  const customerProfilePage = getCustomerProfilePage(this);
  await customerProfilePage.expectUpdatedProfileDetailsDisplayed();
});

When('I switch back to the Admin Portal for client verification', { timeout: 180000 }, async function () {
  if (this.adminPage && !this.adminPage.isClosed()) {
    await this.adminPage.bringToFront();
    this.page = this.adminPage;
  } else {
    const LoginPage = require('../../../pages/admin/auth/LoginPage');
    const loginPage = new LoginPage(this.page);
    await loginPage.ensureAuthenticated(testData.admin.validUser.email, testData.admin.validUser.password);
    this.adminPage = this.page;
  }

  this.adminClientPage = null;
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectAdminLoginSuccessful();

  const currentUrl = this.page.url();
  if (/client\/profile/i.test(currentUrl)) {
    const hub = new URL(currentUrl);
    hub.searchParams.delete('tab');
    hub.searchParams.delete('subTab');
    this.adminClientMeetingProfileUrl = hub.toString();
    console.log(`[Customer] Saved admin lead profile hub URL: ${this.adminClientMeetingProfileUrl}`);
  }

  await this.page.waitForTimeout(3000).catch(() => {});
  console.log('[Customer] Switched back to Admin Portal for client verification (waited for sync)');
});

When('I open the admin project for client {string} verification', { timeout: 180000 }, async function (clientName) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.openProjectForClientVerification(clientName);
});

When('I open the admin project {string} for updated client profile verification', { timeout: 180000 }, async function (projectName) {
  const adminClientPage = getAdminClientPage(this);
  const updatedName = testData.client?.portalUser?.updatedName || 'Hari';
  await adminClientPage.openProjectForClientVerification(projectName, [
    updatedName,
    projectName,
    'kumarorganization',
    'kumar',
    'Hari',
    'john',
    'John',
    this.adminClientDisplayName,
  ]);
});

const HARI_CLIENT_PROFILE = {
  name: 'Hari',
  email: 'bhavani123@yopmail.com',
  mobile: '+91356478667',
  address: 'Chennai Central, into, chennai',
  city: 'Chennai',
  state: 'Tamil Nadu',
  country: 'India',
  zip: '600063',
};

function getUpdatedClientProfile(world) {
  return {
    ...HARI_CLIENT_PROFILE,
    email: world.capturedClientEmail || HARI_CLIENT_PROFILE.email,
  };
}

When('I click Edit on the admin client profile', { timeout: 120000 }, async function () {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.clickEditOnClientProfile();
});

When('I ensure the admin client profile has the updated Hari details', { timeout: 120000 }, async function () {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.ensureClientDetailsInEditForm(getUpdatedClientProfile(this));
});

When('I click Save or Update on the admin client profile', { timeout: 120000 }, async function () {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.clickSaveOrUpdateOnClientProfile();
});

Then('the admin client profile should display the updated Hari details', { timeout: 180000 }, async function () {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectAllClientDetails(getUpdatedClientProfile(this));
});

Then('the admin client name should be displayed as {string}', async function (value) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectClientDetailDisplayed('Name', value);
});

Then('the admin client email should be displayed as {string}', async function (value) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectClientDetailDisplayed('Email', value);
});

Then('the admin client mobile number should be displayed as {string}', async function (value) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectClientDetailDisplayed('Mobile Number', value);
});

Then('the admin client address should be displayed as {string}', async function (value) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectClientDetailDisplayed('Address', value);
});

Then('the admin client city should be displayed as {string}', async function (value) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectClientDetailDisplayed('City', value);
});

Then('the admin client state should be displayed as {string}', async function (value) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectClientDetailDisplayed('State', value);
});

Then('the admin client country should be displayed as {string}', async function (value) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectClientDetailDisplayed('Country', value);
});

Then('the admin client zipcode should be displayed as {string}', async function (value) {
  const adminClientPage = getAdminClientPage(this);
  await adminClientPage.expectClientDetailDisplayed('Zipcode', value);
});
