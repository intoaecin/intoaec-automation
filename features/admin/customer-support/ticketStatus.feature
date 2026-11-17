@customer-support @positive @regression
Feature: Change support ticket status

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-24 Change status from the list
    When I create a linked support ticket
    Then I should see the created support ticket
    When I change the created support ticket status inline
    Then the created support ticket should show the updated status
