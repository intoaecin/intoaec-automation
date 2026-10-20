@crm @lead @create-lead @regression
Feature: CRM Lead Creation

  Background:
    Given I am logged in

  @positive
  Scenario: Create a lead with a generated lead name
    When I open the Create Lead form from Lead Manager
    And I enter a generated lead name
    And I go through the Lead and Project steps
    And I submit the Create Lead form
    Then I should see the lead added successfully toast
    And I should be returned to the Lead Manager list
    And I should see the new lead in the Lead Manager list

  @negative
  Scenario: Lead name is required to continue
    When I open the Create Lead form from Lead Manager
    And I leave the lead name empty
    Then the Create Lead Next button should stay disabled
    And no lead should be created
