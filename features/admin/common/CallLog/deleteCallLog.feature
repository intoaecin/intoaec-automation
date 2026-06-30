@common @callLog @delete @positive @regression
Feature: Delete Call Log

  Scenario: Create a call log and delete it from the row action menu
    Given I am logged in
    When I create a call log ready for deletion
    And I open delete from the three dots menu for the created call log
    And I confirm call log deletion from the popup
    Then I should see the call log deleted successfully
