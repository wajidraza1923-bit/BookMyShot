# Requirements Document

## Introduction

A complete redesign of the BookMyShot booking flow, replacing the existing customer-initiated linear booking system with a creator-initiated booking model. The new flow introduces customer confirmation with a 5% confirmation fee via Razorpay, a cashback wallet for customers, and an anti-cheating policy to ensure all bookings go through the platform. The system serves wedding service providers (photographers, videographers, makeup artists, etc.) and their customers across the BookMyShot mobile app and website.

## Glossary

- **Booking_System**: The core system responsible for creating, managing, and transitioning bookings through their lifecycle
- **Creator**: A service provider registered on BookMyShot who delivers wedding services (also referred to as "provider")
- **Customer**: A user who books wedding services through the platform
- **Confirmation_Fee**: A non-refundable fee equal to a configurable percentage (default 5%) of the booking amount, paid by the Customer via Razorpay upon confirming a booking
- **Cashback_Wallet**: An in-app wallet credited to the Customer after successful event completion and admin verification
- **Razorpay_Gateway**: The payment processing service used to collect the Confirmation Fee
- **Notification_Service**: The system responsible for delivering push notifications, in-app notifications, and email alerts
- **Admin_Panel**: The administrative interface for managing platform operations including fees, cashback, disputes, and verifications
- **Anti_Cheating_Policy**: Platform rules that penalize Creators who circumvent the booking system to avoid confirmation fees
- **Booking_Status**: The lifecycle state of a booking: Waiting_for_Confirmation → Confirmed → Upcoming → Service_Completed → Customer_Confirmed → Admin_Verified → Cashback_Approved
- **Admin**: A platform operator with elevated privileges to verify events, approve cashback, and manage disputes

## Requirements

### Requirement 1: Creator Profile Browsing

**User Story:** As a Customer, I want to browse creator profiles with their portfolio, pricing, and reviews, so that I can evaluate and choose a service provider.

#### Acceptance Criteria

1. THE Booking_System SHALL display the Creator's profile with portfolio, packages, pricing, and reviews to the Customer
2. THE Booking_System SHALL display the Creator's phone number and WhatsApp contact on the profile page without masking or hiding
3. WHEN the Customer taps the phone number, THE Booking_System SHALL initiate a phone call using the device dialer
4. WHEN the Customer taps the WhatsApp button, THE Booking_System SHALL open a WhatsApp conversation with the Creator's registered number

### Requirement 2: Creator-Initiated Booking Creation

**User Story:** As a Creator, I want to create a booking on behalf of a customer after our offline discussion, so that the agreed service details are formally recorded on the platform.

#### Acceptance Criteria

1. THE Booking_System SHALL allow only the Creator to initiate a new booking
2. WHEN the Creator creates a booking, THE Booking_System SHALL require: Customer Name, Customer Mobile Number, Event Date, Event Time, Event Location, Category, Subcategory, and Final Amount
3. WHEN the Creator creates a booking, THE Booking_System SHALL accept optional fields: Advance Amount and Notes
4. WHEN the Creator submits a valid booking, THE Booking_System SHALL set the Booking_Status to "Waiting_for_Confirmation"
5. WHEN a booking is created, THE Notification_Service SHALL send a push notification and an in-app notification to the Customer
6. IF the Customer mobile number does not match any registered user, THEN THE Booking_System SHALL send an SMS invitation link to the Customer
7. THE Booking_System SHALL validate that Event Date is a future date
8. THE Booking_System SHALL validate that Final Amount is a positive number greater than zero

### Requirement 3: Customer Booking Review

**User Story:** As a Customer, I want to review booking details created by the provider, so that I can verify the agreed terms before confirming.

#### Acceptance Criteria

1. WHEN a booking is in "Waiting_for_Confirmation" status, THE Booking_System SHALL display all booking details to the Customer including Creator name, event date, time, location, category, subcategory, final amount, advance amount, and notes
2. WHILE a booking is in "Waiting_for_Confirmation" status, THE Booking_System SHALL present Confirm and Reject actions to the Customer
3. WHEN the Customer selects Reject, THE Booking_System SHALL set the Booking_Status to "Rejected" and notify the Creator via push notification and in-app notification
4. WHEN the Customer selects Reject, THE Booking_System SHALL allow the Customer to provide an optional rejection reason

### Requirement 4: Confirmation Fee Payment

**User Story:** As a Customer, I want to pay a confirmation fee to secure my booking, so that the service provider is committed to my event.

#### Acceptance Criteria

1. WHEN the Customer selects Confirm, THE Booking_System SHALL calculate the Confirmation_Fee as the configured percentage of the Final Amount
2. WHEN the Customer selects Confirm, THE Booking_System SHALL display the Confirmation_Fee amount and initiate a Razorpay_Gateway payment session
3. WHEN Razorpay_Gateway confirms successful payment, THE Booking_System SHALL transition the Booking_Status from "Waiting_for_Confirmation" to "Confirmed"
4. IF Razorpay_Gateway reports payment failure, THEN THE Booking_System SHALL retain the Booking_Status as "Waiting_for_Confirmation" and display a payment failure message to the Customer
5. THE Booking_System SHALL record the Razorpay payment ID, order ID, and payment amount against the booking
6. THE Booking_System SHALL display a non-refundable fee disclaimer to the Customer before payment initiation
7. IF the payment session is abandoned by the Customer, THEN THE Booking_System SHALL retain the Booking_Status as "Waiting_for_Confirmation"

### Requirement 5: Booking Confirmation Notifications

**User Story:** As a Customer or Creator, I want to receive confirmation notifications when a booking is secured, so that both parties are informed of the commitment.

#### Acceptance Criteria

1. WHEN a booking transitions to "Confirmed" status, THE Notification_Service SHALL send a push notification to both the Creator and the Customer
2. WHEN a booking transitions to "Confirmed" status, THE Notification_Service SHALL send an email notification to both the Creator and the Customer
3. WHEN a booking transitions to "Confirmed" status, THE Notification_Service SHALL create an in-app notification for both the Creator and the Customer
4. THE Notification_Service SHALL include the event date, time, location, and booking reference in all confirmation notifications

### Requirement 6: Upcoming Booking View

**User Story:** As a Customer or Creator, I want to see my upcoming booking details with a countdown, so that I can prepare for the event.

#### Acceptance Criteria

1. WHILE a booking is in "Confirmed" or "Upcoming" status, THE Booking_System SHALL display a countdown timer showing days remaining until the event date
2. WHILE a booking is in "Confirmed" or "Upcoming" status, THE Booking_System SHALL display the full booking details including event date, time, location, category, and amount
3. WHILE a booking is in "Confirmed" or "Upcoming" status, THE Booking_System SHALL display contact information for both parties (phone number, WhatsApp)
4. WHEN the event date arrives, THE Booking_System SHALL transition the Booking_Status from "Confirmed" to "Upcoming"

### Requirement 7: Service Completion

**User Story:** As a Creator, I want to mark my service as completed, so that the booking can proceed to customer verification and cashback processing.

#### Acceptance Criteria

1. WHILE a booking is in "Upcoming" status and the event date has passed, THE Booking_System SHALL allow the Creator to mark the service as "Service_Completed"
2. WHEN the Creator marks the service as completed, THE Booking_System SHALL transition the Booking_Status to "Service_Completed"
3. WHEN the Booking_Status transitions to "Service_Completed", THE Notification_Service SHALL notify the Customer to confirm event completion
4. THE Booking_System SHALL prevent the Creator from marking service completed before the event date

### Requirement 8: Customer Event Confirmation

**User Story:** As a Customer, I want to confirm that the event was completed satisfactorily, so that the cashback process can begin.

#### Acceptance Criteria

1. WHILE a booking is in "Service_Completed" status, THE Booking_System SHALL present a "Confirm Event Completed" action to the Customer
2. WHEN the Customer confirms event completion, THE Booking_System SHALL transition the Booking_Status to "Customer_Confirmed"
3. WHEN the Booking_Status transitions to "Customer_Confirmed", THE Notification_Service SHALL notify the Admin for verification
4. IF the Customer does not confirm within 7 days of Creator marking service complete, THEN THE Booking_System SHALL auto-confirm and transition to "Customer_Confirmed"

### Requirement 9: Admin Verification and Cashback Approval

**User Story:** As an Admin, I want to verify completed events and approve cashback, so that only legitimate completions receive rewards.

#### Acceptance Criteria

1. WHILE a booking is in "Customer_Confirmed" status, THE Admin_Panel SHALL display the booking for admin verification
2. WHEN the Admin verifies the booking, THE Booking_System SHALL transition the Booking_Status to "Admin_Verified"
3. WHEN the Admin approves cashback, THE Booking_System SHALL transition the Booking_Status to "Cashback_Approved"
4. WHEN the Booking_Status transitions to "Cashback_Approved", THE Booking_System SHALL credit the cashback amount to the Customer's Cashback_Wallet
5. THE Booking_System SHALL calculate the cashback amount as the admin-configured cashback percentage of the Final Amount
6. IF the Admin rejects verification, THEN THE Booking_System SHALL mark the booking as "Verification_Failed" and notify both the Creator and the Customer

### Requirement 10: Cashback Wallet

**User Story:** As a Customer, I want a wallet to hold my cashback earnings, so that I can track and use my rewards.

#### Acceptance Criteria

1. THE Booking_System SHALL maintain a Cashback_Wallet balance for each registered Customer
2. THE Booking_System SHALL display the current wallet balance and transaction history to the Customer
3. WHEN cashback is credited, THE Booking_System SHALL create a wallet transaction record with the booking reference, amount, and timestamp
4. THE Booking_System SHALL prevent the wallet balance from going below zero
5. WHEN cashback is credited, THE Notification_Service SHALL notify the Customer of the credited amount

### Requirement 11: Anti-Cheating Policy

**User Story:** As the platform, I want to enforce anti-cheating measures, so that Creators do not bypass platform bookings to avoid fees.

#### Acceptance Criteria

1. WHEN the Customer is about to confirm a booking, THE Booking_System SHALL display the Anti_Cheating_Policy warning
2. THE Anti_Cheating_Policy warning SHALL state the consequences of conducting transactions outside the platform
3. WHEN an Admin identifies a Creator violating the Anti_Cheating_Policy, THE Admin_Panel SHALL allow the Admin to issue a warning to the Creator
4. WHEN an Admin identifies repeated Anti_Cheating_Policy violations, THE Admin_Panel SHALL allow the Admin to suspend or penalize the Creator account
5. THE Admin_Panel SHALL maintain a record of all Anti_Cheating_Policy violations and actions taken

### Requirement 12: Admin Fee and Cashback Configuration

**User Story:** As an Admin, I want to configure confirmation fee and cashback percentages, so that I can adjust platform economics without code changes.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow the Admin to configure the Confirmation_Fee percentage
2. THE Admin_Panel SHALL allow the Admin to configure the cashback percentage
3. WHEN the Admin updates the Confirmation_Fee percentage, THE Booking_System SHALL apply the new percentage to all subsequent bookings
4. WHEN the Admin updates the cashback percentage, THE Booking_System SHALL apply the new percentage to all subsequent cashback calculations
5. THE Admin_Panel SHALL display current fee and cashback configurations with their effective dates
6. THE Booking_System SHALL apply configuration changes only to new bookings and not retroactively alter existing bookings

### Requirement 13: Booking Expiry

**User Story:** As the platform, I want bookings to expire if not confirmed within a reasonable time, so that stale bookings do not clutter the system.

#### Acceptance Criteria

1. IF a booking remains in "Waiting_for_Confirmation" status for more than 48 hours, THEN THE Booking_System SHALL transition the Booking_Status to "Expired"
2. WHEN a booking expires, THE Notification_Service SHALL notify both the Creator and the Customer
3. WHEN a booking has expired, THE Booking_System SHALL allow the Creator to create a new booking for the same Customer

### Requirement 14: Admin Booking Management

**User Story:** As an Admin, I want to view and manage all bookings on the platform, so that I can handle disputes and monitor platform activity.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display all bookings with filtering by status, date range, Creator, and Customer
2. THE Admin_Panel SHALL display booking analytics including total bookings, confirmation rate, revenue from fees, and total cashback distributed
3. THE Admin_Panel SHALL allow the Admin to view wallet transaction history for any Customer
4. THE Admin_Panel SHALL allow the Admin to manage disputes by overriding booking status with an audit reason

### Requirement 15: Cross-Platform Consistency

**User Story:** As a Customer or Creator, I want the booking flow to work identically on both the mobile app and website, so that I have a consistent experience regardless of platform.

#### Acceptance Criteria

1. THE Booking_System SHALL support the complete booking lifecycle on both the React Native mobile application and the website
2. THE Booking_System SHALL synchronize booking state in real-time across all platforms for the same user
3. THE Booking_System SHALL maintain consistent UI presentation of booking status, actions, and notifications across mobile and web
