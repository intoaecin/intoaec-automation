# -----------------------------------------------------------------------------
# Purchase Order — incremental manual TCs in ONE file.
#
# TS-01 Purchase Order — @TS01 @TC02 … @TS01 @TC19
#   TC-02 — Action menu Create (not Compose email)
#   TC-04 — Terms template + attachment + Compose send
#   TC-05 — Create → send → list ⋮ → Cancel
#   TC-06 — Action menu Create (alternate title)
#   TC-07 — Terms from first template + Compose send
#   TC-08 — Create → send → Preview → Download
#   TC-09 — Create → send → Edit → add line → Compose send
#   TC-10 — Ten random manual line items + Compose send
#   TC-11 — Create → send → list ⋮ → Preview → close
#   TC-12 — Create → send → card Send → Send reminder
#   TC-13 — Ship To checked + Compose send
#   TC-14 — Full E2E: create → send → preview → super admin line comment
#   TC-14 (list only) — @po-super-admin-comment-from-list — existing PO preview comment only
#   TC-15 — Random terms and conditions + Compose send
#   TC-16 — Import PDF → title → vendor → units → Compose send
#   TC-16 manual PDF: upload in browser → ENTER in terminal → test clicks Proceed
#   TC-16 fast (headless): npm run test:admin:projects:procurement:purchaseorder:tc16
#   TC-16 headed: npm run test:admin:projects:procurement:purchaseorder:tc16:headed
#   TC-16 fast (headless): npm run test:admin:projects:procurement:purchaseorder:tc16
#   TC-16 headed (watch UI): npm run test:admin:projects:procurement:purchaseorder:tc16:headed
#   TC-17 — Create → Yopmail → vendor portal comment
#   TC-18 — Create → Yopmail → vendor portal decline
#   TC-19 — Create → Yopmail → vendor portal accept
#
# Run one case:
#   npx cross-env STEP_DELAY_MS=0 cucumber-js features/admin/projects/procurement/purchase-order/PurchaseOrder_TestCases.feature --tags "@TS01 and @TC02"
#   … through @TC19
#
# npm:
#   npm run test:admin:projects:procurement:purchaseorder
#   npm run test:admin:projects:procurement:purchaseorder:tc02
#   … through :tc19
#   npm run test:admin:projects:procurement:purchaseorder:smoke
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../procurement/purchase-order/;
#            step-definitions/.../procurement/purchase-order/
# -----------------------------------------------------------------------------

@po @procurement @create-po
Feature: Purchase Order — incremental test cases

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  # ===========================================================================
  # TS-01 — Purchase Order (@TS01 @TC02 … @TS01 @TC19)
  # ===========================================================================

  # --- TC-02 (Action menu Create) --------------------------------------------
  @TS01 @TC02 @smoke @regression @positive @po-action-create
  Scenario: TC-02 — Create purchase order successfully using action menu Create
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Electric materials action create"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I create the purchase order from the action menu
    Then I should see the purchase order created from action menu success toast

  # --- TC-04 (Terms template + attachment + send) ----------------------------
  @TS01 @TC04 @regression @positive @po-attachment
  Scenario: TC-04 — Create purchase order with template terms, attachment, and send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO with attachment"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I add purchase order terms and conditions from the first template
    And I add a purchase order attachment before compose
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast

  # --- TC-05 (Create → send → Cancel from list) ------------------------------
  @TS01 @TC05 @smoke @regression @positive @po-cancel
  Scenario: TC-05 — Create purchase order then cancel from three dot menu
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Cancel PO flow"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "seed item" description "seed" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    And I open the three dot menu on the first purchase order card for cancel
    And I click cancel in the purchase order card menu
    Then I should see the purchase order cancel success toast

  # --- TC-06 (Action menu Create — alternate title) --------------------------
  @TS01 @TC06 @smoke @regression @positive @po-create
  Scenario: TC-06 — Create purchase order via action menu Create with alternate title
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Electric materials"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I create the purchase order from the action menu
    Then I should see the purchase order created from action menu success toast

  # --- TC-07 (Default terms from template + send) ----------------------------
  @TS01 @TC07 @regression @positive @po-default-terms-template
  Scenario: TC-07 — Create purchase order with terms from template and send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO default T&C template"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I add purchase order terms and conditions from the first template
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast

  # --- TC-08 (Create → Preview → Download) ---------------------------------
  @TS01 @TC08 @regression @positive @po-download
  Scenario: TC-08 — Create PO, preview, download
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO download flow"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "download item" description "desc" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    And I open the three dot menu on the first purchase order card
    And I click preview in the purchase order card menu
    Then I should see the purchase order full screen preview
    When I download the purchase order from the full screen preview

  # --- TC-09 (Edit from list → add line → Compose send) --------------------
  @TS01 @TC09 @smoke @regression @positive @po-edit
  Scenario: TC-09 — Edit purchase order from list add line and compose send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Edit PO flow"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "seed item" description "seed" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    And I open the three dot menu on the first purchase order card for edit
    And I click edit in the purchase order card menu
    Then I should see the purchase order edit form loaded
    When I click add manually on the purchase order form
    And I fill the new PO line item with name "copper wire" description "bulk line" quantity "20" unit "Nos" rate "30000"
    When I compose and send the purchase order email from the edit form

  # --- TC-10 (Multi-line manual items + send) --------------------------------
  @TS01 @TC10 @regression @positive @po-multi-line-item
  Scenario: TC-10 — Create purchase order with ten random manual line items and send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with a random multi line purchase order label
    And I add the first vendor from the vendor modal
    And I add 10 manual purchase order line items with random fields
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast

  # --- TC-11 (Preview from list) ---------------------------------------------
  @TS01 @TC11 @smoke @regression @positive @po-preview
  Scenario: TC-11 — Create and send a PO then open preview from the three dot menu
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Preview flow PO"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "preview item" description "desc" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    And I open the three dot menu on the first purchase order card
    And I click preview in the purchase order card menu
    Then I should see the purchase order full screen preview
    When I close the purchase order full screen preview
    Then I should be on the purchase order list with create action visible

  # --- TC-12 (Send reminder from card) ---------------------------------------
  @TS01 @TC12 @smoke @regression @positive @po-send-reminder
  Scenario: TC-12 — Send reminder email from the first purchase order card after create and send
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Send reminder PO flow"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "seed item" description "seed" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    When I open the send menu on the first purchase order card
    And I click send reminder in the purchase order send menu
    Then I should see the purchase order compose email dialog for reminder
    When I click send email in the purchase order compose dialog

  # --- TC-13 (Ship To checked + send) ----------------------------------------
  @TS01 @TC13 @regression @positive @po-ship-to
  Scenario: TC-13 — Create purchase order with Ship To and send email successfully
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO Ship To"
    And I add the first vendor from the vendor modal
    And I add a manual line item for ship to purchase order with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I check the Ship To checkbox on the purchase order form
    And I compose and send the purchase order email for ship to flow
    Then I should see the purchase order created and sent success toast

  # --- TC-14 (Super admin line comment — full E2E) ---------------------------
  @TS01 @TC14 @smoke @regression @positive @po-super-admin-comment @po-super-admin-comment-e2e
  Scenario: TC-14 — Full E2E create and send PO then add super admin line comment from preview
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO - Super admin preview comment"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "comment flow item" description "line for preview comment" quantity "1" unit "Nos" rate "50"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    And I open the three dot menu on the first purchase order card
    And I click preview in the purchase order card menu
    Then I should see the purchase order full screen preview
    When I submit a random super admin line comment from the purchase order preview
    Then I should see the super admin preview line comment on the page
    When I close the purchase order full screen preview
    Then I should be on the purchase order list with create action visible

  # --- TC-14 list-only (existing PO — preview comment only) ------------------
  @TS01 @po-super-admin-comment-from-list @regression @positive @po-super-admin-comment
  Scenario: TC-14 list-only — Existing PO on list open preview and add super admin line comment only
    When I open the three dot menu on the first purchase order card
    And I click preview in the purchase order card menu
    Then I should see the purchase order full screen preview
    When I submit a random super admin line comment from the purchase order preview
    Then I should see the super admin preview line comment on the page
    When I close the purchase order full screen preview
    Then I should be on the purchase order list with create action visible

  # --- TC-15 (Random terms and conditions + send) ----------------------------
  @TS01 @TC15 @regression @positive @po-terms-and-conditions
  Scenario: TC-15 — Create purchase order with random terms and conditions and send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO with T&C"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I fill purchase order terms and conditions with a random comment
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast

  # --- TC-16 (Import PDF → send) ---------------------------------------------
  @TS01 @TC16 @smoke @regression @positive @import-po @po-import-pdf
  Scenario: TC-16 — Import PO via PDF upload then title, vendor, units, and send email
    When I open the create purchase order dialog from the list
    And I upload the import purchase order PDF and click proceed
    Then I should see the purchase order create form loaded after PDF import
    When I fill the purchase order title with a random import title
    And I add the first vendor from the vendor modal for import PO
    Then I should see the purchase order vendor ready after import flow
    And I prepare purchase order line item units before compose email
    When I compose and send the purchase order email for the import flow
    Then I should see the purchase order created and sent success toast

  # --- TC-17 (Vendor comment via Yopmail) ------------------------------------
  @TS01 @TC17 @smoke @regression @positive @vendor @po-vendor-comment
  Scenario: TC-17 — Create PO, send email, Yopmail View PO, vendor submits comment
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO - Cable wire procurement (Vendor comment via Yopmail)"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "Cable wire required for project procurement — vendor to review and add comment." quantity "10" unit "Nos" rate "2000"
    And I compose and send the purchase order email capturing vendor Yopmail from the To field
    Then I should see the purchase order created and sent success toast
    When I open Yopmail for the vendor in a new browser tab
    And I wait for the purchase order email in Yopmail open the message and click View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I submit the vendor comment "Automation vendor note for PO review." on the purchase order portal
    Then I should see the vendor comment "Automation vendor note for PO review." on the vendor portal

  # --- TC-18 (Vendor decline via Yopmail) ------------------------------------
  @TS01 @TC18 @smoke @regression @positive @vendor @po-vendor-declined
  Scenario: TC-18 — Create PO, send email, Yopmail View PO, vendor declines
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO - Cable wire procurement (Vendor decline via Yopmail)"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "Cable wire procurement request — vendor to review and decline if not available." quantity "10" unit "Nos" rate "2000"
    And I compose and send the purchase order email capturing vendor Yopmail from the To field
    Then I should see the purchase order created and sent success toast
    When I open Yopmail for the vendor in a new browser tab
    And I wait for the purchase order email in Yopmail open the message and click View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I decline the purchase order on the vendor portal
    Then I should see the purchase order declined on the vendor portal

  # --- TC-19 (Vendor accept via Yopmail) -------------------------------------
  @TS01 @TC19 @smoke @regression @positive @vendor @po-vendor-yopmail
  Scenario: TC-19 — Create PO, send email, Yopmail View PO, vendor accepts
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO - Cable wire procurement (Vendor accept via Yopmail)"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "Cable wire procurement for project needs — vendor to review and accept." quantity "10" unit "Nos" rate "2000"
    And I compose and send the purchase order email capturing vendor Yopmail from the To field
    Then I should see the purchase order created and sent success toast
    When I open Yopmail for the vendor in a new browser tab
    And I wait for the purchase order email in Yopmail open the message and click View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I accept the purchase order on the vendor portal
