# -----------------------------------------------------------------------------
# Purchase Order — incremental TCs in ONE file (same Admin/Vendor pattern as RFQ).
#
# TS-01 Admin: project "Bhavani" → create/send PO "New PO 1" (3 new products via "Add in cost catalog") → toast → list
# TS-02 Continues the SAME PO on Vendor Portal:
#       login → Procurement Hub → Aditya Constructions → first project →
#       Purchase Order → click most recently received PO (PO######) → 3-dots → Preview
# TS-03 Vendor Accept PO:
#       login → Procurement Hub → Aditya Constructions → first project →
#       Purchase Order → Preview → Accept P.O → confirm → success →
#       vendor status Accepted → Admin PO list shows Accepted
# TS-04 Vendor Decline PO:
#       login → Aditya Constructions → first project → Purchase Order →
#       select a PO with status Received (not Accepted) → Preview →
#       3-dots Decline P.O → confirm → success → Declined (vendor only, no Admin)
# TS-05 Vendor Add Comment:
#       login → Aditya Constructions → first project → Purchase Order →
#       Preview → 3-dots Add Comment → "For Testing Process" → success → comment visible
# TS-06 Vendor Add Comment + Admin verifies:
#       Vendor: same as TS-05 (Preview → Add Comment → "For Testing Process" → Save)
#       Admin: project → Purchase Order → open same PO → Preview/comments →
#              verify "For Testing Process" from Vendor Portal
#
# Admin Portal: https://app.aecplayhouse.com/dashboard
#   Admin: kumar@diy.in / Simple@10
# Vendor Portal: https://vendor.aecplayhouse.com/auth/signIn
#   Vendor: same as RFQ — email of PO-added vendor (prefer praveen@yopmail.com) / Simple@10
# Admin project: "Bhavani" (client Bhavani M) · Vendor org: Aditya Constructions (kumar's org)
# Identify PO by recent PO###### (e.g. PO0000093) — digits are dynamic
# Title: New PO 1 | Qty: 1, 2, 3 | Unit: Each (falls back to Nos — account has no Each unit)
#
# Run TC-01 then TC-02 / TC-03 / TC-04 / TC-05 / TC-06 (same PO flow):
#   npx.cmd cucumber-js --tags "@purchase-order-tc"
# Run one:
#   npx.cmd cucumber-js --tags "@purchase-order-tc and @TC01"
#   npx.cmd cucumber-js --tags "@purchase-order-tc and @TC02"
#   npx.cmd cucumber-js --tags "@purchase-order-tc and @TC03"
#   npx.cmd cucumber-js --tags "@purchase-order-tc and @TC04"
#   npx.cmd cucumber-js --tags "@purchase-order-tc and @TC05"
#   npx.cmd cucumber-js --tags "@purchase-order-tc and @TC06"
# -----------------------------------------------------------------------------

@purchase-order-tc @po @procurement @ashraf-modules @create-po
Feature: Purchase Order — incremental test cases

  Background:
    Given I am logged in

  # ===========================================================================
  # TS-01 — Create Purchase Order from scratch with 3 catalog products → Send mail
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Create Purchase Order with 3 products, send mail, and verify toast
    When I open the project "Bhavani" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
    When I start creating a purchase order from scratch
    And I fill purchase order title with "New PO 1"
    And I add the first vendor from the vendor modal
    And I open Add Items on the Purchase Order form
    And I create 3 new Material products in the Purchase Order cost catalog
    Then I should see 3 selected products added to the Purchase Order
    When I enter quantities 1, 2 and 3 for the selected Purchase Order products
    And I select unit "Each" for each selected Purchase Order product
    And I fill remaining required purchase order details
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    And I should see the purchase order titled "New PO 1" in the Purchase Order list

  # ===========================================================================
  # TS-02 — Same PO from TC-01 → Vendor Portal → 3-dots → Preview → verify
  # ===========================================================================

  @TS02 @TC02 @regression @positive
  Scenario: TC-02 — Vendor Portal 3-dots Preview verifies the same Purchase Order from TC-01
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using the Purchase Order vendor credentials
    Then I should be logged in to the vendor portal successfully
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click Purchase Order on the vendor project
    And I click the most recently received vendor Purchase Order
    And I open the vendor Purchase Order overflow menu by its PO number
    And I click Preview from the vendor Purchase Order overflow menu
    Then I should see the Purchase Order preview displayed for the PO from TC-01
    And I should see the vendor details on the Purchase Order preview
    And I should see the Purchase Order items on the vendor preview
    And I should see quantities 1, 2 and 3 on the Purchase Order vendor preview
    And I should see unit "Each" for each item on the Purchase Order vendor preview
    And I should see the price or amount for each item on the Purchase Order vendor preview
    And I should see the total amount on the Purchase Order vendor preview

  # ===========================================================================
  # TS-03 — Vendor Portal Preview → Accept PO → Admin status Accepted
  # ===========================================================================

  @TS03 @TC03 @regression @positive
  Scenario: TC-03 — Vendor Portal Preview and Accept the Purchase Order
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using the Purchase Order vendor credentials
    Then I should be logged in to the vendor portal successfully
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click Purchase Order on the vendor project
    And I click Preview for the required vendor Purchase Order
    Then I should see the Purchase Order preview displayed for the PO from TC-01
    When I click Accept PO on the vendor Purchase Order preview
    And I confirm the Accept PO action if confirmation is displayed
    Then I should see the Purchase Order acceptance success message
    And I should see the Purchase Order status displayed as Accepted
    When I switch to the Admin Portal Purchase Order list for the accepted PO
    And I refresh the Purchase Order list until it shows status "Accepted" for the PO from TC-01
    Then the Purchase Order from TC-01 should show status "Accepted" on the Admin list

  # ===========================================================================
  # TS-04 — Vendor Portal: Received-status PO → Preview → Decline P.O → Declined
  # (Cannot decline an Accepted PO — must use a Received PO. No Admin check.)
  # ===========================================================================

  @TS04 @TC04 @regression @positive
  Scenario: TC-04 — Vendor Portal Preview and Decline a Received Purchase Order
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using the Purchase Order vendor credentials
    Then I should be logged in to the vendor portal successfully
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click Purchase Order on the vendor project
    And I select a vendor Purchase Order with status "Received"
    And I click Preview for the selected vendor Purchase Order
    Then I should see the Purchase Order preview displayed for the selected PO
    When I open the vendor Purchase Order overflow menu by its PO number
    And I click Decline PO from the vendor Purchase Order overflow menu
    And I confirm the Decline PO action if confirmation is displayed
    Then I should see the Purchase Order decline success message
    And I should see the Purchase Order status displayed as Declined

  # ===========================================================================
  # TS-05 — Vendor Portal Preview → Add Comment → verify comment displayed
  # ===========================================================================

  @TS05 @TC05 @regression @positive
  Scenario: TC-05 — Vendor Portal Preview and Add Comment on the Purchase Order
    # 1–4. Vendor login
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using the Purchase Order vendor credentials
    Then I should be logged in to the vendor portal successfully
    # 5–8. Procurement Hub → org → first project → Purchase Order
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click Purchase Order on the vendor project
    # 9. Preview for the required Purchase Order
    And I click Preview for the required vendor Purchase Order
    Then I should see the Purchase Order preview displayed for the PO from TC-01
    # 10–13. Add Comment (overflow or Preview comment icon) → enter → submit
    When I click Add Comment from the vendor Purchase Order overflow menu
    And I enter the vendor Purchase Order comment "For Testing Process"
    And I submit the vendor Purchase Order comment
    # 14. Success + comment displayed on Purchase Order
    Then I should see the vendor Purchase Order comment added successfully
    And I should see the vendor Purchase Order comment "For Testing Process" displayed

  # ===========================================================================
  # TS-06 — Vendor Add Comment → Admin verifies comment on the same Purchase Order
  # ===========================================================================

  @TS06 @TC06 @regression @positive
  Scenario: TC-06 — Vendor adds comment on PO and Admin verifies the comment
    # 1–4. Vendor login
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using the Purchase Order vendor credentials
    Then I should be logged in to the vendor portal successfully
    # 5–8. Procurement Hub → org → first project → Purchase Order
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click Purchase Order on the vendor project
    # 9. Preview for the required Purchase Order
    And I click Preview for the required vendor Purchase Order
    Then I should see the Purchase Order preview displayed for the PO from TC-01
    # 10–14. Add Comment → enter → Save → success
    When I click Add Comment from the vendor Purchase Order overflow menu
    And I enter the vendor Purchase Order comment "For Testing Process"
    And I submit the vendor Purchase Order comment
    Then I should see the vendor Purchase Order comment added successfully
    And I should see the vendor Purchase Order comment "For Testing Process" displayed
    # 15–18. Admin Portal → corresponding project → Purchase Order → open same PO
    When I navigate back to the Admin Portal
    And I open the project "Bhavani" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
    When I open the Purchase Order titled "New PO 1" on the admin Purchase Order list
    # 19. Click Preview icon on that PO (then open comments if needed)
    And I open Preview or the comment section on the admin Purchase Order
    # 20. Verify vendor comment reflected on Admin
    Then I should see the vendor comment "For Testing Process" on the admin Purchase Order

  # ===========================================================================
  # Admin PO consolidated TCs from main (TC-02…TC-19)
  # Each scenario inlines Projects→PO navigation (main Background).
  # ===========================================================================

  # ===========================================================================
  # TS-01 — Purchase Order (@TS01 @TC02 … @TS01 @TC19)
  # ===========================================================================

  # --- TC-02 (Action menu Create) --------------------------------------------
  @TS01 @TC02 @smoke @regression @positive @po-action-create
  Scenario: TC-02 — Create purchase order successfully using action menu Create
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Electric materials action create"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I create the purchase order from the action menu
    Then I should see the purchase order created from action menu success toast

  # --- TC-04 (Terms template + attachment + send) ----------------------------
  @TS01 @TC04 @regression @positive @po-attachment
  Scenario: TC-04 — Create purchase order with template terms, attachment, and send email
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Electric materials"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I create the purchase order from the action menu
    Then I should see the purchase order created from action menu success toast

  # --- TC-07 (Default terms from template + send) ----------------------------
  @TS01 @TC07 @regression @positive @po-default-terms-template
  Scenario: TC-07 — Create purchase order with terms from template and send email
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
    When I start creating a purchase order from scratch
    And I fill purchase order title with a random multi line purchase order label
    And I add the first vendor from the vendor modal
    And I add 10 manual purchase order line items with random fields
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast

  # --- TC-11 (Preview from list) ---------------------------------------------
  @TS01 @TC11 @smoke @regression @positive @po-preview
  Scenario: TC-11 — Create and send a PO then open preview from the three dot menu
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
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
