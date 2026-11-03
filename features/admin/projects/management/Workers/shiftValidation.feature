@projects @workers @negative @validation @project-workers
Feature: Project Shift Validations

  Background:
    Given I am logged in
    When I open a project with Worker Management available
    And I wait for the workers module to load

  Scenario: Creating a shift without required fields shows validation
    When I click the Add Shift button in workers
    Then I should see the add shift form or popup
    When I submit the add shift form without required fields
    Then I should see a shift validation message
