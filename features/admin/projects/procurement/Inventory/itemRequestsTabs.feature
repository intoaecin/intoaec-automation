@procurement @inventory @item-requests @tabs @positive
Feature: Item Requests Status Tabs

  Background:
    Given I am logged in
    And I open an admin project for Purchase Order
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    When I click Inventory in the project
    And I wait for the inventory module to load
    And I open Item Requests from inventory home

  Scenario: Switch all Item Requests status tabs
    Then the Item Requests page should be ready
    When I open the Item Requests tab "Pending Approval"
    Then the Item Requests tab "Pending Approval" should be ready
    When I open the Item Requests tab "Approved"
    Then the Item Requests tab "Approved" should be ready
    When I open the Item Requests tab "Rejected"
    Then the Item Requests tab "Rejected" should be ready
    When I open the Item Requests tab "Converted To Po"
    Then the Item Requests tab "Converted To Po" should be ready
    When I open the Item Requests tab "Converted To Indent"
    Then the Item Requests tab "Converted To Indent" should be ready
    When I open the Item Requests tab "Cancelled"
    Then the Item Requests tab "Cancelled" should be ready
    When I smoke test Item Requests pagination
