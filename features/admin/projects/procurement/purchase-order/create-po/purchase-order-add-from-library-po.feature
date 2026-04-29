@smoke @po @procurement @create-po @po-add-from-library
Feature: Purchase Order — add from library after edit

  After opening the PO edit screen: open the library slide-over, select two rows, Add,
  confirm line items on the form, then Action → Compose email (dialog only; no send).

  Requires My Items or Library Items with at least two rows in the org.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Edit PO add from library then open compose email from Action
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Add from library PO flow"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "seed item" description "seed" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    And I open the three dot menu on the first purchase order card for edit
    And I click edit in the purchase order card menu
    Then I should see the purchase order edit form loaded
    When I store the purchase order line item row count as baseline
    And I click add from library on the purchase order form
    Then I should see the purchase order library drawer
    When I select the first two rows in the purchase order library grid
    And I click add in the purchase order library drawer
    Then the purchase order line item row count should exceed the baseline
    When I open the purchase order action menu and choose compose email
    Then I should see the purchase order compose email dialog from action menu
