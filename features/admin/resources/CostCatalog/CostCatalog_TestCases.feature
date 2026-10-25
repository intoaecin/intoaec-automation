# -----------------------------------------------------------------------------
# Cost Catalog — incremental TCs in ONE file.
#
# After login a popup may appear — Close (X) OR "Continue to My Account".
#
# TS-01 Add Materials — @TS01 @TC01
#   TC-01 — dismiss post-login popup → Resources → Cost Catalog → Materials →
#           Add Items → Materials → verify Item Code → add 2 materials → Save →
#           list + toast
# TS-02 Edit Material — @TS02 @TC02
#   TC-02 — Materials list → select Premium Gypsum Board → 3-dot → Edit →
#           rename to Ceramic Floor Tiles | Unit ft2 | Brand Kajaria | Cost 320 →
#           Save Item → (Price Update Warning → Continue if shown) → list + toast
# TS-03 Add Services — @TS03 @TC03
#   TC-03 — Services tab → Add Items → Services → verify Item Code →
#           add 2 services (both Per Unit Rate) → Save → list + toast
# TS-04 Edit Service — @TS04 @TC04
#   TC-04 — Services list → select Painting Service → Edit →
#           rename to Electrical Installation Service | Category Electrical Works |
#           Description | Pricing Module Fixed Price | Price 750 →
#           Save Item → list + toast
# TS-05 Add Equipments — @TS05 @TC05
#   TC-05 — Equipments tab → Add Items → verify Add Equipment popup →
#           add 2 equipments → Save → list + toast
# TS-06 Edit Equipment — @TS06 @TC06
#   TC-06 — Equipments list → select Concrete Mixer → Edit →
#           rename to Tower Crane | Category Construction Equipment |
#           Description | Unit Cost 250 | Unit Hr →
#           Save Item → list + toast
# TS-07 Add Assembly — @TS07 @TC07
#   TC-07 — Assemblies tab → Add Items → verify Add Assembly page + Item Code →
#           Kitchen Cabinet Assembly | Category | Description | Unit Nos |
#           Taxable | Unit Cost 2750 | Items: Add → Add Manually → Soft Close Hinge Kit qty 2 @ 450 → Save → list + toast
# TS-08 Edit Assembly — @TS08 @TC08
#   TC-08 — Assemblies list → select Kitchen Cabinet Assembly → Edit →
#           rename to Modular Wardrobe Assembly | Category + Sub Category |
#           Description | Unit Nos | Vendor | Unit Cost 1800 |
#           update Items qty/price → Save Item → list + toast
#
# Material / service / equipment / assembly names are auto-suffixed with a number when needed
# to avoid duplicate-name errors; list asserts resolve to the name actually saved.
#
# Material 1: Premium Gypsum Board | Unit: Nos | Brand: Saint Gobain | Cost: $250
# Material 2: PVC Electrical Conduit | Unit: RMT | Brand: Finolex | Cost: $85
# Edit to: Ceramic Floor Tiles | Unit: ft2 | Brand: Kajaria | Cost: $320
# Service 1: Painting Service | Category: Interior Works | Per Unit Rate | $500
# Service 2: Plumbing Service | Category: Plumbing Works | Per Unit Rate | $150
# Edit service to: Electrical Installation Service | Electrical Works | Fixed Price | $750
# Equipment 1: Concrete Mixer | Construction Equipment | Unit Cost $150 | Unit: Hr
# Equipment 2: Drilling Machine | Construction Equipment | Unit Cost $100 | Unit: Hr
# Edit equipment to: Tower Crane | Construction Equipment | Unit Cost $250 | Unit: Hr
# Assembly create: Kitchen Cabinet Assembly | Unit: Nos | Taxable | Unit Cost $2750 | Items: Soft Close Hinge Kit x2 @ $450
# Assembly edit to: Modular Wardrobe Assembly | Unit: Nos | Unit Cost $1800 | Category + Sub Category | Vendor | update Items
#
# Run (PowerShell: use npx.cmd / npm.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js --tags "@cost-catalog-tc"
#   npx.cmd cucumber-js --tags "@cost-catalog-tc and @TC01"
#   npx.cmd cucumber-js --tags "@cost-catalog-tc and @TC02"
#   npx.cmd cucumber-js --tags "@cost-catalog-tc and @TC03"
#   npx.cmd cucumber-js --tags "@cost-catalog-tc and @TC04"
#   npx.cmd cucumber-js --tags "@cost-catalog-tc and @TC05"
#   npx.cmd cucumber-js --tags "@cost-catalog-tc and @TC06"
#   npx.cmd cucumber-js --tags "@cost-catalog-tc and @TC07"
#   npx.cmd cucumber-js --tags "@cost-catalog-tc and @TC08"
#
# Layering:
#   Feature: features/admin/resources/CostCatalog/CostCatalog_TestCases.feature
#   Steps:   step-definitions/admin/resources/CostCatalog/CostCatalogStep.js
#   Page:    pages/admin/resources/CostCatalog/CostCatalogPage.js
# -----------------------------------------------------------------------------

@cost-catalog-tc @cost-catalog @resources @ashraf-modules
Feature: Cost Catalog — incremental test cases

  Background:
    Given I am logged in
    And I close the post-login popup or select Continue to My Account
    When I navigate to Resources
    And I select Cost Catalog

  # ===========================================================================
  # TS-01 — Add two materials to Cost Catalog Materials (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Add two materials to Cost Catalog and verify list and toast
    And I select the Cost Catalog Materials tab
    When I click Cost Catalog Add Items
    And I select Cost Catalog item type Materials
    Then the Cost Catalog Item Code should be generated by default
    When I enter Cost Catalog material 1 details with name "Premium Gypsum Board", unit "Nos", brand "Saint Gobain", and cost "250"
    And I enter Cost Catalog material 2 details with name "PVC Electrical Conduit", unit "RMT", brand "Finolex", and cost "85"
    And I click Cost Catalog Save Item
    Then I should see the Cost Catalog success toast for materials added
    And the Cost Catalog Materials list should display "Premium Gypsum Board"
    And the Cost Catalog Materials list should display "PVC Electrical Conduit"

  # ===========================================================================
  # TS-02 — Edit previously added material (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Edit Premium Gypsum Board to Ceramic Floor Tiles and verify list and toast
    And I select the Cost Catalog Materials tab
    When I select the Cost Catalog material "Premium Gypsum Board"
    And I click Cost Catalog Edit
    When I update the Cost Catalog material name to "Ceramic Floor Tiles"
    And I update the Cost Catalog material unit to "ft2"
    And I update the Cost Catalog material brand to "Kajaria"
    And I update the Cost Catalog material cost to "320"
    And I click Cost Catalog Save Item
    Then I should see the Cost Catalog success toast for material updated
    And the Cost Catalog Materials list should display "Ceramic Floor Tiles"
    And the Cost Catalog Materials list should show unit "ft2", brand "Kajaria", and cost "320" for "Ceramic Floor Tiles"

  # ===========================================================================
  # TS-03 — Add two services to Cost Catalog Services (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Add two services to Cost Catalog and verify list and toast
    And I select the Cost Catalog Services tab
    When I click Cost Catalog Add Items
    And I select Cost Catalog item type Services
    Then the Cost Catalog Item Code should be generated by default
    When I enter Cost Catalog service 1 details with name "Painting Service", category "Interior Works", description "Interior wall painting service", pricing module "Per Unit Rate", and price "500"
    And I enter Cost Catalog service 2 details with name "Plumbing Service", category "Plumbing Works", description "Residential plumbing installation service", pricing module "Per Unit Rate", and price "150"
    And I click Cost Catalog Save Item
    Then I should see the Cost Catalog success toast for services added
    And the Cost Catalog Services list should display "Painting Service"
    And the Cost Catalog Services list should display "Plumbing Service"

  # ===========================================================================
  # TS-04 — Edit previously added service (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Edit Painting Service to Electrical Installation Service and verify list and toast
    And I select the Cost Catalog Services tab
    When I select the Cost Catalog service "Painting Service"
    And I click Cost Catalog Edit
    When I update the Cost Catalog service name to "Electrical Installation Service"
    And I update the Cost Catalog service category to "Electrical Works"
    And I update the Cost Catalog service description to "Electrical installation and wiring service"
    And I update the Cost Catalog service pricing module to "Fixed Price"
    And I update the Cost Catalog service price to "750"
    And I click Cost Catalog Save Item
    Then I should see the Cost Catalog success toast for service updated
    And the Cost Catalog Services list should display "Electrical Installation Service"
    And the Cost Catalog Services list should show category "Electrical Works", pricing module "Fixed Price", and price "750" for "Electrical Installation Service"

  # ===========================================================================
  # TS-05 — Add two equipments to Cost Catalog Equipments (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Add two equipments to Cost Catalog and verify list and toast
    And I select the Cost Catalog Equipments tab
    When I click Cost Catalog Add Items
    Then the Cost Catalog Add Equipment popup should be displayed
    When I enter Cost Catalog equipment 1 details with name "Concrete Mixer", category "Construction Equipment", description "Equipment used for mixing concrete", unit cost "150", and unit "Hr"
    And I enter Cost Catalog equipment 2 details with name "Drilling Machine", category "Construction Equipment", description "Machine used for drilling works", unit cost "100", and unit "Hr"
    And I click Cost Catalog Save Item
    Then I should see the Cost Catalog success toast for equipments added
    And the Cost Catalog Equipments list should display "Concrete Mixer"
    And the Cost Catalog Equipments list should display "Drilling Machine"

  # ===========================================================================
  # TS-06 — Edit previously added equipment (@TS06 @TC06)
  # ===========================================================================

  @TS06 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Edit Concrete Mixer to Tower Crane and verify list and toast
    And I select the Cost Catalog Equipments tab
    When I select the Cost Catalog equipment "Concrete Mixer"
    And I click Cost Catalog Edit
    When I update the Cost Catalog equipment name to "Tower Crane"
    And I update the Cost Catalog equipment category to "Construction Equipment"
    And I update the Cost Catalog equipment description to "Heavy equipment used for lifting construction materials"
    And I update the Cost Catalog equipment unit cost to "250"
    And I update the Cost Catalog equipment unit to "Hr"
    And I click Cost Catalog Save Item
    Then I should see the Cost Catalog success toast for equipment updated
    And the Cost Catalog Equipments list should display "Tower Crane"
    And the Cost Catalog Equipments list should show category "Construction Equipment", unit "Hr", and unit cost "250" for "Tower Crane"

  # ===========================================================================
  # TS-07 — Add assembly to Cost Catalog Assemblies (@TS07 @TC07)
  # ===========================================================================

  @TS07 @TC07 @smoke @regression @positive
  Scenario: TC-07 — Add Kitchen Cabinet Assembly to Cost Catalog and verify list and toast
    And I select the Cost Catalog Assemblies tab
    When I click Cost Catalog Add Items
    Then the Cost Catalog Add Assembly page should be displayed
    And the Cost Catalog Item Code should be generated by default
    When I enter Cost Catalog assembly details with name "Kitchen Cabinet Assembly", description "Complete kitchen cabinet assembly with required fittings", unit "Nos", and unit cost "2750"
    And I select a Cost Catalog assembly category
    And I enable Cost Catalog assembly Taxable
    And I add Cost Catalog assembly materials or components with name "Soft Close Hinge Kit", quantity "2", and unit cost "450"
    And I click Cost Catalog Save Item
    Then I should see the Cost Catalog success toast for assembly added
    And the Cost Catalog Assemblies list should display "Kitchen Cabinet Assembly"

  # ===========================================================================
  # TS-08 — Edit previously added assembly (@TS08 @TC08)
  # ===========================================================================

  @TS08 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Edit Kitchen Cabinet Assembly to Modular Wardrobe Assembly and verify list and toast
    And I select the Cost Catalog Assemblies tab
    When I select the Cost Catalog assembly "Kitchen Cabinet Assembly"
    And I click Cost Catalog Edit
    When I update the Cost Catalog assembly name to "Modular Wardrobe Assembly"
    And I update the Cost Catalog assembly category and sub category
    And I update the Cost Catalog assembly description to "Complete modular wardrobe assembly with required fittings"
    And I update the Cost Catalog assembly unit to "Nos"
    And I update the Cost Catalog assembly vendor
    And I update the Cost Catalog assembly unit cost to "1800"
    And I update Cost Catalog assembly materials or components with name "Soft Close Hinge Kit", quantity "3", and unit cost "600"
    And I click Cost Catalog Save Item
    Then I should see the Cost Catalog success toast for assembly updated
    And the Cost Catalog Assemblies list should display "Modular Wardrobe Assembly"
    And the Cost Catalog Assemblies list should show unit "Nos" and unit cost "1800" for "Modular Wardrobe Assembly"
