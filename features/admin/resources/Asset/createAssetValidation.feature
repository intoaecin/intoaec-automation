@resources @asset @negative @validation
Feature: Create Asset Validation

  Scenario: Create button stays disabled when required fields are empty
    Given I am logged in
    When I navigate to the Resources Manage Asset page
    And I start a new asset from the create menu
    And I leave the required asset fields empty
    Then the asset create button should remain disabled
