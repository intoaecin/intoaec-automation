@projects @workers @positive @project-workers @wage-expense
Feature: Convert Wages to Expenses

  Background:
    Given I am logged in
    When I open a project with Worker Management available
    And I wait for the workers module to load
    When I open the Wage Details tab in worker management
    Then the Wage Details table should be ready

  Scenario: Convert wage details to an expense with payment method
    When I open Add to Expenses for the first wage row
    And I select the wage expense payment method "cash"
    And I confirm convert wage to expense
    Then the wage should be converted to an expense successfully

  @negative @validation
  Scenario: Convert wage without payment method shows validation
    When I open Add to Expenses for the first wage row
    And I confirm convert wage to expense
    Then I should see the payment method required toast
