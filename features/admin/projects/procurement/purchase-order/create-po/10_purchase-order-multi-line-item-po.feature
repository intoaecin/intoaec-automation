@regression @po @procurement @create-po @po-multi-line-item
Feature: Purchase Order — create PO with multiple manual line items

  Same navigation as single-line create PO; adds ten manual rows via Add manually,
  random name, description, quantity, and rate; unit defaults to Nos (set PO_MULTI_LINE_RANDOM_UNITS=1
  and PO_MULTI_LINE_UNITS for random unit). Then Action → Compose email.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create purchase order with ten random manual line items and send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with a random multi line purchase order label
    And I add the first vendor from the vendor modal
    And I add 10 manual purchase order line items with random fields
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    