@project @clientAssets @positive @smoke
Feature: Request asset from Client Assets

  Background:
    Given I am logged in
    When I navigate to the Projects page
    And I click on the first project in the list
    And I select the "Project Management" heading
    And I click the "Assets" module card
    And I wait for the client assets module to load

  Scenario: Project user requests an asset from the listed assets
    When I click Request Asset
    And I select the first listed asset and click Select Asset
    And I enter requested quantity and approximate return time for the asset request
    And I submit the asset request
    Then I should see the asset request status as "Requested"
