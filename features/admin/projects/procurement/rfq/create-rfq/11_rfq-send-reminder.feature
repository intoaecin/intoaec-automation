@regression @rfq @send-reminder
Feature: RFQ - send reminder from list

  Create and send an RFQ through compose email, then expand the created RFQ card,
  open the three dot menu, choose Send reminder, and send the reminder email.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Compose RFQ and send reminder email from the created RFQ card
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ reminder flow {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I wait for the created RFQ card on the list
    And I click the expand button on the created RFQ card
    And I open the three dot menu on the created RFQ card
    And I click send reminder in the RFQ card menu
    Then I should see the RFQ reminder compose email dialog
    When I click send email in the RFQ reminder compose dialog
    Then I should see the RFQ reminder email sent toast
