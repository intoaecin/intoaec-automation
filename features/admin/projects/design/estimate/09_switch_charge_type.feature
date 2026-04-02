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

  @edge @estimate
  Scenario: Switch charge type between percentage and fixed
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add manual estimate item with name "name"
    And I add estimate charge "Switch Charge" with value "5"
    And I switch estimate charge type to fixed and set value "100"
    And I switch estimate charge type to percentage and set value "8"
    Then estimate charge should be visible
