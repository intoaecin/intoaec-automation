@resources @workers @negative @validation @manage-workers
Feature: Create Worker Validation

  Scenario: Add button stays disabled when required individual worker fields are empty
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I start creating an individual worker
    And I leave the required individual worker fields empty
    Then the worker create button should remain disabled
