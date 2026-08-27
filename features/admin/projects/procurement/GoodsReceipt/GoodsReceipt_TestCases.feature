# -----------------------------------------------------------------------------
# Goods Receipt / Inventory Request — incremental TCs in ONE file.
#
# TS-01 Create PO → vendor Accept via Mailinator → Inventory group → Add from PO
# TS-02 Create "Request Items" group → request products (Approved) → Add to Group
# TS-03 After Accepted PO → Inventory → Goods Receipts → Preview accepted PO
# TS-04 Preview → Action/More → Download GR/PO document and verify file
#
# Admin: open BBB project profile (classic UI)
#
# TC-01 — Purchase Order + Mailinator Accept + Goods Receipt from PO:
#   Vendor mail:
#     1) Open Mailinator
#     2) Enter inbox id bhavani123456
#     3) Click GO
#     4) Find just-received PO mail and click it
#     5) View PO → Accept → back to Admin
#   Inventory: Create Group → open group → Add Items → Add from PO →
#              search/select PO (blue arrow) → update received qtys → vehicle → notes → Add → Yes
#
# TC-02 — Request Items → Add to Group (Inventory only — no Purchase Order):
#   Navigate Inventory → Create Group "Request Items" → Add Item → request Product 1/2/3
#              (qty/unit/unit cost, Status=Approved) → Submit → verify Approved
#   Requested Products: ⋮ → Add to Group → fill form → Yes → verify in Request Items group
#
# TC-03 — Goods Receipts Preview (after Accepted PO):
#   Create/Accept PO (same path as TC-01 Accept) → Inventory → Goods Receipts →
#   locate Accepted "New PO FOR Goods Receipt" → Preview → verify PO preview
#
# TC-04 — Goods Receipts Preview → Download:
#   Same Accept + GR create + Preview as TC-03 → Action/More → Download →
#   verify file downloaded and contains GR details (Wires / vehicle / GR#)
#
# Run ALL Goods Receipt TCs (TC-01 … TC-04):
#   npx.cmd cucumber-js --tags "@goods-receipt-tc01-tc04"
#
# Run one case:
#   npx.cmd cucumber-js --tags "@goods-receipt and @TC01"
#   npx.cmd cucumber-js --tags "@goods-receipt and @TC02"
#   npx.cmd cucumber-js --tags "@goods-receipt and @TC03"
#   npx.cmd cucumber-js --tags "@goods-receipt and @TC04"
# -----------------------------------------------------------------------------

@goods-receipt @goods-receipt-tc01-tc04
Feature: Goods Receipt from Purchase Order — incremental test cases

  Background:
    Given I am logged in
    When I open the project "BBB" profile directly
    And I ensure the classic project profile UI is shown

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Goods Receipt from accepted Purchase Order
    When I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
    When I start creating a purchase order from scratch
    And I fill a unique goods receipt purchase order title starting with "New PO FOR Goods Receipt"
    And I add the Mailinator vendor from the vendor modal
    And I add a manual line item with name "Wires" description "Wires for goods receipt" quantity "10" unit "Nos" rate "1000"
    And I add a manual line item with name "Lubbers" description "Lubbers for goods receipt" quantity "15" unit "Nos" rate "2000"
    And I add a manual line item with name "Motors" description "Motors for goods receipt" quantity "3" unit "Nos" rate "3000"
    And I open the purchase order compose email and set the Mailinator recipient
    When I open Mailinator for the vendor and baseline the inbox
    And I send the purchase order email from the open compose dialog
    Then I should see the purchase order created and sent success toast
    # Open Mailinator → enter bhavani123456 → GO → click just-received mail → View PO
    And I wait for the purchase order email in Mailinator open View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I accept the purchase order on the vendor portal
    And I switch back to the Admin Portal after vendor PO accept
    And I refresh the last purchase order list until it shows status "Accepted"
    Then the last purchase order should show status "Accepted" on the Admin list

    When I open Inventory from the Admin portal after PO accepted
    And I wait for the inventory module to load
    And I click the Create Group button in inventory
    Then I should see the create inventory item group popup
    When I enter inventory group name "For Sample Testing"
    And I click Create on the create inventory group popup
    Then the created inventory group should be visible
    When I open the newly created inventory group
    And I click the Add Item button in inventory group
    When I complete goods receipt from the accepted PO with vehicle "20022002" and notes "hdbshdndjndjskjdhdyhdsddnhdhdgffnjshrgrbsndb"
    Then I should see the goods receipt under the last created inventory group

  # ---------------------------------------------------------------------------
  # TS-02 — Request Items group → request products → Add to Group (@TS02 @TC02)
  # ---------------------------------------------------------------------------
  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Request Items and Add requested product to inventory group
    When I navigate to the inventory module from project profile
    And I wait for the inventory module to load
    And I click the Create Group button in inventory
    Then I should see the create inventory item group popup
    When I enter inventory group name "Request Items"
    And I click Create on the create inventory group popup
    Then the created inventory group should be visible
    When I open the newly created inventory group
    And I click the Add Item button in inventory group

    # Request products (Status = Approved)
    When I start an inventory item request
    And I add a request product with name "Product 1" quantity "30" unit "Nos" unit cost "1000" status "Approved"
    And I add a request product with name "Product 2" quantity "40" unit "Nos" unit cost "2000" status "Approved"
    And I add a request product with name "Product 3" quantity "50" unit "Nos" unit cost "3000" status "Approved"
    And I submit the inventory item request
    Then I should see the requested items created successfully with status "Approved"

    # Add Requested Product to Inventory Group
    When I click Request again on inventory
    And I navigate back to the inventory module
    And I open the Requested Products section in inventory
    And I locate the last requested product in Requested Products
    And I open the three-dot menu for the requested product
    And I select Add to Group from the requested product menu
    Then I should see the Add to Group popup
    When I fill the Add to Group form with valid required information
    And I click Yes on the Add to Group confirmation
    Then the requested product should be added to the Request Items inventory group successfully

    When I navigate back to the inventory module
    And I open the newly created inventory group
    Then I should see the requested product in the inventory group with correct details and quantity

  # ---------------------------------------------------------------------------
  # TS-03 — Inventory → Goods Receipts → Preview accepted PO (@TS03 @TC03)
  # ---------------------------------------------------------------------------
  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Preview accepted Purchase Order from Goods Receipts
    # Prerequisite: Accepted PO (sheet starts after Accept from previous TC)
    When I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
    When I start creating a purchase order from scratch
    And I fill a unique goods receipt purchase order title starting with "New PO FOR Goods Receipt"
    And I add the Mailinator vendor from the vendor modal
    And I add a manual line item with name "Wires" description "Wires for goods receipt" quantity "10" unit "Nos" rate "1000"
    And I add a manual line item with name "Lubbers" description "Lubbers for goods receipt" quantity "15" unit "Nos" rate "2000"
    And I add a manual line item with name "Motors" description "Motors for goods receipt" quantity "3" unit "Nos" rate "3000"
    And I open the purchase order compose email and set the Mailinator recipient
    When I open Mailinator for the vendor and baseline the inbox
    And I send the purchase order email from the open compose dialog
    Then I should see the purchase order created and sent success toast
    And I wait for the purchase order email in Mailinator open View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I accept the purchase order on the vendor portal
    And I switch back to the Admin Portal after vendor PO accept
    And I refresh the last purchase order list until it shows status "Accepted"
    Then the last purchase order should show status "Accepted" on the Admin list

    # Create goods receipt from accepted PO so it appears under Goods Receipt list
    When I open Inventory from the Admin portal after PO accepted
    And I wait for the inventory module to load
    And I click the Create Group button in inventory
    Then I should see the create inventory item group popup
    When I enter inventory group name "For Sample Testing"
    And I click Create on the create inventory group popup
    Then the created inventory group should be visible
    When I open the newly created inventory group
    And I click the Add Item button in inventory group
    When I complete goods receipt from the accepted PO with vehicle "20022002" and notes "TC03 GR Preview notes"

    # Goods Receipt module → Preview
    When I open the Goods Receipts module in inventory
    Then I should see the Goods Receipts module
    When I locate the accepted purchase order "New PO FOR Goods Receipt" in Goods Receipts
    And I click Preview for the accepted purchase order in Goods Receipts
    Then I should see the purchase order preview from Goods Receipts

  # ---------------------------------------------------------------------------
  # TS-04 — Preview → Action/More → Download GR document (@TS04 @TC04)
  # ---------------------------------------------------------------------------
  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Download Goods Receipt document from Preview
    # Prerequisite: Accepted PO + GR (sheet starts after Accept from previous TC)
    When I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading
    When I start creating a purchase order from scratch
    And I fill a unique goods receipt purchase order title starting with "New PO FOR Goods Receipt"
    And I add the Mailinator vendor from the vendor modal
    And I add a manual line item with name "Wires" description "Wires for goods receipt" quantity "10" unit "Nos" rate "1000"
    And I add a manual line item with name "Lubbers" description "Lubbers for goods receipt" quantity "15" unit "Nos" rate "2000"
    And I add a manual line item with name "Motors" description "Motors for goods receipt" quantity "3" unit "Nos" rate "3000"
    And I open the purchase order compose email and set the Mailinator recipient
    When I open Mailinator for the vendor and baseline the inbox
    And I send the purchase order email from the open compose dialog
    Then I should see the purchase order created and sent success toast
    And I wait for the purchase order email in Mailinator open View PO for the vendor portal
    Then I should see the purchase order on the vendor portal page
    When I accept the purchase order on the vendor portal
    And I switch back to the Admin Portal after vendor PO accept
    And I refresh the last purchase order list until it shows status "Accepted"
    Then the last purchase order should show status "Accepted" on the Admin list

    When I open Inventory from the Admin portal after PO accepted
    And I wait for the inventory module to load
    And I click the Create Group button in inventory
    Then I should see the create inventory item group popup
    When I enter inventory group name "For Sample Testing"
    And I click Create on the create inventory group popup
    Then the created inventory group should be visible
    When I open the newly created inventory group
    And I click the Add Item button in inventory group
    When I complete goods receipt from the accepted PO with vehicle "20022002" and notes "TC04 GR Download notes"

    When I open the Goods Receipts module in inventory
    Then I should see the Goods Receipts module
    When I locate the accepted purchase order "New PO FOR Goods Receipt" in Goods Receipts
    And I click Preview for the accepted purchase order in Goods Receipts
    Then I should see the purchase order preview from Goods Receipts
    When I open the Action menu on the Goods Receipt preview
    And I click Download on the Goods Receipt preview action menu
    Then the Goods Receipt document should be downloaded successfully
    And the downloaded Goods Receipt file should open and contain the correct details
