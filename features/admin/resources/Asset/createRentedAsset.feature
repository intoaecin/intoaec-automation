@resources @asset @rented @positive
Feature: Create Rented Asset

  Scenario: Create a RENTED individual asset with contractor and unit cost
    Given I am logged in
    When I navigate to the Resources Manage Asset page
    And I start a new asset from the create menu
    And I fill the asset form as a rented asset
    And I submit the asset create form
    Then I should see the asset created successfully
