@procurement @inventory @validation @negative
Feature: Inventory Group Validations

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  Scenario: Create group without a name shows validation error
    When I try to create an inventory group without a name
    Then I should see the create inventory group validation error

  Scenario: Dashboard cards are visible on Inventory home
    Then I should see the inventory dashboard cards
