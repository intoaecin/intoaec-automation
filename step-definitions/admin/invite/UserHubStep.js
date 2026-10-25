const { Before, After, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const UserHubPage = require('../../../pages/admin/invite/UserHubPage');

setDefaultTimeout(60000);

const USER_HUB_TEST_CASE_LOG = {
  TC01: 'TC-01 — Create Project Manager role with permissions in User Hub Roles',
  TC02: 'TC-02 — Edit Project Manager role to Electrician in User Hub Roles',
  TC03: 'TC-03 — Delete first role row from User Hub Roles',
  TC04: 'TC-04 — Invite user from Admin Portal, accept from Yopmail, verify Accepted status',
  TC05: 'TC-05 — Edit existing pending user in User Hub Users list',
  TC06: 'TC-06 — Resend invitation for pending user and verify success toast',
  TC07: 'TC-07 — Delete pending invited user from User Hub Users list',
  TC08: 'TC-08 — Create UHCreateTeam in User Hub Teams with three members',
  TC09: 'TC-09 — Edit UHCreateTeam in User Hub Teams and rename to UHEditTeam',
  TC10: 'TC-10 — Delete UHEditTeam from User Hub Teams and verify removal',
  TC11: 'TC-11 — Delete accepted user from User Hub without lead reassignment and verify removal',
  TC12: 'TC-12 — Delete accepted user with assignee-removal note and verify removal',
  TC13: 'TC-13 — Delete role with assigned users after reassigning them to another role',
  TC14: 'TC-14 — Delete role with no users assigned and verify direct deletion',
};

Before({ tags: '@userhub' }, async function ({ pickle }) {
  const tags = (pickle.tags || []).map((t) => t.name.replace(/^@/, ''));
  const tc = tags.find((t) => /^TC\d+$/i.test(t));
  if (tc && USER_HUB_TEST_CASE_LOG[tc.toUpperCase()]) {
    console.log(`\n>>> ${USER_HUB_TEST_CASE_LOG[tc.toUpperCase()]}\n`);
  }
});

function getUserHubPage(world) {
  if (!world.userHubPage || world.userHubPage.page !== world.page) {
    world.userHubPage = new UserHubPage(world.page);
  }
  return world.userHubPage;
}

function getInvitedUserHubPage(world) {
  const page = world.invitedUserPage || world.userRegistrationPage || world.userInvitationPage;
  if (!page || page.isClosed()) {
    throw new Error('Invited user browser session is missing — open invitation in new browser first.');
  }
  const userHubPage = new UserHubPage(page);
  userHubPage.lastInvite = {
    ...(userHubPage.lastInvite || {}),
    email: world.invitedUserEmail || userHubPage.lastInvite?.email,
    mobile: world.invitedUserMobile || userHubPage.lastInvite?.mobile,
    firstName: world.invitedUserFirstName || userHubPage.lastInvite?.firstName,
    lastName: world.invitedUserLastName || userHubPage.lastInvite?.lastName,
    role: world.invitedUserRole || userHubPage.lastInvite?.role,
  };
  return userHubPage;
}

async function closeInvitedUserBrowser(world) {
  if (world.invitedUserContext) {
    await world.invitedUserContext.close().catch(() => {});
    world.invitedUserContext = null;
  }
  world.invitedUserPage = null;
  world.userInvitationPage = null;
  world.userRegistrationPage = null;
}

Before({ tags: '@userhub-users' }, async function () {
  await closeInvitedUserBrowser(this);
});

After({ tags: '@userhub-users' }, async function () {
  await closeInvitedUserBrowser(this);
});

When('I navigate to User Hub', async function () {
  this.userHubAdminPage = this.page;
  const userHubPage = getUserHubPage(this);
  await userHubPage.navigateToUserHub();
});

When('I click on Roles in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickRoles();
});

Then('the User Hub Roles page should be displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRolesPageDisplayed();
});

When('I click Add Role in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickAddRole();
});

Then('the Add Role form should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectAddRoleFormDisplayed();
});

When('I enter the User Hub role name {string}', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enterRoleName(roleName);
});

When('I enter the User Hub role description {string}', async function (description) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enterRoleDescription(description);
});

When('I enable the Activity Tracker permission in User Hub Add Role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enableActivityTrackerPermission();
});

When('I enable the CRM Automation permission in User Hub Add Role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enableCrmAutomationPermission();
});

When('I enable the required Features permission in User Hub Add Role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enableRequiredFeaturesPermission();
});

When('I enable the required People permission in User Hub Add Role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enableRequiredPeoplePermission();
});

When('I click Save on the User Hub Add Role form', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickSaveRole();
});

Then('the User Hub role should be created successfully', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleCreatedSuccessfully();
});

Then('I should see User Hub role success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleSuccessToast();
});

Then(
  'the role {string} should appear in the User Hub Roles list with description {string} and selected permissions',
  async function (roleName, description) {
    const userHubPage = getUserHubPage(this);
    await userHubPage.expectRoleInRolesList(roleName, description);
  }
);

When('I locate the User Hub role {string} in the Roles list', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.locateRoleInList(roleName);
});

When('I locate the first User Hub role in the Roles list', async function () {
  const userHubPage = getUserHubPage(this);
  const name = await userHubPage.locateFirstRoleInList();
  this.userHubRoleName = name;
  console.log(`[UserHub] Located first role row: ${name}`);
});

When('I locate the User Hub role {string} or {string} in the Roles list', async function (primary, fallback) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.locateRoleInListWithFallback(primary, fallback);
});

When('I locate the User Hub role {string} or {string} or {string} in the Roles list', async function (first, second, third) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.locateRoleInListWithFallback(first, second, third);
});

When('I open the three-dot menu for the located User Hub role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openRoleActionMenuForLocatedRole();
});

When('I open the three-dot menu for User Hub role {string}', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openRoleActionMenu(roleName);
});

When('I click the three-dot menu for the located User Hub role and click Delete', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.deleteLocatedRoleViaThreeDotMenu();
});

When('I click the three-dot menu for User Hub role {string} and click Delete', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openThreeDotMenuAndClickDelete(roleName);
});

When('I click Edit on the User Hub role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickEditRole();
});

Then('the Edit Role form should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectEditRoleFormDisplayed();
});

When('I change the User Hub role name to {string}', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.changeRoleName(roleName);
});

When('I change the User Hub role description to {string}', async function (description) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.changeRoleDescription(description);
});

Then('the existing User Hub role permissions should be displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.verifyExistingPermissionsDisplayed();
});

When('I enable the Activity Tracker permission in User Hub Edit Role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enableActivityTrackerPermission();
});

When('I enable the CRM Automation permission in User Hub Edit Role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enableCrmAutomationPermission();
});

When('I enable the required Features permission in User Hub Edit Role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enableRequiredFeaturesPermission();
});

When('I enable the required People permission in User Hub Edit Role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.enableRequiredPeoplePermission();
});

When('I click Save on the User Hub Edit Role form', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickSaveRole();
});

Then('the User Hub role should be updated successfully', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleUpdatedSuccessfully();
});

Then('I should see User Hub role updated success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleUpdatedToast();
});

Then(
  'the role {string} should appear in the User Hub Roles list with description {string}',
  async function (roleName, description) {
    const userHubPage = getUserHubPage(this);
    await userHubPage.expectRoleInRolesList(roleName, description);
  }
);

When('I open Edit for User Hub role {string}', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openEditForRole(roleName);
});

Then('the User Hub Edit Role form should show role name {string}', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectEditRoleNameValue(roleName);
});

Then('the User Hub Edit Role form should show description {string}', async function (description) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectEditRoleDescriptionValue(description);
});

Then(
  'the User Hub Edit Role form should have Activity Tracker, CRM Automation, Features, and People permissions enabled',
  async function () {
    const userHubPage = getUserHubPage(this);
    await userHubPage.expectRequiredPermissionsEnabledOnEditForm();
  }
);

When('I click Delete on the User Hub role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickDeleteRole();
});

Then('the Delete Role confirmation popup should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectDeleteRoleConfirmationDisplayed();
});

Then(
  'the Delete Role confirmation message for {string} should be displayed correctly',
  async function (roleName) {
    const userHubPage = getUserHubPage(this);
    await userHubPage.expectDeleteRoleConfirmationMessage(roleName);
  }
);

Then('the Delete Role confirmation message for the located User Hub role should be displayed correctly', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectDeleteRoleConfirmationMessageForLocatedRole();
});

When('I confirm Delete Role in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.confirmDeleteRole();
});

When('I confirm Delete Role in User Hub if displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.confirmDeleteRoleIfDisplayed();
});

Then('I locate a User Hub role with assigned users', { timeout: 180000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.locateRoleWithAssignedUsers();
});

Then('I locate a User Hub role with no assigned users', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.locateRoleWithNoAssignedUsers();
});

Then('the Assign Reassign User popup should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectAssignReassignUserPopupDisplayed();
});

Then('the Assign Reassign User popup should display users assigned to the located role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectAssignReassignPopupShowsAssignedUsers();
});

When('I select another available role to reassign User Hub role users', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.selectAnotherRoleToReassignUsers();
});

When('I click Delete on the User Hub Assign Reassign User popup', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickDeleteOnAssignReassignUserPopup();
});

When('I confirm user reassignment on the User Hub role delete popup', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickDeleteOnAssignReassignUserPopup();
});

Then('the User Hub role users should be successfully reassigned', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleUsersSuccessfullyReassigned();
});

Then('the User Hub role deletion should continue', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleDeletionContinues();
});

Then('the User Hub role should be deleted without the Assign Reassign User popup', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleDeletedWithoutAssignReassignPopup();
});

Then('I should see User Hub role deleted success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleDeletedToast();
});

Then('the role {string} should not appear in the User Hub Roles list', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleNotInRolesList(roleName);
});

Then('the located User Hub role should not appear in the User Hub Roles list', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLocatedRoleNotInRolesList();
});

When('I search the User Hub Roles list for {string}', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.searchRoleInList(roleName);
});

When('I search the User Hub Roles list for the located User Hub role', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.searchLocatedRoleInList();
});

Then('the role {string} should not be found in the User Hub Roles search results', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectRoleNotFoundAfterSearch(roleName);
});

Then('the located User Hub role should not be found in the User Hub Roles search results', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLocatedRoleNotFoundAfterSearch();
});

When('I click on Users in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickUsers();
});

Then('the User Hub Users page should be displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUsersPageDisplayed();
});

When('I navigate to User Hub user invite form', async function () {
  this.userHubAdminPage = this.page;
  const userHubPage = getUserHubPage(this);
  await userHubPage.navigateToUserInviteForm();
});

When('I click User Invite in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickUserInvite();
});

Then('the User Hub User Invite form should be displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUserInviteFormDisplayed();
});

When('I fill the User Hub invite first name with {string}', async function (value) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.fillInviteFirstName(value);
  this.invitedUserFirstName = value;
});

When('I fill the User Hub invite last name with {string}', async function (value) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.fillInviteLastName(value);
  this.invitedUserLastName = value;
});

When('I fill the User Hub invite email with {string}', async function (value) {
  const userHubPage = getUserHubPage(this);
  const email = await userHubPage.fillInviteEmail(value);
  this.invitedUserEmail = email;
  console.log(`[UserHub] Invited user email for this run: ${email}`);
});

When('I select the User Hub invite role {string}', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.selectInviteRole(roleName);
  this.invitedUserRole = roleName;
});

When('I click Send Invite on the User Hub invite form', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickSendInviteUser();
});

Then('the user invitation should be sent successfully from User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUserInvitationSent();
});

Then('I should see User Hub user invitation success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUserInviteSuccessToast();
});

Then(
  'the invited user should appear in the User Hub users list with status {string}',
  { timeout: 120000 },
  async function (status) {
    const userHubPage = getUserHubPage(this);
    expect(this.invitedUserEmail, 'Invited user email missing — fill invite email first').toBeTruthy();
    userHubPage.lastInvite = {
      ...(userHubPage.lastInvite || {}),
      email: this.invitedUserEmail,
      search: this.invitedUserEmail,
    };
    await userHubPage.expectUserInListWithStatus(this.invitedUserEmail, status);
  }
);

Then(
  'the invited user {string} should appear in the User Hub users list with status {string}',
  { timeout: 120000 },
  async function (email, status) {
    const userHubPage = getUserHubPage(this);
    const query = this.invitedUserEmail || email;
    await userHubPage.expectUserInListWithStatus(query, status);
  }
);

When('I open Yopmail for the invited user', { timeout: 120000 }, async function () {
  this.userHubAdminPage = this.userHubAdminPage || this.page;
  expect(this.invitedUserEmail, 'Invited user email missing — fill invite email first').toBeTruthy();
  this.yopmailPage = await this.context.newPage();
  const yp = new UserHubPage(this.yopmailPage);
  await yp.gotoYopmailInbox(this.invitedUserEmail);
});

When('I open Yopmail for the invited user {string}', { timeout: 120000 }, async function (email) {
  this.userHubAdminPage = this.userHubAdminPage || this.page;
  const inbox = this.invitedUserEmail || email;
  this.invitedUserEmail = inbox;
  this.yopmailPage = await this.context.newPage();
  const yp = new UserHubPage(this.yopmailPage);
  await yp.gotoYopmailInbox(inbox);
});

When('I wait for the user invitation email to be received', { timeout: 180000 }, async function () {
  if (!this.yopmailPage) {
    throw new Error('Yopmail tab missing: run “I open Yopmail for the invited user …” first.');
  }
  const yp = new UserHubPage(this.yopmailPage);
  await yp.waitForUserInvitationEmail();
  this.userHubYopmailPageObject = yp;
});

Then('the user invitation email should be received successfully', async function () {
  const yp = this.userHubYopmailPageObject || new UserHubPage(this.yopmailPage);
  await yp.expectUserInvitationEmailReceived();
});

Then('the user invitation email should show invited user name {string}', async function (name) {
  const yp = this.userHubYopmailPageObject || new UserHubPage(this.yopmailPage);
  await yp.expectUserInvitationEmailContains(name, 'invited user name');
});

Then('the user invitation email should show role {string}', async function (role) {
  const yp = this.userHubYopmailPageObject || new UserHubPage(this.yopmailPage);
  await yp.expectUserInvitationEmailContains(role, 'role');
});

Then('the user invitation email should contain an invitation link', async function () {
  const yp = this.userHubYopmailPageObject || new UserHubPage(this.yopmailPage);
  await yp.expectUserInvitationLinkPresent();
});

When('I extract and open the user invitation URL', { timeout: 120000 }, async function () {
  this.userHubAdminPage =
    this.userHubAdminPage ||
    this.context
      .pages()
      .find((p) => !p.isClosed() && /app\.(aecplayhouse|intoaec)/i.test(p.url()) && !/yopmail/i.test(p.url()));
  const yp = this.userHubYopmailPageObject || new UserHubPage(this.yopmailPage);
  await closeInvitedUserBrowser(this);
  const { page, context, url } = await yp.openUserInvitationInNewBrowser(this.browser);
  this.invitedUserContext = context;
  this.userInvitationPage = page;
  this.invitedUserPage = page;
  this.page = page;
  const userHubPage = new UserHubPage(page);
  userHubPage.lastInvitationUrl = url || yp.lastInvitationUrl || page.url();
  await userHubPage.prepareInvitationAcceptanceForm();
  this.userRegistrationPage = page;
  this.page = page;
});

When(
  'I enter invited user mobile {string} and password {string} and click Proceed to login',
  { timeout: 120000 },
  async function (mobile, password) {
    const userHubPage = getInvitedUserHubPage(this);
    const usedMobile = await userHubPage.acceptUserInvitationWithCredentials(mobile, password);
    this.invitedUserMobile = usedMobile;
    this.invitedUserPassword = password;
    this.userRegistrationPage = userHubPage.page;
    this.invitedUserPage = userHubPage.page;
    this.page = userHubPage.page;
    console.log(`[UserHub] Entered mobile/password and clicked Proceed to login (${usedMobile})`);
  }
);

When(
  'I accept the user invitation with mobile {string} and password {string}',
  { timeout: 120000 },
  async function (mobile, password) {
    const userHubPage = new UserHubPage(this.userRegistrationPage || this.userInvitationPage || this.page);
    const usedMobile = await userHubPage.acceptUserInvitationWithCredentials(mobile, password);
    this.invitedUserMobile = usedMobile;
    this.invitedUserPassword = password;
    this.userRegistrationPage = userHubPage.page;
    this.page = userHubPage.page;
    console.log(`[UserHub] Accepted invitation with mobile ${usedMobile}`);
  }
);

Then('the invited user invitation page should be displayed', async function () {
  const userHubPage = new UserHubPage(this.userInvitationPage || this.page);
  await userHubPage.expectUserInvitationLandingPage();
});

When('I click Accept Invitation on the invited user page', { timeout: 120000 }, async function () {
  const userHubPage = new UserHubPage(this.userInvitationPage || this.page);
  await userHubPage.clickAcceptInvitationOnLandingPage();
  this.userRegistrationPage = userHubPage.page;
  this.page = this.userRegistrationPage;
});

Then('the invited user registration page should be displayed', async function () {
  const userHubPage = new UserHubPage(this.userRegistrationPage || this.page);
  await userHubPage.expectUserRegistrationPage();
});

When('I enter the invited user mobile number {string}', async function (value) {
  const userHubPage = new UserHubPage(this.userRegistrationPage || this.page);
  const mobile = await userHubPage.fillUserRegistrationMobile(value);
  this.invitedUserMobile = mobile;
  console.log(`[UserHub] Invited user mobile for this run: ${mobile}`);
});

When('I fill the invited user password with {string}', async function (value) {
  const userHubPage = new UserHubPage(this.userRegistrationPage || this.page);
  this.invitedUserPassword = value;
  await userHubPage.fillUserRegistrationPassword(value);
});

When('I fill the invited user confirm password with {string}', async function (value) {
  const userHubPage = new UserHubPage(this.userRegistrationPage || this.page);
  await userHubPage.fillUserRegistrationConfirmPassword(value);
});

When('I click Accept on the invited user registration form', { timeout: 120000 }, async function () {
  const userHubPage = new UserHubPage(this.userRegistrationPage || this.page);
  await userHubPage.clickSubmitInvitedUserRegistration();
});

Then('the invited user invitation should be accepted successfully', async function () {
  const userHubPage = getInvitedUserHubPage(this);
  await userHubPage.expectUserInvitationAccepted();
});

When(
  'I log in as the invited user with the captured mobile and password {string} if required',
  { timeout: 120000 },
  async function (password) {
    const userHubPage = getInvitedUserHubPage(this);
    expect(this.invitedUserMobile, 'Invited user mobile missing — enter mobile on registration first').toBeTruthy();
    await userHubPage.loginInvitedUserIfRequired(this.invitedUserMobile, password, { useMobile: true });
    this.invitedUserPage = userHubPage.page;
    this.page = userHubPage.page;
  }
);

When(
  'I log in as the invited user with mobile {string} and password {string} if required',
  { timeout: 120000 },
  async function (mobile, password) {
    const userHubPage = new UserHubPage(this.userRegistrationPage || this.page);
    await userHubPage.loginInvitedUserIfRequired(
      this.invitedUserMobile || mobile,
      password,
      { useMobile: true }
    );
    this.page = userHubPage.page;
    this.invitedUserPage = userHubPage.page;
  }
);

Then('the invited user should be logged in to the Admin Portal successfully', async function () {
  const userHubPage = getInvitedUserHubPage(this);
  await userHubPage.expectInvitedUserLoggedIn();
});

Then('the invited user should be assigned the role {string}', async function (roleName) {
  const userHubPage = getInvitedUserHubPage(this);
  await userHubPage.expectInvitedUserHasRole(roleName);
});

Then('the invited user should be able to access User Hub per Site Engineer permissions', async function () {
  const userHubPage = getInvitedUserHubPage(this);
  await userHubPage.expectInvitedUserCanAccessUserHub();
});

When('I switch back to the Admin Portal User Hub tab', { timeout: 120000 }, async function () {
  const adminPage = this.userHubAdminPage;
  if (!adminPage || adminPage.isClosed()) {
    throw new Error('Admin Portal tab is missing — cannot switch back.');
  }
  await adminPage.bringToFront();
  this.page = adminPage;
  const userHubPage = new UserHubPage(adminPage);
  userHubPage.lastInvite = {
    ...(userHubPage.lastInvite || {}),
    email: this.invitedUserEmail || userHubPage.lastInvite?.email,
    search: this.invitedUserEmail || userHubPage.lastInvite?.search,
    firstName: this.invitedUserFirstName || userHubPage.lastInvite?.firstName,
    lastName: this.invitedUserLastName || userHubPage.lastInvite?.lastName,
    role: this.invitedUserRole || userHubPage.lastInvite?.role,
  };
  this.userHubPage = userHubPage;
  await userHubPage.navigateToUserHubUsersDirect();
  console.log('[UserHub] Switched back to Admin Portal and opened User Hub users list');
});

When('I navigate to User Hub User Invite in the Admin Portal', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.navigateToUserInviteFromUserHub();
});

When('I refresh the User Hub users list', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.refreshUsersList();
});

When('I search the User Hub users list for the invited user', async function () {
  const userHubPage = getUserHubPage(this);
  expect(this.invitedUserEmail, 'Invited user email missing — fill invite email first').toBeTruthy();
  await userHubPage.searchUsersList(this.invitedUserEmail);
});

When('I search the User Hub users list for {string}', async function (query) {
  const userHubPage = getUserHubPage(this);
  const q = this.invitedUserEmail || query;
  await userHubPage.searchUsersList(q);
});

Then(
  'the invited user should appear in the User Hub users list with status {string} after acceptance',
  { timeout: 120000 },
  async function (status) {
    const userHubPage = getUserHubPage(this);
    expect(this.invitedUserEmail, 'Invited user email missing — fill invite email first').toBeTruthy();
    await userHubPage.expectUserInListWithStatus(this.invitedUserEmail, status);
  }
);

Then(
  'the invited user {string} should appear in the User Hub users list with status {string} after acceptance',
  { timeout: 120000 },
  async function (email, status) {
    const userHubPage = getUserHubPage(this);
    await userHubPage.expectUserInListWithStatus(this.invitedUserEmail || email, status);
  }
);

When('I open the User Hub invited users list', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.navigateToUserHubUsersDirect();
});

When('I click User Invite in User Hub to view invited users', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.navigateToUserHubUsersDirect();
});

Then('I locate the invited user with status {string} in User Hub', { timeout: 120000 }, async function (status) {
  const userHubPage = getUserHubPage(this);
  expect(this.invitedUserEmail, 'Invited user email missing — send invite first').toBeTruthy();
  userHubPage.lastInvite = {
    ...(userHubPage.lastInvite || {}),
    email: this.invitedUserEmail,
    search: this.invitedUserEmail,
  };
  await userHubPage.locateUserInListWithStatus(this.invitedUserEmail, status);
});

Then('I locate a user with status {string} in User Hub', { timeout: 300000 }, async function (status) {
  const userHubPage = getUserHubPage(this);
  const wanted = String(status || '').trim();
  const query =
    /^accepted$/i.test(wanted)
      ? await userHubPage.locateAcceptedUserForDelete()
      : await userHubPage.locateFirstUserWithStatus(wanted);
  this.invitedUserEmail = query;
  console.log(`[UserHub] Located user with status ${wanted}: ${query}`);
});

Then('I locate an accepted user for delete in User Hub', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  const query = await userHubPage.locateAcceptedUserForDelete();
  this.invitedUserEmail = query;
  console.log(`[UserHub] Located Accepted user for delete: ${query}`);
});

When('I open the three-dot menu for the located User Hub user', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openUserActionMenuForLocatedUser();
});

When('I click Edit on the User Hub user', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickEditUser();
});

Then('the Edit User form should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectEditUserFormDisplayed();
});

When('I update the User Hub user first name to {string}', async function (value) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.updateEditUserFirstName(value);
});

When('I update the User Hub user last name to {string}', async function (value) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.updateEditUserLastName(value);
});

When('I update the User Hub user email to {string}', async function (value) {
  const userHubPage = getUserHubPage(this);
  const email = await userHubPage.updateEditUserEmail(value);
  this.invitedUserEmail = email;
  console.log(`[UserHub] Updated user email for this run: ${email}`);
});

When('I update the User Hub user role to {string}', async function (roleName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.updateEditUserRole(roleName);
  this.invitedUserRole = roleName;
});

When('I click Save on the User Hub Edit User form', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickSaveEditUser();
});

Then('the User Hub user should be updated successfully', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUserUpdatedSuccessfully();
});

Then('I should see User Hub user updated success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUserUpdatedToast();
});

Then('the updated User Hub user details should be displayed in the users list', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUpdatedUserDetailsInList();
});

Then('I locate a pending user with Yopmail email in User Hub', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  const query = await userHubPage.locateFirstPendingUserWithYopmailEmail();
  this.invitedUserEmail = query;
  console.log(`[UserHub] Located Pending Yopmail user for resend: ${query}`);
});

When('I click Resend Invitation for the User Hub user', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickResendInvitation();
});

Then('the resend invitation confirmation popup should be displayed if applicable', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectResendInvitationConfirmationPopup();
});

When('I confirm resend invitation for the User Hub user', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.confirmResendInvitation();
});

Then('I should see User Hub invitation resent success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectInvitationResentToast();
});

When('I wait for the new user invitation email after resend', { timeout: 180000 }, async function () {
  if (!this.yopmailPage) {
    throw new Error('Yopmail tab missing: open Yopmail for the invited user first.');
  }
  const yp = this.userHubYopmailPageObject || new UserHubPage(this.yopmailPage);
  await yp.captureYopmailInboxBaseline();
  await yp.waitForNewUserInvitationEmailAfterResend();
  this.userHubYopmailPageObject = yp;
});

When('I open the latest user invitation email in Yopmail', async function () {
  const yp = this.userHubYopmailPageObject || new UserHubPage(this.yopmailPage);
  await yp.openLatestUserInvitationEmail();
  this.userHubYopmailPageObject = yp;
});

Then('the user invitation link should be valid', async function () {
  const yp = this.userHubYopmailPageObject || new UserHubPage(this.yopmailPage);
  await yp.expectInvitationLinkValid();
});

When('I click Delete on the User Hub user', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickDeleteUser();
});

Then('the Delete User confirmation popup should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectDeleteUserConfirmationDisplayed();
});

Then(
  'the Delete User confirmation message for the located User Hub user should be displayed correctly',
  async function () {
    const userHubPage = getUserHubPage(this);
    await userHubPage.expectDeleteUserConfirmationMessageForLocatedUser();
  }
);

Then('the Delete User confirmation should not require lead reassignment in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectNoLeadReassignmentInDeleteUserPopup();
});

Then('the Delete User confirmation should show the assignee removal note in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectDeleteUserAssigneeRemovalNote();
});

When('I enter the User Hub delete reason {string}', async function (reason) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.fillDeleteUserReason(reason);
});

When('I confirm Delete User in User Hub', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.confirmDeleteUser();
});

When('I click Yes on the User Hub Delete User confirmation popup', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickYesOnDeleteUserConfirmation({ fillReasonIfNeeded: false });
});

When(
  'I click Yes on the User Hub Delete User confirmation to open Lead Assignment',
  { timeout: 300000 },
  async function () {
    const userHubPage = getUserHubPage(this);
    await userHubPage.clickYesOnDeleteUserConfirmationExpectingLeadAssignment({
      fillReasonIfNeeded: false,
    });
    this.invitedUserEmail = userHubPage.locatedUserQuery || this.invitedUserEmail;
  }
);

When(
  'I open Lead Assignment on the User Hub Delete confirmation with assignee',
  { timeout: 300000 },
  async function () {
    const userHubPage = getUserHubPage(this);
    await userHubPage.openLeadAssignmentFromDeleteConfirmation();
    this.invitedUserEmail = userHubPage.locatedUserQuery || this.invitedUserEmail;
  }
);

When(
  'I complete Lead Assignment on the User Hub Delete confirmation with assignee',
  { timeout: 180000 },
  async function () {
    const userHubPage = getUserHubPage(this);
    await userHubPage.completeLeadAssignmentOnDeleteConfirmationWithAssignee();
    this.invitedUserEmail = userHubPage.locatedUserQuery || this.invitedUserEmail;
  }
);
When(
  'I click Yes on the User Hub assignee popup without selecting an assignee if displayed',
  { timeout: 120000 },
  async function () {
    const userHubPage = getUserHubPage(this);
    await userHubPage.clickYesOnAssigneePopupWithoutSelectingIfDisplayed();
  }
);

Then('I locate an accepted user with assigned leads in User Hub', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  const query = await userHubPage.locateAcceptedUserWithAssignedLeads();
  this.invitedUserEmail = query;
  console.log(`[UserHub] Located first Accepted user: ${query}`);
});

Then('I locate the first accepted user in User Hub', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  const query = await userHubPage.locateAcceptedUserWithAssignedLeads();
  this.invitedUserEmail = query;
  console.log(`[UserHub] Located first Accepted user: ${query}`);
});

Then('the located User Hub user should be assigned to one or more leads', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLocatedUserHasAssignedLeads();
});

Then('the Lead Assignment confirmation popup should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLeadAssignmentConfirmationPopup();
});

Then('the Lead Assignment popup should provide Reassign and Unassign options', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLeadAssignmentReassignUnassignOptions();
});

When('I select Reassign on the User Hub Lead Assignment popup', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.selectLeadAssignmentReassignOption();
});

When('I select an assignee on the User Hub Lead Assignment popup', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.selectLeadAssignmentAssignee();
});

When('I confirm Lead reassignment on the User Hub Lead Assignment popup', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.confirmLeadReassignment();
});

Then('the User Hub leads should be successfully reassigned', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLeadsSuccessfullyReassigned();
});

When('I click Delete User on the User Hub Lead Assignment popup', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickDeleteUserOnLeadAssignmentPopup();
});
Then('I should see User Hub user deleted success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUserDeletedToast();
});

Then('the located User Hub user should not appear in the users list', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUserRemovedFromList();
});

When('I search the User Hub users list for the located user', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.searchLocatedUserInList();
});

Then('the located User Hub user should not be found in the User Hub users search results', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLocatedUserNotFoundAfterSearch();
});

When('I click on Teams in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickTeams();
});

Then('the User Hub Teams page should be displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectTeamsPageDisplayed();
});

When('I click Create Team in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickCreateTeam();
});

Then('the User Hub Create Team form should be displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectCreateTeamFormDisplayed();
});

Then('the User Hub Create Team branch name should be {string}', async function (branchName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectCreateTeamBranchName(branchName);
});

Then('the User Hub Create Team branch name should not be editable if applicable', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectCreateTeamBranchNotEditableIfApplicable();
});

When('I enter the User Hub team name {string}', async function (teamName) {
  const userHubPage = getUserHubPage(this);
  const name = await userHubPage.fillTeamName(teamName);
  this.userHubTeamName = name;
  console.log(`[UserHub] Team name for this run: ${name}`);
});

When('I enter the User Hub team description {string}', async function (description) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.fillTeamDescription(description);
});

When('I open the User Hub team members list', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openTeamMembersList();
});

When('I select {int} available members for the User Hub team', async function (count) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.selectAvailableTeamMembers(count);
});

Then('{int} selected members should be added to the User Hub team', async function (count) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectSelectedTeamMembersAdded(count);
});

When('I click Create on the User Hub Create Team form', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickSaveCreateTeam();
});

Then('the User Hub team should be created successfully', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectTeamCreatedSuccessfully();
});

Then('I should see User Hub team created success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectTeamCreatedToast();
});

Then('the User Hub team {string} should appear in the Teams list', async function (teamName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectTeamInList(this.userHubTeamName || teamName);
});

When('I open the created User Hub team if applicable', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openCreatedTeamIfApplicable();
});

Then('the selected User Hub team members should be displayed under the team', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectSelectedTeamMembersDisplayedUnderTeam();
});

Then('the User Hub team branch name should be displayed as {string}', async function (branchName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectTeamBranchNameDisplayed(branchName);
});

When('I locate the User Hub team {string} in the Teams list', { timeout: 180000 }, async function (teamPattern) {
  const userHubPage = getUserHubPage(this);
  const name = await userHubPage.locateTeamInList(teamPattern);
  this.userHubTeamName = name;
});

When('I open the three-dot menu for the located User Hub team', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openTeamActionMenuForLocatedTeam();
});

When('I click Edit on the User Hub team', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickEditTeam();
});

Then('the User Hub Edit Team form should be displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectEditTeamFormDisplayed();
});

Then('the User Hub Edit Team branch name should be {string}', async function (branchName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectEditTeamBranchName(branchName);
});

When('I update the User Hub team name to {string}', async function (teamName) {
  const userHubPage = getUserHubPage(this);
  const name = await userHubPage.updateTeamName(teamName);
  this.userHubTeamName = name;
  console.log(`[UserHub] Updated team name for this run: ${name}`);
});

When('I update the User Hub team description to {string}', async function (description) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.updateTeamDescription(description);
});

When('I remove one existing member from the User Hub team if applicable', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.removeOneExistingTeamMemberIfApplicable();
});

When('I add another member to the User Hub team from the available list', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.addAnotherTeamMemberFromAvailableList();
});

Then('the updated User Hub team member list should be displayed correctly', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUpdatedTeamMemberListDisplayed();
});

When('I click Save on the User Hub Edit Team form', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickSaveEditTeam();
});

Then('the User Hub team should be updated successfully', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectTeamUpdatedSuccessfully();
});

Then('I should see User Hub team updated success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectTeamUpdatedToast();
});

When('I open the updated User Hub team if applicable', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openUpdatedTeamIfApplicable();
});

Then('the updated User Hub team description should be displayed correctly', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUpdatedTeamDescriptionDisplayed();
});

Then('the updated User Hub team members should be displayed', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectUpdatedTeamMembersDisplayed();
});

When('I click Delete on the User Hub team', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.clickDeleteTeam();
});

Then('the Delete Team reassign confirmation popup should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectDeleteTeamConfirmationDisplayed();
});

Then(
  'the Delete Team reassign confirmation message for the located User Hub team should be displayed correctly',
  async function () {
    const userHubPage = getUserHubPage(this);
    await userHubPage.expectDeleteTeamConfirmationMessageForLocatedTeam();
  }
);

When('I click Delete on the User Hub team delete confirmation popup', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.confirmDeleteTeam();
});

Then('the Delete Team confirmation popup should be displayed in User Hub', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectDeleteTeamConfirmationDisplayed();
});

Then(
  'the Delete Team confirmation message for the located User Hub team should be displayed correctly',
  async function () {
    const userHubPage = getUserHubPage(this);
    await userHubPage.expectDeleteTeamConfirmationMessageForLocatedTeam();
  }
);

When('I open the User Hub team delete reassign dropdown', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.openTeamDeleteReassignDropdown();
});

When('I select {string} from the User Hub team delete reassign dropdown', async function (teamName) {
  const userHubPage = getUserHubPage(this);
  await userHubPage.selectTeamDeleteReassignTarget(teamName);
});

When('I confirm Delete Team in User Hub', { timeout: 120000 }, async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.confirmDeleteTeam();
});

Then('I should see User Hub team deleted success toast', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectTeamDeletedToast();
});

Then('the located User Hub team should not appear in the Teams list', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLocatedTeamNotInTeamsList();
});

When('I search the User Hub Teams list for the located team', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.searchLocatedTeamInList();
});

Then('the located User Hub team should not be found in the User Hub Teams search results', async function () {
  const userHubPage = getUserHubPage(this);
  await userHubPage.expectLocatedTeamNotFoundAfterSearch();
});
