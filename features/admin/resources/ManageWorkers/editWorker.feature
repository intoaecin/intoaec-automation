@resources @workers @positive @manage-workers
Feature: Edit Worker

  Scenario: Edit an individual worker and validate the changes
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I create an individual worker quickly
    And I open edit for the created individual worker
    And I update the individual worker details
    And I submit the worker form
    Then I should see the worker updated successfully
    And I should see the edited individual worker in the list
