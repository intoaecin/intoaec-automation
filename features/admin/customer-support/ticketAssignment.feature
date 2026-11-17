@customer-support @positive @regression
Feature: Assign support tickets

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-27 Assign users and clear back toward Unassigned
    When I create a support ticket with no assignee
    Then I should see the created support ticket
    And the created support ticket should show Unassigned
    When I assign two users on the support ticket
    Then I should see the created support ticket
    And the created support ticket should not be Unassigned
    When I remove one support ticket assignee
    Then the support ticket should be updated
