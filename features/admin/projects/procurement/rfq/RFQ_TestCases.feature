# -----------------------------------------------------------------------------
# RFQ — incremental manual TCs in ONE file.
#
# TS-01 RFQ — @TS01 @TC01 … @TS01 @TC19
#   TC-01 — Action → Compose email → Send
#   TC-02 — Action → Create (from scratch)
#   TC-03 — Add from library (2 rows) → Compose send
#   TC-04 — Notes then Compose send
#   TC-05 — Ship to address then Compose send
#   TC-06 — Attachment then Compose send
#   TC-07 — Create → Send to vendor via email
#   TC-08 — Compose send → Preview → close
#   TC-09 — Compose send → Preview → Download
#   TC-10 — Compose send → Preview → super admin line comment
#   TC-11 — Compose send → card ⋮ → Send reminder
#   TC-12 — Compose send → card ⋮ → Decline
#   TC-13 — Yopmail vendor portal → price update
#   TC-14 — Yopmail vendor portal → decline
#   TC-15 — Yopmail vendor portal → comment
#   TC-16 — Vendor price update → convert RFQ to PO
#   TC-17 — Vendor price update → convert RFQ to WO
#   TC-18 — Vendor price update → Compare vendor price
#   TC-19 — Start from estimate group → Compose send
#
# Run one case:
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/rfq/RFQ_TestCases.feature --tags "@TS01 and @TC01"
#   … through @TC19
#
# npm:
#   npm run test:admin:projects:procurement:rfq
#   npm run test:admin:projects:procurement:rfq:tc01
#   … through :tc19
#   npm run test:admin:projects:procurement:rfq:smoke
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../procurement/rfq/;
#            step-definitions/.../procurement/rfq/
# -----------------------------------------------------------------------------

@rfq @procurement
Feature: RFQ — incremental test cases

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  # ===========================================================================
  # TS-01 — RFQ (@TS01 @TC01 … @TS01 @TC19)
  # ===========================================================================

  # --- TC-01 (Compose email and send) ----------------------------------------
  @TS01 @TC01 @regression @positive @compose-rfq
  Scenario: TC-01 — Compose and send RFQ email from Action menu
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

  # --- TC-02 (Action menu Create) --------------------------------------------
  @TS01 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Create RFQ from scratch
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

  # --- TC-03 (Add from library → Compose send) -------------------------------
  @TS01 @TC03 @regression @positive @rfq-add-from-library
  Scenario: TC-03 — Add line items from library then compose and send email
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ library compose flow"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    When I click add from library on the RFQ form
    Then I should see the RFQ library drawer
    When I select the first two rows in the RFQ library grid
    And I click add in the RFQ library drawer
    And I log the RFQ line item row count for diagnostics
    When I compose and send RFQ email after add from library
    Then I should see RFQ compose email success toast after library compose

  # --- TC-04 (Notes → Compose send) ------------------------------------------
  @TS01 @TC04 @regression @positive @rfq-notes
  Scenario: TC-04 — Enter RFQ notes then compose and send email
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

  # --- TC-05 (Ship to → Compose send) ----------------------------------------
  @TS01 @TC05 @regression @positive @rfq-ship-to
  Scenario: TC-05 — Click ship to address then compose and send RFQ email
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ Ship To compose flow"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I click the RFQ ship to address control on the form
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast

  # --- TC-06 (Attachment → Compose send) -------------------------------------
  @TS01 @TC06 @regression @positive @rfq-attachment
  Scenario: TC-06 — Add RFQ attachment then compose and send email
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

  # --- TC-07 (Create → Send to vendor via email) -----------------------------
  @TS01 @TC07 @regression @positive @rfq-send-to-vendor
  Scenario: TC-07 — Create RFQ then send to vendor via email
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

  # --- TC-08 (Preview from list) ---------------------------------------------
  @TS01 @TC08 @regression @positive @rfq-preview
  Scenario: TC-08 — Create RFQ then open preview
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ preview flow {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I click the RFQ preview icon
    When I close the RFQ preview page

  # --- TC-09 (Download from preview) -----------------------------------------
  @TS01 @TC09 @regression @positive @rfq-download
  Scenario: TC-09 — Create RFQ then download from preview
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ download flow {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I click the RFQ preview icon
    And I click the RFQ download icon
    Then the RFQ should be downloaded

  # --- TC-10 (Super admin line comment from preview) -------------------------
  @TS01 @TC10 @regression @positive @rfq-super-admin-comment
  Scenario: TC-10 — Create RFQ then add super admin line comment from preview
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ super admin comment {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I click the RFQ preview icon
    Then the RFQ preview page should load
    When I submit a random super admin line comment from the RFQ preview
    Then I should see the super admin RFQ preview line comment on the page
    When I close the RFQ preview page

  # --- TC-11 (Send reminder from card) ---------------------------------------
  @TS01 @TC11 @regression @positive @send-reminder
  Scenario: TC-11 — Compose RFQ and send reminder email from the created RFQ card
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ reminder flow {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I wait for the created RFQ card on the list
    And I click the expand button on the created RFQ card
    And I open the three dot menu on the created RFQ card
    And I click send reminder in the RFQ card menu
    Then I should see the RFQ reminder compose email dialog
    When I click send email in the RFQ reminder compose dialog
    Then I should see the RFQ reminder email sent toast

  # --- TC-12 (Decline from card) ---------------------------------------------
  @TS01 @TC12 @regression @positive @decline
  Scenario: TC-12 — Compose RFQ and decline it from the created RFQ card
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ decline flow {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I wait for the created RFQ card on the list
    And I click the expand button on the created RFQ card
    And I open the three dot menu on the created RFQ card
    And I click decline in the RFQ card menu
    Then I should see the RFQ decline success toast

  # --- TC-13 (Vendor price update via Yopmail) -------------------------------
  @TS01 @TC13 @regression @positive @rfq-vendor @rfq-price-update
  Scenario: TC-13 — Compose RFQ, open Yopmail, vendor updates price
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

  # --- TC-14 (Vendor decline via Yopmail) ------------------------------------
  @TS01 @TC14 @regression @negative @rfq-vendor @rfq-vendor-decline
  Scenario: TC-14 — Compose RFQ, open Yopmail, vendor declines RFQ
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ - Vendor decline {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I compose and send the RFQ email capturing vendor Yopmail from the To field
    When I open Yopmail for the RFQ vendor in a new browser tab
    And I wait for the RFQ email in Yopmail open the message and click View RFQ for the vendor portal
    Then I should see the RFQ on the vendor portal page
    When I decline the RFQ on the vendor portal
    Then I should see the RFQ declined on the vendor portal
    When I close the RFQ vendor portal tab

  # --- TC-15 (Vendor comment via Yopmail) ------------------------------------
  @TS01 @TC15 @regression @positive @rfq-vendor @rfq-vendor-comment
  Scenario: TC-15 — Compose RFQ, open Yopmail, vendor adds comment on RFQ
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ - Vendor comment {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I compose and send the RFQ email capturing vendor Yopmail from the To field
    When I open Yopmail for the RFQ vendor in a new browser tab
    And I wait for the RFQ email in Yopmail open the message and click View RFQ for the vendor portal
    Then I should see the RFQ on the vendor portal page
    When I add a random vendor comment on the RFQ vendor portal
    Then I should see the RFQ vendor comment on the vendor portal
    When I close the RFQ vendor portal tab

  # --- TC-16 (Vendor price update → convert to PO) ---------------------------
  @TS01 @TC16 @regression @positive @rfq-vendor @rfq-vendor-to-po
  Scenario: TC-16 — Compose RFQ, vendor updates price, then convert RFQ to PO
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

  # --- TC-17 (Vendor price update → convert to WO) ---------------------------
  @TS01 @TC17 @regression @positive @rfq-vendor @rfq-vendor-to-wo
  Scenario: TC-17 — Compose RFQ, vendor updates price, then convert RFQ to WO
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ - Vendor to WO {unique}"
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
    And I click convert to WO in the RFQ card menu
    Then I should see the work order page after converting the RFQ
    When I fill work order title with a random value after converting RFQ
    And I compose and send the work order email from the converted WO
    Then I should see the work order email sent toast from the converted WO

  # --- TC-18 (Compare vendor price) ------------------------------------------
  @TS01 @TC18 @regression @positive @rfq-vendor @rfq-compare-vendor-price
  Scenario: TC-18 — Compose RFQ, vendor updates price, then compare vendor price
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ - Compare vendor price {unique}"
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
    And I click the compare vendor price button on the created RFQ card
    When I close the compare vendor price page for the RFQ

  # --- TC-19 (Start from estimate) -------------------------------------------
  @TS01 @TC19 @regression @positive @estimate-to-rfq @start-from-estimate
  Scenario: TC-19 — Create RFQ from a sent estimate group and send email
    When I create and send an estimate using estimate flow 2 for start from estimate
    And I return to Procurement RFQ module
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I create RFQ from the created estimate through group flow and send email
    Then I should see RFQ compose email success toast
