@regression @rfq @rfq-vendor @rfq-vendor-to-po
Feature: RFQ Vendor - convert to PO after price update

  Create and send an RFQ to a Yopmail vendor, open Yopmail in a new tab, click View RFQ,
  update the vendor price and submit it, then return to the RFQ list and convert the created RFQ to PO.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Compose RFQ, vendor updates price, then convert RFQ to PO
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ - Vendor to PO {unique}"
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
    And I wait for the created RFQ card on the list
    And I click the expand button on the created RFQ card
    And I open the three dot menu on the created RFQ card
    And I click convert to PO in the RFQ card menu
    Then I should see the purchase order page after converting the RFQ
    When I fill purchase order title with a random value after converting RFQ
    And I compose and send the purchase order email from the converted PO
    Then I should see the purchase order email sent toast from the converted PO
