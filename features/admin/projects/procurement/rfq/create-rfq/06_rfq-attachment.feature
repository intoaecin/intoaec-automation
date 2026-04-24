@regression @rfq @rfq-attachment
Feature: RFQ - attachment and compose email

  Same pattern as PO attachment (`04_purchase-order-attachment-po.feature`): attach below Terms & Conditions,
  then **Action → Compose email** (opens the modal), then **Send email** from that dialog.

  Default: **Explorer** — long-timeout click, then ENTER in the terminal (or Resume Inspector) before the Action step.
  **RFQ_ATTACHMENT_SKIP_STEP_ENTER=1** skips that gate.

  Automation: **RFQ_ATTACHMENT_AUTO=1** with **RFQ_ATTACHMENT_FILE_PATH** or bundled **fixtures/sample-po-import.pdf**.

  Detection follows **Terms & Conditions** (same idea as PO). If needed: **RFQ_ATTACHMENT_TRIGGER_TEXT**.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Add RFQ attachment then compose and send email
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "Copper wire"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    And I add an RFQ attachment before compose
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
