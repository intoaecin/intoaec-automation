@projects @financial @bills-expenses @positive
Feature: Create Expense in Bills and Expenses

  # UI Create menu: Received Payment | Expenses (no separate Add Bill)
  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available
    And I wait for the Bills and Expenses module to load

  Scenario: Create a native expense from Create → Expenses → Scratch
    When I click Add Expense in Bills and Expenses
    And I fill the expense form with unique details
    And I submit the Bills and Expenses create form
    Then the expense should be created successfully
