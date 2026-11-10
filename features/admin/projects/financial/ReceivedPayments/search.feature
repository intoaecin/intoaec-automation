@projects @financial @received-payments @positive @search
Feature: Received Payments module search

  Background:
    Given I am logged in
    When I open a project with Received Payments available
    And I wait for the Received Payments module to load
    When I click Add Received Payment
    And I fill the received payment form with unique details
    And I submit the Received Payments create form
    Then the received payment should be created successfully

  Scenario: Search finds the created payment in module search
    When I search Received Payments for the created payment
    Then I should see the created payment in the search results
