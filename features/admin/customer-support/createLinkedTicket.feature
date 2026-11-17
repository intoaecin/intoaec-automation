@customer-support @positive
Feature: Create a linked support ticket

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  @smoke @regression
  Scenario: CS-ADM-16 Create a linked ticket with a tag and attachment
    When I create a linked support ticket with an attachment
    Then I should see the created support ticket
    And the created support ticket should show its serial, summary, tag, and priority
