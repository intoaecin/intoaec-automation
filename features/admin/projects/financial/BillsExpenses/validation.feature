@projects @financial @bills-expenses @negative @validation
Feature: Bills and Expenses validation

  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available
    And I wait for the Bills and Expenses module to load

  Scenario: Create expense without required fields shows validation
    When I click Add Expense in Bills and Expenses
    And I submit the Bills and Expenses create form without required fields
    Then I should see a Bills and Expenses validation message
