@resources @asset @bulk @positive
Feature: Create Bulk Asset

  Scenario: Create a BULK owned asset with initial quantity
    Given I am logged in
    When I navigate to the Resources Manage Asset page
    And I start a new asset from the create menu
    And I fill the asset form as a bulk owned asset
    And I submit the asset create form
    Then I should see the asset created successfully
