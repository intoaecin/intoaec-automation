@common @callLog @ui @regression
Feature: Call Log popup UI

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I open the Call Log module
    And I click Add Call Log

  @smoke
  Scenario: Close Call Log popup with the close icon
    When I click the Call Log close icon
    Then the Call Log popup should be closed

  Scenario: Close Call Log popup without saving
    When I fill the call log mandatory fields
    And I click the Call Log close icon
    Then the Call Log popup should be closed
    And the entered call log should not be present in the list
