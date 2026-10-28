@procurement @inventory @workshop @positive
Feature: Add Inventory Item from Workshop

  # Branches when env has no factory dispatch for this project:
  #   empty → assert "No dispatched items available to receive." and pass
  #   hasData → receive first load into the group

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  @empty-state
  Scenario: Receive from Workshop or show no dispatched workshop material
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I click the Add Item button in inventory group
    And I select Add from Workshop in inventory
    Then I should see the workshop selection panel
    When I receive from workshop or assert no dispatched workshop material
    Then the inventory Add from Workshop outcome should be recorded
