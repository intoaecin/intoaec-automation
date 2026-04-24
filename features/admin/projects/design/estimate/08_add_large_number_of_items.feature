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
  Scenario: Add large number of items in estimate
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate mandatory details with title "AAA"
    And I add estimate section "Default Section"
    And I add 10 manual estimate items
    Then I should see at least 10 estimate items in table
