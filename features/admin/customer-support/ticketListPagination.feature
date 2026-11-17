@customer-support
Feature: Support ticket list pagination

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  @positive @regression @boundary
  Scenario: CS-ADM-12 The list loads the next page of 10 without duplicates
    Then the support ticket list should request 10 rows
    When I scroll the support ticket list for the next page

  @boundary @regression
  Scenario: CS-ADM-14 Kanban requests at most 200 tickets and the list still pages by 10
    When I switch the support desk to Kanban
    And I switch the support desk to List
    Then the support ticket list should request 10 rows

  @negative @regression
  Scenario: CS-ADM-15 A failed list request shows an error
    When the support ticket list request fails
    Then the Support Desk should show a load error
