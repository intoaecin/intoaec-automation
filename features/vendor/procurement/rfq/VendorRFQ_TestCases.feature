# -----------------------------------------------------------------------------
# Vendor Portal RFQ — incremental TCs in ONE file.
#
# TS-01 Create RFQ "New One" on BBB only — vendor Update Price / admin verifies that RFQ only
#
# Admin: open BBB profile directly (skip slow /client splash) → classic UI OFF → RFQ
#         https://app.aecplayhouse.com/client/profile?...
# Vendor: https://vendor.aecplayhouse.com/auth/signIn
#           email bhavanimmm12345@yopmail.com / Simple@10
# Org:    AEC Solutions
# RFQ:    Add 3 line items manually (Material 1/2/3) — title "New One" only for Preview / Update Price / verify
# Admin verify: Expand the most recently created "New One" (highest RFQ####), then check price-update status + 1000
#
# Run:
#   npx.cmd cucumber-js --tags "@vendor-rfq and @TC01"
#
# Layers: AGENTS.md; admin RFQ steps reuse RFQ.steps / compose steps;
#         vendor: VendorRFQPage.js + VendorRFQStep.js
# -----------------------------------------------------------------------------

@vendor-rfq
Feature: Vendor Portal RFQ — incremental test cases

  Background:
    Given I am logged in
    When I open the project "BBB" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I navigate to the RFQ module
    Then I should see the RFQ page loaded

  # ===========================================================================
  # TS-01 — Create RFQ "New One", vendor Update Price 1000, admin verifies
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Create RFQ for BBB, vendor updates price, admin verifies 1000
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "New One"
    And I set RFQ required by date to today
    And I set RFQ created on date to a random date
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    And I add RFQ line item manually with name "Material 2" quantity "2" unit "Each"
    And I add RFQ line item manually with name "Material 3" quantity "3" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I sign in to the vendor portal with email "bhavanimmm12345@yopmail.com" and password "Simple@10"
    Then I should be logged in to the vendor portal successfully
    When I navigate to the Procurement Hub
    And I select the connected organization "AEC Solutions"
    And I click the first project name on the vendor procurement hub
    And I click RFQ on the vendor project
    And I work only on the vendor RFQ titled "New One"
    And I click Preview on the vendor RFQ
    And I open the vendor RFQ overflow menu for "New One"
    And I click Update Price from the vendor RFQ overflow menu
    And I change the first row vendor RFQ price to "1000"
    And I click Update Price on the vendor RFQ
    Then I should see the vendor RFQ price update success
    When I navigate back to the Admin Portal
    And I open the project "BBB" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I navigate to the RFQ module
    Then I should see the RFQ page loaded
    When I open the RFQ titled "New One" on the admin RFQ list
    Then I should see the RFQ price update status on the expanded card
    And I should see the updated RFQ price "1000" for the line item "Material 1"
    And I should see the updated RFQ price "1000" for the line item "Material 2"
    And I should see the updated RFQ price "1000" for the line item "Material 3"
