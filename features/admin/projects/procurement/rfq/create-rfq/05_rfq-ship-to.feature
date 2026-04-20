@regression @rfq @rfq-ship-to
Feature: RFQ — ship to address and compose email

  Same journey as compose RFQ; before Action → Compose email, opens/clicks Ship to address on the form.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Click ship to address then compose and send RFQ email
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ Ship To compose flow"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I click the RFQ ship to address control on the form
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
