Feature: Estimate create workflow - start from template

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
  Scenario: Create estimate from template and save as draft
    When I click Create Estimate
    And I start estimate from template and proceed
    And I select estimate template category "Commercial"
    And I select estimate template sub category "Waterproofing"
    And I select estimate template "Title"
    And I confirm estimate template selection
    And I fill estimate title with random 4 letters
    And I click back to Estimate page
    And I click Save as draft & Continue

