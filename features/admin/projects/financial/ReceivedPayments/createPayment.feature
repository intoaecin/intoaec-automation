@projects @financial @received-payments @positive
Feature: Create Received Payment

  Background:
    Given I am logged in
    When I open a project with Received Payments available
    And I wait for the Received Payments module to load

  Scenario: Create a received payment
    When I click Add Received Payment
    And I fill the received payment form with unique details
    And I submit the Received Payments create form
    Then the received payment should be created successfully
