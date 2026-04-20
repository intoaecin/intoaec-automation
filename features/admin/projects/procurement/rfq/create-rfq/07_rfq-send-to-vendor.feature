@regression @rfq @rfq-send-to-vendor
Feature: RFQ — send to vendor by email

  After creating an RFQ (same setup as compose RFQ), use **Send to vendor** on the RFQ view,
  pick a vendor, **Send** → **Email** from the dropdown, then **Send email** in the compose dialog.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Create RFQ then send to vendor via email
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ send to vendor email flow"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    And I create the RFQ from Action menu
    Then I should see RFQ created successfully toast
    When I click Send to vendor on the RFQ page
    And I select the first vendor in the send to vendor panel
    And I click Send and choose the email option
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
