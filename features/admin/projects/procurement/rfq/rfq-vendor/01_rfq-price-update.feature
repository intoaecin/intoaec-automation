@regression @rfq @rfq-vendor @rfq-price-update
Feature: RFQ Vendor - price update

  Create and send an RFQ to a Yopmail vendor, open Yopmail in a new tab, click View RFQ,
  then update the vendor price and submit the update from the vendor portal.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Compose RFQ, open Yopmail, vendor updates price
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ - Vendor price update {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I compose and send the RFQ email capturing vendor Yopmail from the To field
    When I open Yopmail for the RFQ vendor in a new browser tab
    And I wait for the RFQ email in Yopmail open the message and click View RFQ for the vendor portal
    Then I should see the RFQ on the vendor portal page
    When I update the RFQ vendor price and submit the update
    Then I should see the RFQ vendor price update success
    When I close the RFQ vendor portal tab
