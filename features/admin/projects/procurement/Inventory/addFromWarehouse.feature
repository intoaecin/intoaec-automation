@procurement @inventory @warehouse @positive @empty-state
Feature: Add Inventory Item from Warehouse

  # Branches when env has no warehouse products:
  #   empty → assert empty picker and pass
  #   hasData → select product → qty → add to group

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Add from Warehouse or show no warehouse products empty state
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I add an item from warehouse into the current inventory group
    Then the inventory Add from Warehouse outcome should be recorded
