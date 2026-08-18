# -----------------------------------------------------------------------------
# My Account — incremental TCs in ONE file.
#
# TS-01 Edit profile — @TS01 @TC01
#   TC-01 — Profile Settings → My Account → Edit → update all fields → Update
# TS-02 Profile picture — @TS02 @TC02
#   TC-02 — Hover avatar → View / Upload / Delete profile picture
# TS-03 Change password — @TS03 @TC03
#   TC-03 — My Profile → Security → change password → success
# TS-04 My Organization About Us — @TS04 @TC04
#   TC-04 — My Organization → About Us → Edit → update details → Update
# TS-05 Area of Expertise — @TS05 @TC05
#   TC-05 — About Us → Add Skill (e.g. 2D Design) → Save
# TS-06 Awards — @TS06 @TC06
#   TC-06 — About Us → Add Award → Save
# TS-07 Certifications — @TS07 @TC07
#   TC-07 — About Us → Add Certification → Save
# TS-08 Publications — @TS08 @TC08
#   TC-08 — About Us → Add Publication → Save
# TS-09 Presentations — @TS09 @TC09
#   TC-09 — About Us → Add Presentation → Save
# TS-10 Organization Info Address — @TS10 @TC10
#   TC-10 — Organization Info → Address → Edit → update address → Save
# TS-11 Portfolio Add Project — @TS11 @TC11
#   TC-11 — Portfolio → Add Project → upload video → Add
# TS-12 Social Media Links — @TS12 @TC12
#   TC-12 — Social Media → Edit → save URLs → refresh → verify
# TS-13 E-Signature Draw — @TS13 @TC13
#   TC-13 — E-Signature → Draw → Update → verify existing signature
# TS-14 E-Signature Upload — @TS14 @TC14
#   TC-14 — E-Signature → Upload sample_signature.png → Update
#
# Run one case:
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS01 and @TC01"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS02 and @TC02"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS03 and @TC03"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS04 and @TC04"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS05 and @TC05"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS06 and @TC06"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS07 and @TC07"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS08 and @TC08"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS09 and @TC09"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS10 and @TC10"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS11 and @TC11"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS12 and @TC12"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS13 and @TC13"
#   npx cucumber-js "features/admin/account/My accounts.feature" --tags "@TS14 and @TC14"
#
# npm:
#   npm run test:admin:account:myaccount
#   npm run test:admin:account:myaccount:tc01
#   npm run test:admin:account:myaccount:tc02
#   npm run test:admin:account:myaccount:tc03
#   npm run test:admin:account:myaccount:tc04
#   npm run test:admin:account:myaccount:tc05
#   npm run test:admin:account:myaccount:tc06
#   npm run test:admin:account:myaccount:tc07
#   npm run test:admin:account:myaccount:tc08
#   npm run test:admin:account:myaccount:tc09
#   npm run test:admin:account:myaccount:tc10
#   npm run test:admin:account:myaccount:tc11
#   npm run test:admin:account:myaccount:tc12
#   npm run test:admin:account:myaccount:tc13
#   npm run test:admin:account:myaccount:tc14
#
# Layering: `AGENTS.md` — scenarios here; logic in pages/admin/account/MyAccountPage.js;
#            step-definitions/admin/account/MyAccount.steps.js
# -----------------------------------------------------------------------------

@account @my-account
Feature: My Account — incremental test cases

  Background:
    Given I am logged in

  # ===========================================================================
  # TS-01 — Edit My Account profile (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Edit My Account profile details and save successfully
    When I navigate to Profile Settings
    And I click on My Account
    Then the My Account page should be displayed
    When I click the My Account Edit button
    And I fill the My Account first name with "Arjun"
    And I fill the My Account last name with "Kumar"
    And I fill the My Account email address with "testintoaec@gmail.com"
    And I fill the My Account mobile number with "+91 9876543210"
    And I fill the My Account organization with "AEC Solutions"
    And I fill the My Account address line 1 with "45 Lake View Road"
    And I fill the My Account address line 2 with "Tech Park, Block B"
    And I fill the My Account city with "Bengaluru"
    And I select the My Account state "Karnataka"
    And I select the My Account country "India"
    And I fill the My Account zip code with "560001"
    And I click the My Account Update button
    Then I should see My Account success toast "Profile updated successfully."
    And the My Account profile details should be saved

  # ===========================================================================
  # TS-02 — Profile picture (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — View, upload, and delete My Account profile picture
    When I navigate to Profile Settings
    And I click on My Account
    Then the My Account page should be displayed
    When I hover over the My Account profile picture
    Then the My Account profile picture Close, View, Upload, and Delete icons should be displayed
    When I click the My Account profile picture View icon
    Then the My Account profile picture preview should be displayed
    When I close the My Account profile picture preview
    And I hover over the My Account profile picture
    And I click the My Account profile picture Upload icon
    And I select a valid My Account profile image file
    Then the My Account profile picture should be uploaded successfully
    And the updated My Account profile picture should be displayed
    When I hover over the My Account profile picture
    And I click the My Account profile picture Delete icon
    And I confirm the My Account profile picture delete
    Then the My Account profile picture should be deleted successfully
    And the default My Account profile picture should be displayed

  # ===========================================================================
  # TS-03 — Change password (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Change My Account password from Security
    When I navigate to Profile Settings
    And I click on My Account
    Then the My Account page should be displayed
    When I navigate to My Account Security
    And I fill the My Account current password with "Courage@10"
    And I fill the My Account new password with "Simple@10"
    And I fill the My Account confirm new password with "Simple@10"
    And I click the My Account Change Password button
    Then I should see My Account success toast "Password changed successfully.|Password updated successfully.|password changed|password updated"

  # ===========================================================================
  # TS-04 — My Organization About Us (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Edit My Organization About Us details and update
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization About Us tab
    And I click the My Organization Edit button
    And I fill the My Organization summary with "Experienced construction management company specializing in residential, commercial, and infrastructure projects. Skilled in project planning, quality assurance, resource management, regulatory compliance, client communication, and timely project delivery with a strong commitment to safety and excellence."
    And I fill the My Organization license number with "73456738273"
    And I fill the My Organization tax id with "2999"
    And I fill the My Organization tax name with "Projectid"
    And I select the My Organization languages spoken "English, Telugu, Hindi"
    And I click the My Organization Update button
    Then I should see My Organization success toast "updated successfully.|Organization updated|About us updated|success"

  # ===========================================================================
  # TS-05 — Area of Expertise add skill (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Add a skill to My Organization Area of Expertise
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization About Us tab
    And I scroll to the My Organization Area of Expertise section
    And I click the My Organization Add Skill button
    Then the My Organization available skills list should be displayed
    When I select the My Organization skill "2D Design"
    And I click the My Organization skill Save button
    Then the My Organization skill "2D Design" should be added to Area of Expertise
    And I should see My Organization success toast "added|skill|success|updated"

  # ===========================================================================
  # TS-06 — Awards add award (@TS06 @TC06)
  # ===========================================================================

  @TS06 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Add an award to My Organization Awards section
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization About Us tab
    And I scroll to the My Organization Awards section
    And I click the My Organization Add Award button
    And I fill the My Organization award title with "Testing"
    And I fill the My Organization award issuer with "Bhavani"
    And I select the My Organization award issued on date "07 Aug 2026"
    And I fill the My Organization award description with "abcderfsgdhe"
    And I click the My Organization award Save button
    Then I should see My Organization success toast "Award added successfully."
    And the My Organization award should be displayed in the Awards section with title "Testing" issuer "Bhavani" issued on "07 Aug 2026" and description "abcderfsgdhe"

  # ===========================================================================
  # TS-07 — Certifications add certification (@TS07 @TC07)
  # ===========================================================================

  @TS07 @TC07 @smoke @regression @positive
  Scenario: TC-07 — Add a certification to My Organization Certifications section
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization About Us tab
    And I scroll to the My Organization Certifications section
    And I click the My Organization Add Certification button
    And I fill the My Organization certification title with "Testing"
    And I fill the My Organization certification issuer with "Bhavani"
    And I select the My Organization certification issued on date "07 Aug 2026"
    And I select the My Organization certification expires on date "07 Aug 2027"
    And I fill the My Organization certification credential id with "06072002"
    And I fill the My Organization certification credential url with "https://www.testingcertificate.com/credential/06072002"
    And I click the My Organization certification Save button
    Then I should see My Organization success toast "Certification added successfully.|added successfully|certification"
    And the My Organization certification should be displayed in the Certifications section with title "Testing" issuer "Bhavani" issued on "07 Aug 2026" expires on "07 Aug 2027" credential id "06072002" and credential url "https://www.testingcertificate.com/credential/06072002"

  # ===========================================================================
  # TS-08 — Publications add publication (@TS08 @TC08)
  # ===========================================================================

  @TS08 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Add a publication to My Organization Publications section
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization About Us tab
    And I scroll to the My Organization Publications section
    And I click the My Organization Add Publication button
    And I fill the My Organization publication title with "Test"
    And I fill the My Organization publication publisher with "Bhavani"
    And I select the My Organization publication date "08 Aug 2026"
    And I fill the My Organization publication author with "Hari"
    And I fill the My Organization publication url with "https://www.fakepublication.com/articles/test"
    And I click the My Organization publication Save button
    Then I should see My Organization success toast "Publication added successfully."
    And the My Organization publication should be displayed in the Publications section with title "Test" publisher "Bhavani" date "08 Aug 2026" author "Hari" and url "https://www.fakepublication.com/articles/test"

  # ===========================================================================
  # TS-09 — Presentations add presentation (@TS09 @TC09)
  # ===========================================================================

  @TS09 @TC09 @smoke @regression @positive
  Scenario: TC-09 — Add a presentation to My Organization Presentations section
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization About Us tab
    And I scroll to the My Organization Presentations section
    And I click the My Organization Add Presentation button
    And I fill the My Organization presentation event name with "Housing Property"
    And I fill the My Organization presentation location with "Perungudi"
    And I select the My Organization presentation start date "07 Aug 2026" and start time "10:00 AM"
    And I select the My Organization presentation end date "08 Aug 2026" and end time "10:00 AM"
    And I fill the My Organization presentation venue details with "ABC Convention Center, Perungudi, Chennai."
    And I click the My Organization presentation Save button
    Then I should see My Organization success toast "Presentation added successfully."
    And the My Organization presentation should be displayed in the Presentations section with event name "Housing Property" location "Perungudi" start date "07 Aug 2026" start time "10:00 AM" end date "08 Aug 2026" end time "10:00 AM" and venue "ABC Convention Center, Perungudi, Chennai."

  # ===========================================================================
  # TS-10 — Organization Info Address (@TS10 @TC10)
  # ===========================================================================

  @TS10 @TC10 @smoke @regression @positive
  Scenario: TC-10 — Edit My Organization Info Address details and save
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization Organization Info tab
    And I scroll to the My Organization Address section
    And I click the My Organization Address Edit button
    And I fill the My Organization address line 1 with "Singapore New City 1"
    And I fill the My Organization address line 2 with "Londone City Mexico"
    And I fill the My Organization address city with "Beverly Hills"
    And I select the My Organization address state "California"
    And I select the My Organization address country "United States"
    And I fill the My Organization address zip code with "90210"
    And I click the My Organization Address Save button
    Then I should see My Organization success toast "Organization address updated successfully.|updated successfully|address updated|success"
    And the My Organization address should be displayed in the Address section with line 1 "Singapore New City 1" line 2 "Londone City Mexico" city "Beverly Hills" state "California" country "United States" and zip "90210"

  # ===========================================================================
  # TS-11 — Portfolio Add Project (@TS11 @TC11)
  # ===========================================================================

  @TS11 @TC11 @smoke @regression @positive
  Scenario: TC-11 — Add a portfolio project with video to My Organization Portfolio
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization Portfolio tab
    And I click the My Organization Add Project button
    Then the My Organization Add Portfolio popup should be displayed
    When I fill the My Organization portfolio project name with "Green Valley Residency"
    And I select the My Organization portfolio project type "Residential Project"
    And I fill the My Organization portfolio description with "Residential construction project focused on modern design, quality materials, safety, and timely completion."
    And I fill the My Organization portfolio project duration with "12 Months"
    And I fill the My Organization portfolio location with "Chennai, Tamil Nadu"
    And I enable the My Organization portfolio public visibility
    And I upload the My Organization portfolio media file "portfolio_test_image.png"
    Then the My Organization portfolio uploaded video should be displayed in the upload section
    When I click the My Organization portfolio Add button
    Then I should see My Organization success toast "added successfully|portfolio|project added|success"
    And the My Organization portfolio project should be displayed with name "Green Valley Residency" type "Residential Project" duration "12 Months" location "Chennai, Tamil Nadu" public visibility enabled and video visible

  # ===========================================================================
  # TS-12 — Social Media Links (@TS12 @TC12)
  # ===========================================================================

  @TS12 @TC12 @smoke @regression @positive
  Scenario: TC-12 — Edit My Organization Social Media links and verify after refresh
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization Social Media tab
    Then the My Organization Social Media Links section should be displayed
    When I click the My Organization Social Media Edit button
    And I fill the My Organization Facebook URL with "https://www.facebook.com/testprofile"
    And I fill the My Organization Twitter URL with "https://twitter.com/testprofile"
    And I fill the My Organization LinkedIn URL with "https://www.linkedin.com/in/testprofile"
    And I fill the My Organization Instagram URL with "https://www.instagram.com/testprofile"
    And I fill the My Organization Public Profile URL with "https://www.example.com/publicprofile"
    And I fill the My Organization Website or Blog URL with "https://www.example.com/blog"
    And I click the My Organization Social Media Save button
    Then I should see My Organization success toast "Social media added successfully."
    When I refresh the page
    And I click the My Organization Social Media tab
    Then the My Organization Social Media Links section should be displayed
    And the My Organization social media URLs should be displayed with Facebook "https://www.facebook.com/testprofile" Twitter "https://twitter.com/testprofile" LinkedIn "https://www.linkedin.com/in/testprofile" Instagram "https://www.instagram.com/testprofile" Public Profile "https://www.example.com/publicprofile" and Website "https://www.example.com/blog"

  # ===========================================================================
  # TS-13 — E-Signature Draw (@TS13 @TC13)
  # ===========================================================================

  @TS13 @TC13 @smoke @regression @positive
  Scenario: TC-13 — Draw and update My Organization Admin Digital Signature
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization E-Signature tab
    Then the My Organization Admin Digital Signature section should be displayed
    When I click the My Organization E-Signature Draw option
    And I draw a sample signature in the My Organization signature area
    Then the My Organization drawn signature should be displayed in the signature area
    When I click the My Organization E-Signature Update button
    Then I should see My Organization success toast "updated successfully|signature updated|digital signature|success"
    And the My Organization updated signature should be displayed under Existing Digital Signature

  # ===========================================================================
  # TS-14 — E-Signature Upload (@TS14 @TC14)
  # ===========================================================================

  @TS14 @TC14 @smoke @regression @positive
  Scenario: TC-14 — Upload and update My Organization Admin Digital Signature
    When I navigate to Profile Settings
    And I click on My Organization
    Then the My Organization page should be displayed
    When I click the My Organization E-Signature tab
    Then the My Organization Admin Digital Signature section should be displayed
    When I click the My Organization E-Signature Upload option
    And I upload the My Organization signature file "sample_signature.png"
    Then the My Organization uploaded signature should be displayed in the signature area
    When I click the My Organization E-Signature Update button
    Then I should see My Organization success toast "updated successfully|signature updated|digital signature|success"
    And the My Organization updated signature should be displayed under Existing Digital Signature
