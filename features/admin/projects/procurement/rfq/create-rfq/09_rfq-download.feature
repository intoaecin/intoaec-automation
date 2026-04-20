@regression @rfq @rfq-download
Feature: RFQ — download from preview

  Create an RFQ via Action → Compose email → Send email, open Preview from the RFQ card menu,
  then click Download in the preview.

  Background:
    Given the RFQ suite is ready with login and Procurement RFQ module open

  Scenario: Create RFQ then download from preview
    Then I should see the RFQ page loaded
    When I click Create RFQ
    And I start RFQ from scratch and proceed
    And I fill RFQ title with "RFQ download flow {unique}"
    And I set RFQ required by date to today
    And I set RFQ created on date to today
    And I add the first vendor in RFQ vendor panel
    And I add RFQ line item manually with name "Material 1" quantity "1" unit "Each"
    When I open RFQ compose email from Action menu
    And I send email from RFQ compose dialog
    Then I should see RFQ compose email success toast
    When I click the RFQ preview icon
    And I click the RFQ download icon
    Then the RFQ should be downloaded
    # End scenario after download (no navigation back needed)

