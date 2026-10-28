@resources @workers @positive @manage-workers
Feature: Delete Worker

  Scenario: Delete an individual worker and verify it is removed from the listing
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I create an individual worker quickly
    And I open delete for the created individual worker
    And I fill the worker delete reason
    And I confirm the worker delete
    Then I should see the worker deleted successfully
