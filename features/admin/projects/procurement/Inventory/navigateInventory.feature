@procurement @inventory @group @navigate @positive
Feature: Navigate to Inventory Management

  Scenario: Client project Procurement opens Inventory module
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load
    Then the Inventory module should be ready
    And I should see the inventory dashboard cards
