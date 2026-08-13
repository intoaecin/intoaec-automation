@crm @lead-profile @events @meeting @repeat @positive @regression
Feature: Repeat Meeting

  Background:
    Given I am logged in

  @smoke
  Scenario: Repeat a backdated offline meeting and schedule it for the future
    When I navigate to the first available lead
    And I open the Events module
    And I open the Events action menu
    And I select Create Meeting
    And I create a backdated offline meeting with location and participants
    Then I should see the meeting created successfully
    When I open the Past events tab
    Then I should see the created backdated meeting in the Past tab
    When I open repeat for the created meeting from the three dots menu
    Then the Edit Meeting page should open with the original meeting details prefilled
    When I schedule the repeated meeting with a future date and updated times
    And I save the repeated meeting from the Edit Meeting page
    Then I should see the repeated meeting saved successfully
    When I navigate back to Lead Events
    And I open the Upcoming events tab
    Then I should see the repeated meeting in the Upcoming tab with the updated schedule
    When I open the Past events tab
    Then I should see the original backdated meeting unchanged in the Past tab
