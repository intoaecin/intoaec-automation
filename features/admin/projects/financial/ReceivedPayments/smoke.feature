@projects @financial @received-payments @smoke @positive
Feature: Received Payments smoke navigation

  Background:
    Given I am logged in
    When I open a project with Received Payments available

  Scenario: Received Payments module loads
    Then I should see the Received Payments module ready
