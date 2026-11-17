@customer-support @positive @regression
Feature: Project overview support tickets

  Background:
    Given I am logged in
    When I open Customer Support from the sidebar
    Then the Support Desk should be displayed

  Scenario: CS-ADM-31 A linked ticket appears on that client's Support Tickets dialog
    When I create a linked support ticket on a projects client
    Then I should see the created support ticket
    When I navigate to the Projects page
    And I select the client captured from the support ticket
    And I open Support Tickets on the project overview
    And I open the created ticket from the project support dialog
    Then the support ticket panel should show the created title
