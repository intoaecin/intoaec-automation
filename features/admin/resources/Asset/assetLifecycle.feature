@resources @asset @lifecycle @smoke @positive
Feature: Full asset lifecycle

  Scenario: Create, request, approve, receive, request return, return, and mark returned
    Given I am logged in
    When I create an owned individual asset quickly
    And I navigate to the project Client Assets module
    And I click Request Asset
    And I select the created asset and click Select Asset
    And I enter requested quantity and approximate return time for the asset request
    And I submit the asset request
    Then I should see the asset request status as "Requested"
    When I navigate to Resources Manage Assets Asset Requests tab
    And I approve the asset request from the three dots menu
    Then I should see the asset request status as "IN_TRANSIT"
    When I navigate to the project Client Assets module
    And I mark the asset request as receive and collect with a user
    Then I should see the asset request status as "ISSUED"
    When I navigate to Resources Manage Assets Asset Requests tab
    And I request return for the asset request from the three dots menu
    Then I should see the asset request status as "RETURN_REQUESTED"
    When I navigate to the project Client Assets module
    And I mark the asset request as return with notes
    Then I should see the asset request status as "RETURN_INITIATED"
    When I navigate to Resources Manage Assets Asset Requests tab
    And I mark the asset request as returned from the three dots menu
    Then I should see the asset request status as "RETURNED"
