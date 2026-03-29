Feature: Lead Profile Questionnaire

  Scenario: Send a questionnaire via email
    Given I am logged in and on a Lead Profile page
    When I click the "Questionnaire" tab
    And I click the "Choose Questionnaire" button
    And I select a random questionnaire from the "Choose Questionnaire" dropdown
    And I click the "Confirm" button
    Then I should see the "Select Your Preference" page
    When I click the "Send Via" button
    And I click the "Email" option
    Then I should see the "Compose Email" tab
    When I click the "Send Email" button
    Then I should see a "Questionnaire sent successfully" toast message
    And I click the "Sent via email" dropdown
    And the sent questionnaire should be visible
    And I expand the sent questionnaire details
    Then the email details should be visible
