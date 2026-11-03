@procurement @inventory @item-actions @positive
Feature: Inventory Group Item Actions

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Edit used quantity on an inventory item
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I ensure the current inventory group has at least one item
    And I edit the used quantity on the first inventory item to "1"
    Then I should see an inventory item row in the group

  Scenario: Move unused stock to Warehouse
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I ensure the current inventory group has at least one item
    And I open the actions menu for the first inventory item
    And I choose inventory item action "Move To Warehouse"
    And I complete move to warehouse if prompted
    Then I should see an inventory item row in the group

  Scenario: Delete an inventory item from the group
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I ensure the current inventory group has at least one item
    And I open the actions menu for the first inventory item
    And I choose inventory item action "Delete"
    And I confirm delete inventory item with reason "E2E cleanup"
    Then the selected inventory item should be displayed in the inventory group

  Scenario: Link selected inventory items to a schedule
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I ensure the current inventory group has at least one item
    And I select the first inventory item checkbox
    And I click Link to Schedule in inventory
    And I complete schedule binding if prompted
    Then I should see an inventory item row in the group
