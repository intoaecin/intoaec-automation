@resources @asset @search @filter @positive
Feature: Search and Filter Assets

  Scenario: Search finds a created asset and filters can be applied and cleared
    Given I am logged in
    When I create an owned individual asset quickly
    And I search for the created asset by name
    Then I should see the created asset in the list
    When I apply asset list filters for status "AVAILABLE"
    And I clear the asset list filters
    And I clear the asset search
    Then the Manage Assets list should be ready
