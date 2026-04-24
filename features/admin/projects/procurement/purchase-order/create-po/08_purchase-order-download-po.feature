@regression @po @procurement @create-po @po-download
Feature: Purchase Order — create PO, open preview, and download

  Create and send a PO, open Preview from the three dot menu, then click Download and finish.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create PO, preview, download
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

