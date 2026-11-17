@customer-support @positive @regression
Feature: Delete a support ticket

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-29 Cancel keeps the ticket and confirm deletes it
    When I create a linked support ticket
    Then I should see the created support ticket
    When I delete the created support ticket and cancel
    Then the created support ticket should stay in the list
    When I delete the created support ticket
    Then the created support ticket should be removed
