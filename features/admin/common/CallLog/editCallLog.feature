@common @callLog @edit @positive @regression
Feature: Edit Call Log

  Scenario: Create a call log and edit it from the row action menu
    Given I am logged in
    When I create a call log ready for editing
    And I open edit from the row action menu for the created call log
    And I edit the call log mandatory fields
    And I submit the call log update form
    Then I should see the call log updated successfully
