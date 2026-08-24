@crm @lead-profile @events @meeting @positive @regression
Feature: Navigate to Create Meeting

  Background:
    Given I am logged in

  @smoke
  Scenario: Create an online meeting with full details
    When I navigate to the first available lead
    And I open the Events module
    And I open the Events action menu
    And I select Create Meeting
    And I fill the Create Meeting online form with valid details
    And I submit the Create Meeting form
    Then I should see the meeting created successfully
    And I should see the created meeting in the online events tab

  @smoke
  Scenario: Create an offline meeting with full details
    When I navigate to the first available lead
    And I open the Events module
    And I open the Events action menu
    And I select Create Meeting
    And I fill the Create Meeting offline form with valid details
    And I submit the Create Meeting form
    Then I should see the meeting created successfully
    And I should see the created meeting in the offline events tab

  @smoke
  Scenario: Create an offline meeting without location and agenda
    When I navigate to the first available lead
    And I open the Events module
    And I open the Events action menu
    And I select Create Meeting
    And I fill the Create Meeting offline form without location and agenda
    And I submit the Create Meeting form
    Then I should see the meeting created successfully
    And I should see the created meeting in the offline events tab

  Scenario: Open the Create Meeting screen from Events
    When I navigate to the first available lead
    And I open the Events module
    And I open the Events action menu
    And I select Create Meeting
    Then the Create Meeting panel should open
    And all mandatory Create Meeting fields and action buttons should be displayed
    And I should remain on the Create Meeting screen without errors
