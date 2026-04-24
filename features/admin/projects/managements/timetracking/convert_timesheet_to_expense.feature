@timetracking @timesheet @timesheet_expense @regression
Feature: Convert Timesheet To Expense

  Scenario: Create a timesheet with cost and convert it to an expense
    Given I am logged in
    And I go to Clients section
    And I select the first client
    And I open Time Tracking
    When I click Create timesheet
    And I fill mandatory fields with cost for timesheet
    And I submit the timesheet form
    Then I verify the timesheet is created successfully
    When I convert the created timesheet to an expense
    And I confirm the timesheet expense conversion
    And I open Bills and Expenses
    Then I verify the timesheet is converted to expense successfully
//hello