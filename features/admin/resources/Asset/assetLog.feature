@resources @asset @log @positive
Feature: Asset Activity Log

  Scenario: Open asset activity log from the asset row
    Given I am logged in
    When I create an owned individual asset quickly
    And I open the asset log for the created asset
    Then I should see the asset log modal
