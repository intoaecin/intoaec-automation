@projects @financial @bills-expenses @expense-origins @inventory @positive
Feature: Expense origin — inventory

  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available

  Scenario: Convert inventory item to expense and assert in Expenses
    When I try to convert from "inventory" module to an expense
    And I open Bills and Expenses from the current project
    Then I should see an expense originated from "inventory"
