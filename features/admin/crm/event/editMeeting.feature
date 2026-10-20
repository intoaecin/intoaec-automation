@crm @lead-profile @events @meeting @edit @positive @regression
Feature: Edit Meeting

  Background:
    Given I am logged in

  @smoke
  Scenario: Edit an offline meeting title and agenda
    When I create a meeting ready for editing
    And I open edit for the created meeting from the three dots menu
    And I edit the meeting title and agenda
    And I save the meeting update
    Then I should see the meeting updated successfully
    And I should see the updated meeting in the offline events tab
