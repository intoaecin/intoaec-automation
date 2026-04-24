@regression @rfq @rfq-notes
Feature: RFQ — notes and compose email

  Same journey as compose RFQ; fills the Notes area with random medium-length text before Action → Compose email.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Enter RFQ notes then compose and send email
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ notes compose flow"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I enter random medium content in the RFQ notes field
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
