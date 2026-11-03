@crm @questionnaire @client-response @regression
Feature: Client questionnaire response and CRM verification

  Background:
    Given I am logged in

  Scenario: The client answers the emailed questionnaire and the CRM shows the response
    When I open the lead Questionnaire tab
    And I choose a questionnaire template and confirm
    Then I should see the questionnaire send preference page
    When I send the questionnaire via email
    Then I should see questionnaire sent successfully
    And the sent questionnaire should be recorded in the Sent via email list
    When I open the questionnaire link from the lead mailbox
    And I answer all mandatory questions as the client
    And I submit the client questionnaire
    Then the client should see the questionnaire submitted page
    When I open the questionnaire link again
    Then the client should see the questionnaire submitted page
    When I reload the lead Sent via email list
    Then the sent questionnaire card should show "Responded"
    When I open View Response for the sent questionnaire
    Then the response should show the submitted answers
