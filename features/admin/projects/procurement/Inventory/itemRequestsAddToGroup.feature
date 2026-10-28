@procurement @inventory @item-requests @add-to-group @positive
Feature: Add Approved Item Request to Inventory Group

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Add approved request to group with goods receipt confirm
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I start an inventory item request from the group
    And I add an approved request product with name "E2E Pull To Group" quantity "8" unit "Nos" unit cost "200"
    And I submit the inventory item request as approved
    And I navigate back to the inventory module
    And I open the Requested Products section in inventory
    And I open the Approved tab in Item Requests
    Then I should see the requested items created successfully with status "Approved"
    When I locate the last requested product in Requested Products
    And I open the three-dot menu for the requested product
    And I select Add to Group from the requested product menu
    Then I should see the Add to Group popup
    When I fill the Add to Group form with valid required information
    And I click Yes on the Add to Group confirmation
    Then the requested product should be added to the Request Items inventory group successfully
    When I navigate back to the inventory module
    And I open the newly created inventory group
    Then I should see the requested product in the inventory group with correct details and quantity
