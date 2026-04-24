@regression @rfq @rfq-super-admin-comment
Feature: RFQ — super admin line comment from preview

  Create an RFQ via Action → Compose email → Send email, open Preview from the RFQ card menu,
  then add a random super admin comment on the first line item.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Create RFQ then add super admin line comment from preview
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ super admin comment {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I click the RFQ preview icon
    Then the RFQ preview page should load
    When I submit a random super admin line comment from the RFQ preview
    Then I should see the super admin RFQ preview line comment on the page
    When I close the RFQ preview page

