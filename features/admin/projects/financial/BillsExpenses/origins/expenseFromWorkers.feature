@projects @financial @bills-expenses @expense-origins @workers @positive
Feature: Expense origin — workers wage

  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available

  Scenario: Convert worker wage to expense and assert in Expenses
    When I try to convert from "workers" module to an expense
    And I open Bills and Expenses from the current project
    Then I should see an expense originated from "workers"
