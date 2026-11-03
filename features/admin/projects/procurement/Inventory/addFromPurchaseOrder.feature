@procurement @inventory @po @goods-receipt @positive
Feature: Add Inventory Item from Purchase Order

  # Branches when env has no Accepted PO:
  #   empty → assert "no accepted PO" and pass
  #   hasData → complete goods receipt into the group
  # Full PO create/accept + GR document preview/download stay in GoodsReceipt_TestCases.

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load

  @empty-state
  Scenario: Goods receipt from accepted PO or show no accepted PO empty state
    When I create a new inventory group quickly
    And I open the newly created inventory group
    And I click the Add Item button in inventory group
    When I complete goods receipt from accepted PO or assert no accepted PO with notes "Inventory E2E Add from PO"
    Then the inventory Add from PO outcome should be recorded
