@timetracking @timesheet @workers @positive @linked-shift
Feature: Create Timesheet Linked to Shift

  Scenario: Create a timesheet by selecting a linked shift for an organization user
    Given I am logged in
    And I go to Clients section
    And I select the first client
    And I open Time Tracking
    When I click Create timesheet
    And I fill mandatory fields for timesheet
    And I select a linked shift on the timesheet form
    And I submit the timesheet form
    Then I verify the timesheet is created successfully
