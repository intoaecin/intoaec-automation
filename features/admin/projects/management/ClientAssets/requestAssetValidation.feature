@project @clientAssets @negative @validation
Feature: Request asset validation

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Project Management" heading
    And I click the "Assets" module card
    And I wait for the client assets module to load

  Scenario: Cannot proceed without selecting an asset
    When I try to request an asset without selecting any asset
    Then the request without selection should be blocked

  Scenario: Cannot submit selected assets with zero quantity
    When I try to submit an asset request with invalid quantity
    Then the invalid quantity request should be blocked
