@smoke @regression @po @procurement @import-po @po-import-pdf
Feature: Purchase Order — import from PDF

  From the PO list: Upload PDF → create form → title → vendor → prepare units → Action → Compose email → Send email.

  Before Action → Compose: auto-fill may run, then the test **always** waits — finish unfilled units in the UI, then press ENTER (real terminal) or resume Inspector. It will not click **Action** until then. `PO_IMPORT_SKIP_UNITS_MANUAL_GATE=1` skips that pause (CI). `PO_IMPORT_MANUAL_UNITS_BEFORE_COMPOSE=1` skips auto-fill only. `PO_IMPORT_MANUAL_UNITS_INSPECTOR=1` / `PO_IMPORT_MANUAL_UNITS_STDIN` control Inspector vs ENTER.

  Automated: bundled sample PDF (if present) or PO_IMPORT_PDF_PATH — setInputFiles, no Explorer.
  Explorer: PO_IMPORT_PDF_MANUAL=1 or PO_IMPORT_USE_EXPLORER=1 — click Upload PDF card → pick file → test waits for file + Proceed enabled → clicks Proceed. Missing PO_IMPORT_PDF_PATH also opens Explorer.
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
