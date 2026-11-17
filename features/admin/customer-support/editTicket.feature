@customer-support @positive @regression
Feature: Edit a support ticket

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-23 Edit the ticket title
    When I create a linked support ticket
    Then I should see the created support ticket
    When I edit the created support ticket title
    Then the support ticket should be updated
