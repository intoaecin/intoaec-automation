@projects @workers @positive @project-workers @wages
Feature: Wage Details View

  Background:
    Given I am logged in
    When I open a project with Worker Management available
    And I wait for the workers module to load

  Scenario: Open Wage Details tab and verify wage information is displayed
    When I open the Wage Details tab in worker management
    Then the Wage Details table should be ready
