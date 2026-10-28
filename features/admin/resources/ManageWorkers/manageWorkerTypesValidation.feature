@resources @workers @negative @validation @manage-workers @manage-worker-types
Feature: Manage Worker Types Validation

  Scenario: Create stays disabled when worker type name is empty
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I open Manage Worker Types
    And I start adding a worker type
    And I leave the worker type name empty
    Then the worker type create button should remain disabled
