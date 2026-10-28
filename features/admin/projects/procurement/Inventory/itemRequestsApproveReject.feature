@procurement @inventory @item-requests @approve @reject @positive
Feature: Approve and Reject Item Requests

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Approve a pending inventory request
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I start an inventory item request from the group
    And I add a pending request product with name "E2E Approve Me" quantity "3" unit "Nos" unit cost "25"
    And I submit the inventory item request keeping status
    And I navigate back to the inventory module
    And I open Item Requests from inventory home
    And I open the Item Requests tab "Pending Approval"
    And I approve the last pending inventory request
    Then the Item Requests tab "Approved" should be ready

  Scenario: Reject a pending inventory request
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I start an inventory item request from the group
    And I add a pending request product with name "E2E Reject Me" quantity "2" unit "Nos" unit cost "15"
    And I submit the inventory item request keeping status
    And I navigate back to the inventory module
    And I open Item Requests from inventory home
    And I open the Item Requests tab "Pending Approval"
    And I reject the last pending inventory request
    Then the Item Requests tab "Rejected" should be ready
