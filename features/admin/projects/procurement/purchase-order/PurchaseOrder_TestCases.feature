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

@purchase-order-tc @po @procurement @ashraf-modules
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
