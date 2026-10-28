@resources @asset @bulkUpload @positive
Feature: Bulk Upload Assets

  Scenario: Download the bulk assets template from Add New
    Given I am logged in
    When I navigate to the Resources Manage Asset page
    And I download the bulk assets template
    Then the bulk assets template download should start

  @negative
  Scenario: Upload an invalid bulk assets file and see upload results
    Given I am logged in
    When I navigate to the Resources Manage Asset page
    And I upload an invalid bulk assets file
    Then I should see the bulk upload results page
