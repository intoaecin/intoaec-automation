@procurement @inventory @group @create @positive
Feature: Create Inventory Group

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Create an inventory group with a random name
    When I click the Create Group button in inventory
    Then I should see the create inventory item group popup
    When I enter a random group name in the create inventory group popup
    And I click Create on the create inventory group popup
    Then the created inventory group should be visible
    When I open the newly created inventory group
    And I click the Add Item button in inventory group
    Then I should see the add item options
