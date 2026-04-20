@regression @rfq @rfq-preview
Feature: RFQ — preview

  Create an RFQ via Action → Compose email → Send email (same as compose RFQ),
  then open the Preview view from the RFQ page.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Create RFQ then open preview
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    # Use a unique title each run to avoid matching older RFQs (faster + prevents wrong-card clicks).
    And I fill RFQ title with "RFQ preview flow {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I click the RFQ preview icon
    # Close immediately after opening preview
    When I close the RFQ preview page

