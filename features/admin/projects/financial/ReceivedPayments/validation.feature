@projects @financial @received-payments @negative @validation
Feature: Received Payments validation

  Background:
    Given I am logged in
    When I open a project with Received Payments available
    And I wait for the Received Payments module to load

  Scenario: Create payment without required fields shows validation
    When I click Add Received Payment
    And I submit the Received Payments create form without required fields
    Then I should see a Received Payments validation message
