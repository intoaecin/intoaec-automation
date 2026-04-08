@timetracking @timesheet @timesheet_edit @regression
Feature: Edit Timesheet

  # Prerequisites: login + navigation + create steps reuse timeSheetSteps.js and TimeTrackingPage.js.
  # Creates a timesheet, then opens it and performs full edit flow.

  Scenario: Create a timesheet then edit it with full field updates
    Given I am logged in
    And I go to Clients section
    And I select the first client
    And I open Time Tracking
    When I click Create timesheet
    And I fill mandatory fields for timesheet
    And I submit the timesheet form
    Then I verify the timesheet is created successfully
    When I open the created timesheet
    And I click Edit on the timesheet
    And I update all prefilled fields on the timesheet
    And I add break time with start and end
    And I select a random AEC work category
    And I update cost with a random value
    And I enter a random description in the dashboard text area
    And I save the timesheet changes
    Then I verify the timesheet is updated successfully
