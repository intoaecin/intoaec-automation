# -----------------------------------------------------------------------------
# Preferences — incremental TCs in ONE file.
#
# TS-01 Domain Configuration — @TS01 @TC01
#   TC-01 — Settings → Preferences → Domain Configuration → Edit →
#           enter domain "Lead" (or another available name if taken) → Save →
#           verify section shows updated domain + success toast
#
# TS-02 Calendar Availability (Online) — @TS02 @TC02
#   TC-02 — Settings → Preferences → Calendar Availability → Copy link →
#           open link in new tab → Online Meeting → pick slot → fill details →
#           Confirm Booking → verify success → Admin Dashboard Meeting/Event
#           shows the booked meeting
#
# TS-03 Calendar Availability (In-Person) — @TS03 @TC03
#   TC-03 — Settings → Preferences → Calendar Availability → Copy link →
#           open link in new tab → In-Person Meeting → pick slot → fill details →
#           enter location/address → Confirm Booking → verify success →
#           Admin Dashboard Meeting/Event shows the booked in-person meeting
#
# TS-04 Facebook Lead Capture — @TS04 @TC04
#   TC-04 — Settings → Preferences → Lead Capture → Copy Facebook Lead Capture link →
#           open link in new tab → select project type → unique name (not Charles) →
#           location Chennai → Phone Call → area 2000 → pick day →
#           unique yopmail email + unique phone (avoids "already exists") → Get OTP →
#           retrieve OTP (Yopmail) → enter OTP → phone step clicks Verify →
#           enter the phone OTP by hand (test waits until Next is enabled) →
#           Submit → verify success →
#           Admin Lead Manager (direct URL) → open created lead → Form → View Response → Close
#
# TS-05 Instagram Lead Capture — @TS05 @TC05
#   TC-05 — Settings → Preferences → Lead Capture → Copy Instagram Lead Capture link →
#           open link in new tab → select project type → unique name →
#           location Chennai → Phone Call → area 2000 → pick day →
#           unique yopmail email + unique phone → Get OTP →
#           retrieve OTP (Yopmail) → enter OTP → phone Verify + manual OTP →
#           Submit → verify success →
#           Admin Lead Manager → locate lead → verify displayed → verify lead details
#
# TS-06 Website Lead Capture — @TS06 @TC06
#   TC-06 — Settings → Preferences → Lead Capture → Copy Website Lead Capture link →
#           open link in new tab → select project type → unique name →
#           location Chennai → Phone Call → area 2000 → pick day →
#           unique yopmail email + unique phone → Get OTP →
#           retrieve OTP (Yopmail) → enter OTP → phone Verify + manual OTP →
#           Submit → verify success →
#           Admin Lead Manager → locate lead → verify displayed → verify lead details
#
# TS-07 Twitter Lead Capture — @TS07 @TC07
#   TC-07 — Settings → Preferences → Lead Capture → Copy Twitter Lead Capture link →
#           open link in new tab → select project type → unique name →
#           location Chennai → Phone Call → area 2000 → pick day →
#           unique yopmail email + unique phone → Get OTP →
#           retrieve OTP (Yopmail) → enter OTP → phone Verify + manual OTP →
#           Submit → verify success →
#           Admin Lead Manager → locate lead → verify displayed → verify lead details
#
# TS-08 LinkedIn Lead Capture — @TS08 @TC08
#   TC-08 — Settings → Preferences → Lead Capture → Copy LinkedIn Lead Capture link →
#           open link in new tab → select project type → unique name →
#           location Chennai → Phone Call → area 2000 → pick day →
#           unique yopmail email + unique phone → Get OTP →
#           retrieve OTP (Yopmail) → enter OTP → phone Verify + manual OTP →
#           Submit → verify success →
#           Admin Lead Manager → locate lead → verify displayed → verify lead details
#
# TS-09 YouTube Lead Capture — @TS09 @TC09
#   TC-09 — Settings → Preferences → Lead Capture → Copy YouTube Lead Capture link →
#           open link in new tab → select project type → unique name →
#           location Chennai → Phone Call → area 2000 → pick day →
#           unique yopmail email + unique phone → Get OTP →
#           retrieve OTP (Yopmail) → enter OTP → phone Verify + manual OTP →
#           Submit → verify success →
#           Admin Lead Manager → locate lead → verify displayed → verify lead details
#
# TS-10 TikTok Lead Capture — @TS10 @TC10
#   TC-10 — Settings → Preferences → Lead Capture → Copy TikTok Lead Capture link →
#           open link in new tab → select project type → unique name →
#           location Chennai → Phone Call → area 2000 → pick day →
#           unique yopmail email + unique phone → Get OTP →
#           retrieve OTP (Yopmail) → enter OTP → phone Verify + manual OTP →
#           Submit → verify success →
#           Admin Lead Manager → locate lead → verify displayed → verify lead details
#
# TS-11 WhatsApp Lead Capture — @TS11 @TC11
#   TC-11 — Settings → Preferences → Lead Capture → Copy WhatsApp Lead Capture link →
#           open link in new tab → select project type → unique name →
#           location Chennai → Phone Call → area 2000 → pick day →
#           unique yopmail email + unique phone → Get OTP →
#           retrieve OTP (Yopmail) → enter OTP → phone Verify + manual OTP →
#           Submit → verify success →
#           Admin Lead Manager → locate lead → verify displayed → verify lead details
#
# TS-12 Calendar Availability weekly slots — @TS12 @TC12
#   TC-12 — Settings → Preferences → Calendar Availability →
#           for Sunday–Saturday: Add New Time Slot → pick random upcoming hour → Save →
#           Copy Calendar Availability link → open architectAvailableSlots in new tab →
#           verify configured upcoming slots appear for each day and match admin config →
#           switch back to Admin Portal
#
# TS-13 Calendar Availability date-specific slot — @TS13 @TC13
#   TC-13 — Settings → Preferences → Calendar Availability → Date Specific Slots →
#           Add → pick upcoming date → Add Time Slot → pick upcoming time → Save →
#           verify date/slot listed → open public booking link → verify slot bookable →
#           switch back to Admin Portal
#
# TS-14 Preferences Forms — create Lead Capture form — @TS14 @TC14
#   TC-14 — Settings → Preferences → Forms → Create → Lead Capture →
#           Form Name "Project Information Form" (unique if taken) → Title "Tender" →
#           sample description → Lead Capture field details → Thank You message → Save →
#           verify success toast + form appears in Forms list
#
# TS-15 Preferences Forms — create Instant Proposal form — @TS15 @TC15
#   TC-15 — Settings → Preferences → Forms → Filter Type "Instant Proposal" →
#           Create → Instant Proposal → Form Name "Instant Proposal" (unique suffix) →
#           sample description → Service Types → Add Service (random emoji, sample
#           service name — required by UI — and tagline) → Create Service →
#           Lead Capture field details → Preview → verify Welcome → Continue →
#           verify Lead Capture fields → Save → success toast → form in Forms list
#
# TS-16 Preferences Forms — create Feedback Form — @TS16 @TC16
#   TC-16 — Settings → Preferences → Forms → Filter Type "Feedback Form" →
#           Create → Feedback Form → Form Name "Customer Feedback Form" (unique suffix) →
#           Title "Share Your Feedback" → sample description → Feedback section
#           (Full Name / Email Address / Rating / Feedback listed) → Preview → verify
#           title + description → Continue → enter Full Name, valid email, Rating,
#           Feedback in the preview (the builder has no value inputs) → verify values →
#           Save → success toast → form in Forms list
#
# TS-17 Preferences Forms — create Complaint Form — @TS17 @TC17
#   TC-17 — Settings → Preferences → Forms → Filter Type "Complaint Form" →
#           Create → Complaint Form → Form Name "Customer Complaint Form" (unique suffix) →
#           Title "Raise a Complaint" → sample description → Complaint section
#           (Full Name / Email Address / Mobile Number / Subject / Complaint Details listed) →
#           Preview → verify title + description → Continue → enter Full Name, valid email,
#           Complaint Details in the preview → verify values → Save → success toast →
#           form in Forms list
#
# TS-18 Preferences Forms — create Custom Form with all elements — @TS18 @TC18
#   TC-18 — Settings → Preferences → Forms → Filter Type "Custom Form" → Create →
#           Custom Form → Form Name "Customer Information Form" (unique suffix) →
#           Title "Customer Details" → sample description → Custom Form section →
#           add Short Answer, Long Answer, Email, Phone, Dropdown, Multi Select, Yes / No,
#           Number, Dimension, File Upload, Terms & Conditions (label + description,
#           options for Dropdown / Multi Select, paragraph for Terms) → verify cards →
#           Thank You message → Preview → verify all elements → Save → success toast →
#           form in Forms list
#
# TS-19 Preferences Tax Configuration — add tax — @TS19 @TC19
#   TC-19 — Settings → Preferences → Tax Configuration (/localization/taxes) → Add Tax →
#           Tax Name "Service Tax XXXX" (random suffix) → Percentage 1–28 → Save →
#           success toast → tax row (name + percentage) in Tax Configuration list
#
# TS-20 Preferences Tax Configuration — edit & delete tax — @TS20 @TC20
#   TC-20 — Settings → Preferences → Tax Configuration → locate the TC-19 tax
#           ("Service Tax XXXX"; one is created first if none exists) → hover row → ⋮ → Edit →
#           "Updated Tax XXXX" + new percentage → Update → toast → updated row in list →
#           ⋮ → Delete → Reason (required by UI) → Yes → toast → row removed from list
#
# TS-21 Preferences Discount Configuration — add discount — @TS21 @TC21
#   TC-21 — Settings → Preferences → Discount Configuration (/localization/discount) →
#           Add Discount → Discount Name "Festive Discount XXXX" (random suffix) →
#           Percentage 1–50 → Save → success toast → discount row (name + percentage) in list
#
# TS-22 Preferences Discount Configuration — add, edit and delete discount — @TS22 @TC22
#   TC-22 — Discount Configuration → Add Discount (random name / 1–50%) → Save → toast + row in list →
#           ⋮ → Edit → "Updated Discount XXXX" + new percentage → Update → toast → updated row, old name gone →
#           ⋮ → Delete → Reason (required by UI) → Yes → toast → row removed from list
#
# TS-23 Preferences Working Days — public holiday + custom off day — @TS23 @TC23
#   TC-23 — Settings → Preferences → Working Days (/preferences/admin?section=schedule) →
#           Public Holidays & Custom Off Days → add "Public Holiday XXXX" and "Custom Off Day XXXX"
#           (unused random dates 1–6 months ahead, dd/MM/yyyy) → verify both in the calendar list →
#           Save Calendar → toast "Working calendar updated successfully" → reload → entries persisted
#
# TS-24 Preferences Terms & Conditions — default template — @TS24 @TC24
#   TC-24 — Templates → Terms and Conditions (/template-center/terms-and-condition) → Create Template →
#           name "Payment Terms XXXX" → random Category → content → Save → toast
#           "Terms and conditions created successfully" + row in list →
#           Settings → Preferences → Terms & Conditions (/preferences/lead?section=receipt-terms) →
#           select the created template → Save → toast → reload → selection persisted
#           Template layer: pages/admin/templates/TermsConditionsTemplatePage.js +
#                           step-definitions/admin/templates/TermsConditionsTemplate.steps.js
#
# TS-25 Preferences Organization Locations — add location — @TS25 @TC25
#   TC-25 — Settings → Preferences → Organization Locations (/preferences/organization-locations) →
#           Add Location → "Pin organization location" → Google Places suggestion for a random Chennai
#           locality not already pinned → Tracking radius 50–500 m → Save → toast
#           "Organization location pinned successfully." → reload → row (location, coordinates, radius)
#
# TS-26 Preferences Organization Locations — edit location — @TS26 @TC26
#   TC-26 — Organization Locations → locate a TC-25 location (automation Chennai locality; pins one if
#           none exist) → ⋮ → Edit → "Edit organization location" → new unpinned locality + new radius →
#           Update → toast "Organization location updated successfully." → reload → updated row, old gone
#
# TS-27 Preferences Organization Locations — delete location — @TS27 @TC27
#   TC-27 — Organization Locations → locate a TC-25/TC-26 location (automation Chennai locality; pins
#           one if none exist) → ⋮ → Delete → "Delete organization location?" → Delete → toast →
#           row removed → reload → still not listed
#
# Run (PowerShell: use npx.cmd / npm.cmd — npx.ps1 is blocked by execution policy):
#   npx.cmd cucumber-js --tags "@preferences-tc"
#   npx.cmd cucumber-js --tags "@preferences-tc12-tc27"      (TC-12 … TC-27 in order)
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC01"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC02"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC03"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC04"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC05"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC06"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC07"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC08"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC09"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC10"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC11"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC12"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC13"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC14"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC15"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC16"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC17"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC18"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC19"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC20"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC21"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC22"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC23"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC24"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC25"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC26"
#   npx.cmd cucumber-js --tags "@preferences-tc and @TC27"
#
# Layering:
#   Feature: features/admin/settings/Preferences/Preferences_TestCases.feature
#   Steps:   step-definitions/admin/settings/Preferences/PreferencesStep.js
#   Page:    pages/admin/settings/Preferences/PreferencesPage.js
# -----------------------------------------------------------------------------

@preferences-tc @preferences @settings @ashraf-modules
Feature: Preferences — incremental test cases

  Background:
    Given I am logged in
    And I close the post-login popup or select Continue to My Account
    When I navigate to Settings
    And I select Preferences

  # ===========================================================================
  # TS-01 — Domain Configuration (@TS01 @TC01)
  # ===========================================================================

  @TS01 @TC01 @smoke @regression @positive
  Scenario: TC-01 — Update Domain Configuration with an available domain name
    When I select Domain Configuration
    And I click Edit on Domain Configuration
    And I enter the domain name "Lead"
    Then I should see whether the domain name is available
    When I enter another available domain name if the current one is unavailable
    And I save Domain Configuration
    Then I should see the Domain Configuration success toast
    And the Domain Configuration section should display the updated domain name

  # ===========================================================================
  # TS-02 — Calendar Availability Online (@TS02 @TC02)
  # ===========================================================================

  @TS02 @TC02 @smoke @regression @positive
  Scenario: TC-02 — Book Online Meeting via Calendar Availability link and verify on Dashboard
    When I select Calendar Availability
    And I copy the Calendar Availability link
    When I open the copied Calendar Availability link in a new browser tab
    And I select Online Meeting on the Calendar Availability page
    And I select an available time slot on the Calendar Availability page
    And I enter the required Calendar Availability meeting details
    And I click Confirm Booking on the Calendar Availability page
    Then the Calendar Availability meeting booking should be confirmed successfully
    When I switch back to the Admin Portal from Calendar Availability
    And I navigate to the Admin Dashboard
    And I select the Meeting Event section on the Dashboard
    Then the booked Calendar Availability meeting should be reflected on the Dashboard

  # ===========================================================================
  # TS-03 — Calendar Availability In-Person (@TS03 @TC03)
  # ===========================================================================

  @TS03 @TC03 @smoke @regression @positive
  Scenario: TC-03 — Book In-Person Meeting via Calendar Availability link and verify on Dashboard
    When I select Calendar Availability
    And I copy the Calendar Availability link
    When I open the copied Calendar Availability link in a new browser tab
    And I select In-Person Meeting on the Calendar Availability page
    And I select an available time slot on the Calendar Availability page
    And I enter the required Calendar Availability meeting details
    And I enter the Calendar Availability meeting location "Chennai, Tamil Nadu, India"
    And I click Confirm Booking on the Calendar Availability page
    Then the Calendar Availability in-person meeting booking should be confirmed successfully
    When I switch back to the Admin Portal from Calendar Availability
    And I navigate to the Admin Dashboard
    And I select the Meeting Event section on the Dashboard
    Then the booked Calendar Availability in-person meeting should be reflected on the Dashboard

  # ===========================================================================
  # TS-04 — Facebook Lead Capture (@TS04 @TC04)
  # ===========================================================================

  @TS04 @TC04 @smoke @regression @positive
  Scenario: TC-04 — Submit Facebook Lead Capture form and verify lead in Lead Manager
    When I select Lead Capture
    And I copy the Facebook Lead Capture link
    When I open the copied Facebook Lead Capture link in a new browser tab
    And I select an available project type on the Lead Capture form
    And I enter a unique Lead Capture name
    And I select the Lead Capture project location "Chennai"
    And I select the Lead Capture preferred contact method "Phone Call"
    And I enter the Lead Capture project area "2000"
    And I select an available day on the Lead Capture form
    And I enter a unique Lead Capture yopmail email
    And I enter a unique Lead Capture phone number
    And I open Yopmail for the Lead Capture email in a new browser tab
    And I click Get OTP on the Lead Capture form
    And I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP
    And I switch back to the Lead Capture form tab
    And I enter the received OTP on the Lead Capture form
    Then the Lead Capture OTP should be accepted successfully
    When I click Submit on the Lead Capture form
    Then the Lead Capture form should be submitted successfully
    When I switch back to the Admin Portal from Lead Capture
    And I navigate to Lead Manager
    And I locate the newly submitted Lead Capture lead
    Then the newly submitted lead should be displayed in Lead Manager
    When I open the newly submitted Lead Capture lead
    And I navigate to the Form module on the lead profile
    And I click View Response on the lead Form
    Then the Lead Capture form response should be visible
    When I close the Lead Capture form response

  # ===========================================================================
  # TS-05 — Instagram Lead Capture (@TS05 @TC05)
  # ===========================================================================

  @TS05 @TC05 @smoke @regression @positive
  Scenario: TC-05 — Submit Instagram Lead Capture form and verify lead in Lead Manager
    When I select Lead Capture
    And I copy the Instagram Lead Capture link
    When I open the copied Instagram Lead Capture link in a new browser tab
    And I select an available project type on the Lead Capture form
    And I enter a unique Lead Capture name
    And I select the Lead Capture project location "Chennai"
    And I select the Lead Capture preferred contact method "Phone Call"
    And I enter the Lead Capture project area "2000"
    And I select an available day on the Lead Capture form
    And I enter a unique Lead Capture yopmail email
    And I enter a unique Lead Capture phone number
    And I open Yopmail for the Lead Capture email in a new browser tab
    And I click Get OTP on the Lead Capture form
    And I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP
    And I switch back to the Lead Capture form tab
    And I enter the received OTP on the Lead Capture form
    Then the Lead Capture OTP should be accepted successfully
    When I click Submit on the Lead Capture form
    Then the Lead Capture form should be submitted successfully
    When I switch back to the Admin Portal from Lead Capture
    And I navigate to Lead Manager
    And I locate the newly submitted Lead Capture lead
    Then the newly submitted lead should be displayed in Lead Manager
    And the Lead Manager lead details should match the submitted Lead Capture form

  # ===========================================================================
  # TS-06 — Website Lead Capture (@TS06 @TC06)
  # ===========================================================================

  @TS06 @TC06 @smoke @regression @positive
  Scenario: TC-06 — Submit Website Lead Capture form and verify lead in Lead Manager
    When I select Lead Capture
    And I copy the Website Lead Capture link
    When I open the copied Website Lead Capture link in a new browser tab
    And I select an available project type on the Lead Capture form
    And I enter a unique Lead Capture name
    And I select the Lead Capture project location "Chennai"
    And I select the Lead Capture preferred contact method "Phone Call"
    And I enter the Lead Capture project area "2000"
    And I select an available day on the Lead Capture form
    And I enter a unique Lead Capture yopmail email
    And I enter a unique Lead Capture phone number
    And I open Yopmail for the Lead Capture email in a new browser tab
    And I click Get OTP on the Lead Capture form
    And I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP
    And I switch back to the Lead Capture form tab
    And I enter the received OTP on the Lead Capture form
    Then the Lead Capture OTP should be accepted successfully
    When I click Submit on the Lead Capture form
    Then the Lead Capture form should be submitted successfully
    When I switch back to the Admin Portal from Lead Capture
    And I navigate to Lead Manager
    And I locate the newly submitted Lead Capture lead
    Then the newly submitted lead should be displayed in Lead Manager
    And the Lead Manager lead details should match the submitted Lead Capture form

  # ===========================================================================
  # TS-07 — Twitter Lead Capture (@TS07 @TC07)
  # ===========================================================================

  @TS07 @TC07 @smoke @regression @positive
  Scenario: TC-07 — Submit Twitter Lead Capture form and verify lead in Lead Manager
    When I select Lead Capture
    And I copy the Twitter Lead Capture link
    When I open the copied Twitter Lead Capture link in a new browser tab
    And I select an available project type on the Lead Capture form
    And I enter a unique Lead Capture name
    And I select the Lead Capture project location "Chennai"
    And I select the Lead Capture preferred contact method "Phone Call"
    And I enter the Lead Capture project area "2000"
    And I select an available day on the Lead Capture form
    And I enter a unique Lead Capture yopmail email
    And I enter a unique Lead Capture phone number
    And I open Yopmail for the Lead Capture email in a new browser tab
    And I click Get OTP on the Lead Capture form
    And I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP
    And I switch back to the Lead Capture form tab
    And I enter the received OTP on the Lead Capture form
    Then the Lead Capture OTP should be accepted successfully
    When I click Submit on the Lead Capture form
    Then the Lead Capture form should be submitted successfully
    When I switch back to the Admin Portal from Lead Capture
    And I navigate to Lead Manager
    And I locate the newly submitted Lead Capture lead
    Then the newly submitted lead should be displayed in Lead Manager
    And the Lead Manager lead details should match the submitted Lead Capture form

  # ===========================================================================
  # TS-08 — LinkedIn Lead Capture (@TS08 @TC08)
  # ===========================================================================

  @TS08 @TC08 @smoke @regression @positive
  Scenario: TC-08 — Submit LinkedIn Lead Capture form and verify lead in Lead Manager
    When I select Lead Capture
    And I copy the LinkedIn Lead Capture link
    When I open the copied LinkedIn Lead Capture link in a new browser tab
    And I select an available project type on the Lead Capture form
    And I enter a unique Lead Capture name
    And I select the Lead Capture project location "Chennai"
    And I select the Lead Capture preferred contact method "Phone Call"
    And I enter the Lead Capture project area "2000"
    And I select an available day on the Lead Capture form
    And I enter a unique Lead Capture yopmail email
    And I enter a unique Lead Capture phone number
    And I open Yopmail for the Lead Capture email in a new browser tab
    And I click Get OTP on the Lead Capture form
    And I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP
    And I switch back to the Lead Capture form tab
    And I enter the received OTP on the Lead Capture form
    Then the Lead Capture OTP should be accepted successfully
    When I click Submit on the Lead Capture form
    Then the Lead Capture form should be submitted successfully
    When I switch back to the Admin Portal from Lead Capture
    And I navigate to Lead Manager
    And I locate the newly submitted Lead Capture lead
    Then the newly submitted lead should be displayed in Lead Manager
    And the Lead Manager lead details should match the submitted Lead Capture form

  # ===========================================================================
  # TS-09 — YouTube Lead Capture (@TS09 @TC09)
  # ===========================================================================

  @TS09 @TC09 @smoke @regression @positive
  Scenario: TC-09 — Submit YouTube Lead Capture form and verify lead in Lead Manager
    When I select Lead Capture
    And I copy the YouTube Lead Capture link
    When I open the copied YouTube Lead Capture link in a new browser tab
    And I select an available project type on the Lead Capture form
    And I enter a unique Lead Capture name
    And I select the Lead Capture project location "Chennai"
    And I select the Lead Capture preferred contact method "Phone Call"
    And I enter the Lead Capture project area "2000"
    And I select an available day on the Lead Capture form
    And I enter a unique Lead Capture yopmail email
    And I enter a unique Lead Capture phone number
    And I open Yopmail for the Lead Capture email in a new browser tab
    And I click Get OTP on the Lead Capture form
    And I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP
    And I switch back to the Lead Capture form tab
    And I enter the received OTP on the Lead Capture form
    Then the Lead Capture OTP should be accepted successfully
    When I click Submit on the Lead Capture form
    Then the Lead Capture form should be submitted successfully
    When I switch back to the Admin Portal from Lead Capture
    And I navigate to Lead Manager
    And I locate the newly submitted Lead Capture lead
    Then the newly submitted lead should be displayed in Lead Manager
    And the Lead Manager lead details should match the submitted Lead Capture form

  # ===========================================================================
  # TS-10 — TikTok Lead Capture (@TS10 @TC10)
  # ===========================================================================

  @TS10 @TC10 @smoke @regression @positive
  Scenario: TC-10 — Submit TikTok Lead Capture form and verify lead in Lead Manager
    When I select Lead Capture
    And I copy the TikTok Lead Capture link
    When I open the copied TikTok Lead Capture link in a new browser tab
    And I select an available project type on the Lead Capture form
    And I enter a unique Lead Capture name
    And I select the Lead Capture project location "Chennai"
    And I select the Lead Capture preferred contact method "Phone Call"
    And I enter the Lead Capture project area "2000"
    And I select an available day on the Lead Capture form
    And I enter a unique Lead Capture yopmail email
    And I enter a unique Lead Capture phone number
    And I open Yopmail for the Lead Capture email in a new browser tab
    And I click Get OTP on the Lead Capture form
    And I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP
    And I switch back to the Lead Capture form tab
    And I enter the received OTP on the Lead Capture form
    Then the Lead Capture OTP should be accepted successfully
    When I click Submit on the Lead Capture form
    Then the Lead Capture form should be submitted successfully
    When I switch back to the Admin Portal from Lead Capture
    And I navigate to Lead Manager
    And I locate the newly submitted Lead Capture lead
    Then the newly submitted lead should be displayed in Lead Manager
    And the Lead Manager lead details should match the submitted Lead Capture form

  # ===========================================================================
  # TS-11 — WhatsApp Lead Capture (@TS11 @TC11)
  # ===========================================================================

  @TS11 @TC11 @smoke @regression @positive
  Scenario: TC-11 — Submit WhatsApp Lead Capture form and verify lead in Lead Manager
    When I select Lead Capture
    And I copy the WhatsApp Lead Capture link
    When I open the copied WhatsApp Lead Capture link in a new browser tab
    And I select an available project type on the Lead Capture form
    And I enter a unique Lead Capture name
    And I select the Lead Capture project location "Chennai"
    And I select the Lead Capture preferred contact method "Phone Call"
    And I enter the Lead Capture project area "2000"
    And I select an available day on the Lead Capture form
    And I enter a unique Lead Capture yopmail email
    And I enter a unique Lead Capture phone number
    And I open Yopmail for the Lead Capture email in a new browser tab
    And I click Get OTP on the Lead Capture form
    And I wait for the Lead Capture OTP email in Yopmail and retrieve the OTP
    And I switch back to the Lead Capture form tab
    And I enter the received OTP on the Lead Capture form
    Then the Lead Capture OTP should be accepted successfully
    When I click Submit on the Lead Capture form
    Then the Lead Capture form should be submitted successfully
    When I switch back to the Admin Portal from Lead Capture
    And I navigate to Lead Manager
    And I locate the newly submitted Lead Capture lead
    Then the newly submitted lead should be displayed in Lead Manager
    And the Lead Manager lead details should match the submitted Lead Capture form

  # ===========================================================================
  # TS-12 — Calendar Availability weekly slots (@TS12 @TC12)
  # ===========================================================================

  @TS12 @TC12 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-12 — Configure weekly Calendar Availability slots and verify on public link
    When I select Calendar Availability
    And I add a random upcoming time slot for "Sunday"
    And I add a random upcoming time slot for "Monday"
    And I add a random upcoming time slot for "Tuesday"
    And I add a random upcoming time slot for "Wednesday"
    And I add a random upcoming time slot for "Thursday"
    And I add a random upcoming time slot for "Friday"
    And I add a random upcoming time slot for "Saturday"
    And I copy the Calendar Availability link
    When I open the copied Calendar Availability link in a new browser tab
    And I select Online Meeting on the Calendar Availability page
    Then the configured Calendar Availability time slots should be displayed for their respective days
    And the public Calendar Availability slots should match the configured time slots
    When I switch back to the Admin Portal from Calendar Availability

  # ===========================================================================
  # TS-13 — Calendar Availability date-specific slot (@TS13 @TC13)
  # ===========================================================================

  @TS13 @TC13 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-13 — Add date-specific Calendar Availability slot and verify it is bookable
    When I select Calendar Availability
    And I select Date Specific Slots
    And I add a random upcoming date-specific time slot
    Then the date-specific time slot should be displayed correctly
    And I copy the Calendar Availability link
    When I open the copied Calendar Availability link in a new browser tab
    And I select Online Meeting on the Calendar Availability page
    Then the date-specific time slot should be available for booking
    When I switch back to the Admin Portal from Calendar Availability

  # ===========================================================================
  # TS-14 — Preferences Forms create Lead Capture form (@TS14 @TC14)
  # ===========================================================================

  @TS14 @TC14 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-14 — Create Project Information Form and verify it in Forms list
    When I select Forms
    And I click Create Form
    And I choose the Lead Capture form type
    And I enter the Form Name "Project Information Form"
    And I enter the Form Title "Tender"
    And I enter a sample Form Description
    And I navigate to the form Lead Capture section
    And I fill the Lead Capture field details with sample data
    And I navigate to the form Thank You section
    And I enter a sample Thank You message
    And I save the Preferences form
    Then I should see the form created successfully toast
    And the Forms list should display the created form "Project Information Form"

  # ===========================================================================
  # TS-15 — Preferences Forms create Instant Proposal form (@TS15 @TC15)
  # ===========================================================================

  @TS15 @TC15 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-15 — Create Instant Proposal form with a service and verify it in Forms list
    When I select Forms
    And I select Instant Proposal
    And I click Create Form
    And I choose the Instant Proposal form type
    And I enter the Form Name "Instant Proposal"
    And I enter a sample Form Description
    And I navigate to the form Service Types section
    And I click Add Services
    And I select any available service emoji
    And I enter a sample service name
    And I enter a sample service tagline
    And I click Create Services
    And I navigate to the form Lead Capture section
    And I fill the Lead Capture field details with sample data
    And I navigate to the form Preview section
    And I click form Preview
    Then the Instant Proposal form should be displayed correctly in the preview
    When I click Continue in the form preview
    Then the form preview should display the form details correctly
    When I save the Preferences form
    Then I should see the form created successfully toast
    And the Forms list should display the created form "Instant Proposal"

  # ===========================================================================
  # TS-16 — Preferences Forms create Feedback Form (@TS16 @TC16)
  # ===========================================================================

  @TS16 @TC16 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-16 — Create Feedback Form, verify preview details and Forms list
    When I select Forms
    And I select Feedback Form
    And I click Create Form
    And I choose the Feedback Form form type
    And I enter the Form Name "Customer Feedback Form"
    And I enter the Form Title "Share Your Feedback"
    And I enter a sample Form Description
    And I navigate to the form Feedback section
    And I navigate to the form Preview section
    And I click form Preview
    Then the form preview should display the form title and description
    When I click Continue in the form preview
    And I enter the feedback Full Name with sample data
    And I enter the feedback Email Address with a valid email
    And I select a feedback Rating
    And I enter the Feedback with sample data
    Then the Feedback Form details should be displayed correctly in the preview
    When I save the Preferences form
    Then I should see the form created successfully toast
    And the Forms list should display the created form "Customer Feedback Form"

  # ===========================================================================
  # TS-17 — Preferences Forms create Complaint Form (@TS17 @TC17)
  # ===========================================================================

  @TS17 @TC17 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-17 — Create Complaint Form, verify preview details and Forms list
    When I select Forms
    And I select Complaint Form
    And I click Create Form
    And I choose the Complaint Form form type
    And I enter the Form Name "Customer Complaint Form"
    And I enter the Form Title "Raise a Complaint"
    And I enter a sample Form Description
    And I navigate to the form Complaint section
    And I navigate to the form Preview section
    And I click form Preview
    Then the form preview should display the form title and description
    When I click Continue in the form preview
    And I enter the complaint Full Name with sample data
    And I enter the complaint Email Address with a valid email
    And I enter the Complaint with sample data
    Then the Complaint Form details should be displayed correctly in the preview
    When I save the Preferences form
    Then I should see the form created successfully toast
    And the Forms list should display the created form "Customer Complaint Form"

  # ===========================================================================
  # TS-18 — Preferences Forms create Custom Form with all elements (@TS18 @TC18)
  # ===========================================================================

  @TS18 @TC18 @preferences-tc12-tc27 @regression @positive
  Scenario: TC-18 — Create Custom Form with all elements, verify builder, preview and Forms list
    When I select Forms
    And I select Custom Form
    And I click Create Form
    And I choose the Custom Form form type
    And I enter the Form Name "Customer Information Form"
    And I enter the Form Title "Customer Details"
    And I enter a sample Form Description
    And I navigate to the form Custom Form section
    And I add and configure the following Custom Form elements:
      | element            | label              | details                                                          |
      | Short Answer       | Customer Name      |                                                                  |
      | Long Answer        | Project Summary    |                                                                  |
      | Email              | Contact Email      |                                                                  |
      | Phone              | Contact Number     |                                                                  |
      | Dropdown           | Preferred Service  | Residential Design, Commercial Design, Interior Design           |
      | Multi Select       | Rooms To Design    | Kitchen, Living Room, Bedroom                                    |
      | Yes / No           | Existing Customer  |                                                                  |
      | Number             | Number Of Floors   |                                                                  |
      | Dimension          | Plot Dimension     |                                                                  |
      | File Upload        | Site Photos        |                                                                  |
      | Terms & Conditions | Terms & Conditions | I agree to be contacted by the team regarding this enquiry.      |
    Then all added elements should be displayed correctly in the Custom Form
    When I navigate to the form Thank You section
    And I enter a sample Thank You message
    And I navigate to the form Preview section
    And I click form Preview
    Then all configured Custom Form elements should be displayed correctly in the preview
    When I save the Preferences form
    Then I should see the form created successfully toast
    And the Forms list should display the created form "Customer Information Form"

  # ===========================================================================
  # TS-19 — Preferences Tax Configuration add tax (@TS19 @TC19)
  # ===========================================================================

  @TS19 @TC19 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-19 — Add tax in Tax Configuration and verify it in the list
    When I select Tax Configuration
    And I click Add Tax
    And I enter a sample Tax Name
    And I enter a valid Tax Percentage
    And I save the tax
    Then I should see the tax created successfully toast
    And the created tax should be displayed in the Tax Configuration list

  # ===========================================================================
  # TS-20 — Preferences Tax Configuration edit & delete tax (@TS20 @TC20)
  # ===========================================================================

  @TS20 @TC20 @preferences-tc12-tc27 @regression @positive
  Scenario: TC-20 — Edit and delete tax configuration
    When I select Tax Configuration
    And I locate the created tax configuration
    And I open the three-dot menu for the tax configuration
    And I select "Edit" from the tax configuration menu
    And I update the Tax Name and Tax Percentage with valid values
    And I save the updated tax
    Then I should see the tax updated successfully toast
    And the updated tax details should be displayed in the Tax Configuration list
    When I open the three-dot menu for the tax configuration
    And I select "Delete" from the tax configuration menu
    And I confirm the tax deletion
    Then I should see the tax deleted successfully toast
    And the tax configuration should no longer be displayed in the list

  # ===========================================================================
  # TS-21 — Preferences Discount Configuration add discount (@TS21 @TC21)
  # ===========================================================================

  @TS21 @TC21 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-21 — Add discount in Discount Configuration and verify it in the list
    When I select Discount Configuration
    And I click Add Discount
    And I enter a sample Discount Name
    And I enter a valid Discount Percentage
    And I save the discount
    Then I should see the discount created successfully toast
    And the created discount should be displayed in the Discount Configuration list

  # ===========================================================================
  # TS-22 — Preferences Discount Configuration add / edit / delete (@TS22 @TC22)
  # ===========================================================================

  @TS22 @TC22 @preferences-tc12-tc27 @regression @positive
  Scenario: TC-22 — Add, edit and delete discount configuration
    When I select Discount Configuration
    And I click Add Discount
    And I enter a sample Discount Name
    And I enter a valid Discount Percentage
    And I save the discount
    Then I should see the discount created successfully toast
    And the created discount should be displayed in the Discount Configuration list
    When I open the three-dot menu for the discount configuration
    And I select "Edit" from the discount configuration menu
    And I update the Discount Name and Discount Percentage with valid values
    And I save the updated discount
    Then I should see the discount updated successfully toast
    And the updated discount details should be displayed in the Discount Configuration list
    When I open the three-dot menu for the discount configuration
    And I select "Delete" from the discount configuration menu
    And I confirm the discount deletion
    Then I should see the discount deleted successfully toast
    And the discount configuration should no longer be displayed in the list

  # ===========================================================================
  # TS-23 — Preferences Working Days public holidays & custom off days (@TS23 @TC23)
  # ===========================================================================

  @TS23 @TC23 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-23 — Add public holiday and custom off day in Working Days and save calendar
    When I select Working Days
    And I navigate to the Public Holidays & Custom Off Days section
    And I add a sample public holiday
    And I add a sample custom off day
    Then the added holidays and custom off days should be displayed in the Working Days calendar
    When I click Save Calendar
    Then the Working Days calendar should be saved successfully
    And I should see the working calendar saved successfully toast

  # ===========================================================================
  # TS-24 — Terms & Conditions template → Preferences default (@TS24 @TC24)
  # ===========================================================================

  @TS24 @TC24 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-24 — Create Terms and Conditions template and set it as the default in Preferences
    When I navigate to Templates
    And I select Terms and Conditions in Templates
    And I click Create Template for Terms and Conditions
    And I enter a sample Terms and Conditions template name
    And I select any available Terms and Conditions category
    And I enter the required Terms and Conditions content
    And I save the Terms and Conditions template
    Then the Terms and Conditions template should be created successfully
    When I navigate to Settings
    And I select Preferences
    And I select Terms and Conditions in Preferences
    And I select the created Terms and Conditions template
    And I save the Terms and Conditions preference
    Then the selected Terms and Conditions template should be saved successfully
    And I should see the Terms and Conditions preference saved successfully toast

  # ===========================================================================
  # TS-25 — Preferences Organization Locations add location (@TS25 @TC25)
  # ===========================================================================

  @TS25 @TC25 @preferences-tc12-tc27 @smoke @regression @positive
  Scenario: TC-25 — Add organization location and verify it in the Organization Locations list
    When I select Organization Locations
    And I click Add Location
    And I enter the required organization location details with valid sample data
    And I save the organization location
    Then the organization location should be created successfully
    And the created location should be displayed in the Organization Locations list
    And I should see the organization location created successfully toast

  # ===========================================================================
  # TS-26 — Preferences Organization Locations edit location (@TS26 @TC26)
  # ===========================================================================

  @TS26 @TC26 @preferences-tc12-tc27 @regression @positive
  Scenario: TC-26 — Edit organization location and verify the updated details in the list
    When I select Organization Locations
    And I locate the created organization location
    And I open the three-dot menu for the organization location
    And I select "Edit" from the organization location menu
    And I update the organization location details with valid sample data
    And I save the updated organization location
    Then the organization location should be updated successfully
    And the updated location details should be displayed in the Organization Locations list
    And I should see the organization location updated successfully toast

  # ===========================================================================
  # TS-27 — Preferences Organization Locations delete location (@TS27 @TC27)
  # ===========================================================================

  @TS27 @TC27 @preferences-tc12-tc27 @regression @positive
  Scenario: TC-27 — Delete organization location and verify it is removed from the list
    When I select Organization Locations
    And I locate the created organization location
    And I open the three-dot menu for the organization location
    And I select "Delete" from the organization location menu
    And I confirm the organization location deletion
    Then the organization location should be deleted successfully
    And the deleted location should no longer be displayed in the Organization Locations list
    And I should see the organization location deleted successfully toast
