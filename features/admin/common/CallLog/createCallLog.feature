@common @callLog @positive @smoke
Feature: Create Call Log

  Scenario: Create a call log with mandatory fields
    Given I am logged in
    When I navigate to the project Call Log form
    And I fill the call log mandatory fields
    And I submit the call log create form
    Then I should see the call log created successfully
