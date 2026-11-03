@projects @financial @bills-expenses @expense-origins @po-wo @positive
Feature: Expense origin — PO / WO

  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available

  Scenario: Convert purchase order to expense and assert in Expenses
    When I try to convert from "purchase order" module to an expense
    And I open Bills and Expenses from the current project
    Then I should see an expense originated from "purchase order"

  Scenario: Convert work order to expense and assert in Expenses
    When I try to convert from "work order" module to an expense
    And I open Bills and Expenses from the current project
    Then I should see an expense originated from "work order"
