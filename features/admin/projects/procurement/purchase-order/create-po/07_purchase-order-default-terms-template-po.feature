@regression @po @procurement @create-po @po-default-terms-template
Feature: Purchase Order — create PO with default terms from template and send email

  Does not type in the Terms & Conditions editor — only clicks "Choose from Template",
  selects the first template row, and Add. Requires at least one terms template in the environment.
  Pauses (~550ms) between T&C steps for headed visibility; set PO_TERMS_TEMPLATE_DEMO_DELAY_MS=0 to disable.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Create purchase order with terms from template and send email
    When I start creating a purchase order from scratch
    And I fill purchase order title with "PO default T&C template"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "cable wire" description "ccccc" quantity "10" unit "Nos" rate "2000"
    And I add purchase order terms and conditions from the first template
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
