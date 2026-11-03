@projects @financial @bills-expenses @expense-origins @bulk-upload @positive
Feature: Expense origin — bulk upload

  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available
    And I wait for the Bills and Expenses module to load

  Scenario: Bulk upload creates expense rows
    When I apply the Bills and Expenses type filter "Expenses"
    And I open bulk upload expenses
    And I upload the sample expenses fixture
    Then the bulk uploaded expenses should be visible
