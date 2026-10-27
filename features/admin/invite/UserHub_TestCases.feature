# -----------------------------------------------------------------------------
# User Hub — Roles & Users — incremental TCs in ONE file.
#
# Admin: kumar@diy.in / Simple@10 only (never switch account).
# Do not click organization Domain setup Continue.
#
# File order is the run order. Creates and edits run first. Deletes run last,
# so a later case still has the user, team, or role the earlier case needs.
#
#  1. TC-01 Add Role
#  2. TC-02 Edit Role
#  3. TC-04 Invite User and accept (creates an Accepted user)
#  4. TC-05 Edit Pending User
#  5. TC-06 Resend Invitation (same Pending user, before it is deleted)
#  6. TC-08 Create Team (members still exist)
#  7. TC-09 Edit Team (renames the team from TC-08)
#  8. TC-13 Delete Role with users (users are still assigned)
#  9. TC-14 Delete Role with no users
# 10. TC-07 Delete Pending User
# 11. TC-10 Delete Team
# 12. TC-11 Delete Accepted User
# 13. TC-12 Delete Accepted User (assignee-removal note)
# 14. TC-03 Delete first role row (last — removes a role other cases may still need)
#
# TS-01 Add Role — @TS01 @TC01
# TS-02 Edit Role — @TS02 @TC02
# TS-04 Invite User — email only on invite form; mobile + password on accept/login
# TS-05 Edit Pending User — use existing Pending user → Edit → verify update + status Pending
# TS-06 Resend Invitation — Pending user → Resend → verify toast
# TS-08 Create Team — Teams → Create Team → UHCreateTeam-<id> → 3 members → toast → list → open → members
# TS-09 Edit Team — locate UHCreateTeam → Edit → rename to UHEditTeam-<id> → verify
# TS-13 Delete Role with users — role with users → Delete → reassign users → delete role → verify removal
# TS-14 Delete Role with no users — empty role → Delete → no Assign/Reassign popup → toast → verify removal
# TS-07 Delete Pending User — Pending user → Delete → verify removed from list
# TS-10 Delete Team — locate UHEditTeam → Delete → verify removal + search
#   If that team is already gone, TC-10 creates a new "UHEditTeam-<id>".
#   If it is the only team, TC-10 also creates a second team so the next run can delete again.
# TS-11 Delete Accepted User — Accepted user → Delete → reason → Yes → assignee Yes (no select) → verify removal + search
# TS-12 Delete Accepted User — Accepted → Delete → assignee-removal note → reason → Yes → verify removal + search
# TS-03 Delete Role — first role row in Roles list → Delete → toast → gone from list/search
#
# Run ALL User Hub TCs (TC-01 through TC-14):
#   npx.cmd cucumber-js --tags "@userhub-tc01-tc14"
#
# Run only the cases that failed in the last full run (TC-04, TC-08, TC-12):
#   npx.cmd cucumber-js --tags "@userhub-failed"
#
# Run one case (PowerShell: use npx.cmd / npm.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js --tags "@userhub and @TC01"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS01 and @TC01"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS02 and @TC02"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS03 and @TC03"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS04 and @TC04"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS05 and @TC05"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS06 and @TC06"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS07 and @TC07"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS08 and @TC08"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS09 and @TC09"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS10 and @TC10"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS11 and @TC11"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS12 and @TC12"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS13 and @TC13"
#   npx.cmd cucumber-js features/admin/invite/UserHub_TestCases.feature --tags "@TS14 and @TC14"
#   npx.cmd cucumber-js --tags "@userhub-all"
#
# npm:
#   npm.cmd run test:admin:invite:userhub:tc01
#   npm.cmd run test:admin:invite:userhub:tc02
#   npm.cmd run test:admin:invite:userhub:tc03
#   npm.cmd run test:admin:invite:userhub:tc04
#   npm.cmd run test:admin:invite:userhub:tc05
#   npm.cmd run test:admin:invite:userhub:tc06
#   npm.cmd run test:admin:invite:userhub:tc07
#   npm.cmd run test:admin:invite:userhub:tc08
#   npm.cmd run test:admin:invite:userhub:tc09
#   npm.cmd run test:admin:invite:userhub:tc10
#   npm.cmd run test:admin:invite:userhub:tc11
#   npm.cmd run test:admin:invite:userhub:tc12
#   npm.cmd run test:admin:invite:userhub:tc13
#   npm.cmd run test:admin:invite:userhub:tc14
#   npm.cmd run test:admin:invite:userhub:all
#   npm.cmd run test:admin:invite:userhub:roles
#
# Layering: `AGENTS.md` — scenarios here;
#            logic in pages/admin/invite/UserHubPage.js;
#            step-definitions/admin/invite/UserHubStep.js
# -----------------------------------------------------------------------------

@userhub @userhub-all @userhub-tc01-tc14 @roles @userhub-roles @userhub-users @ashraf-modules
Feature: User Hub — incremental test cases

  # ===========================================================================
  # TS-01 — Add Role (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Create Project Manager role with permissions in User Hub Roles
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click on Roles in User Hub
    Then the User Hub Roles page should be displayed
    When I click Add Role in User Hub
    Then the Add Role form should be displayed in User Hub
    When I enter the User Hub role name "Project Manager"
    And I enter the User Hub role description "For plumbing work for kitchen"
    And I enable the Activity Tracker permission in User Hub Add Role
    And I enable the CRM Automation permission in User Hub Add Role
    And I enable the required Features permission in User Hub Add Role
    And I enable the required People permission in User Hub Add Role
    When I click Save on the User Hub Add Role form
    Then the User Hub role should be created successfully
    And I should see User Hub role success toast
    Then the role "Project Manager" should appear in the User Hub Roles list with description "For plumbing work for kitchen" and selected permissions

  # ===========================================================================
  # TS-02 — Edit Role (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @regression @positive
  Scenario: TC-02 — Edit Project Manager role to Electrician in User Hub Roles
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click on Roles in User Hub
    Then the User Hub Roles page should be displayed
    When I locate the User Hub role "Project Manager" or "Electrician" in the Roles list
    And I open the three-dot menu for the located User Hub role
    And I click Edit on the User Hub role
    Then the Edit Role form should be displayed in User Hub
    When I change the User Hub role name to "Electrician"
    And I change the User Hub role description to "Electrical work for home and kitchen"
    Then the existing User Hub role permissions should be displayed
    And I enable the Activity Tracker permission in User Hub Edit Role
    And I enable the CRM Automation permission in User Hub Edit Role
    And I enable the required Features permission in User Hub Edit Role
    And I enable the required People permission in User Hub Edit Role
    When I click Save on the User Hub Edit Role form
    Then the User Hub role should be updated successfully
    And I should see User Hub role updated success toast
    Then the role "Electrician" should appear in the User Hub Roles list with description "Electrical work for home and kitchen"
    When I open Edit for User Hub role "Electrician"
    Then the User Hub Edit Role form should show role name "Electrician"
    And the User Hub Edit Role form should show description "Electrical work for home and kitchen"
    And the User Hub Edit Role form should have Activity Tracker, CRM Automation, Features, and People permissions enabled

  # ===========================================================================
  # TS-04 — Invite User (@TS04 @TC04)
  # Admin Portal invite → Yopmail → user registration → Accepted status
  # ===========================================================================

   @userhub-failed
  Scenario: TC-04 — Invite user from Admin Portal, accept from Yopmail, and verify Accepted status
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I navigate to User Hub user invite form
    Then the User Hub User Invite form should be displayed
    When I fill the User Hub invite first name with "Bhavani"
    And I fill the User Hub invite last name with "ZZ"
    And I fill the User Hub invite email with "bhavanihub@yopmail.com"
    And I select the User Hub invite role "Site Engineer"
    And I click Send Invite on the User Hub invite form
    Then the user invitation should be sent successfully from User Hub
    And I should see User Hub user invitation success toast
    When I open Yopmail for the invited user
    And I wait for the user invitation email to be received
    Then the user invitation email should be received successfully
    And the user invitation email should show invited user name "Bhavani"
    And the user invitation email should contain an invitation link
    When I extract and open the user invitation URL
    When I enter invited user mobile "9876543210" and password "Bhavani@123" and click Proceed to login
    Then the invited user invitation should be accepted successfully
    When I log in as the invited user with the captured mobile and password "Bhavani@123" if required
    Then the invited user should be logged in to the Admin Portal successfully
    When I switch back to the Admin Portal User Hub tab
    And I refresh the User Hub users list
    And I search the User Hub users list for the invited user
    Then the invited user should appear in the User Hub users list with status "Accepted" after acceptance

  # ===========================================================================
  # TS-05 — Edit Pending User (@TS05 @TC05)
  # Existing Pending user → Users list → Edit → verify update + status Pending
  # ===========================================================================

  @TS05 @TC05 @regression @positive @userhub-users
  Scenario: TC-05 — Edit pending invited user in User Hub and verify status remains Pending
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click User Invite in User Hub to view invited users
    Then I locate a user with status "Pending" in User Hub
    When I open the three-dot menu for the located User Hub user
    And I click Edit on the User Hub user
    Then the Edit User form should be displayed in User Hub
    When I update the User Hub user first name to "Hari"
    And I update the User Hub user last name to "M"
    And I update the User Hub user email to "harihub@yopmail.com"
    And I update the User Hub user role to "Project Manager"
    And I click Save on the User Hub Edit User form
    Then the User Hub user should be updated successfully
    And I should see User Hub user updated success toast
    Then the updated User Hub user details should be displayed in the users list
    And the invited user should appear in the User Hub users list with status "Pending"

  # ===========================================================================
  # TS-06 — Resend Invitation (@TS06 @TC06)
  # Existing Pending user → Resend → verify resent toast
  # ===========================================================================

  @TS06 @TC06 @regression @positive @userhub-users
  Scenario: TC-06 — Resend invitation for pending user and verify success toast
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click User Invite in User Hub to view invited users
    Then I locate a user with status "Pending" in User Hub
    When I open the three-dot menu for the located User Hub user
    And I click Resend Invitation for the User Hub user
    Then the resend invitation confirmation popup should be displayed if applicable
    When I confirm resend invitation for the User Hub user
    Then I should see User Hub invitation resent success toast

  # ===========================================================================
  # TS-08 — Create Team (@TS08 @TC08)
  # Login → User Hub → Teams → Create Team → Branch HQ (non-editable if applicable) →
  # Team Name "UHCreateTeam" (auto-suffixed unique id) → Description → Members → Create →
  # toast → team in list → open team → verify 3 members under the team
  # ===========================================================================

   @userhub-failed
  Scenario: TC-08 — Create UHCreateTeam in User Hub Teams with three members
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click on Teams in User Hub
    Then the User Hub Teams page should be displayed
    When I click Create Team in User Hub
    Then the User Hub Create Team form should be displayed
    And the User Hub Create Team branch name should be "Default Headquarters (HQ)"
    And the User Hub Create Team branch name should not be editable if applicable
    When I enter the User Hub team name "UHCreateTeam"
    And I enter the User Hub team description "Team created for managing new project activities and coordination."
    When I open the User Hub team members list
    And I select 3 available members for the User Hub team
    Then 3 selected members should be added to the User Hub team
    When I click Create on the User Hub Create Team form
    Then the User Hub team should be created successfully
    And I should see User Hub team created success toast
    Then the User Hub team "UHCreateTeam" should appear in the Teams list
    When I open the created User Hub team if applicable
    Then the selected User Hub team members should be displayed under the team

  # ===========================================================================
  # TS-09 — Edit Team (@TS09 @TC09)
  # Requires UHCreateTeam — auto-creates via TC-08 setup if missing
  # ===========================================================================

  @TS09 @TC09 @regression @positive @userhub-teams
  Scenario: TC-09 — Edit UHCreateTeam in User Hub Teams and rename to UHEditTeam
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click on Teams in User Hub
    Then the User Hub Teams page should be displayed
    When I locate the User Hub team "UHCreateTeam" in the Teams list
    And I open the three-dot menu for the located User Hub team
    And I click Edit on the User Hub team
    Then the User Hub Edit Team form should be displayed
    And the User Hub Edit Team branch name should be "Default Headquarters (HQ)"
    When I update the User Hub team name to "UHEditTeam"
    And I update the User Hub team description to "Team responsible for handling project planning, execution, and coordination."
    When I remove one existing member from the User Hub team if applicable
    And I add another member to the User Hub team from the available list
    Then the updated User Hub team member list should be displayed correctly
    When I click Save on the User Hub Edit Team form
    Then the User Hub team should be updated successfully
    And I should see User Hub team updated success toast
    Then the User Hub team "UHEditTeam" should appear in the Teams list
    When I open the updated User Hub team if applicable
    Then the updated User Hub team description should be displayed correctly
    And the updated User Hub team members should be displayed
    And the User Hub team branch name should be displayed as "Default Headquarters (HQ)"

  # ===========================================================================
  # TS-13 — Delete Role with Assigned Users (@TS13 @TC13)
  # Role with users → Delete → Assign/Reassign User popup → reassign → delete → verify removal
  # ===========================================================================

  @TS13 @TC13 @regression @positive @userhub-roles
  Scenario: TC-13 — Delete role with assigned users after reassigning them to another role
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click on Roles in User Hub
    Then the User Hub Roles page should be displayed
    Then I locate a User Hub role with assigned users
    When I open the three-dot menu for the located User Hub role
    And I click Delete on the User Hub role
    Then the Assign Reassign User popup should be displayed in User Hub
    And the Assign Reassign User popup should display users assigned to the located role
    When I select another available role to reassign User Hub role users
    And I click Delete on the User Hub Assign Reassign User popup
    Then the User Hub role users should be successfully reassigned
    And the User Hub role deletion should continue
    When I confirm Delete Role in User Hub if displayed
    Then I should see User Hub role deleted success toast
    And the located User Hub role should not appear in the User Hub Roles list
    When I search the User Hub Roles list for the located User Hub role
    Then the located User Hub role should not be found in the User Hub Roles search results

  # ===========================================================================
  # TS-14 — Delete Role with No Assigned Users (@TS14 @TC14)
  # Empty role → Delete → no Assign/Reassign popup → toast → verify removal + search
  # ===========================================================================

  @TS14 @TC14 @regression @positive @userhub-roles
  Scenario: TC-14 — Delete role with no users assigned and verify direct deletion
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click on Roles in User Hub
    Then the User Hub Roles page should be displayed
    Then I locate a User Hub role with no assigned users
    When I open the three-dot menu for the located User Hub role
    And I click Delete on the User Hub role
    Then the User Hub role should be deleted without the Assign Reassign User popup
    Then I should see User Hub role deleted success toast
    And the located User Hub role should not appear in the User Hub Roles list
    When I search the User Hub Roles list for the located User Hub role
    Then the located User Hub role should not be found in the User Hub Roles search results

  # ===========================================================================
  # TS-07 — Delete Pending User (@TS07 @TC07)
  # Existing Pending user → Delete → verify toast + removed from list/search
  # ===========================================================================

  @TS07 @TC07 @regression @positive @userhub-users
  Scenario: TC-07 — Delete pending invited user from User Hub and verify removal
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click User Invite in User Hub to view invited users
    Then I locate a user with status "Pending" in User Hub
    When I open the three-dot menu for the located User Hub user
    And I click Delete on the User Hub user
    Then the Delete User confirmation popup should be displayed in User Hub
    And the Delete User confirmation message for the located User Hub user should be displayed correctly
    When I enter the User Hub delete reason "For automation testing"
    And I confirm Delete User in User Hub
    Then I should see User Hub user deleted success toast
    And the located User Hub user should not appear in the users list
    When I search the User Hub users list for the located user
    Then the located User Hub user should not be found in the User Hub users search results

  # ===========================================================================
  # TS-10 — Delete Team (@TS10 @TC10)
  # Deletes UHEditTeam. If it is already gone, creates a new unique UHEditTeam-<id> and deletes that.
  # If no other team is left to reassign to, creates another team so the next delete can run.
  # ===========================================================================

  @TS10 @TC10 @regression @positive @userhub-teams
  Scenario: TC-10 — Delete UHEditTeam from User Hub Teams and verify removal
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click on Teams in User Hub
    Then the User Hub Teams page should be displayed
    When I locate the User Hub team "UHEditTeam" in the Teams list
    And I open the three-dot menu for the located User Hub team
    And I click Delete on the User Hub team
    Then the Delete Team reassign confirmation popup should be displayed in User Hub
    And the Delete Team reassign confirmation message for the located User Hub team should be displayed correctly
    When I open the User Hub team delete reassign dropdown
    And I select "Admins" from the User Hub team delete reassign dropdown
    And I click Delete on the User Hub team delete confirmation popup
    Then I should see User Hub team deleted success toast
    And the located User Hub team should not appear in the Teams list
    When I search the User Hub Teams list for the located team
    Then the located User Hub team should not be found in the User Hub Teams search results

  # ===========================================================================
  # TS-11 — Delete Accepted User (@TS11 @TC11)
  # Accepted user → Delete → reason → Yes → assignee popup Yes (no assignee) → verify removal
  # ===========================================================================

  @TS11 @TC11 @regression @positive @userhub-users
  Scenario: TC-11 — Delete accepted user from User Hub without lead reassignment and verify removal
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click User Invite in User Hub to view invited users
    Then I locate a user with status "Accepted" in User Hub
    When I open the three-dot menu for the located User Hub user
    And I click Delete on the User Hub user
    Then the Delete User confirmation popup should be displayed in User Hub
    And the Delete User confirmation message for the located User Hub user should be displayed correctly
    When I enter the User Hub delete reason "For automation testing"
    And I click Yes on the User Hub Delete User confirmation popup
    And I click Yes on the User Hub assignee popup without selecting an assignee if displayed
    Then I should see User Hub user deleted success toast
    And the located User Hub user should not appear in the users list
    When I search the User Hub users list for the located user
    Then the located User Hub user should not be found in the User Hub users search results

  # ===========================================================================
  # TS-12 — Delete Accepted User (assignee note) (@TS12 @TC12)
  # Accepted → Delete → verify assignee-removal note → reason → Yes → verify removal
  # (Live UI has no separate Assign Lead popup; assignees are removed on delete.)
  # ===========================================================================

  @TS12 @TC12 @regression @positive @userhub-users @userhub-failed
  Scenario: TC-12 — Delete accepted user and verify assignee removal note then removal from list
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click User Invite in User Hub to view invited users
    Then I locate the first accepted user in User Hub
    When I open the three-dot menu for the located User Hub user
    And I click Delete on the User Hub user
    Then the Delete User confirmation popup should be displayed in User Hub
    And the Delete User confirmation message for the located User Hub user should be displayed correctly
    And the Delete User confirmation should show the assignee removal note in User Hub
    When I enter the User Hub delete reason "For automation testing"
    And I click Yes on the User Hub Delete User confirmation popup
    Then I should see User Hub user deleted success toast
    And the located User Hub user should not appear in the users list
    When I search the User Hub users list for the located user
    Then the located User Hub user should not be found in the User Hub users search results

  # ===========================================================================
  # TS-03 — Delete Role (@TS03 @TC03)
  # Delete the first role row in the Roles list (no fixed role name)
  # ===========================================================================

  @TS03 @TC03 @regression @positive
  Scenario: TC-03 — Delete first role row from User Hub Roles
    Given I am logged in
    Then I should be logged in successfully
    When I navigate to User Hub
    And I click on Roles in User Hub
    Then the User Hub Roles page should be displayed
    When I locate the first User Hub role in the Roles list
    And I click the three-dot menu for the located User Hub role and click Delete
    Then the Delete Role confirmation popup should be displayed in User Hub
    And the Delete Role confirmation message for the located User Hub role should be displayed correctly
    When I confirm Delete Role in User Hub
    Then I should see User Hub role deleted success toast
    Then the located User Hub role should not appear in the User Hub Roles list
    When I search the User Hub Roles list for the located User Hub role
    Then the located User Hub role should not be found in the User Hub Roles search results
