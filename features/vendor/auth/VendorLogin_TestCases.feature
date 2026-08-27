# -----------------------------------------------------------------------------
# Vendor Portal — incremental TCs in ONE file.
#
# TS-01 Vendor Login — @TS01 @TC01
#   TC-01 — Vendor sign-in → Dashboard (https://vendor.aecplayhouse.com/auth/signIn)
# TS-02 My Profile — @TS02 @TC02
#   TC-02 — My Profile → Edit → update profile details → Save
# TS-03 Change password — @TS03 @TC03
#   TC-03 — My Profile → Security → change password → logout → login with new password
# TS-04 Company Info — @TS04 @TC04
#   TC-04 — My Organization → Company Info → registration number + category → Update
# TS-05 Business Info — @TS05 @TC05
#   TC-05 — My Organization → Business Info → address fields → Update
# TS-06 Social Media — @TS06 @TC06
#   TC-06 — My Organization → Social Media → save URLs → refresh → verify
# TS-07 E-Signature — @TS07 @TC07
#   TC-07 — My Organization → E-Signature → Draw → Update → refresh → verify
# TS-08 E-Signature Upload — @TS08 @TC08
#   TC-08 — My Organization → E-Signature → Upload sample_signature.png → Update → verify
# TS-09 Add Product — @TS09 @TC09
#   TC-09 — Products → Add Product → Start From Scratch → Save Premium Ceramic Floor Tile
# TS-10 Add Service — @TS10 @TC10
#   TC-10 — Services → Create New → Interior Design Consultation → Save
# TS-11 Invite Vendor — @TS11 @TC11
#   TC-11 — Admin Invite Vendor → send invite → Yopmail → register with OTP → status Accepted
#
# Run ALL vendor portal TCs from TC-01 to TC-11:
#   npx.cmd cucumber-js --tags "@vendor-tc01-tc11"
#   npx.cmd cucumber-js --tags "@vendor-all"
#
# Run one case (PowerShell: use npx.cmd / npm.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC01"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC02"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC03"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC04"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC05"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC06"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC07"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC08"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC09"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC10"
#   npx.cmd cucumber-js --tags "@vendor-portal and @TC11"
#
# npm:
#   npm.cmd run test:vendor:auth:login
#   npm.cmd run test:vendor:auth:login:tc01
#   npm.cmd run test:vendor:auth:login:tc02
#   npm.cmd run test:vendor:auth:login:tc03
#   npm.cmd run test:vendor:auth:login:tc04
#   npm.cmd run test:vendor:auth:login:tc05
#   npm.cmd run test:vendor:auth:login:tc06
#   npm.cmd run test:vendor:auth:login:tc07
#   npm.cmd run test:vendor:auth:login:tc08
#   npm.cmd run test:vendor:auth:login:tc09
#   npm.cmd run test:vendor:auth:login:tc10
#   npm.cmd run test:vendor:auth:login:tc11
#
# Layering: `AGENTS.md` — scenarios here;
#            logic in pages/vendor/auth/VendorLoginPage.js, pages/vendor/profile/VendorProfilePage.js,
#            pages/vendor/organization/VendorOrganizationPage.js,
#            pages/vendor/products/VendorProductsPage.js,
#            pages/vendor/services/VendorServicesPage.js,
#            pages/admin/invite/InviteVendorPage.js (TC-11);
#            step-definitions/vendor/auth/VendorLoginStep.js,
#            step-definitions/admin/invite/InviteVendor.steps.js (TC-11)
# -----------------------------------------------------------------------------

@vendor @vendor-portal @vendor-login @vendor-all @vendor-tc01-tc11
Feature: Vendor Portal — incremental test cases

  # ===========================================================================
  # TS-01 — Vendor Login (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Vendor portal login with valid credentials
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I enter the vendor email "testintoaec@gmail.com"
    And I enter the vendor password "Simple@10"
    And I click the vendor Sign In button
    Then I should be logged in to the vendor portal successfully
    And the Vendor Dashboard should be displayed

  # ===========================================================================
  # TS-02 — My Profile (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Edit vendor My Profile with BuildCraft Solutions details
    Given I am logged in to the vendor portal
    When I navigate to the vendor My Profile page
    Then the vendor My Profile page should be displayed
    When I click the vendor profile Edit button
    Then the vendor profile edit page should be displayed
    When I fill the vendor profile first name with "Madhan"
    And I fill the vendor profile last name with "Mehta"
    And I fill the vendor profile email with "testintoaec@gmail.com"
    And I fill the vendor profile mobile number with "+91 9123456780"
    And I fill the vendor profile organization with "BuildCraft Solutions"
    And I fill the vendor profile designation with "Project Manager"
    And I fill the vendor profile address line 1 with "24 Green Park Avenue"
    And I fill the vendor profile address line 2 with "Tower B, 3rd Floor"
    And I fill the vendor profile city with "Chennai"
    And I select the vendor profile state "Tamil Nadu"
    And I select the vendor profile country "India"
    And I fill the vendor profile zip code with "600034"
    And I select the vendor profile industry "Construction"
    And I fill the vendor profile website with "www.buildcraftsolutions.com"
    And I click the vendor profile Save or Update button
    Then I should see vendor profile success toast "Profile updated successfully."
    And the updated vendor profile details should be displayed correctly

  # ===========================================================================
  # TS-03 — Change password (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Change vendor password from My Profile Security
    Given I am logged in to the vendor portal
    When I navigate to the vendor My Profile Security page
    Then the vendor Update Password section should be displayed
    When I fill the vendor current password with "Simple@10"
    And I fill the vendor new password with "Courage@10"
    And I fill the vendor confirm new password with "Courage@10"
    And I click the vendor Change Password button
    Then the vendor password should be changed successfully
    And I should see vendor password success toast "Password Changed|Password changed successfully.|Your Password has been changed successfully."
    When I log out of the vendor portal
    And I navigate to the Vendor login page
    And I enter the vendor email "testintoaec@gmail.com"
    And I enter the vendor password "Courage@10"
    And I click the vendor Sign In button
    Then I should be logged in to the vendor portal successfully

  # ===========================================================================
  # TS-04 — Company Info (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Update vendor My Organization Company Info
    Given I am logged in to the vendor portal
    When I navigate to the vendor My Organization page
    Then the vendor My Organization page should be displayed
    When I click the vendor Company Info tab
    Then the vendor Company Info section should be displayed
    And the vendor Vendor Type field should be displayed
    And the vendor Registration Number field should be displayed
    And the vendor Categories field should be displayed
    When I fill the vendor registration number with "VND20260817001"
    And I click vendor Add categories
    And I select the vendor organization category "Construction"
    Then the vendor category "Construction" should be added successfully
    When I click the vendor organization Update button
    Then I should see vendor organization success toast "updated successfully.|Company info updated|Organization updated|success"
    And the vendor registration number "VND20260817001" and category "Construction" should be displayed correctly

  # ===========================================================================
  # TS-05 — Business Info (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Update vendor My Organization Business Info
    Given I am logged in to the vendor portal
    When I navigate to the vendor My Organization page
    Then the vendor My Organization page should be displayed
    When I click the vendor Business Info tab
    Then the vendor Business Info section should be displayed
    When I fill the vendor organization address line 1 with "18 Green Valley Road"
    And I fill the vendor organization address line 2 with "Tech Park, Building A"
    And I fill the vendor organization city with "Chennai"
    And I select the vendor organization state "Tamil Nadu"
    And I select the vendor organization country "India"
    And I fill the vendor organization zip code with "600028"
    When I click the vendor organization Update button
    Then I should see vendor organization success toast "updated successfully.|Business info updated|Organization updated|success"
    And the vendor Business Info should show address "18 Green Valley Road", "Tech Park, Building A", city "Chennai", state "Tamil Nadu", country "India" and zip "600028"

  # ===========================================================================
  # TS-06 — Social Media (@TS06 @TC06)
  # ===========================================================================

  @TS06 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Update vendor My Organization Social Media links
    Given I am logged in to the vendor portal
    When I navigate to the vendor My Organization page
    Then the vendor My Organization page should be displayed
    When I click the vendor Social Media tab
    Then the vendor Social Media Links section should be displayed
    When I fill the vendor Facebook URL with "https://www.facebook.com/buildcraftsolutions"
    And I fill the vendor Twitter URL with "https://twitter.com/buildcraftindia"
    And I fill the vendor LinkedIn URL with "https://www.linkedin.com/in/arjunmehta"
    And I fill the vendor Instagram URL with "https://www.instagram.com/buildcraftsolutions"
    And I fill the vendor Public Profile URL with "https://www.buildcraftsolutions.com/profile"
    And I fill the vendor Website or Blog URL with "https://www.buildcraftsolutions.com/blog"
    When I click the vendor organization Update button
    Then the vendor social media links should be saved successfully
    And I should see vendor organization success toast "updated successfully.|Social media updated|Organization updated|success"
    When I refresh the vendor organization page
    And I click the vendor Social Media tab
    Then the vendor Social Media Links section should be displayed
    And the vendor social media URLs should be displayed correctly

  # ===========================================================================
  # TS-07 — E-Signature (@TS07 @TC07)
  # ===========================================================================

  @TS07 @TC07 @smoke @regression @positive
  Scenario: TC-07 — Draw and update vendor My Organization E-Signature
    Given I am logged in to the vendor portal
    When I navigate to the vendor My Organization page
    Then the vendor My Organization page should be displayed
    When I click the vendor E-Signature tab
    Then the vendor Admin Digital Signature section should be displayed
    When I click the vendor E-Signature Draw option
    And I draw a sample signature in the vendor signature area
    Then the vendor drawn signature should be displayed in the signature area
    When I click the vendor E-Signature Update button
    Then the vendor digital signature should be updated successfully
    And I should see vendor organization success toast "Digital signature updated successfully.|signature updated|updated successfully"
    When I refresh the vendor organization page
    And I click the vendor E-Signature tab
    Then the vendor updated signature should be displayed under Existing Digital Signature

  # ===========================================================================
  # TS-08 — E-Signature Upload (@TS08 @TC08)
  # File upload is skipped so the suite can continue to TC-09..TC-11.
  # ===========================================================================

  @TS08 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Upload and update vendor My Organization E-Signature
    Given I am logged in to the vendor portal
    When I navigate to the vendor My Organization page
    Then the vendor My Organization page should be displayed
    When I click the vendor E-Signature tab
    Then the vendor Admin Digital Signature section should be displayed
    When I click the vendor E-Signature Upload option
    And I click the vendor signature upload area
    And I upload the vendor signature file "sample_signature.png"
    Then the vendor uploaded signature should be displayed in the signature area
    When I click the vendor E-Signature Update button
    Then the vendor digital signature should be updated successfully
    And I should see vendor organization success toast "Digital signature updated successfully.|signature updated|updated successfully"
    Then the vendor updated signature should be displayed under Existing Digital Signature

  # ===========================================================================
  # TS-09 — Add Product from scratch (@TS09 @TC09)
  # ===========================================================================

  @TS09 @TC09 @smoke @regression @positive
  Scenario: TC-09 — Add vendor product Premium Ceramic Floor Tile from scratch
    Given I am logged in to the vendor portal
    When I navigate to the vendor Products page
    Then the vendor Products page should be displayed
    When I click the vendor Add Product button
    Then the vendor product creation options should be displayed
    When I select vendor Start From Scratch
    Then the vendor Start From Scratch option should be selected
    When I click the vendor Proceed button
    Then the vendor Create New Product page should be displayed
    And the vendor Product Information section should be displayed
    When I fill the vendor product name with "Premium Ceramic Floor Tile"
    And I select the vendor product category "Building Materials"
    And I select the vendor product sub category "Floor Tiles"
    And I fill the vendor product quantity with "50"
    And I fill the vendor product brand with "BuildPro"
    And I fill the vendor product description with "High-quality ceramic floor tiles suitable for residential and commercial projects."
    Then the vendor entered product information should be displayed correctly
    When I click the vendor product Save button
    Then the vendor product should be created successfully
    And I should see vendor product success toast "Product added successfully."
    Then the vendor product "Premium Ceramic Floor Tile" should be displayed in the Product List

  # ===========================================================================
  # TS-10 — Add Service (@TS10 @TC10)
  # ===========================================================================

  @TS10 @TC10 @smoke @regression @positive
  Scenario: TC-10 — Add vendor service Interior Design Consultation
    Given I am logged in to the vendor portal
    When I navigate to the vendor Services page
    Then the vendor Services page should be displayed
    When I click the vendor Add Service button
    Then the vendor Create New Service page should be displayed
    When I fill the vendor service name with "Interior Design Consultation"
    And I select the vendor service category "Interior Design"
    And I select the vendor service type "Consultation"
    And I fill the vendor service description with "Professional interior design consultation for residential and commercial projects."
    And I select the vendor service pricing module "Fixed Price"
    And I fill the vendor service price with "2500"
    And I enable the vendor service Taxable option
    Then the vendor entered service details should be displayed correctly
    When I click the vendor service Save button
    Then the vendor service should be created successfully
    And I should see vendor service success toast "Service added successfully."
    When I navigate back to the vendor Service List
    Then the vendor service "Interior Design Consultation" should be displayed in the Service List

  # ===========================================================================
  # TS-11 — Invite Vendor (@TS11 @TC11)
  # Admin Portal invite → Yopmail invitation → vendor registration (manual OTP) → Accepted
  # OTP is entered manually; the scenario pauses at that step.
  # ===========================================================================

  @TS11 @TC11 @smoke @regression @positive @invite-vendor @yopmail
  Scenario: TC-11 — Invite vendor from Admin Portal, register from Yopmail, and verify Accepted status
    Given I am logged in
    When I navigate to Invite Vendor
    And I click the Send Invite Vendor option
    And I fill the invite vendor first name with "Bhavani"
    And I fill the invite vendor last name with "MM"
    And I fill the invite vendor email with "bhavanimm@yopmail.com"
    And I fill the invite vendor organization name with "Intoaec Org"
    And I fill the invite vendor phone number with "7305570607"
    And I fill the invite vendor tax name with "abc2002"
    And I click the Send Invite button
    Then the vendor invitation should be sent successfully
    And the invite vendor status should be displayed as "Pending"
    When I open Yopmail for "bhavanimm@yopmail.com"
    And I wait for the vendor invitation email to be received
    Then the vendor invitation email should be received successfully
    And the vendor invitation email should show vendor name "Bhavani MM"
    And the vendor invitation email should show organization name "Intoaec Org"
    And the vendor invitation email should contain an invitation link
    When I extract and open the vendor invitation URL
    Then the Vendor Registration page should be displayed
    When I enter the vendor registration mobile number "7305570607"
    And I click the Request OTP button
    And I wait for the OTP to be received
    And I enter the received OTP manually
    And I verify the vendor registration OTP
    And I fill the vendor registration password with "Simple@10"
    And I fill the vendor registration confirm password with "Simple@10"
    And I click the vendor registration Proceed or Login button
    When I refresh the vendor portal and sign in with the invited credentials
    Then I should be logged in to the vendor portal successfully
    When I switch back to the Admin Portal
    And I refresh the Invite Vendor list
    And I search the Invite Vendor list for "bhavanimm@yopmail.com"
    Then the invite vendor status should be displayed as "Accepted"
    And the invite vendor Edit, Delete, and Resend buttons should not be displayed
