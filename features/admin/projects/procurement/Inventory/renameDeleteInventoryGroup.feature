@procurement @inventory @group @rename @delete @positive
Feature: Rename and Delete Inventory Group

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Rename an empty inventory group
    When I create a new inventory group quickly
    And I rename the created inventory group
    Then the renamed inventory group should be visible

  Scenario: Delete an empty inventory group
    When I create a new inventory group quickly
    And I delete the created inventory group
    Then the created inventory group should be deleted

  Scenario: Cannot delete inventory group that has items
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I ensure the current inventory group has at least one item
    And I navigate back to the inventory module
    And I delete the created inventory group
    Then I should see that the inventory group cannot be deleted with items
