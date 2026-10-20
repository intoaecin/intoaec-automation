@crm @lead-profile @events @meeting @delete @positive @regression
Feature: Delete Meeting

  Background:
    Given I am logged in

  @smoke
  Scenario: Delete an offline meeting from the events list
    When I create a meeting ready for deletion
    And I open delete from the three dots menu for the created meeting
    And I confirm meeting deletion from the popup
    Then I should see the meeting deleted successfully

  Scenario: Verify delete confirmation popup appears for meeting
    When I create a meeting ready for deletion
    And I open delete from the three dots menu for the created meeting
    Then I should see the meeting delete confirmation popup

  @negative
  Scenario: Cancel delete keeps the meeting in the offline tab
    When I create a meeting ready for deletion
    And I open delete from the three dots menu for the created meeting
    And I cancel meeting deletion from the popup
    Then I should see the meeting still present in the offline events tab
