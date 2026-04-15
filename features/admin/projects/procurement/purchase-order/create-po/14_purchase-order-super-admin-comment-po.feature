@smoke @regression @po @procurement @create-po @po-super-admin-comment
Feature: Purchase Order — super admin line comment from list preview

  Full-screen preview → top comment (if shown) → first line-item comment → random text → save → close.
  Reuses vendor-comment style fill/save helpers. Optional: **PO_VENDOR_COMMENT_SELECTOR**, **PO_VENDOR_COMMENT_PLACEHOLDER**.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  @po-super-admin-comment-e2e
  Scenario: Full E2E — create and send PO then add super admin line comment from preview
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

  @po-super-admin-comment-from-list
  Scenario: Existing PO on list — open preview and add super admin line comment only
    When I open the three dot menu on the first purchase order card
    And I click preview in the purchase order card menu
    Then I should see the purchase order full screen preview
    When I submit a random super admin line comment from the purchase order preview
    Then I should see the super admin preview line comment on the page
    When I close the purchase order full screen preview
    Then I should be on the purchase order list with create action visible
