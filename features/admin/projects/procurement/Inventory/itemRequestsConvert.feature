@procurement @inventory @item-requests @convert @positive
Feature: Convert Item Requests to PO or Indent

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Convert a pending inventory request to Purchase Order
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I start an inventory item request from the group
    And I add a pending request product with name "E2E Convert PO" quantity "4" unit "Nos" unit cost "75"
    And I submit the inventory item request keeping status
    And I navigate back to the inventory module
    And I open Item Requests from inventory home
    And I open the Item Requests tab "Pending Approval"
    And I convert the last inventory request to "PO"

  Scenario: Convert an approved inventory request to Indent
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I start an inventory item request from the group
    And I add an approved request product with name "E2E Convert Indent" quantity "4" unit "Nos" unit cost "80"
    And I submit the inventory item request as approved
    And I navigate back to the inventory module
    And I open Item Requests from inventory home
    And I open the Item Requests tab "Approved"
    And I convert the last inventory request to "Indent"
