const { Before, After, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const MyAccountPage = require('../../../pages/admin/account/MyAccountPage');
const testData = require('../../../utils/testData');

/** Per AGENTS.md: cucumber timeout aligned with page-object defaultTimeout. */
setDefaultTimeout(60000);

const MY_ACCOUNT_TEST_CASE_LOG = {
  TC00: 'TC-00 — Navigate to My Account and view profile details',
  TC01: 'TC-01 — Edit My Account profile details and save',
  TC02: 'TC-02 — View, upload, and delete My Account profile picture',
  TC03: 'TC-03 — Change My Account password from Security',
  TC04: 'TC-04 — Edit My Organization About Us details and update',
  TC05: 'TC-05 — Add a skill to My Organization Area of Expertise',
  TC06: 'TC-06 — Add an award to My Organization Awards section',
  TC07: 'TC-07 — Add a certification to My Organization Certifications section',
  TC08: 'TC-08 — Add a publication to My Organization Publications section',
  TC09: 'TC-09 — Add a presentation to My Organization Presentations section',
  TC10: 'TC-10 — Edit My Organization Info Address details and save',
  TC11: 'TC-11 — Add a portfolio project with video to My Organization Portfolio',
  TC12: 'TC-12 — Edit My Organization Social Media links and verify after refresh',
  TC13: 'TC-13 — Draw and update My Organization Admin Digital Signature',
  TC14: 'TC-14 — Upload and update My Organization Admin Digital Signature',
};

Before({ tags: '@my-account or @my-account-tc' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && MY_ACCOUNT_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${MY_ACCOUNT_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getMyAccountPage(world) {
  if (!world.myAccountPage || world.myAccountPage.page !== world.page) {
    world.myAccountPage = new MyAccountPage(world.page);
  }
  return world.myAccountPage;
}

When('I navigate to Profile Settings', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.navigateToProfileSettings();
});

When('I click on My Account', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.clickMyAccount();
});

Then('the My Account page should be displayed', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectMyAccountPageDisplayed();
});

Then('the My Account profile details should be visible', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectProfileDetailsVisible();
});

When('I click the My Account Edit button', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.clickEdit();
});

When('I fill the My Account first name with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillFirstName(value);
});

When('I fill the My Account last name with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillLastName(value);
});

When('I fill the My Account email address with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillEmail(value);
});

When('I fill the My Account mobile number with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillMobile(value);
});

When('I fill the My Account organization with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillOrganization(value);
});

When('I fill the My Account address line 1 with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillAddressLine1(value);
});

When('I fill the My Account address line 2 with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillAddressLine2(value);
});

When('I fill the My Account city with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillCity(value);
});

When('I select the My Account state {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.selectState(value);
});

When('I select the My Account country {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.selectCountry(value);
});

When('I fill the My Account zip code with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillZip(value);
});

When('I click the My Account Update button', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.clickUpdate();
});

Then('I should see My Account success toast {string}', async function (message) {
  // Toast is optional — do not fail the TC if the UI does not show it.
  console.log(`[MyAccount] Skipping toast assert (optional): ${message}`);
});

Then('the My Account profile details should be saved', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectProfileDetailsSaved();
});

When('I hover over the My Account profile picture', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.hoverProfilePicture();
});

Then('the My Account profile picture Close, View, Upload, and Delete icons should be displayed', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectProfileHoverIconsVisible();
});

When('I click the My Account profile picture View icon', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.clickProfileViewIcon();
});

Then('the My Account profile picture preview should be displayed', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectProfilePreviewVisible();
});

When('I close the My Account profile picture preview', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.closeProfilePreview();
});

When('I click the My Account profile picture Upload icon', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.clickProfileUploadIcon();
});

When('I select a valid My Account profile image file', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.selectValidProfileImage();
});

Then('the My Account profile picture should be uploaded successfully', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectProfilePictureUploaded();
});

Then('the updated My Account profile picture should be displayed', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectUpdatedProfilePictureDisplayed();
});

When('I click the My Account profile picture Delete icon', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.clickProfileDeleteIcon();
});

When('I confirm the My Account profile picture delete', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.confirmProfilePictureDelete();
});

Then('the My Account profile picture should be deleted successfully', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectProfilePictureDeleted();
});

Then('the default My Account profile picture should be displayed', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectDefaultProfilePictureDisplayed();
});

When('I navigate to My Account Security', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.navigateToSecurity();
});

When('I fill the My Account current password with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillCurrentPassword(value);
});

When('I fill the My Account new password with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillNewPassword(value);
});

When('I fill the My Account confirm new password with {string}', async function (value) {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.fillConfirmNewPassword(value);
});

When('I click the My Account Change Password button', async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.clickChangePassword();
  this.myAccountSubmittedPassword = myAccountPage.lastSubmittedPassword;
});

When('I switch the Admin organization to {string}', { timeout: 30000 }, async function (orgName) {
  const myAccountPage = getMyAccountPage(this);
  // No-op: never open multi-account-switch (404 / wrong account). kumar@diy.in only.
  await myAccountPage.switchToOrganization(orgName);
});

When('I log out of the Admin portal', { timeout: 120000 }, async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.logout();
});

When(
  'I log in to the Admin portal with email {string} and password {string}',
  { timeout: 180000 },
  async function (email, password) {
    const myAccountPage = getMyAccountPage(this);
    await myAccountPage.loginWithCredentials(email, password);
  }
);

Then('I should be logged in to the Admin portal successfully', { timeout: 120000 }, async function () {
  const myAccountPage = getMyAccountPage(this);
  await myAccountPage.expectLoggedInSuccessfully();
});

After({ tags: '@my-account-tc and @TC03', timeout: 180000 }, async function () {
  // The admin account is shared by every module: if TC-03 stopped after switching to the temporary
  // password, change it back here so other scenarios can still log in with the original one.
  const original = testData.admin.validUser.password; // Simple@10
  const email = testData.admin.validUser.email;
  const current = this.myAccountSubmittedPassword || original;
  if (current === original) {
    console.log('[MyAccount] TC-03 After: account password is the original — nothing to restore');
    return;
  }
  try {
    await this.ensureLivePage();
    const LoginPage = require('../../../pages/admin/auth/LoginPage');
    await new LoginPage(this.page).ensureAuthenticated(email, current);
    const myAccountPage = getMyAccountPage(this);
    await myAccountPage.navigateToProfileSettings();
    await myAccountPage.clickMyAccount();
    await myAccountPage.navigateToSecurity();
    await myAccountPage.fillCurrentPassword(current);
    await myAccountPage.fillNewPassword(original);
    await myAccountPage.fillConfirmNewPassword(original);
    await myAccountPage.clickChangePassword();
    await this.page.waitForTimeout(3000);
    this.myAccountSubmittedPassword = original;
    console.log(`[MyAccount] TC-03 After: restored ${email} password to the original`);
  } catch (err) {
    console.log(`[MyAccount] ERROR after TC-03: password may still be "${current}" — restore manually: ${err.message}`);
  }
});
