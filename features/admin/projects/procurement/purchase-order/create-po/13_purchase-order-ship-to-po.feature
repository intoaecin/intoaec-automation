@regression @po @procurement @create-po @po-ship-to
Feature: Purchase Order — create PO with Ship To checked and send email

  Same as create PO; additionally checks the Ship To checkbox before Action → Compose email.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create purchase order with Ship To and send email successfully
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO Ship To"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I check the Ship To checkbox on the purchase order form
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast

