@po @procurement @import-po @po-import-pdf
Feature: Purchase Order — import from PDF

  From the PO list: Upload PDF → create form → title → vendor → prepare units → Action → Compose email → Send email.

  Units before compose: default = auto-fill empty units after vendor. `PO_IMPORT_MANUAL_UNITS_BEFORE_COMPOSE=1` = you fill units, then resume (Inspector ▶) or `PO_IMPORT_MANUAL_UNITS_STDIN=1` + ENTER in terminal; then compose runs.

  Automated: bundled sample PDF, or PO_IMPORT_PDF_PATH when that file exists.
  Manual (headed): PO_IMPORT_PDF_MANUAL=1, or a missing/wrong PO_IMPORT_PDF_PATH — Upload PDF opens Explorer; select file; test waits for Proceed then clicks it.
  Runs only this folder — not merged with the full create-po / cancel journey.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Import PO via PDF upload then title, vendor, units, and send email
    When I open the create purchase order dialog from the list
    And I upload the import purchase order PDF and click proceed
    Then I should see the purchase order create form loaded after PDF import
    When I fill the purchase order title with a random import title
    And I add the first vendor from the vendor modal for import PO
    Then I should see the purchase order vendor ready after import flow
    And I prepare purchase order line item units before compose email
    When I compose and send the purchase order email for the import flow
    Then I should see the purchase order created and sent success toast
