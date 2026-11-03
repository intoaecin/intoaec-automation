# -----------------------------------------------------------------------------
# Money Matters — incremental TCs in ONE file (Invoice + Credit Note).
#
# TS-01 Create Invoice — @TS01 @TC01
#   TC-01 — Invoice → Create Invoice → Start from Scratch → name → Add Manually → Create
#
# TS-02 Create Credit Note — @TS02 @TC02
#   TC-02 — Credit Note → Create Credit Note → Add Credit Note line item → Create
#
# TS-03 Register Payment — @TS03 @TC03
#   TC-03 — (creates invoice first) Payment tab → Add Payment → Register Payment
#           → Cash + today → select first outstanding invoice → Update Payment
#
# TS-04 Void Invoice — @TS04 @TC04
#   TC-04 — (reuses TC-03) Invoice tab → click/hover first row → kebab → Void → random comment → Yes
#
# TS-05 Delete Invoice — @TS05 @TC05
#   TC-05 — (reuses TC-04 path) Invoice tab → click/hover first row → kebab → Delete → reason → Yes
#
# TS-06 Preview Invoice — @TS06 @TC06
#   TC-06 — (reuses TC-05 path) Invoice tab → click/hover first row → kebab → Preview (end)
#
# TS-07 Edit Invoice — @TS07 @TC07
#   TC-07 — (reuses TC-06 path) Invoice tab → kebab → Edit → increase qty → Update
#
# TS-08 Send Invoice Email — @TS08 @TC08
#   TC-08 — (reuses TC-07 path) Invoice tab → hover first row → kebab → Send Email → composer → Send Email
#
# TS-09 Send Invoice Email after create — @TS09 @TC09
#   TC-09 — (reuses TC-01) create invoice → hover first row → kebab → Send Email → composer → Send Email
#
# TS-10 Refund Credit Note — @TS10 @TC10
#   TC-10 — (reuses TC-02) create credit note → hover first row → kebab → Refund → reason + Cash → Yes
#
# TS-11 Preview Refund — @TS11 @TC11
#   TC-11 — (reuses TC-10) Refund page → hover created refund → kebab → Preview (end)
#
# TS-12 Refund Payment — @TS12 @TC12
#   TC-12 — (reuses TC-03) Payment tab → kebab → Refund → reason + Cash → Yes
#
# TS-13 Create Invoice with Pay Now — @TS13 @TC13
#   TC-13 — (reuses TC-01) Create Invoice → Start from Scratch → name → line item
#           → enable Pay Now button to client → Create
#
# TS-14 Pay Now from invoice preview — @TS14 @TC14
#   TC-14 — (reuses TC-13) Client Profile breadcrumb → first invoice link → preview
#           → Pay Now → select saved card → Proceed to payment → payment successful popup → close
#
# TS-15 Pay Now with extra payment terms — @TS15 @TC15
#   TC-15 — (reuses TC-14) while creating invoice enable Payment Terms, add 2 extra
#           payment terms, then the same Pay Now saved-card journey
#
# Run one case (always pass this file path):
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS01 and @TC01"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS02 and @TC02"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS03 and @TC03"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS04 and @TC04"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS05 and @TC05"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS06 and @TC06"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS07 and @TC07"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS08 and @TC08"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS09 and @TC09"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS10 and @TC10"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS11 and @TC11"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS12 and @TC12"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS13 and @TC13"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS14 and @TC14"
#   npx cross-env KEEP_BROWSER=false STEP_DELAY_MS=0 cucumber-js features/admin/projects/financial/create-invoice/Invoice_TestCases.feature --tags "@TS15 and @TC15"
#
# npm:
#   npm run test:admin:projects:financial:invoice
#   npm run test:admin:projects:financial:invoice:tc01
#   npm run test:admin:projects:financial:invoice:tc02
#   npm run test:admin:projects:financial:invoice:tc03
#   npm run test:admin:projects:financial:invoice:tc04
#   npm run test:admin:projects:financial:invoice:tc05
#   npm run test:admin:projects:financial:invoice:tc06
#   npm run test:admin:projects:financial:invoice:tc07
#   npm run test:admin:projects:financial:invoice:tc08
#   npm run test:admin:projects:financial:invoice:tc09
#   npm run test:admin:projects:financial:invoice:tc10
#   npm run test:admin:projects:financial:invoice:tc11
#   npm run test:admin:projects:financial:invoice:tc12
#   npm run test:admin:projects:financial:invoice:tc13
#   npm run test:admin:projects:financial:invoice:tc14
#   npm run test:admin:projects:financial:invoice:tc15
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/.../financial/create-invoice/;
#            step-definitions/.../financial/create-invoice/
# -----------------------------------------------------------------------------

@invoice @financial @money-matters @create-invoice @credit-note
Feature: Money Matters — invoice and credit note incremental test cases

  Background:
    Given I am logged in

  # ===========================================================================
  # TS-01 — Create Invoice (@TS01 @TC01)
  # ===========================================================================

  # --- TC-01 (Start from Scratch → name → Add Manually → Create → success) ---
  @TS01 @TC01 @smoke @regression @positive @invoice-create @invoice-scratch
  Scenario: TC-01 — Create invoice from scratch with a manual line item
    When I complete the invoice create from scratch journey with name "Electricians" line item "Labour 1" quantity "20" and rate "100"
    Then I should see the invoice created successfully

  # ===========================================================================
  # TS-02 — Create Credit Note (@TS02 @TC02)
  # ===========================================================================
  # --- TC-02 (Credit Note → Create → Add Credit Note → item/qty/price → Create → success) ---
  @TS02 @TC02 @smoke @regression @positive @credit-note-create
  Scenario: TC-02 — Create credit note with a manual line item
    When I complete the credit note create journey
    Then I should see the credit note created successfully

  # ===========================================================================
  # TS-03 — Register Payment (@TS03 @TC03)
  # ===========================================================================
  # --- TC-03 (create invoice → Payment → Register Payment → Cash / today → Update) ---
  @TS03 @TC03 @smoke @regression @positive @register-payment
  Scenario: TC-03 — Register cash payment against the first outstanding invoice
    When I complete the register payment journey after creating an invoice
    Then I should see the payment registered successfully

  # ===========================================================================
  # TS-04 — Void Payment (@TS04 @TC04)
  # ===========================================================================
  # --- TC-04 (register payment → Invoice tab → click/hover first row → kebab → Void → Yes) ---
  @TS04 @TC04 @smoke @regression @positive @void-payment
  Scenario: TC-04 — Void the invoice from the kebab menu after registering payment
    When I complete the void payment journey after registering a payment
    Then I should see the payment voided successfully

  # ===========================================================================
  # TS-05 — Delete Invoice (@TS05 @TC05)
  # ===========================================================================
  # --- TC-05 (register payment → Invoice tab → kebab → Delete → reason → Yes) ---
  @TS05 @TC05 @smoke @regression @positive @delete-invoice
  Scenario: TC-05 — Delete the invoice from the kebab menu after registering payment
    When I complete the delete invoice journey after registering a payment
    Then I should see the invoice deleted successfully

  # ===========================================================================
  # TS-06 — Preview Invoice (@TS06 @TC06)
  # ===========================================================================
  # --- TC-06 (register payment → Invoice tab → kebab → Preview → done) ---
  @TS06 @TC06 @smoke @regression @positive @preview-invoice
  Scenario: TC-06 — Preview the invoice from the kebab menu after registering payment
    When I complete the invoice preview journey after registering a payment
    Then I should see the invoice preview opened

  # ===========================================================================
  # TS-07 — Edit Invoice (@TS07 @TC07)
  # ===========================================================================
  # --- TC-07 (register payment → Invoice tab → kebab → Edit → extra qty → Update) ---
  @TS07 @TC07 @smoke @regression @positive @edit-invoice
  Scenario: TC-07 — Edit the invoice from the kebab menu and update extra qty
    When I complete the edit invoice journey after registering a payment
    Then I should see the invoice updated successfully

  # ===========================================================================
  # TS-08 — Send Invoice Email (@TS08 @TC08)
  # ===========================================================================
  # --- TC-08 (register payment → Invoice tab → kebab → Send Email → composer Send Email) ---
  @TS08 @TC08 @smoke @regression @positive @send-invoice-email
  Scenario: TC-08 — Send invoice email from the kebab menu after registering payment
    When I complete the send invoice email journey after registering a payment
    Then I should see the invoice email sent successfully

  # ===========================================================================
  # TS-09 — Send Invoice Email after create (@TS09 @TC09)
  # ===========================================================================
  # --- TC-09 (create invoice → hover first row → kebab → Send Email → composer Send Email) ---
  @TS09 @TC09 @smoke @regression @positive @send-invoice-email-after-create
  Scenario: TC-09 — Send invoice email from the kebab menu after creating an invoice
    When I complete the send invoice email journey after creating an invoice
    Then I should see the invoice email sent successfully

  # ===========================================================================
  # TS-10 — Refund Credit Note (@TS10 @TC10)
  # ===========================================================================
  # --- TC-10 (create credit note → hover first row → kebab → Refund → reason + Cash → Yes) ---
  @TS10 @TC10 @smoke @regression @positive @refund-credit-note
  Scenario: TC-10 — Refund the first credit note from the kebab menu
    When I complete the refund credit note journey after creating a credit note
    Then I should see the credit note refunded successfully

  # ===========================================================================
  # TS-11 — Preview Refund (@TS11 @TC11)
  # ===========================================================================
  # --- TC-11 (refund credit note → Refund page → hover created refund → kebab → Preview) ---
  @TS11 @TC11 @smoke @regression @positive @preview-refund
  Scenario: TC-11 — Preview the created refund from the kebab menu
    When I complete the preview refund journey after refunding a credit note
    Then I should see the refund preview opened

  # ===========================================================================
  # TS-12 — Refund Payment (@TS12 @TC12)
  # ===========================================================================
  # --- TC-12 (register payment → Payment tab → kebab → Refund → reason + Cash → Yes) ---
  @TS12 @TC12 @smoke @regression @positive @refund-payment
  Scenario: TC-12 — Refund the payment from the kebab menu after registering payment
    When I complete the refund payment journey after registering a payment
    Then I should see the payment refunded successfully

  # ===========================================================================
  # TS-13 — Create Invoice with Pay Now to client (@TS13 @TC13)
  # ===========================================================================
  # --- TC-13 (create invoice → enable Pay Now button to client → Create) ---
  @TS13 @TC13 @smoke @regression @positive @invoice-create @invoice-pay-now
  Scenario: TC-13 — Create invoice with Pay Now button to client enabled
    When I complete the invoice create from scratch journey with Pay Now to client enabled
    Then I should see the invoice created successfully

  # ===========================================================================
  # TS-14 — Pay Now from invoice preview (@TS14 @TC14)
  # ===========================================================================
  # --- TC-14 (TC-13 create → Client Profile → first invoice → Pay Now → saved card → success popup) ---
  @TS14 @TC14 @smoke @regression @positive @invoice-pay-now @pay-now-card
  Scenario: TC-14 — Pay the created invoice from preview with a saved card
    When I complete the pay now card journey after creating an invoice with Pay Now enabled
    Then I should see the pay now payment successful message

  # ===========================================================================
  # TS-15 — Pay Now with extra payment terms (@TS15 @TC15)
  # ===========================================================================
  # --- TC-15 (TC-14 + enable Payment Terms + add 2 extra terms → Pay Now) ---
  @TS15 @TC15 @smoke @regression @positive @invoice-pay-now @payment-terms
  Scenario: TC-15 — Pay the invoice after adding two extra payment terms
    When I complete the pay now card journey after creating an invoice with Pay Now and extra payment terms
    Then I should see the pay now payment successful message
