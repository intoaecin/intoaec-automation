@projects @financial @bills-expenses @positive @search
Feature: Bills and Expenses list filter and find expense

  Background:
    Given I am logged in
    When I open a project with Bills and Expenses available
    And I wait for the Bills and Expenses module to load
    When I click Add Expense in Bills and Expenses
    And I fill the expense form with unique details
    And I submit the Bills and Expenses create form
    Then the expense should be created successfully

  Scenario: FilterMenu Expenses type shows the created expense
    When I apply the Bills and Expenses type filter "Expenses"
    And I apply a Bills and Expenses status filter if available
    And I search Bills and Expenses for the created expense
    Then I should see the created expense in the search results
