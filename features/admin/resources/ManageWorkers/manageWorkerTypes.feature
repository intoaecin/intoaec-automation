@resources @workers @positive @manage-workers @manage-worker-types
Feature: Manage Worker Types

  Scenario: Create a worker type and verify it in the panel
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I open Manage Worker Types
    And I start adding a worker type
    And I fill the worker type form with valid details
    And I submit the worker type form
    Then I should see the worker type created successfully
    And I should see the created worker type in the panel

  Scenario: Edit a worker type and verify the changes
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I create a worker type quickly
    And I open edit for the created worker type
    And I update the worker type details
    And I submit the worker type form
    Then I should see the worker type updated successfully
    And I should see the edited worker type in the panel

  Scenario: Delete an unused worker type and verify it is removed
    Given I am logged in
    When I navigate to the Resources Manage Workers page
    And I create a worker type quickly
    And I open delete for the created worker type
    And I confirm the worker type delete
    Then I should see the worker type deleted successfully
