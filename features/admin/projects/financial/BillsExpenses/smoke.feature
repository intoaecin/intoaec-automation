@projects @financial @bills-expenses @smoke @positive
Feature: Bills and Expenses smoke navigation

  # UI: PageLayout title + Create (Received Payment | Expenses) + FilterMenu + summary cards
  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available

  Scenario: Module loads with summary chrome and Expenses type filter
    Then I should see the Bills and Expenses module ready
    And I should see the Bills and Expenses summary cards
    When I apply the Bills and Expenses type filter "Expenses"
    Then I should see the Bills and Expenses module ready
