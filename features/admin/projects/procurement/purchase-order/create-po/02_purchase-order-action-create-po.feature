@smoke @regression @po @procurement @create-po @po-action-create
Feature: Purchase Order — create PO via Action menu Create

  Same journey as create-from-scratch, but submit with Action → Create instead of Action → Compose email.
  Requires a user who can see the Action dropdown with Create on the PO create form.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create purchase order successfully using action menu Create
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Electric materials action create"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I create the purchase order from the action menu
    Then I should see the purchase order created from action menu success toast
