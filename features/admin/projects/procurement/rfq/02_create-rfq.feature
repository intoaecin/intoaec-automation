Feature: Create RFQ

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  @smoke @rfq
  Scenario: Create RFQ from scratch
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "Quotation for Maintenance and Support Services"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    And I create the RFQ from Action menu
    Then I should see RFQ created successfully toast
