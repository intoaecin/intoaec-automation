@projects @workers @positive @project-workers
Feature: Edit and Delete Project Shifts

  Background:
    Given I am logged in
    When I open a project with Worker Management available
    And I wait for the workers module to load
    When I click the Add Shift button in workers
    Then I should see the add shift form or popup
    When I enter a random shift name in the add shift form
    And I select the second checkbox in the add shift form
    And I select today as the start date in the add shift form
    And I enter start and end time in the add shift form
    And I click Create on the add shift form
    Then the created shift should be visible in worker management

  Scenario: Edit an existing shift and validate the updated name
    When I open the created shift in worker management
    And I update the opened shift name
    And I save the shift edits
    Then the created shift should be visible in worker management

  Scenario: Delete an existing shift and verify removal
    When I open the created shift in worker management
    And I delete the opened shift
    Then the created shift should be removed from worker management
