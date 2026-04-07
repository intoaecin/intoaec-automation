@po @procurement @vendor @po-vendor-declined
Feature: Purchase Order — vendor declines PO via Yopmail (same browser)

  Same journey as accept: create PO → compose (capture Yopmail) → send → Yopmail → **View PO** on vendor portal,
  then **Decline** (and confirm delete if the app shows it) until the PO shows as **declined**.

  Prerequisites: same as `@po-vendor-yopmail` (Yopmail vendor in To, optional env overrides).
  - If Decline is icon-only or custom: set **PO_VENDOR_DECLINE_SELECTOR** (CSS) or **PO_VENDOR_DECLINE_TEST_ID** (data-testid).

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create PO, send email, Yopmail View PO, vendor declines
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Vendor Declined Yopmail PO"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "vendor decline" quantity "10" unit "Nos" rate "2000"
    And I compose and send the purchase order email capturing vendor Yopmail from the To field
    Then I should see the purchase order created and sent success toast
    When I open Yopmail for the vendor in a new browser tab
    And I wait for the purchase order email in Yopmail open the message and click View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I decline the purchase order on the vendor portal
    Then I should see the purchase order declined on the vendor portal
