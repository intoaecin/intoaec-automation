@timetracking @timesheet @timesheet_delete @regression
Feature: Delete Timesheet

  Scenario: Create a timesheet and delete it successfully
    Given I am logged in
    And I go to Clients section
    And I select the first client
    And I open Time Tracking
    When I click Create timesheet
    And I fill mandatory fields for timesheet
    And I submit the timesheet form
    Then I verify the timesheet is created successfully
    When I click Delete on the timesheet
    And I confirm the timesheet deletion
    Then I verify the timesheet is deleted successfully
