@customer-support
Feature: Search support tickets

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  @positive @regression
  Scenario: CS-ADM-03 Search by title, serial, and summary
    When I create a linked support ticket
    Then I should see the created support ticket
    When I search support tickets for the created title
    Then I should see the created support ticket
    When I search support tickets for the created serial
    Then I should see the created support ticket
    When I search support tickets for the created summary token
    Then I should see the created support ticket
    When I clear the support ticket search
    Then I should see the created support ticket

  @negative @regression
  Scenario: CS-ADM-04 Search with no match shows the filtered empty state
    When I search support tickets for "no-such-support-ticket-zz99"
    Then the support ticket search should show no matches

  @boundary @regression
  Scenario: CS-ADM-05 Search trims spaces and stays usable for a short or long query
    When I create a linked support ticket
    Then I should see the created support ticket
    When I search support tickets for the created title with extra spaces
    Then I should see the created support ticket
    When I search support tickets for one character of the created title
    Then the Support Desk should stay usable
    When I search support tickets for the created title
    Then I should see the created support ticket
