const { When, Then } = require('@cucumber/cucumber');
const InviteVendorPage = require('../../../pages/admin/invite/InviteVendorPage');

function getInviteVendorPage(world, page = world.page) {
  if (!world.inviteVendorPage || world.inviteVendorPage.page !== page) {
    world.inviteVendorPage = new InviteVendorPage(page);
  }
  return world.inviteVendorPage;
}

When('I navigate to Invite Vendor', { timeout: 120000 }, async function () {
  this.inviteAdminPage = this.page;
  const invitePage = getInviteVendorPage(this, this.page);
  await invitePage.navigateToInviteVendor();
});

When('I click the Send Invite Vendor option', { timeout: 120000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.clickSendInviteVendor();
});

When('I fill the invite vendor first name with {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.fillFirstName(value);
});

When('I fill the invite vendor last name with {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.fillLastName(value);
});

When('I fill the invite vendor email with {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.fillEmail(value);
  this.inviteVendorEmail = invitePage.lastInvite.email;
});

When('I fill the invite vendor organization name with {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.fillOrganization(value);
});

When('I fill the invite vendor phone number with {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.fillPhone(value);
  this.inviteVendorPhone = invitePage.lastInvite.phone;
});

When('I fill the invite vendor tax name with {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.fillTaxName(value);
});

When('I click the Send Invite button', { timeout: 120000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.clickSendInvite();
});

Then('the vendor invitation should be sent successfully', async function () {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.expectInvitationSent();
});

Then('the invite vendor status should be displayed as {string}', { timeout: 120000 }, async function (status) {
  const adminPage = this.inviteAdminPage || this.page;
  const invitePage = getInviteVendorPage(this, adminPage);
  if (this.inviteVendorEmail) {
    invitePage.lastInvite = { ...(invitePage.lastInvite || {}), email: this.inviteVendorEmail };
  }
  await invitePage.expectVendorStatus(status);
});

When('I open Yopmail for {string}', { timeout: 120000 }, async function (email) {
  const inbox = this.inviteVendorEmail || email;
  this.inviteVendorEmail = inbox;
  this.yopmailPage = await this.context.newPage();
  const yp = new InviteVendorPage(this.yopmailPage);
  await yp.gotoYopmailInbox(inbox);
});

When('I wait for the vendor invitation email to be received', { timeout: 180000 }, async function () {
  if (!this.yopmailPage) {
    throw new Error('Yopmail tab missing: run “I open Yopmail for …” first.');
  }
  const yp = new InviteVendorPage(this.yopmailPage);
  await yp.waitForInvitationEmail();
  this.inviteYopmailPageObject = yp;
});

Then('the vendor invitation email should be received successfully', async function () {
  const yp = this.inviteYopmailPageObject || new InviteVendorPage(this.yopmailPage);
  await yp.expectInvitationEmailReceived();
});

Then('the vendor invitation email should show vendor name {string}', async function (name) {
  const yp = this.inviteYopmailPageObject || new InviteVendorPage(this.yopmailPage);
  await yp.expectInvitationEmailContains(name, 'vendor name');
});

Then('the vendor invitation email should show organization name {string}', async function (name) {
  const yp = this.inviteYopmailPageObject || new InviteVendorPage(this.yopmailPage);
  await yp.expectInvitationEmailContains(name, 'organization name');
});

Then('the vendor invitation email should contain an invitation link', async function () {
  const yp = this.inviteYopmailPageObject || new InviteVendorPage(this.yopmailPage);
  await yp.expectInvitationLinkPresent();
});

When('I extract and open the vendor invitation URL', { timeout: 120000 }, async function () {
  const yp = this.inviteYopmailPageObject || new InviteVendorPage(this.yopmailPage);
  this.vendorPortalPage = await yp.extractAndOpenInvitationUrl(this.context);
  this.page = this.vendorPortalPage;
  this.inviteVendorPage = new InviteVendorPage(this.vendorPortalPage);
});

Then('the Vendor Registration page should be displayed', async function () {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  await invitePage.expectRegistrationPage();
});

When('I enter the vendor registration mobile number {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  // SMS OTP must hit a real handset. Do not reuse the unique invite-form phone.
  await invitePage.fillRegistrationMobile(value);
  this.inviteVendorPhone = value;
});

When('I click the Request OTP button', { timeout: 120000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  await invitePage.clickRequestOtp();
});

When('I wait for the OTP to be received', { timeout: 30000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  if (this.vendorPortalPage && !this.vendorPortalPage.isClosed()) {
    await this.vendorPortalPage.bringToFront().catch(() => {});
    this.page = this.vendorPortalPage;
  }
  await invitePage.waitForOtpEmail();
});

When('I enter the received OTP manually', { timeout: 600000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  await invitePage.enterOtpManually();
});

When('I verify the vendor registration OTP', { timeout: 120000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  await invitePage.verifyOtp();
});

When('I fill the vendor registration password with {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  this.vendorRegistrationPassword = value;
  await invitePage.fillPassword(value);
});

When('I fill the vendor registration confirm password with {string}', async function (value) {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  await invitePage.fillConfirmPassword(value);
});

When('I click the vendor registration Proceed or Login button', { timeout: 120000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  await invitePage.clickProceedOrLogin();
});

When('I refresh the vendor portal and sign in with the invited credentials', { timeout: 180000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.vendorPortalPage || this.page);
  await invitePage.refreshAndSignInWithInvitedCredentials(
    this.inviteVendorEmail,
    this.vendorRegistrationPassword || 'Simple@10'
  );
  this.page = invitePage.page;
  this.vendorPortalPage = invitePage.page;
});

When('I switch back to the Admin Portal', { timeout: 120000 }, async function () {
  const adminPage = this.inviteAdminPage;
  if (!adminPage || adminPage.isClosed()) {
    throw new Error('Admin Portal tab is missing — cannot switch back.');
  }
  await adminPage.bringToFront();
  this.page = adminPage;
  this.inviteVendorPage = new InviteVendorPage(adminPage);
});

When('I refresh the Invite Vendor list', { timeout: 120000 }, async function () {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.refreshVendorList();
});

When('I search the Invite Vendor list for {string}', async function (query) {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  const q = this.inviteVendorEmail || query;
  if (this.inviteVendorEmail) {
    invitePage.lastInvite = { ...(invitePage.lastInvite || {}), email: this.inviteVendorEmail };
  }
  await invitePage.searchVendor(q);
});

Then('the invite vendor Edit, Delete, and Resend buttons should not be displayed', async function () {
  const invitePage = getInviteVendorPage(this, this.inviteAdminPage || this.page);
  await invitePage.expectEditDeleteResendHidden();
});
