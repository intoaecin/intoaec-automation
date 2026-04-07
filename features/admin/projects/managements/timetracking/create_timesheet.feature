@timetracking @timesheet
Feature: Create Timesheet

  Scenario: Create a timesheet with manual attachment upload
    Given I am logged in
    And I go to Clients section
    And I select the first client
    And I open Time Tracking
    When I click Create timesheet
    And I fill mandatory fields for timesheet
    And I wait 60 seconds for manual attachment upload
    And I submit the timesheet form
    Then I verify the timesheet is created successfully
