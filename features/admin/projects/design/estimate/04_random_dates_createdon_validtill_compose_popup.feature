Feature: Estimate create workflow - random dates

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
  Scenario: Create estimate with random Created on and Valid till dates
    When I click Create Estimate
    And I start estimate from scratch and proceed
    And I fill estimate title with random 4 letters
    And I select random Created on and Valid till dates from calendar

