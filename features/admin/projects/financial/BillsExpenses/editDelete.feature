@projects @financial @bills-expenses @positive
Feature: Edit and delete expense in Bills and Expenses

  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available
    And I wait for the Bills and Expenses module to load
    When I click Add Expense in Bills and Expenses
    And I fill the expense form with unique details
    And I submit the Bills and Expenses create form
    Then the expense should be created successfully

  Scenario: Edit then delete a created expense
    When I open the created expense in Bills and Expenses
    And I edit the opened Bills and Expenses record
    Then the expense should be created successfully
    When I open the created expense in Bills and Expenses
    And I delete the opened Bills and Expenses record
    Then the Bills and Expenses record should be removed
