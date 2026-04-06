@smoke @po @procurement @create-po @po-cancel @po-smoke-full-journey
Feature: Purchase Order — cancel PO from card menu

  End-to-end: create → send → preview → edit → update → send reminder email → kebab Cancel.
  Headed step pauses when @po-smoke-full-journey (see hooks). PO_FLOW_STEP_PAUSE_MS overrides.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Full PO journey then cancel from the three dot menu
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Smoke PO flow"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "seed item" description "seed" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    And I open the three dot menu on the first purchase order card
    And I click preview in the purchase order card menu
    Then I should see the purchase order full screen preview
    When I close the purchase order full screen preview
    Then I should be on the purchase order list with create action visible
    When I open the three dot menu on the first purchase order card for edit
    And I click edit in the purchase order card menu
    Then I should see the purchase order edit form loaded
    When I click add manually on the purchase order form
    And I fill the new PO line item with name "copper wire" description "bulk line" quantity "20" unit "Nos" rate "30000"
    When I open the purchase order action menu and choose update
    Then I should see the purchase order updated success toast
    When I wait for the purchase order list after update redirect
    When I open the send menu on the first purchase order card
    And I click send reminder in the purchase order send menu
    Then I should see the purchase order compose email dialog for reminder
    When I click send email in the purchase order compose dialog
    Then I should see the purchase order reminder email sent toast
    When I open the three dot menu on the first purchase order card for cancel
    And I click cancel in the purchase order card menu
    Then I should see the purchase order cancel success toast
