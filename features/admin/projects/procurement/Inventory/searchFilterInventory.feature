@procurement @inventory @group @search @filter @positive
Feature: Search Inventory Groups and Items

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Search finds a created inventory group
    When I create a new inventory group quickly
    And I search inventory groups for the created group name
    Then I should see the created inventory group in the list
    When I clear the inventory group search
    Then I should see the created inventory group in the list

  Scenario: Search items inside an inventory group
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I ensure the current inventory group has at least one item
    And I search inventory items for the last added item
    Then I should see an inventory item row in the group
