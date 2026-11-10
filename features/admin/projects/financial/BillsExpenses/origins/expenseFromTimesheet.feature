@projects @financial @bills-expenses @expense-origins @timesheet @positive
Feature: Expense origin — timesheet convert

  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available

  Scenario: Convert timesheet to expense and assert in Expenses
    When I convert a timesheet to expense for Bills and Expenses origin
    And I open Bills and Expenses from the current project
    Then I should see an expense originated from "timesheet"
