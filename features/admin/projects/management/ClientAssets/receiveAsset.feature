@project @clientAssets @receive @positive
Feature: Receive asset on project Assets

  Scenario: Project user marks an in-transit asset as received
    Given I am logged in
    And a requested asset exists from a project
    When I navigate to Resources Manage Assets Asset Requests tab
    And I approve the asset request from the three dots menu
    And I navigate to the project Client Assets module
    And I mark the asset request as receive and collect with a user
    Then I should see the asset request status as "ISSUED"
