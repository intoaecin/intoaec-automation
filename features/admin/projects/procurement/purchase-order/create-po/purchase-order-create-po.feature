@smoke @regression @po @procurement @create-po @po-create
Feature: Purchase Order — create PO and send email

  Create from scratch, add vendor and line item, send via Action → Compose email.
  Requires a user with PO approver permissions (Action → Compose email).

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create purchase order and send email successfully
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Electric materials"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
