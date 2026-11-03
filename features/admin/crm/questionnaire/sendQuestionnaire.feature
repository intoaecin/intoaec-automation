@crm @questionnaire @positive @regression
Feature: CRM Lead Questionnaire

  Background:
    Given I am logged in

  Scenario: Send a questionnaire via email
    When I open the lead Questionnaire tab
    And I choose a questionnaire template and confirm
    Then I should see the questionnaire send preference page
    When I send the questionnaire via email
    Then I should see questionnaire sent successfully
    When I open the sent via tab
    Then I should see the sent questionnaire in the list
    When I expand the sent questionnaire details
    Then I should see the questionnaire email details
