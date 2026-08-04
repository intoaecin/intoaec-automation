@crm @lead-profile @events @meeting @negative @validation @regression
Feature: Create Meeting Validation

  Background:
    Given I am logged in

  Scenario: Verify mandatory Title validation
    When I navigate to the first available lead
    And I open the Events module
    And I open the Events action menu
    And I select Create Meeting
    And I leave the Create Meeting title empty and fill other mandatory fields
    And I attempt to submit the Create Meeting form expecting validation
    Then I should see Create Meeting title mandatory validation
    And the meeting should not be created

  Scenario: Verify mandatory Participants validation
    When I open the Create Meeting popup for validation
    And I fill Create Meeting mandatory fields except Participants
    And I attempt to submit the Create Meeting form expecting validation
    Then I should see Create Meeting participants mandatory validation
    And the meeting should not be created

  Scenario: Verify invalid meeting schedule
    When I open the Create Meeting popup for validation
    And I fill Create Meeting mandatory fields with invalid schedule times
    And I attempt to submit the Create Meeting form expecting validation
    Then I should see Create Meeting invalid schedule validation
    And the meeting should not be created
