# -----------------------------------------------------------------------------
# Manage Warehouse — incremental TCs in ONE file.
#
# TS-01 Add Product from scratch — @TS01 @TC01
#   TC-01 — Products → Add Product → Start from Scratch → Save Cement
# TS-02 Update Categories — @TS02 @TC02
#   TC-02 — Product List → first row → Update Category → Construction Materials / Cement
# TS-03 Edit Product — @TS03 @TC03
#   TC-03 — Product List → first row → Edit → Premium Cement details → Update
# TS-04 Delete Product — @TS04 @TC04
#   TC-04 — Product List → first row → Delete → reason + Yes → confirm
# TS-05 Filter Products — @TS05 @TC05
#   TC-05 — Product List → Filter → first product Category / Subcategory → Apply
#
# Run one case (PowerShell: use npx.cmd / npm.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js features/admin/resources/ManageWarehouse/Warehouse_TestCases.feature --tags "@TS01 and @TC01"
#   npx.cmd cucumber-js features/admin/resources/ManageWarehouse/Warehouse_TestCases.feature --tags "@TS02 and @TC02"
#   npx.cmd cucumber-js features/admin/resources/ManageWarehouse/Warehouse_TestCases.feature --tags "@TS03 and @TC03"
#   npx.cmd cucumber-js features/admin/resources/ManageWarehouse/Warehouse_TestCases.feature --tags "@TS04 and @TC04"
#   npx.cmd cucumber-js features/admin/resources/ManageWarehouse/Warehouse_TestCases.feature --tags "@TS05 and @TC05"
#
# npm:
#   npm.cmd run test:admin:resources:managewarehouse
#   npm.cmd run test:admin:resources:managewarehouse:tc01
#   npm.cmd run test:admin:resources:managewarehouse:tc02
#   npm.cmd run test:admin:resources:managewarehouse:tc03
#   npm.cmd run test:admin:resources:managewarehouse:tc04
#   npm.cmd run test:admin:resources:managewarehouse:tc05
#
# Layering: `AGENTS.md` — scenarios here;
#            logic in pages/admin/resources/ManageWarehouse/WarehousePage.js;
#            step-definitions/admin/resources/ManageWarehouse/WarehouseStep.js
# -----------------------------------------------------------------------------

@warehouse @manage-warehouse
Feature: Manage Warehouse — incremental test cases

  Background:
    Given I am logged in
    When I navigate to Manage Warehouse
    And I navigate to the warehouse Products section

  # ===========================================================================
  # TS-01 — Add Product from scratch (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Add warehouse product Cement from scratch
    When I click the warehouse Add Product button
    Then the warehouse product creation options should be displayed
    When I select warehouse Start from Scratch
    And I click the warehouse Proceed button
    Then the warehouse Add Product form should be displayed
    When I fill the warehouse product name with "Cement"
    And I fill the warehouse product required fields with valid data
    And I click the warehouse Save button
    Then I should see warehouse success toast "Product added successfully."
    When I refresh the warehouse product list
    Then the warehouse product "Cement" should be displayed in the Product List
    And the warehouse product details should be displayed correctly in the Product List

  # ===========================================================================
  # TS-02 — Update Categories (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Update warehouse product category to Construction Materials / Cement
    Then the warehouse Product List should be displayed
    When I select the first row in the warehouse Product List
    Then the warehouse selected product details should be displayed
    When I click the warehouse Update Categories option
    Then the warehouse Update Categories popup should be displayed
    When I select the warehouse category "Construction Materials"
    And I select the warehouse subcategory "Cement"
    Then the warehouse selected category should be "Construction Materials" and subcategory "Cement"
    When I click the warehouse Update Categories Update button
    Then I should see warehouse success toast "Categories updated successfully."
    When I refresh the warehouse product list
    And I select the updated warehouse product
    Then the warehouse product category should be "Construction Materials"
    And the warehouse product subcategory should be "Cement"

  # ===========================================================================
  # TS-03 — Edit Product (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Edit warehouse product details to Premium Cement
    Then the warehouse Product List should be displayed
    When I select the first row in the warehouse Product List
    And I click the warehouse Edit option
    Then the warehouse Edit Product form should be displayed with existing details
    When I update the warehouse product name to "Premium Cement"
    And I update the warehouse product type to "Construction Material"
    And I update the warehouse product color to "Light Grey"
    And I update the warehouse product finish to "Matte"
    And I update the warehouse product material to "Portland Cement"
    And I update the warehouse product manufacturer to "XYZ Building Materials"
    And I update the warehouse product tag to "Premium Construction"
    And I update the warehouse product price to "550"
    Then the warehouse Edit Product form should show the updated details
    When I click the warehouse Update button
    Then I should see warehouse success toast "Product updated successfully."
    When I refresh the warehouse product list
    Then the warehouse first product row should show the updated details

  # ===========================================================================
  # TS-04 — Delete Product (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Delete first warehouse product from Product List
    Then the warehouse Product List should be displayed
    When I capture the first warehouse product for deletion
    And I click the warehouse Delete button for the first product row
    Then the warehouse Delete Product confirmation popup should be displayed
    When I enter the warehouse product deletion reason "Product is no longer required"
    And I enter "Yes" in the warehouse product deletion confirmation field
    And I click the warehouse Delete Product confirm button
    Then I should see warehouse success toast "Product deleted successfully."
    When I refresh the warehouse product list
    Then the deleted warehouse product should not be displayed in the Product List

  # ===========================================================================
  # TS-05 — Filter Products (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Filter warehouse products by first row Category and Subcategory
    Then the warehouse Product List should be displayed
    When I capture the first warehouse product category and subcategory for filter
    And I click the warehouse Filter option
    When I select the warehouse filter category for the first product
    And I select the warehouse filter subcategory for the first product
    And I click the warehouse Apply filter button
    Then the warehouse first product row should match the selected filter category and subcategory
