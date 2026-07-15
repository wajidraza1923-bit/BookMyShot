# Requirements Document

## Introduction

This feature implements the complete BookMyShot Booking, Commission, Subscription, and Cashback system. It covers the full booking lifecycle from customer request through negotiation, payment confirmation, event completion, and post-event cashback distribution. The system includes a subscription gate for creators (free bookings quota followed by mandatory subscription), a dynamic commission model based on the highest booking amount, a customer cashback wallet, and comprehensive dashboards for all user roles. An anti-cheating policy enforces platform usage integrity. All configurable parameters (commission percentages, cashback rates, subscription plans, free booking limits, withdrawal rules) are managed from the Admin Panel without code changes. The system applies uniformly across all service categories (Photography & Videography, Makeup Artists, Decoration & Floral, Wedding Planners, Catering Services, Venues, DJs & Entertainment, Mehndi Artists, Choreographers, Luxury Cars, Invitation & Printing, Pandits & Priests, Wedding Essentials, and any future category added by the Admin).

## Glossary

- **Booking_System**: The backend service responsible for managing booking creation, negotiation, confirmation, completion, and related transactions
- **Customer**: A registered user who creates booking requests and hires service providers through the platform
- **Creator**: A registered service provider (photographer, makeup artist, decorator, etc.) who receives and responds to booking requests
- **Booking_Request**: A service request initiated by a Customer containing event details, category, budget, and requirements
- **Negotiation_Engine**: The subsystem that manages the back-and-forth price negotiation between Customer and Creator until mutual agreement
- **Counter_Offer**: A price revision submitted by either the Customer or Creator during negotiation, containing an updated amount and optional message
- **Official_Booking_Amount**: The final agreed price between Customer and Creator after negotiation, which becomes locked for commission calculations
- **Booking_Confirmation_Fee**: A percentage-based fee (default 5%) of the Official_Booking_Amount that the Customer pays via Razorpay to confirm the booking
- **Commission_Settings**: The admin-configurable singleton document storing all commission, cashback, and fee percentages
- **Cashback_Wallet**: A digital wallet for the Customer that accumulates cashback after verified event completion, with pending, approved, and available balance states
- **Subscription_Gate**: The mechanism that blocks a Creator from accepting new bookings after exhausting free booking quota until a subscription plan is purchased
- **Free_Booking_Limit**: The admin-configurable number of accepted bookings a new Creator receives before requiring a subscription (default 3)
- **Subscription_Plan**: A paid plan a Creator must purchase to continue accepting bookings after the free quota, managed dynamically from the Admin Panel
- **Price_Revision**: A post-confirmation amendment to the booking amount initiated only by the Creator for additional services, stored with full audit history
- **Additional_Platform_Fee**: The difference in Booking_Confirmation_Fee resulting from a Price_Revision increase, payable by the Creator before marking completion
- **Admin_Panel**: The administrative interface for managing all configurable platform settings
- **Razorpay**: The payment gateway integrated for processing Booking_Confirmation_Fee payments, subscription purchases, and Additional_Platform_Fee payments
- **Notification_Service**: The subsystem responsible for delivering push notifications, email notifications, and in-app notifications to users
- **Anti_Cheating_Policy**: The platform usage policy displayed to users before booking confirmation that outlines consequences of platform misuse
- **Branding_Settings**: Admin-configurable visual identity assets (logos, colors, banners) that apply across Website and Mobile App
- **Audit_Log**: A chronological record of all booking amount changes, fee calculations, and administrative actions

## Requirements

### Requirement 1: Booking Request Creation

**User Story:** As a Customer, I want to create a booking request with event details and my expected budget, so that I can initiate a service engagement with a Creator.

#### Acceptance Criteria

1. WHEN a Customer submits a booking request, THE Booking_System SHALL create a new booking record containing: event date, event time, event location, service category, subcategory, expected budget (offer price), special requirements, and optional notes
2. WHEN a booking request is created, THE Booking_System SHALL set the booking status to "Waiting for Service Provider Response"
3. THE Booking_System SHALL require the Customer to provide event date, event time, event location, service category, subcategory, and expected budget as mandatory fields before submission
4. WHEN a booking request is created, THE Booking_System SHALL send a push notification, email notification, and in-app notification to the targeted Creator informing them of the new request
5. THE Booking_System SHALL validate that the event date is a future date and reject submission with an error message if the date is in the past
6. THE Booking_System SHALL validate that the expected budget is a positive numeric value greater than zero and not exceeding 99,99,99,999
7. IF no specific Creator is selected by the Customer, THEN THE Booking_System SHALL assign the booking to an available featured and approved Creator in the selected category, or if none is featured, to the most recently approved Creator in that category
8. IF no approved Creator is available in the selected category, THEN THE Booking_System SHALL reject the submission with an error message indicating no creator is available for booking in that category

### Requirement 2: Creator Booking Review and Response

**User Story:** As a Creator, I want to review incoming booking requests and respond with acceptance, counter offer, or rejection, so that I can manage my incoming work.

#### Acceptance Criteria

1. WHEN a Creator opens a booking request with status "Waiting for Service Provider Response", THE Booking_System SHALL present three response options: Accept Offer, Change Price (Counter Offer), and Reject Booking
2. WHEN a Creator selects "Accept Offer", THE Booking_System SHALL lock the Customer's offered price as the Official_Booking_Amount and advance the booking to the confirmation fee stage
3. WHEN a Creator selects "Change Price", THE Booking_System SHALL require the Creator to enter a new price amount between 1 and 99,999,999 (inclusive) and allow an optional message of up to 500 characters explaining the price change
4. IF a Creator submits a Counter_Offer with a price amount outside the range of 1 to 99,999,999 or leaves the price field empty, THEN THE Booking_System SHALL reject the submission and display an error message indicating the valid price range
5. WHEN a Creator submits a valid Counter_Offer, THE Booking_System SHALL store the counter offer with the new amount, optional message, timestamp, and the Creator's identity in the negotiation history, and update the booking status to indicate a counter offer is pending Customer review
6. WHEN a Creator selects "Reject Booking", THE Booking_System SHALL update the booking status to "Rejected" and notify the Customer with a push notification, email, and in-app notification within 60 seconds of the rejection action
7. WHEN a Creator submits a Counter_Offer, THE Booking_System SHALL send a push notification, email, and in-app notification to the Customer within 60 seconds indicating a counter offer has been received
8. IF the notification delivery to the Customer fails for any channel (push, email, or in-app), THEN THE Booking_System SHALL retry delivery up to 3 times with 30-second intervals and log the failure for administrative review

### Requirement 3: Customer Counter Offer Review

**User Story:** As a Customer, I want to review counter offers from the Creator and respond with acceptance, a revised price, or rejection, so that I can negotiate a fair price.

#### Acceptance Criteria

1. WHEN a Customer receives a Counter_Offer, THE Booking_System SHALL present three response options: Accept, Change Price Again, and Reject
2. WHEN a Customer selects "Accept", THE Booking_System SHALL lock the Creator's last offered price as the Official_Booking_Amount and advance the booking to the confirmation fee stage
3. WHEN a Customer selects "Change Price Again", THE Booking_System SHALL require the Customer to enter a revised price amount between 1 and 99,999,999 and allow an optional message of up to 500 characters
4. WHEN a Customer submits a revised price, THE Booking_System SHALL store it in the negotiation history with the new amount, message, timestamp, and the Customer's identity, and notify the Creator via push notification, email, and in-app notification
5. WHEN a Customer selects "Reject", THE Booking_System SHALL update the booking status to "Rejected", record the rejection in the negotiation history with the Customer's identity and timestamp, and notify the Creator via push notification, email, and in-app notification
6. WHILE a negotiation is in progress, THE Negotiation_Engine SHALL accept a response only from the party whose turn it is based on alternating sequence, starting with the Creator's Counter_Offer triggering the Customer's turn
7. IF the total number of negotiation rounds (one round equals one offer from each party) reaches 10, THEN THE Booking_System SHALL notify both parties that the negotiation limit has been reached and present only Accept or Reject options on the next turn
8. THE Booking_System SHALL store the complete negotiation history for each booking, including all offers, counter offers, messages, timestamps, and the identity of the party who submitted each entry
9. IF a Customer submits a revised price that is not a positive numeric value greater than zero, THEN THE Booking_System SHALL reject the submission and display an error message indicating the price must be a positive number

### Requirement 4: Final Deal and Amount Locking

**User Story:** As a platform user, I want the agreed amount to be locked once both parties agree, so that there is clarity on the booking price.

#### Acceptance Criteria

1. WHEN both Customer and Creator agree on a price, THE Booking_System SHALL set the booking status to "Deal Finalized" and record the agreed amount as the Official_Booking_Amount
2. WHILE the booking status is "Deal Finalized" or later, THE Booking_System SHALL reject any request from the Customer to modify the Official_Booking_Amount
3. AFTER deal finalization, THE Booking_System SHALL allow only the Creator to submit a Price_Revision request, requiring: new amount, reason for revision, and reference to the additional service
4. WHEN the Creator submits a Price_Revision, THE Booking_System SHALL store the revision with: old amount, new amount, reason, and date-time in the booking audit history
5. WHEN a Price_Revision increases the Official_Booking_Amount, THE Booking_System SHALL automatically update the booking record with the new amount
6. IF a Price_Revision attempts to decrease the Official_Booking_Amount, THEN THE Booking_System SHALL reject the revision request
7. THE Booking_System SHALL track a "highest booking amount" field that stores the maximum Official_Booking_Amount reached across all accepted revisions and SHALL prevent this field from decreasing
8. THE Booking_System SHALL limit Price_Revisions to a maximum of 5 per booking

### Requirement 5: Booking Confirmation Fee Payment

**User Story:** As a Customer, I want to pay a confirmation fee to secure my booking, so that the Creator is committed to my event.

#### Acceptance Criteria

1. WHEN the deal is finalized, THE Booking_System SHALL display to the Customer: the Official_Booking_Amount and the Booking_Confirmation_Fee calculated as the admin-configured percentage (default 5%, configurable from 1% to 50%) of the Official_Booking_Amount, rounded to the nearest whole number in INR
2. THE Booking_System SHALL process the Booking_Confirmation_Fee payment exclusively through Razorpay by creating an order and verifying the payment signature upon completion
3. WHEN the Razorpay payment signature verification succeeds, THE Booking_System SHALL update the booking status to "Confirmed", store the Razorpay order ID, payment ID, and signature, and display a confirmation message to the Customer within 5 seconds of payment completion
4. IF the Razorpay payment fails or signature verification fails, THEN THE Booking_System SHALL retain the booking in "Deal Finalized" status, preserve all previously entered booking details, and display an error message indicating the payment was unsuccessful and prompting the Customer to retry
5. THE Booking_System SHALL read the Booking_Confirmation_Fee percentage from the Commission_Settings document, and the Admin_Panel SHALL allow editing this percentage at any time with the updated value applying only to new payment initiations
6. THE Booking_System SHALL calculate the Booking_Confirmation_Fee based on the current Official_Booking_Amount at the time of payment initiation, with the resulting fee being a minimum of 1 INR
7. IF the Razorpay service is unavailable when the Customer initiates payment, THEN THE Booking_System SHALL display an error message indicating the payment service is temporarily unavailable and retain the booking in "Deal Finalized" status without data loss

### Requirement 6: Booking Confirmation Notifications

**User Story:** As a platform user, I want to receive confirmation notifications when a booking is confirmed, so that I know the engagement is official.

#### Acceptance Criteria

1. WHEN a booking status changes to "Confirmed", THE Notification_Service SHALL send a push notification to both the Customer and the Creator within 30 seconds of the status change
2. WHEN a booking status changes to "Confirmed", THE Notification_Service SHALL send an email notification to both the Customer and the Creator within 60 seconds of the status change
3. WHEN a booking status changes to "Confirmed", THE Notification_Service SHALL send an in-app notification to both the Customer and the Creator within 30 seconds of the status change
4. THE Notification_Service SHALL include in the confirmation notification: the booking ID, event date, event time, event location, and the Official_Booking_Amount
5. IF the event time or event location is not set on the booking at the time of confirmation, THEN THE Notification_Service SHALL omit that field from the notification content and include only the available fields
6. IF a push notification or email notification fails to deliver, THEN THE Notification_Service SHALL log the failure and still deliver the remaining notification channels without blocking or retrying synchronously

### Requirement 7: Upcoming Booking Display

**User Story:** As a platform user, I want to see my upcoming confirmed bookings with all relevant details, so that I can prepare for the event.

#### Acceptance Criteria

1. WHILE a booking has status "Confirmed" and the event date is later than the current date, THE Booking_System SHALL display the booking in the upcoming section of both the Customer and Creator dashboards
2. THE Booking_System SHALL display for each upcoming booking: Booking ID, Booking Status, Event Countdown (days remaining), Event Date, Event Time, Event Location, Final Amount (in ₹), and Booking Summary
3. WHEN the event countdown reaches zero days remaining (event date equals today's date), THE Booking_System SHALL display a distinct visual indicator on that booking card distinguishing it from bookings with one or more days remaining
4. THE Booking_System SHALL sort upcoming bookings by event date in ascending order with the nearest event displayed first
5. IF the user has no bookings with status "Confirmed" and a future event date, THEN THE Booking_System SHALL display an empty-state message indicating that there are no upcoming bookings
6. WHEN the user navigates to the dashboard, THE Booking_System SHALL load and display the upcoming bookings list within 3 seconds

### Requirement 8: Event Completion Flow

**User Story:** As a platform user, I want a two-step completion confirmation process, so that both parties agree the service was delivered.

#### Acceptance Criteria

1. WHEN the event date has passed and no unpaid Additional_Platform_Fee exists, THE Booking_System SHALL enable a "Mark Service Completed" button on the Creator's booking detail view
2. WHEN the Creator clicks "Mark Service Completed", THE Booking_System SHALL record the Creator's completion timestamp and send a push notification, email, and in-app notification to the Customer requesting them to confirm completion
3. WHEN the Customer clicks "Confirm Service Completed", THE Booking_System SHALL update the booking status to "Completed" and record the Customer's confirmation timestamp
4. THE Booking_System SHALL require both the Creator's completion mark and the Customer's confirmation before setting a booking to "Completed" status
5. IF the Creator has not marked the service as completed, THEN THE Booking_System SHALL NOT display the "Confirm Service Completed" button to the Customer
6. IF the Customer does not confirm completion within 7 days of the Creator marking it complete, THEN THE Booking_System SHALL send a reminder notification to the Customer and escalate to Admin review after 14 days
7. IF an unpaid Additional_Platform_Fee exists for the booking, THEN THE Booking_System SHALL disable the "Mark Service Completed" button and display a message indicating the outstanding fee must be paid first

### Requirement 9: Cashback System

**User Story:** As a Customer, I want to receive cashback after a verified completed booking, so that I am rewarded for using the platform.

#### Acceptance Criteria

1. WHEN a booking reaches "Completed" status with both Customer confirmation and Admin verification, THE Booking_System SHALL credit the cashback amount to the Customer's Cashback_Wallet as "Pending Cashback" within 5 seconds of the verification event
2. WHEN the Booking_System credits cashback, THE Booking_System SHALL calculate the cashback amount as the admin-configured cashback percentage (between 0 and 100 inclusive) of the Official_Booking_Amount read from Commission_Settings, rounded down to two decimal places
3. WHEN the Admin approves a pending cashback entry, THE Cashback_Wallet SHALL move the amount from "Pending Cashback" to "Approved Cashback" and add it to the "Available Balance"
4. THE Cashback_Wallet SHALL display four sections: Pending Cashback (total amount and per-booking entries with booking ID and date), Approved Cashback (total amount), Available Balance (total withdrawable amount), and Withdrawal History (list of past withdrawals with amount, date, and status)
5. IF the Admin rejects a pending cashback entry, THEN THE Cashback_Wallet SHALL remove the entry from "Pending Cashback", not add it to "Available Balance", and display the entry in a "Rejected" state visible to the Customer with the associated booking ID
6. THE Admin_Panel SHALL allow editing the cashback percentage at any time, and the new percentage SHALL apply only to bookings that reach "Completed" status after the change, without affecting already-credited pending or approved cashback entries
7. IF the cashback percentage in Commission_Settings is set to 0%, THEN THE Booking_System SHALL NOT create a cashback entry in the Customer's Cashback_Wallet for that completed booking

### Requirement 10: Cashback Withdrawal

**User Story:** As a Customer, I want to withdraw my approved cashback balance, so that I can receive the reward money.

#### Acceptance Criteria

1. WHEN a Customer requests a withdrawal, THE Cashback_Wallet SHALL validate that the requested amount does not exceed the Available Balance and is greater than or equal to the minimum withdrawal amount configured in the Admin_Panel
2. WHILE a withdrawal request is being processed, THE Cashback_Wallet SHALL set the withdrawal status to "Pending" and prevent the requested amount from being used in another withdrawal until the current request reaches a terminal status of "Completed" or "Failed"
3. WHEN a withdrawal is processed successfully, THE Cashback_Wallet SHALL deduct the amount from Available Balance and add an entry to the Withdrawal History with amount, date, and status set to "Completed"
4. IF a Customer requests a withdrawal amount exceeding the Available Balance, THEN THE Cashback_Wallet SHALL reject the request and display an error indicating insufficient balance without modifying the Available Balance
5. IF a Customer requests a withdrawal amount below the minimum withdrawal amount configured in the Admin_Panel, THEN THE Cashback_Wallet SHALL reject the request and display an error indicating the minimum amount requirement
6. IF a Customer has already reached the maximum withdrawal frequency configured in the Admin_Panel within the current calendar month, THEN THE Cashback_Wallet SHALL reject the request and display an error indicating the frequency limit has been reached
7. IF a withdrawal fails during processing, THEN THE Cashback_Wallet SHALL set the withdrawal status to "Failed", restore the requested amount to the Available Balance, and add an entry to the Withdrawal History with status set to "Failed"
8. THE Admin_Panel SHALL allow configuring withdrawal rules including minimum amount (default: ₹100), maximum frequency per calendar month (default: 4 withdrawals), and estimated processing time (default: 72 hours) without code changes

### Requirement 11: Subscription Gate for Creators

**User Story:** As a Creator, I want to receive free initial bookings and then be prompted to subscribe, so that I can evaluate the platform before committing financially.

#### Acceptance Criteria

1. WHEN a new Creator registers, THE Subscription_Gate SHALL grant the Creator a Free_Booking_Limit of accepted bookings (default 3, admin-configurable within the range of 1 to 50) at no cost
2. WHEN a Creator has accepted bookings equal to the Free_Booking_Limit, THE Subscription_Gate SHALL block the Creator from accepting the next booking request and any pending booking requests SHALL remain visible but non-actionable until the Creator subscribes
3. WHILE a Creator is blocked by the Subscription_Gate, THE Booking_System SHALL display a lock icon, blur the booking card, show "Subscription Required" text, and display an "Upgrade Subscription" button on each pending booking card
4. WHEN a blocked Creator completes a Subscription_Plan purchase via Razorpay and the payment is confirmed, THE Subscription_Gate SHALL unblock the Creator within 5 seconds of payment confirmation and allow accepting new bookings
5. IF a blocked Creator initiates a Subscription_Plan purchase via Razorpay and the payment fails or is abandoned, THEN THE Subscription_Gate SHALL keep the Creator blocked and THE Booking_System SHALL display an error message indicating payment was unsuccessful with an option to retry
6. THE Admin_Panel SHALL allow editing the Free_Booking_Limit value within the range of 1 to 50, and the new limit SHALL apply only to Creators who have not yet reached their previous limit without retroactively unblocking already-blocked Creators
7. THE Subscription_Gate SHALL count only bookings where the Creator selected "Accept Offer" (not rejections or pending negotiations) toward the Free_Booking_Limit

### Requirement 12: Dynamic Subscription Plans

**User Story:** As an Admin, I want to manage subscription plans dynamically, so that I can adjust pricing and offerings without code changes.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow creating, editing, enabling, and disabling Subscription_Plans with fields: plan name (1-100 characters), price (positive integer in INR), duration (1-365 days), description (up to 500 characters), and benefits list (up to 10 items)
2. THE Booking_System SHALL display only enabled Subscription_Plans to Creators on the upgrade screen, sorted by price ascending
3. WHEN a Creator selects a Subscription_Plan and completes Razorpay payment, THE Booking_System SHALL activate the subscription with the plan's configured duration starting from the payment date
4. WHEN a Creator's subscription expires (current date exceeds start date plus duration), THE Subscription_Gate SHALL block the Creator from accepting new bookings until a new plan is purchased
5. THE Admin_Panel SHALL allow configuring Razorpay payment settings (API key, secret) without code changes
6. THE Booking_System SHALL display the Creator's current subscription status, plan name, expiry date, days remaining, and renewal options on the Creator dashboard
7. IF a Creator attempts to purchase a Subscription_Plan and the Razorpay payment fails, THEN THE Booking_System SHALL not activate any subscription, display an error, and allow retrying

### Requirement 13: Commission on Price Revisions

**User Story:** As the platform, I want to collect additional commission when booking amounts increase after confirmation, so that platform revenue reflects actual deal values.

#### Acceptance Criteria

1. WHEN a Creator submits a Price_Revision that increases the Official_Booking_Amount after booking confirmation, THE Booking_System SHALL recalculate the Booking_Confirmation_Fee based on the new highest amount and calculate the Additional_Platform_Fee as: (Booking_Confirmation_Fee at new highest amount) minus (total Booking_Confirmation_Fee already paid by the Customer for this booking)
2. WHEN an Additional_Platform_Fee is calculated, THE Booking_System SHALL send a push notification, email notification, and in-app notification to the Creator indicating the Additional_Platform_Fee amount due and the reason for the charge
3. THE Booking_System SHALL require the Creator to pay the Additional_Platform_Fee via Razorpay before the booking can be marked as "Completed"
4. WHILE an Additional_Platform_Fee is unpaid, THE Booking_System SHALL display to the Creator: Additional Platform Fee Due, Original Booking Amount, Updated Booking Amount, Already Paid by Customer, Additional Fee Payable by Creator, and a "Pay Now" button
5. WHEN the Creator completes the Additional_Platform_Fee payment via Razorpay, THE Booking_System SHALL record the payment transaction details (amount, Razorpay transaction ID, timestamp, and booking reference) and enable the "Mark Service Completed" button
6. IF the Additional_Platform_Fee payment via Razorpay fails, THEN THE Booking_System SHALL retain the booking in its current status, display an error message prompting the Creator to retry payment, and keep the "Mark Service Completed" button disabled
7. IF a Price_Revision decreases the booking amount, THEN THE Booking_System SHALL NOT issue a refund of the already-paid Booking_Confirmation_Fee and SHALL retain the commission based on the highest recorded amount
8. WHEN multiple successive Price_Revisions increase the Official_Booking_Amount, THE Booking_System SHALL recalculate the Additional_Platform_Fee each time based on the cumulative difference between the fee at the current highest amount and the total fees already paid (by Customer and Creator combined for this booking)

### Requirement 14: Admin Commission and Fee Management

**User Story:** As an Admin, I want to configure all commission, cashback, and fee settings from the Admin Panel, so that I can adjust business parameters without developer involvement.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow editing the following settings through the user interface without modifying source code or restarting the server: Booking Confirmation Fee percentage, Cashback percentage, Free Booking Limit (non-negative integer, maximum value of 100), and Withdrawal Rules (minimum withdrawal amount and maximum withdrawal frequency per month)
2. WHEN an Admin updates a Commission_Settings value, THE Booking_System SHALL apply the new value to all transactions created after the update, while transactions already in progress retain the values that were active at their creation time
3. THE Admin_Panel SHALL display the current persisted value of each configurable setting alongside an input control that allows the Admin to modify and save a new value
4. WHEN an Admin saves a change to any Commission_Settings value, THE Booking_System SHALL create an Audit_Log entry recording the setting name, previous value, new value, Admin identity, and timestamp of the change
5. IF an Admin submits a percentage value less than 0 or greater than 100, or a Free Booking Limit that is not a non-negative integer within 0 to 100, THEN THE Admin_Panel SHALL reject the submission and display an error message indicating which field failed validation and the acceptable range

### Requirement 15: Creator Dashboard

**User Story:** As a Creator, I want a comprehensive dashboard showing all my booking and business information, so that I can manage my work effectively.

#### Acceptance Criteria

1. WHEN the Creator navigates to the dashboard, THE Booking_System SHALL display the following summary counts: Pending Requests (bookings awaiting Creator response), Active Negotiations (bookings with ongoing counter offers), Confirmed Bookings, Upcoming Events (confirmed bookings with event date in the future, sorted by nearest date first, limited to the next 10 events), Completed Events, and Cancelled Bookings
2. WHEN the Creator navigates to the dashboard, THE Booking_System SHALL display: a Calendar view showing all scheduled events with their event dates, a CRM section listing customer name, email, and phone for each confirmed booking, total Earnings, Wallet balance, Subscription Status including plan name and expiry date, and Booking History sorted by most recent first
3. WHEN a new booking request arrives, THE Booking_System SHALL update the Creator dashboard Pending Requests count within 5 seconds without requiring a page refresh
4. THE Booking_System SHALL display the Creator's subscription status including plan name, subscription start date, expiry date, and days remaining until expiry
5. IF the Creator's subscription has 7 or fewer days remaining, THEN THE Booking_System SHALL display an expiry warning on the dashboard indicating the number of days remaining
6. WHEN the Creator applies filters to Booking History, THE Booking_System SHALL filter results by status, by date range, and by category, and SHALL display results within 3 seconds
7. IF the dashboard data fails to load due to a network or server error, THEN THE Booking_System SHALL display an error message and provide a retry option to reload the dashboard data

### Requirement 16: Customer Dashboard

**User Story:** As a Customer, I want a dashboard showing all my booking activities and cashback information, so that I can track my engagements and rewards.

#### Acceptance Criteria

1. THE Booking_System SHALL display on the Customer dashboard: Pending Requests count, Counter Offers awaiting response count, Confirmed Bookings count, Upcoming Events list (sorted by event date ascending, limited to the next 10 upcoming events), and Completed Events count
2. THE Booking_System SHALL display on the Customer dashboard: Cashback_Wallet summary (Available Balance and Pending Cashback amounts), Withdrawal History, and Booking History paginated at 20 entries per page
3. WHEN a Counter_Offer is received, THE Booking_System SHALL update the Customer dashboard Counter Offers count within 5 seconds without requiring a manual page refresh
4. THE Booking_System SHALL allow the Customer to filter Booking History by status, date range, and category, and SHALL display results matching all applied filters simultaneously
5. THE Booking_System SHALL display each booking in the history with: Booking ID, Creator name, event date, category, Official_Booking_Amount (or the last negotiated amount if negotiation is in progress), and current booking status
6. IF the dashboard data fails to load, THEN THE Booking_System SHALL display an error message indicating the data could not be retrieved and provide a retry option

### Requirement 17: Admin Dashboard and Revenue Tracking

**User Story:** As an Admin, I want a comprehensive dashboard showing platform revenue, user metrics, and operational data, so that I can monitor business performance.

#### Acceptance Criteria

1. WHEN an Admin loads the dashboard, THE Admin_Panel SHALL display the following revenue metrics: Total Revenue (sum of Booking Confirmation Fee Revenue plus Subscription Revenue plus Additional Platform Fee Revenue), Booking Confirmation Fee Revenue, Subscription Revenue, Cashback Paid, Active Subscriptions count, Pending Renewals count, Total Bookings count, and the 50 most recent Razorpay Transactions sorted by date descending
2. THE Admin_Panel SHALL display: Total Categories count, Total Subcategories count, Total Creators count, Total Customers count, Pending Cashback amount, and Pending Disputes count
3. THE Admin_Panel SHALL allow the Admin to view for each booking: Original Amount, Updated Amount, Amount Change History (listing each revision with old amount, new amount, reason, and date-time in chronological order), Customer Paid Fee, Additional Creator Fee, and Total Platform Revenue from that booking
4. THE Admin_Panel SHALL display the Audit_Log paginated at 50 entries per page, covering all booking amount changes, fee payments, and settings modifications with timestamps and Admin identity
5. WHEN an Admin loads or refreshes the dashboard, THE Admin_Panel SHALL recalculate and display all revenue figures from the current transaction records without manual data entry

### Requirement 18: Branding Management

**User Story:** As an Admin, I want to manage all branding assets from the Admin Panel, so that visual identity changes reflect across all platforms automatically.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow editing: Website Logo, App Logo, Splash Screen image, Homepage Banner, Footer Logo, Brand Colors (primary, secondary, accent), Social Media Links, Promotional Images, and Category Images
2. WHEN an Admin updates a Branding_Settings value, THE Booking_System SHALL serve the updated asset to both the Website and Mobile App on the next page load without requiring code deployment, within a maximum propagation delay of 60 seconds from the time of save
3. THE Admin_Panel SHALL support image upload for logo, banner, splash screen, promotional, and category image fields accepting only PNG, JPG, JPEG, and SVG formats with a maximum file size of 5MB per image and maximum dimensions of 2048x2048 pixels
4. THE Admin_Panel SHALL validate brand color values as valid 6-digit hex color codes (format: #RRGGBB) and reject invalid entries with an error message indicating the expected format
5. THE Booking_System SHALL serve branding assets through a public API endpoint that both Website and Mobile App consume
6. IF an image upload fails due to unsupported format, file size exceeding 5MB, or dimensions exceeding the maximum, THEN THE Admin_Panel SHALL reject the upload, display an error message indicating the specific validation failure, and preserve the previously saved asset value
7. THE Admin_Panel SHALL validate Social Media Links as well-formed URLs beginning with https:// and having a maximum length of 2048 characters, and SHALL reject invalid entries with an error message
8. IF the branding API endpoint is unavailable, THEN THE Booking_System SHALL serve the most recently cached branding assets to the Website and Mobile App

### Requirement 19: Anti-Cheating Policy Display

**User Story:** As the platform, I want to display a fair usage policy notice before booking confirmation, so that users understand the consequences of platform misuse.

#### Acceptance Criteria

1. WHEN a Customer proceeds to pay the Booking_Confirmation_Fee, THE Booking_System SHALL display the Anti_Cheating_Policy notice as a full-screen overlay before the Razorpay payment session is initiated
2. THE Anti_Cheating_Policy notice SHALL contain: cashback eligibility requires booking through the platform, creators receive platform benefits only for managed bookings, repeated misuse may result in warnings, temporary suspension, or permanent account deactivation, and Admin has authority to review booking history and disputes
3. THE Booking_System SHALL disable the payment initiation action until the Customer taps the "I Agree" button on the Anti_Cheating_Policy notice
4. WHEN the Customer taps "I Agree", THE Booking_System SHALL store the acknowledgment timestamp and the current version identifier of the Anti_Cheating_Policy text with the booking record
5. THE Admin_Panel SHALL allow editing the Anti_Cheating_Policy text (maximum 5000 characters) without code changes and SHALL assign a new version identifier each time the text is saved
6. IF the Anti_Cheating_Policy text is not configured or is empty, THEN THE Booking_System SHALL block the confirmation flow and display a message indicating that the policy is temporarily unavailable

### Requirement 20: Cross-Platform Synchronization

**User Story:** As a platform user, I want all changes made in the Admin Panel to reflect on the Website and Mobile App immediately, so that the experience is consistent everywhere.

#### Acceptance Criteria

1. THE Booking_System SHALL use a single backend API and database shared by the Website, Mobile App, and Admin_Panel
2. WHEN an Admin updates any configurable setting (commission percentages, branding, policies, subscription plans), THE Booking_System SHALL persist the change to the database and serve the updated values to both Website and Mobile App on the next API request, with no additional propagation delay
3. THE Booking_System SHALL NOT require code deployment or application restart for Admin Panel changes to take effect on consumer-facing platforms, and changes SHALL be available to consumers within 5 seconds of the Admin saving the update
4. WHEN a booking status changes, THE Booking_System SHALL reflect the update on all platforms (Website, Mobile App, Admin_Panel) that query the booking data, returning the current status on the next API request
5. THE Booking_System SHALL serve all configurable content (branding, policies, subscription plans, commission rates) through API endpoints rather than hardcoded values in frontend code
6. IF a consumer-facing platform requests configurable content and the API request fails, THEN THE Booking_System SHALL serve the last successfully retrieved values from a local cache and retry on the next user interaction
7. IF a booking status query fails due to network or server unavailability, THEN THE Booking_System SHALL display the last known booking status along with an indication that the data may be outdated

### Requirement 21: Admin Booking Audit and Commission Visibility

**User Story:** As an Admin, I want complete visibility into booking amount changes and commission calculations, so that I can audit platform revenue accurately.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display for each booking: the original negotiated amount, the current amount, and the complete amount change history with old amount, new amount, reason, and date-time for each revision; IF a booking has no Price_Revisions, THEN THE Admin_Panel SHALL display only the original negotiated amount as both the original and current amount with an empty revision history
2. THE Admin_Panel SHALL display for each booking: the Booking_Confirmation_Fee paid by the Customer, any Additional_Platform_Fee paid by the Creator, the Booking_Confirmation_Fee percentage that was applied at confirmation time, and the total platform revenue from that booking calculated as the sum of the Booking_Confirmation_Fee and all Additional_Platform_Fee payments
3. THE Admin_Panel SHALL allow the Admin to edit the Booking_Confirmation_Fee percentage within the range of 0 to 100 inclusive, and the updated percentage SHALL apply only to bookings confirmed after the update while existing confirmed bookings retain the percentage active at their confirmation time
4. WHEN the Admin_Panel displays commission amounts, additional fees, or revenue figures, THE Booking_System SHALL calculate these values in real time based on the configured percentages and recorded booking amounts without manual data entry
5. THE Admin_Panel SHALL provide an audit view of all fee transactions across all bookings, filterable by date range, booking status, Creator name, and Customer name, searchable by booking ID, and sortable by date, amount, booking ID, and status, with results paginated at a maximum of 50 entries per page
6. WHEN the Admin updates the Booking_Confirmation_Fee percentage, THE Audit_Log SHALL record the previous percentage, new percentage, Admin identity, and timestamp of the change
