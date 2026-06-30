@resources @assetRequest @positive
Feature: Approve asset request

  Scenario: Administrator approves a requested asset from Manage Assets Asset Requests tab
    Given I am logged in
    And a requested asset exists from a project
    When I navigate to Resources Manage Assets Asset Requests tab
    And I approve the asset request from the three dots menu
    Then I should see the asset request status as "Approved"
