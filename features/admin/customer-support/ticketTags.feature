@customer-support @positive @regression
Feature: Support ticket tags

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-28 Selected tags show on the ticket card
    When I select four support ticket tags
    Then I should see the created support ticket
    And the created support ticket should show the selected tags
