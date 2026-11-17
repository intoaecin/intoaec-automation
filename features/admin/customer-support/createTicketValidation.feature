@customer-support @negative
Feature: Support ticket create validation

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  @regression
  Scenario: CS-ADM-19 Empty title, summary, and lead are required
    When I open the create support ticket panel
    And I submit an empty support ticket
    Then the support ticket form should show required fields

  @boundary @regression
  Scenario: CS-ADM-20 Title is limited to 200 characters and that title can be saved
    When I open the create support ticket panel
    And I enter a 201 character support ticket title
    Then the support ticket title should be limited to 200 characters
    When I finish and save the support ticket
    Then I should see the created support ticket

  @regression
  Scenario: CS-ADM-21 Invalid phones are rejected and a valid phone is accepted
    When I prepare an internal support ticket
    And I enter an invalid support ticket phone "abc"
    And I enter an invalid support ticket phone "12345"
    And I enter a 31 character support ticket phone
    Then the support ticket phone should be limited to 30 characters
    When I enter a valid support ticket phone and save
    Then I should see the created support ticket

  @regression
  Scenario: CS-ADM-22 Completion date before the start date is rejected
    When I set the support ticket completion date before the start date
    Then the support ticket should reject the completion date

  @regression
  Scenario: CS-ADM-30 Cancel closes a dirty create panel without saving
    When I cancel a dirty support ticket
    And I search support tickets for the cancelled title
    Then the support ticket search should show no matches
