@procurement @inventory @request @item-requests @positive
Feature: Request Inventory Items from Group

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Submit inventory request items as Approved
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I start an inventory item request from the group
    And I add an approved request product with name "E2E Approved Cable" quantity "10" unit "Nos" unit cost "100"
    And I submit the inventory item request as approved
    And I navigate back to the inventory module
    And I open Item Requests from inventory home
    And I open the Item Requests tab "Approved"
    Then the Item Requests tab "Approved" should be ready

  Scenario: Submit inventory request items as Pending Approval
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I start an inventory item request from the group
    And I add a pending request product with name "E2E Pending Cable" quantity "5" unit "Nos" unit cost "50"
    And I submit the inventory item request keeping status
    And I navigate back to the inventory module
    And I open Item Requests from inventory home
    And I open the Item Requests tab "Pending Approval"
    Then the Item Requests tab "Pending Approval" should be ready
