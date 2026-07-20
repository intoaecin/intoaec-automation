@crm @questionnaire @answer @positive @regression
Feature: Answer By Own Questionnaire

  Background:
    Given I am logged in

  Scenario: Answer and submit questionnaire via Answer By Own
    When I open the lead Questionnaire module to answer by own
    And I select a questionnaire template to answer by own
    And I click answer by own questionnaire
    And I fill all mandatory questionnaire questions
    And I submit the answered questionnaire
    And I open the answer by own tab
    Then I should see the questionnaire submitted successfully
    And I should see the questionnaire answer success message if displayed
    And I should see the submitted questionnaire in the answer by own tab
    And I should see the submitted questionnaire title and details displayed correctly
