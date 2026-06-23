@smoke @regression @po @procurement @create-po @po-cancel
Feature: Purchase Order — create and cancel from list

  Create PO, send email, return to list, open ⋮ on the first card, choose Cancel.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create purchase order then cancel from three dot menu
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Cancel PO flow"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "seed item" description "seed" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    And I open the three dot menu on the first purchase order card for cancel
    And I click cancel in the purchase order card menu
    Then I should see the purchase order cancel success toast
