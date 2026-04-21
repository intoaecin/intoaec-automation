@resources @asset @positive
Feature: Create Asset

  Scenario: Create an asset with manual attachment upload
    Given I am logged in
    When I navigate to the Resources Manage Asset page
    And I start a new asset from the create menu
    And I fill the asset form with valid details
    And I attach the asset document manually and press Enter to continue
    And I submit the asset create form
    Then I should see the asset created successfully
