@common @callLog @negative @validation @regression
Feature: Create Call Log validation

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I open the Call Log module
    And I click Add Call Log

  Scenario: Verify Call Purpose empty shows validation and Call Log is not created
    When I leave the call purpose empty and fill other call log mandatory fields
    And I attempt to submit the call log create form
    Then I should see call purpose mandatory validation
    And the call log should not be created

  Scenario: Verify What happened on this call empty shows mandatory validation
    When I leave the call outcome empty and fill other call log mandatory fields
    And I attempt to submit the call log create form
    Then I should see call outcome mandatory validation
    And the call log should not be created

  Scenario: Verify Comments empty shows validation and Call Log is not saved
    When I leave the call log comments empty and fill other call log mandatory fields
    And I attempt to submit the call log create form
    Then I should see call log comments mandatory validation
    And the call log should not be created

  Scenario: Verify Call Purpose exceeding maximum character limit
    When I fill the call purpose exceeding the maximum character limit
    Then I should see call purpose maximum character validation

  Scenario: Verify Comments exceeding maximum character limit
    When I fill the call log comments exceeding the maximum character limit
    Then I should see call log comments maximum character validation

  Scenario: Verify special characters in Call Purpose are handled correctly
    When I fill special characters in the call purpose
    Then I should see call purpose special character input handled correctly

  Scenario: Verify What happened on this call dropdown shows all expected options
    When I open the call outcome dropdown
    Then I should see all expected call outcome options
