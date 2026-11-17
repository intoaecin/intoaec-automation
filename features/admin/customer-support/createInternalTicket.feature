@customer-support @positive @regression
Feature: Create an internal support ticket

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-17 Internal ticket stores a contact name and phone
    When I save an internal support ticket with a contact name and phone
    Then I should see the created support ticket
    And the created support ticket should show Internal and the contact name

  Scenario: CS-ADM-18 Internal ticket can be saved with a name and no phone
    When I save an internal support ticket with a contact name only
    Then I should see the created support ticket
    And the created support ticket should show Internal and the contact name
