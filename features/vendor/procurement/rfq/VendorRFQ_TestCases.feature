# -----------------------------------------------------------------------------
# Vendor Portal RFQ — incremental TCs in ONE file.
#
# TS-01 Verify Admin Can Send RFQ to Accepted Vendor
#   Admin (kumar@diy.in / Simple@10) → client/project "Bhavani" → Create RFQ from scratch "New One" →
#   Required By = today, Created On = random → add first vendor →
#   create 2 new Material products via "Add in cost catalog" → qty + Unit Each (falls back to Nos) →
#   Action → Compose Email → Send → success toast →
#   Vendor Portal → org Aditya Constructions → first project → RFQ →
#   Preview "New One" → verify 2 products / quantities / Unit Each
# TS-02 Vendor: Update Price 1000 on RFQ "New One" → Admin: open associated project →
#       open sent RFQ → verify status + vendor response + updated price 1000
#       (reuses TC-01 session Admin project / RFQ title when present)
# TS-03 Vendor: Preview → Decline RFQ "New One" → Declined on Vendor + Admin
#       (reuses TC-01 session Admin project / RFQ title / vendor email)
# TS-04 Admin creates and sends "Vendor Comment RFQ"
# TS-05 Vendor: Preview → Show comments → line comment "For Testing Process" → suggestion Save, then green header Save
# TS-06 Admin: open the same RFQ → verify the vendor comment
#
# Admin Portal: https://app.aecplayhouse.com/dashboard
#   Admin: kumar@diy.in / Simple@10
# Vendor Portal: https://vendor.aecplayhouse.com/auth/signIn
#   Vendor: email of RFQ-added vendor (prefer praveen@yopmail.com) / Simple@10
# Admin project: "Bhavani" (client Bhavani M) · Vendor org: Aditya Constructions (kumar's org)
# RFQ titles: "New One" (TC-01–03), "Vendor Comment RFQ" (TC-04 creates it; TC-05 and TC-06 reuse it)
#
# Run:
#   npx.cmd cucumber-js --tags "@vendor-rfq and @TC01"
#   npx.cmd cucumber-js --tags "@vendor-rfq and @TC02"
#   npx.cmd cucumber-js --tags "@vendor-rfq and @TC03"
#   npx.cmd cucumber-js --tags "@vendor-rfq and @TC04"
#   npx.cmd cucumber-js --tags "@vendor-rfq and @TC05"
#   npx.cmd cucumber-js --tags "@vendor-rfq and @TC06"
#   npx.cmd cucumber-js --tags "@vendor-rfq"
# -----------------------------------------------------------------------------

@vendor-rfq @ashraf-modules
Feature: Vendor Portal RFQ — incremental test cases

  Background:
    Given I am logged in

  # ===========================================================================
  # TS-01 — Verify Admin Can Send RFQ to Accepted Vendor (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Verify Admin Can Send RFQ to Accepted Vendor
    # 2–3. Open the Admin project "Bhavani"
    When I open the project "Bhavani" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I navigate to the RFQ module
    Then I should see the RFQ page loaded
    # 4–5. Create RFQ → Start RFQ from Scratch and proceed
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    # 6–8. Title, Required By (today), Created On (random)
    And I fill RFQ title with "New One"
    And I set RFQ required by date to today
    And I set RFQ created on date to a random date
    # 9. Add the first vendor in the RFQ vendor panel
    And I add a vendor in the RFQ vendor panel
    # 10–12. Create 2 new products: unique name → "Add in cost catalog" → Unit + Type Material → Create
    And I create 2 new Material products in the RFQ cost catalog
    Then I should see 2 selected products added to the RFQ
    # 13–14. Quantity + Unit: Each for each selected product
    When I enter quantity for each selected RFQ product
    And I select unit "Each" for each selected RFQ product
    # 15–18. Action → Compose Email → Send → success toast
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    # 19–22. Vendor Login page → login with valid vendor credentials
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using valid vendor credentials
    Then I should be logged in to the vendor portal successfully
    # 23–26. Procurement Hub → org Aditya Constructions → first project → RFQ
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click RFQ on the vendor project
    # 27–28. Locate RFQ "New One" → Preview
    And I work only on the vendor RFQ titled "New One"
    And I click Preview on the vendor RFQ
    # 29–30. Verify RFQ + 2 Material products, quantities, Unit: Each
    Then I should see the RFQ available in the Vendor Portal with title "New One"
    And I should see the vendor RFQ preview contains the selected Material products with unit "Each"

  # ===========================================================================
  # TS-02 — Vendor Update Price 1000 → Admin verifies status + price
  # Vendor: login → Procurement Hub → org → project → RFQ "New One" → Update Price 1000
  # Admin: associated project → RFQ → open sent RFQ → status / vendor response / price 1000
  # ===========================================================================

  @TS02 @TC02 @regression @positive
  Scenario: TC-02 — Admin verifies RFQ status and updated price 1000 after vendor price update
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using valid vendor credentials
    Then I should be logged in to the vendor portal successfully
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click RFQ on the vendor project
    And I work only on the vendor RFQ titled "New One"
    And I open the vendor RFQ overflow menu for "New One"
    And I click Update Price from the vendor RFQ overflow menu
    And I change the first row vendor RFQ price to "1000"
    And I click Update Price on the vendor RFQ
    Then I should see the vendor RFQ price update success
    When I navigate back to the Admin Portal
    And I open the project "Bhavani" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I navigate to the RFQ module
    Then I should see the RFQ page loaded
    When I open the RFQ titled "New One" on the admin RFQ list
    Then I should see the RFQ price update status on the expanded card
    And I should see the RFQ vendor response status on the expanded card
    And I should see the updated RFQ price "1000" for the first line item

  # ===========================================================================
  # TS-03 — Vendor Decline RFQ "New One" → Declined on Vendor + Admin
  # 1–11 Vendor: login → Hub → org → project → RFQ → Preview → Decline → Declined
  # 12–18 Admin: associated project → RFQ → open same RFQ → Declined + vendor response
  # ===========================================================================

  @TS03 @TC03 @regression @negative
  Scenario: TC-03 — Vendor Declines RFQ "New One" and Admin verifies Declined status
    # 1. Login to the Vendor Portal using valid vendor credentials
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using valid vendor credentials
    Then I should be logged in to the vendor portal successfully
    # 2–5. Procurement Hub → org → first project → RFQ
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click RFQ on the vendor project
    # 6. Click Preview for the required RFQ
    And I work only on the vendor RFQ titled "New One"
    And I click Preview on the vendor RFQ
    Then I should see the RFQ available in the Vendor Portal with title "New One"
    # 7–9. Overflow menu → Decline RFQ → confirm
    When I open the vendor RFQ overflow menu for "New One"
    And I click Decline RFQ from the vendor RFQ overflow menu
    And I confirm the Decline RFQ action if confirmation is displayed
    # 10–11. Declined status on Vendor Portal (decline toast check skipped for now)
    Then I should see the RFQ status displayed as Declined in the Vendor Portal
    # 12–16. Return to Admin → associated project → RFQ → open same RFQ
    When I navigate back to the Admin Portal
    And I open the project "Bhavani" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I navigate to the RFQ module
    Then I should see the RFQ page loaded
    When I open the RFQ titled "New One" on the admin RFQ list
    # 17–18. Declined status + vendor declined response on Admin
    Then I should see the RFQ status displayed as Declined on the admin RFQ card
    And I should see the RFQ vendor declined response on the admin RFQ card

  # ===========================================================================
  # TS-04 — Admin creates and sends "Vendor Comment RFQ"
  # ===========================================================================

  @TS04 @TC04 @regression @positive
  Scenario: TC-04 — Admin creates Vendor Comment RFQ and sends it
    When I open the project "Bhavani" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I navigate to the RFQ module
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "Vendor Comment RFQ"
    And I set RFQ required by date to today
    And I set RFQ created on date to a random date
    And I add a vendor in the RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast

  # ===========================================================================
  # TS-05 — Vendor Preview → Show comments → "For Testing Process" → suggestion Save, then green header Save
  # Run TC-04 first so "Vendor Comment RFQ" exists.
  # ===========================================================================

  @TS05 @TC05 @regression @positive
  Scenario: TC-05 — Vendor adds a comment on Vendor Comment RFQ
    When I navigate to the Vendor login page
    Then the Vendor Login page should be displayed
    When I login to the Vendor Portal using valid vendor credentials
    Then I should be logged in to the vendor portal successfully
    When I navigate to the Procurement Hub
    And I select the connected organization "Aditya Constructions"
    And I click the first project name on the vendor procurement hub
    And I click RFQ on the vendor project
    And I work only on the vendor RFQ titled "Vendor Comment RFQ"
    And I click Preview on the vendor RFQ
    Then I should see the RFQ available in the Vendor Portal with title "Vendor Comment RFQ"
    When I open the vendor RFQ overflow menu for "Vendor Comment RFQ"
    And I click Add Comment from the vendor RFQ overflow menu
    And I enter the vendor RFQ comment "For Testing Process"
    And I submit the vendor RFQ comment
    Then I should see the vendor RFQ comment added successfully

  # ===========================================================================
  # TS-06 — Admin opens the same RFQ and verifies the vendor comment
  # Run TC-05 first.
  # ===========================================================================

  @TS06 @TC06 @regression @positive
  Scenario: TC-06 — Admin verifies the vendor comment on Vendor Comment RFQ
    When I open the project "Bhavani" profile directly
    And I ensure the classic project profile UI is shown
    And I select the "Procurement" heading
    And I navigate to the RFQ module
    Then I should see the RFQ page loaded
    When I open the RFQ titled "Vendor Comment RFQ" on the admin RFQ list
    Then I should see the vendor comment "For Testing Process" on the admin RFQ
