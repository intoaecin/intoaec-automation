Feature: Estimate draft and send workflow

  Background:
    Given I am on the login page
    When I enter email "testintoaec@gmail.com"
    And I enter password "Courage@10"
    And I click the Login button
    Then I should be logged in successfully
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Design & Estimates" heading
    And I click the "Estimate" module card
    And I wait for estimate module to load

  @regression @estimate
  Scenario: Save estimate as draft and send to customer
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate title with random 4 letters
    And I add estimate section with random 6 letter name
    And I add manual estimate item with random 4 letter name
    And I save estimate as draft from action menu
    And I open Draft tab in estimate module
    And I open first draft options menu and click Edit
    And I add another manual estimate item with random 4 letter name
    And I add smoke catalog via Add Product Service and library
    And I fill first other charge with random data
    And I add second other charge with random data
    And I click percent toggle for second other charge
    And I add estimate discount using first option
    And I add estimate tax using first option
    And I enable estimate round off
    And I add estimate terms from first template
    And I enable estimate digital signature
    And I add custom estimate column with random name and Link type
    And I preview estimate and return to edit page
    And I save estimate as draft from action menu
    And I open Draft tab in estimate module
    And I preview first drafted estimate and close preview
    And I open Draft tab in estimate module
    And I compose draft estimate email from Draft tab and send
    Then I should see estimate success toast "Estimation created successfully|Email sent successfully"

