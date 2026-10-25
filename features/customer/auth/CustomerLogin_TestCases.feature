# -----------------------------------------------------------------------------
# Customer Portal — incremental TCs in ONE file.
#
# TS-01 Customer Login — @TS01 @TC01
#   TC-01 — Admin: vasanth project client email → Customer Portal OTP via Yopmail
# TS-02 My Profile — @TS02 @TC02
#   TC-02 — My Profile → Edit name to Hari → verify in Customer Portal + Admin Client tab
# TS-03 My Files — @TS03 @TC03
#   TC-03 — kumarorganization client: Files → My Files → Create Folder → verify in Admin Document Client section
# TS-04 Upload Folder — @TS04 @TC04
#   TC-04 — Upload folder into My Folder (manual folder pick + upload, press ENTER to resume) → verify in Admin Document Client section
# TS-05 Schedule Meeting — @TS05 @TC05
#   TC-05 — Admin OTP login → Schedule Online Meeting → verify Lead Dashboard + Event module
# TS-06 Schedule Offline Meeting — @TS06 @TC06
#   TC-06 — Admin OTP login → Schedule Offline Meeting → verify Lead Dashboard + Event module
#   Portal: https://staging-bac9-intoaec1.wpcomstaging.com/cutomer-portal/
#
# Run ALL customer portal TCs (TC-01 through TC-06):
#   npx.cmd cucumber-js --tags "@customer-tc01-tc06"
#   npx.cmd cucumber-js --tags "@customer-all"
#   npx.cmd cucumber-js --tags "@customer-portal"
#
# Run one case (PowerShell: use npx.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js --tags "@customer-portal and @TC01"
#   npx.cmd cucumber-js --tags "@customer-portal and @TC02"
#   npx.cmd cucumber-js --tags "@customer-portal and @TC03"
#   npx.cmd cucumber-js --tags "@customer-portal and @TC04"
#   npx.cmd cucumber-js --tags "@customer-portal and @TC05"
#   npx.cmd cucumber-js --tags "@customer-portal and @TC06"
#
# npm:
#   npm.cmd run test:customer:all
#   npm.cmd run test:customer:auth:login
#   npm.cmd run test:customer:auth:login:tc01
#   npm.cmd run test:customer:auth:login:tc02
#   npm.cmd run test:customer:auth:login:tc03
#   npm.cmd run test:customer:auth:login:tc04
#   npm.cmd run test:customer:auth:login:tc05
#   npm.cmd run test:customer:auth:login:tc06
#
# Layering: `AGENTS.md` — scenarios here;
#            logic in pages/customer/auth/CustomerLoginPage.js,
#            pages/customer/auth/CustomerPortalYopmailPage.js,
#            pages/customer/profile/CustomerProfilePage.js,
#            pages/customer/files/CustomerMyFilesPage.js,
#            pages/customer/meeting/CustomerScheduleMeetingPage.js,
#            pages/admin/client/AdminClientPage.js,
#            pages/admin/client/AdminClientDocumentPage.js,
#            pages/admin/client/AdminClientMeetingPage.js;
#            step-definitions/customer/auth/CustomerLoginStep.js,
#            step-definitions/customer/files/CustomerFilesStep.js,
#            step-definitions/customer/meeting/CustomerMeetingStep.js
# -----------------------------------------------------------------------------

@customer @customer-portal @customer-login @customer-all @customer-tc01-tc06 @ashraf-modules
Feature: Customer Portal — incremental test cases

  # ===========================================================================
  # TS-01 — Customer Login (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Customer portal OTP login using vasanth project client email from Admin
    Given I am logged in
    Then the Admin Portal login should be successful
    When I navigate to the Projects page
    And I select the client "vasanth"
    And I navigate to the project Client section
    And I open the client "vasanth" details
    And I capture the client email for contact "vasanth"
    When I navigate to the Customer Portal login page
    Then the Customer Portal Login page should be displayed
    When I enter the captured client email on the Customer Portal
    And I open Yopmail for the captured client email in a new browser tab
    And I click Login or Continue on the Customer Portal
    Then the Customer Portal OTP verification page should be displayed
    And I wait for the Customer Portal OTP email in Yopmail and retrieve the OTP
    And I switch back to the Customer Portal tab
    And I enter the received OTP on the Customer Portal
    And I click Verify or Login on the Customer Portal
    Then I should be logged in to the Customer Portal successfully

  # ===========================================================================
  # TS-02 — My Profile (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Edit customer My Profile and verify changes in Admin Portal
    Given I am logged in
    Then the Admin Portal login should be successful
    When I navigate to the Projects page
    And I select the client "kumarorganization"
    And I navigate to the project Client section
    And I open the client "Hari" details
    And I capture the client email for contact "Hari"
    And I am logged in to the customer portal
    When I navigate to the customer My Profile page
    Then the customer My Profile page should be displayed
    When I click the customer profile Edit button
    Then the customer profile edit page should be displayed
    When I fill the customer profile name with "Hari"
    Then the customer profile email should display the captured client email
    When I fill the customer profile mobile number with "+91356478667"
    And I fill the customer profile address with "Chennai Central, into, chennai"
    And I fill the customer profile city with "Chennai"
    And I select the customer profile state "Tamil Nadu"
    And I select the customer profile country "India"
    And I fill the customer profile zip code with "600063"
    And I click the customer profile Save or Update button
    Then I should see customer profile success toast "Profile updated successfully."
    When I switch back to the Admin Portal for client verification
    And I open the admin project "kumarorganization" for updated client profile verification
    When I click Edit on the admin client profile
    And I ensure the admin client profile has the updated Hari details
    And I click Save or Update on the admin client profile
    Then the admin client profile should display the updated Hari details

  # ===========================================================================
  # TS-03 — My Files (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Create My Folder for kumarorganization client and verify in Admin Document
    Given I am logged in
    Then the Admin Portal login should be successful
    When I navigate to the Projects page
    And I select the client "kumarorganization"
    And I navigate to the project Client section
    And I open the client "Hari" details
    And I capture the client email for contact "Hari"
    And I am logged in to the customer portal
    When I navigate to the customer Files section
    And I click My Files on the customer portal
    Then the customer My Files page should be displayed
    When I click Create on the customer My Files page
    And I enter a unique customer folder name with base "My Folder"
    And I click Create on the customer folder dialog
    Then the customer folder should be created successfully
    And the customer folder should be displayed in the My Files list
    When I switch back to the Admin Portal for client verification
    And I open the admin project "kumarorganization" for client document verification
    When I navigate to the admin project Document section
    And I navigate to the admin Document Client section
    Then the admin client folder should be displayed
    When I open the admin client folder
    Then the admin client folder should be accessible

  # ===========================================================================
  # TS-04 — Upload Folder (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Upload folder in Customer My Folder and verify in Admin Document
    Given I am logged in
    Then the Admin Portal login should be successful
    When I navigate to the Projects page
    And I select the client "kumarorganization"
    And I navigate to the project Client section
    And I open the client "Hari" details
    And I capture the client email for contact "Hari"
    And I am logged in to the customer portal
    When I navigate to the customer Files section
    And I click My Files on the customer portal
    Then the customer My Files page should be displayed
    When I open the existing customer folder "My Folder"
    And I click Upload Folder on the customer My Files page
    And I wait for the customer folder selection window to open
    And I pause for manual customer folder upload
    Then the uploaded customer folder should be displayed inside "My Folder"
    When I switch back to the Admin Portal for client verification
    And I open the admin project "kumarorganization" for client document verification
    When I navigate to the admin project Document section
    And I navigate to the admin Document Client section
    And I open the admin client folder "My Folder" in Document
    Then the admin uploaded customer folder should be displayed
    When I open the admin uploaded customer folder
    Then the admin uploaded customer folder should be accessible with contents

  # ===========================================================================
  # TS-05 — Schedule Meeting (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Schedule Online Meeting in Customer Portal and verify in Admin Dashboard and Event
    Given I am logged in
    Then the Admin Portal login should be successful
    When I navigate to the Projects page
    And I click on the project "kumarorganization" in the list
    And I navigate to the project Client section
    And I open the client "Hari" details
    And I click Edit on the admin client profile
    And I capture the registered customer email from the admin client project
    When I navigate to the Customer Portal login page
    Then the Customer Portal Login page should be displayed
    When I enter the captured client email on the Customer Portal
    And I open Yopmail for the captured client email in a new browser tab
    And I click Login or Continue on the Customer Portal
    Then the Customer Portal OTP verification page should be displayed
    And I refresh Yopmail once and retrieve the Customer Portal OTP
    And I switch back to the Customer Portal tab
    And I enter the received OTP on the Customer Portal
    And I click Verify or Login on the Customer Portal
    Then I should be logged in to the Customer Portal successfully
    When I navigate to Schedule Meeting on the customer portal
    And I click Create on the customer Schedule Meeting page
    And I select Online Meeting on the customer portal
    Then the customer Preferred Mode of Contact should be Online
    When I select an available day on the customer meeting form
    And I select an available time on the customer meeting form
    And I select meeting frequency "Monthly" on the customer portal
    And I enter the customer meeting purpose "For Testing discussion for meeting"
    When I click Confirm Booking on the customer portal
    Then the customer meeting should be created successfully
    And I should see customer meeting success toast
    When I switch back to the Admin Portal for client verification
    And I click Save or Update on the admin client profile
    And I navigate to the Lead Dashboard
    Then the newly created customer meeting should be reflected on the Lead Dashboard
    And I open the same admin lead for client meeting verification
    When I navigate to the admin project Event section
    Then the newly created customer meeting should be reflected in the admin Event list
    When I open the admin customer meeting from the Event list
    Then the admin meeting details should match the customer portal meeting details

  # ===========================================================================
  # TS-06 — Schedule Offline Meeting (@TS06 @TC06)
  # ===========================================================================

  @TS06 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Schedule Offline Meeting in Customer Portal and verify in Admin Dashboard and Event
    Given I am logged in
    Then the Admin Portal login should be successful
    When I navigate to the Projects page
    And I click on the project "kumarorganization" in the list
    And I navigate to the project Client section
    And I open the client "Hari" details
    And I click Edit on the admin client profile
    And I capture the registered customer email from the admin client project
    When I navigate to the Customer Portal login page
    Then the Customer Portal Login page should be displayed
    When I enter the captured client email on the Customer Portal
    And I open Yopmail for the captured client email in a new browser tab
    And I click Login or Continue on the Customer Portal
    Then the Customer Portal OTP verification page should be displayed
    And I refresh Yopmail once and retrieve the Customer Portal OTP
    And I switch back to the Customer Portal tab
    And I enter the received OTP on the Customer Portal
    And I click Verify or Login on the Customer Portal
    Then I should be logged in to the Customer Portal successfully
    When I navigate to Schedule Meeting on the customer portal
    And I click Create on the customer Schedule Meeting page
    When I select an available day on the customer meeting form
    And I select an available time on the customer meeting form
    And I select meeting frequency "Monthly" on the customer portal
    And I enter the customer meeting purpose "For Testing Process"
    And I enter or select the required customer meeting location
    Then all entered customer meeting details should be displayed
    When I click Confirm Booking on the customer portal
    Then the customer meeting should be created successfully
    And I should see customer meeting success toast
    When I switch back to the Admin Portal for client verification
    And I click Save or Update on the admin client profile
    And I navigate to the Lead Dashboard
    Then the newly created offline customer meeting should be reflected on the Lead Dashboard
    And I open the same admin lead for client meeting verification
    When I navigate to the admin project Event section
    Then the newly created offline customer meeting should be reflected in the admin Event list
    When I open the admin customer meeting from the Event list
    Then the admin meeting details should match the customer portal meeting details
