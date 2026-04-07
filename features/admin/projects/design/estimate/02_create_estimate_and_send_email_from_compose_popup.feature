Feature: Estimate create and email workflow

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

  @estimate
  Scenario: Create estimate and send email from compose email popup
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate title with "AAA"
    And I add estimate section "Default Section"
    And I add manual estimate item with name "name"
    And I click estimate action compose email and send
    Then I should see estimate success toast "Estimate successfully sent"

