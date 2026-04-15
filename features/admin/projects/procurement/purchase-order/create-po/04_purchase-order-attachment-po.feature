@regression @po @procurement @create-po @po-attachment
Feature: Purchase Order — create PO with terms template, attachment, and send email

  Same path as default terms template, then attach a file before Action → Compose email.

  Default: **Explorer** — the script finds the attachment control, clicks it (long timeout so you can pick a file),
  then press ENTER in the terminal (or Resume Inspector) before Action → Compose. PO_ATTACHMENT_SKIP_STEP_ENTER=1 skips that gate.

  Automation (no Explorer): PO_ATTACHMENT_AUTO=1 with PO_ATTACHMENT_FILE_PATH or bundled fixtures/sample-po-import.pdf.

  Detection looks for controls **below** Terms & Conditions (file input, “Attachments”, etc.).
  If needed: PO_ATTACHMENT_TRIGGER_TEXT=substring of your button/label.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create purchase order with template terms, attachment, and send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO with attachment"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I add purchase order terms and conditions from the first template
    And I add a purchase order attachment before compose
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
