@customer-support @positive
Feature: Open the Customer Support desk

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar

  @smoke @regression
  Scenario: CS-ADM-01 Support Desk opens from the sidebar
    Then the Support Desk should be displayed
    And the Support Desk should show tickets or the empty state

  @regression
  Scenario: CS-ADM-02 Support Desk shows a ticket list or the empty state with Create Ticket
    Then the Support Desk should show tickets or the empty state
