@projects @workers @positive @project-workers @recurring
Feature: Recurring Project Shifts

  Background:
    Given I am logged in
    When I open a project with Worker Management available
    And I wait for the workers module to load

  Scenario: Create a recurring shift with end after occurrences
    When I click the Add Shift button in workers
    Then I should see the add shift form or popup
    When I enter a random shift name in the add shift form
    And I select the second checkbox in the add shift form
    And I select today as the start date in the add shift form
    And I enter start and end time in the add shift form
    And I configure a basic recurring shift ending after 3 occurrences
    And I click Create on the add shift form
    Then the created shift should be visible in worker management
