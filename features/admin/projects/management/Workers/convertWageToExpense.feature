@projects @workers @positive @project-workers @wage-expense
Feature: Convert Wages to Expenses

  Background:
    Given I am logged in
    When I open a project with Worker Management available
    And I wait for the workers module to load
    # Seed a shift + Present attendance so Wage Details has a Pending row to convert
    When I click the Add Shift button in workers
    Then I should see the add shift form or popup
    When I select the shift worker tab "INDIVIDUAL"
    And I enter a random shift name in the add shift form
    And I select the second checkbox in the add shift form
    And I select today as the start date in the add shift form
    And I enter start and end time in the add shift form
    And I click Create on the add shift form
    Then the created shift should be visible in worker management
    When I open attendance in worker management
    And I mark the first individual worker as present
    Then I should see present attendance status
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
