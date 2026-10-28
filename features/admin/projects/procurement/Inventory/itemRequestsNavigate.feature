@procurement @inventory @item-requests @navigate @positive
Feature: Navigate Item Requests Tab

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Open Item Requests from Inventory home and go back
    When I open Item Requests from inventory home
    Then the Item Requests page should be ready
    When I go back from Item Requests to Inventory
    Then the Inventory module should be ready
