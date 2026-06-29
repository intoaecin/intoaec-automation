@smoke @regression @po @procurement @create-po @po-send-reminder
Feature: Purchase Order — send reminder from list card

  Create and send a PO, then on the list card open Send → Send reminder → compose → Send email.

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Procurement" heading
    And I click the "Purchase Order" module card
    And I ensure the Purchase Order list has finished loading

  Scenario: Send reminder email from the first purchase order card after create and send
    When I start creating a purchase order from scratch
    And I fill purchase order title with "Send reminder PO flow"
    And I add the first vendor from the vendor modal
    And I add a manual line item with name "seed item" description "seed" quantity "1" unit "Nos" rate "100"
    And I compose and send the purchase order email
    Then I should see the purchase order created and sent success toast
    When I wait for the purchase order list after create and send redirect
    When I open the send menu on the first purchase order card
    And I click send reminder in the purchase order send menu
    Then I should see the purchase order compose email dialog for reminder
    When I click send email in the purchase order compose dialog
