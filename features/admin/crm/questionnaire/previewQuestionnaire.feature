@crm @questionnaire @preview @positive @regression
Feature: Preview Questionnaire

  Background:
    Given I am logged in

  Scenario: Verify preview questionnaire displays title, questions, and close button
    When I open the lead Questionnaire module for preview
    And I select a questionnaire template for preview
    And I click preview questionnaire
    Then I should see the questionnaire preview opened successfully
    And I should see the questionnaire preview title displayed
    And I should see all questionnaire preview questions visible
    When I navigate to the last questionnaire preview page
    Then I should see the disabled questionnaire preview submit button
    And I should see the questionnaire preview close button displayed
    When I close the questionnaire preview
    Then I should see the questionnaire preview closed successfully
