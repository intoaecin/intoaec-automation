Feature: Estimate create workflow - add second section

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

  @smoke @estimate
  Scenario: Create estimate and add second section
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate title with random 4 letters
    And I add estimate section with random 6 letter name
    And I add manual estimate item with random 4 letter name
    And I click Add Section button to add another section
    

