@smoke @regression @po @procurement @vendor @po-vendor-comment
Feature: Purchase Order — vendor adds comment via Yopmail (same browser)

  Create PO → send to Yopmail vendor → **View PO** → submit a **comment** on the vendor portal and assert it appears.

  Prerequisites: same as `@po-vendor-yopmail` (Yopmail vendor in To, optional env overrides). Yopmail waits use a refresh burst + the scenario PO title to avoid opening an older PO email.
  - If the comment box is custom: **PO_VENDOR_COMMENT_SELECTOR** (CSS) or **PO_VENDOR_COMMENT_PLACEHOLDER** (regex source for placeholder text).

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create PO, send email, Yopmail View PO, vendor submits comment
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO - Cable wire procurement (Vendor comment via Yopmail)"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "Cable wire required for project procurement — vendor to review and add comment." quantity "10" unit "Nos" rate "2000"
    And I compose and send the purchase order email capturing vendor Yopmail from the To field
    Then I should see the purchase order created and sent success toast
    When I open Yopmail for the vendor in a new browser tab
    And I wait for the purchase order email in Yopmail open the message and click View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I submit the vendor comment "Automation vendor note for PO review." on the purchase order portal
    Then I should see the vendor comment "Automation vendor note for PO review." on the vendor portal
