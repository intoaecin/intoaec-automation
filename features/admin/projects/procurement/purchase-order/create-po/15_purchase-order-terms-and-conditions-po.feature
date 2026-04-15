@regression @po @procurement @create-po @po-terms-and-conditions
Feature: Purchase Order — create PO with terms and conditions and send email

  Same as basic create PO; before Action → Compose email, fill Terms & Conditions with text.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create purchase order with random terms and conditions and send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO with T&C"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I fill purchase order terms and conditions with a random comment
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
