@regression @rfq @compose-rfq
Feature: RFQ — compose email and send

  Same journey as create RFQ from scratch; finishes with Action → Compose email → Send email.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Compose and send RFQ email from Action menu
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "Quotation for Maintenance and Support Services"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
