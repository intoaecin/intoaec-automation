@crm @questionnaire @expiry @regression
Feature: Questionnaire link expiry

  Background:
    Given I am logged in

  Scenario: A questionnaire sent with a 1 minute manual expiry expires and can be resent
    When I open the lead Questionnaire tab
    And I choose a questionnaire template and confirm
    Then I should see the questionnaire send preference page
    When I send the questionnaire via email with a manual expiry of 1 minute
    Then I should see questionnaire sent successfully
    And the sent questionnaire should be recorded with a manual expiry of 1 minute
    When I wait for the sent questionnaire link to expire
    And I reload the lead Sent via email list
    Then the sent questionnaire card should show "Expired"
    And Resend should be available for the expired questionnaire
    When I open the questionnaire link from the lead mailbox
    Then the questionnaire link should show the link expired page
