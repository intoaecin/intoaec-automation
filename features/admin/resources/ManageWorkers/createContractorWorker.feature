@resources @workers @positive @manage-workers
Feature: Create Contractor Worker

  Scenario: Create a contractor with workers and verify it in the listing
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I start creating a contractor with workers
    And I fill the contractor worker form with valid details
    And I submit the worker form
    Then I should see the worker created successfully
    And I should see the created contractor worker in the list
