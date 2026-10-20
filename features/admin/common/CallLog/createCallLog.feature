@common @callLog @positive @smoke
Feature: Create Call Log

  Scenario: Create a call log with mandatory fields
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I open the Call Log module
    And I click Add Call Log
    And I fill the call log mandatory fields
    And I submit the call log create form
    Then I should see the call log created successfully
