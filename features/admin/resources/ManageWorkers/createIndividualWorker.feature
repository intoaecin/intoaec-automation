@resources @workers @positive @manage-workers
Feature: Create Individual Worker

  Scenario: Create an individual worker and verify it in the listing
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I start creating an individual worker
    And I fill the individual worker form with valid details
    And I submit the worker form
    Then I should see the worker created successfully
    And I should see the created individual worker in the list
