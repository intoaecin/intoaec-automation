@procurement @inventory @item-requests @bulk @positive
Feature: Item Requests Bulk Actions

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Bulk approve pending inventory requests
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I start an inventory item request from the group
    And I add a pending request product with name "E2E Bulk One" quantity "2" unit "Nos" unit cost "10"
    And I add a pending request product with name "E2E Bulk Two" quantity "2" unit "Nos" unit cost "10"
    And I submit the inventory item request keeping status
    And I navigate back to the inventory module
    And I open Item Requests from inventory home
    And I open the Item Requests tab "Pending Approval"
    And I select the first 2 Item Requests rows
    And I click Item Requests bulk action "Approve"
    Then the Item Requests tab "Approved" should be ready
