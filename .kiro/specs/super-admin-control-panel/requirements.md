# Requirements Document

## Introduction

The Super Admin Control Panel is a comprehensive administration system for the BookMyShot platform that enables complete business management without code changes or direct database modifications. All pricing, commissions, plans, featured listings, search boosts, and platform settings are database-driven and editable from the admin panel, allowing the admin to operate the entire business through a centralized interface.

## Glossary

- **Admin_Panel**: The web-based administrative interface accessible only to users with the "admin" role
- **Platform_Settings**: A database collection storing global site configuration key-value pairs
- **Subscription_Settings**: A database collection storing subscription plan pricing and configuration
- **Commission_Settings**: A database collection storing commission rate configurations
- **Featured_Portfolio**: A system that promotes selected creators to prominent positions on the platform
- **Search_Boost**: A paid service that elevates creator visibility in search results and homepage
- **Revenue_Center**: The admin module that aggregates and displays revenue across all platform income streams
- **Announcement_System**: The module that sends targeted communications to platform users
- **Finance_Control**: The admin module for manual payment management, adjustments, and refunds
- **Creator_Account**: A creator profile record in the database with associated subscription and status fields
- **Audit_Log**: A database record capturing every admin action with timestamp and context
- **Dashboard_Overview**: The admin landing page displaying aggregated platform metrics
- **Super_Admin**: A user with the "admin" role who has full access to the Admin_Panel
- **BMS_Lead**: A booking where the user discovered the creator through the BookMyShot platform
- **Creator_Lead**: A booking where the user was referred directly by the creator

## Requirements

### Requirement 1: Platform Settings Management

**User Story:** As a Super_Admin, I want to manage all platform configuration from the Admin_Panel, so that I can update site settings without modifying code or accessing the database directly.

#### Acceptance Criteria

1. THE Admin_Panel SHALL store all platform settings as key-value pairs in the Platform_Settings database collection
2. WHEN the Super_Admin navigates to the Platform Settings section, THE Admin_Panel SHALL display editable fields for site name, site description, support email, support phone, currency, maintenance mode toggle, and platform status
3. WHEN the Super_Admin saves platform settings, THE Admin_Panel SHALL validate all fields and persist the changes to the Platform_Settings collection
4. WHEN maintenance mode is enabled, THE Admin_Panel SHALL display a maintenance notice to all non-admin users visiting the platform
5. IF the Super_Admin submits an invalid email format for support email, THEN THE Admin_Panel SHALL display a validation error and reject the save
6. WHEN platform settings are updated, THE Audit_Log SHALL record the action, previous values, new values, timestamp, and the Super_Admin identity

### Requirement 2: Subscription Settings Management

**User Story:** As a Super_Admin, I want to control all subscription pricing and plan configurations from the Admin_Panel, so that I can adjust pricing strategy without code deployments.

#### Acceptance Criteria

1. THE Admin_Panel SHALL store subscription configuration in the Subscription_Settings database collection with no hardcoded pricing values in application code
2. WHEN the Super_Admin navigates to Subscription Settings, THE Admin_Panel SHALL display editable fields for Monthly Plan Price, Yearly Plan Price, Trial Days, Auto Renew Default, Grace Period Days, Featured Portfolio Price, Search Boost Price, and Homepage Featured Price
3. WHEN the Super_Admin updates subscription pricing, THE Admin_Panel SHALL apply new prices only to future subscriptions and renewals
4. WHEN the application needs subscription pricing, THE Admin_Panel SHALL read values from the Subscription_Settings collection at runtime
5. IF the Super_Admin enters a negative value for any price field, THEN THE Admin_Panel SHALL display a validation error and reject the save
6. WHEN subscription settings are updated, THE Audit_Log SHALL record the action, previous values, new values, timestamp, and the Super_Admin identity

### Requirement 3: Commission Settings Management

**User Story:** As a Super_Admin, I want to configure commission rates from the Admin_Panel, so that I can adjust revenue split without requiring developer intervention.

#### Acceptance Criteria

1. THE Admin_Panel SHALL store commission rates in the Commission_Settings database collection
2. WHEN the Super_Admin navigates to Commission Settings, THE Admin_Panel SHALL display editable fields for BMS Lead Commission percentage, Creator Lead Commission percentage, Late Payment Fee percentage, and Manual Adjustment percentage
3. WHEN commission rates are updated, THE Admin_Panel SHALL apply new rates only to bookings created after the update
4. WHEN a new booking commission is calculated, THE Admin_Panel SHALL read the current commission rate from the Commission_Settings collection
5. IF the Super_Admin enters a commission percentage below 0 or above 100, THEN THE Admin_Panel SHALL display a validation error and reject the save
6. WHEN commission settings are updated, THE Audit_Log SHALL record the action, previous values, new values, timestamp, and the Super_Admin identity

### Requirement 4: Featured Portfolio System

**User Story:** As a Super_Admin, I want to manage featured creator portfolios from the Admin_Panel, so that I can promote creators and manage featured listing payments.

#### Acceptance Criteria

1. WHEN the Super_Admin navigates to the Featured Portfolio section, THE Admin_Panel SHALL display a list of all creators with their current featured status, start date, end date, and payment status
2. WHEN the Super_Admin features a creator, THE Admin_Panel SHALL set the featured flag to true, record the start date, and require a featured expiry date
3. WHEN the Super_Admin removes a creator from featured, THE Admin_Panel SHALL set the featured flag to false and record the end date
4. WHEN a featured listing expiry date is reached, THE Admin_Panel SHALL automatically remove the creator from featured status
5. WHEN a creator submits a featured portfolio payment, THE Admin_Panel SHALL allow the Super_Admin to approve or reject the payment
6. IF a featured payment is rejected, THEN THE Admin_Panel SHALL notify the creator with the rejection reason
7. WHEN any featured portfolio action is performed, THE Audit_Log SHALL record the action, target creator, timestamp, and the Super_Admin identity

### Requirement 5: Search Boost System

**User Story:** As a Super_Admin, I want to manage search boost purchases from the Admin_Panel, so that I can control creator visibility upgrades and associated payments.

#### Acceptance Criteria

1. THE Admin_Panel SHALL support three search boost types: Top Search Position, Category Priority, and Homepage Spotlight
2. WHEN a creator purchases a search boost, THE Admin_Panel SHALL create a pending boost request for Super_Admin review
3. WHEN the Super_Admin navigates to Search Boost management, THE Admin_Panel SHALL display all boost requests with creator name, boost type, duration, payment status, and current status
4. WHEN the Super_Admin approves a search boost, THE Admin_Panel SHALL activate the boost for the specified duration and update the creator visibility accordingly
5. WHEN the Super_Admin rejects a search boost, THE Admin_Panel SHALL notify the creator with the rejection reason
6. WHEN the Super_Admin extends a search boost, THE Admin_Panel SHALL update the expiry date and record the extension
7. WHEN a search boost expiry date is reached, THE Admin_Panel SHALL automatically deactivate the boost
8. WHEN any search boost action is performed, THE Audit_Log SHALL record the action, target creator, boost type, timestamp, and the Super_Admin identity

### Requirement 6: Revenue Control Center

**User Story:** As a Super_Admin, I want to view categorized revenue data with time-based filters, so that I can monitor platform financial performance across all income streams.

#### Acceptance Criteria

1. WHEN the Super_Admin navigates to the Revenue Control Center, THE Admin_Panel SHALL display separate revenue sections for Subscription Revenue, BMS Lead Commission Revenue, Creator Lead Commission Revenue, Featured Portfolio Revenue, Search Boost Revenue, and Total Platform Revenue
2. THE Admin_Panel SHALL provide time filter options: Today, This Week, This Month, and This Year for all revenue sections
3. WHEN the Super_Admin selects a time filter, THE Admin_Panel SHALL recalculate and display revenue figures for the selected period
4. THE Admin_Panel SHALL calculate Total Platform Revenue as the sum of all individual revenue streams for the selected time period
5. WHEN new payments are recorded in any revenue category, THE Admin_Panel SHALL reflect the updated totals without requiring a page refresh within 30 seconds

### Requirement 7: Global Announcement Center

**User Story:** As a Super_Admin, I want to send targeted announcements to platform users, so that I can communicate important information, offers, and alerts effectively.

#### Acceptance Criteria

1. THE Admin_Panel SHALL support five announcement types: General Announcement, Maintenance Notice, Offer, Subscription Reminder, and Emergency Alert
2. THE Admin_Panel SHALL support four audience targets: All Creators, All Users, Selected Creators, and Selected Users
3. WHEN the Super_Admin creates an announcement, THE Admin_Panel SHALL require a title, message body, announcement type, and target audience
4. WHEN an announcement is sent, THE Admin_Panel SHALL deliver it as a notification to each targeted recipient
5. WHEN an announcement is marked as Emergency Alert or Maintenance Notice, THE Admin_Panel SHALL trigger a popup display for targeted recipients on their next page load
6. WHEN the Super_Admin selects individual creators or users, THE Admin_Panel SHALL provide a searchable selection interface
7. WHEN any announcement is sent, THE Audit_Log SHALL record the action, announcement type, target audience count, timestamp, and the Super_Admin identity

### Requirement 8: Finance Control

**User Story:** As a Super_Admin, I want to manage payments manually from the Admin_Panel, so that I can handle exceptions, adjustments, and refunds without database access.

#### Acceptance Criteria

1. WHEN the Super_Admin navigates to Finance Control, THE Admin_Panel SHALL display options to Add Manual Payment, Approve Payment, Reject Payment, Adjust Revenue, Adjust Commission, Refund Payment, and View Payment History
2. WHEN the Super_Admin adds a manual payment, THE Admin_Panel SHALL require the target creator, amount, payment type, and a reason note
3. WHEN the Super_Admin approves or rejects a payment, THE Admin_Panel SHALL update the payment status and notify the affected creator
4. WHEN the Super_Admin adjusts revenue or commission, THE Admin_Panel SHALL require the target booking or creator, adjustment amount, and a justification note
5. WHEN the Super_Admin processes a refund, THE Admin_Panel SHALL require the original payment reference, refund amount, and reason
6. IF a refund amount exceeds the original payment amount, THEN THE Admin_Panel SHALL display a validation error and reject the refund
7. THE Admin_Panel SHALL display a searchable and filterable payment history with date range, creator, payment type, and status filters
8. WHEN any finance action is performed, THE Audit_Log SHALL record the action, amounts, target records, timestamp, and the Super_Admin identity

### Requirement 9: Creator Account Control

**User Story:** As a Super_Admin, I want to manage creator accounts from the Admin_Panel, so that I can control creator lifecycle and resolve account issues without code changes.

#### Acceptance Criteria

1. WHEN the Super_Admin navigates to Creator Account Control, THE Admin_Panel SHALL display a searchable list of all creators with their current status, subscription status, and featured status
2. WHEN the Super_Admin activates a creator account, THE Admin_Panel SHALL set the creator status to "approved" and notify the creator
3. WHEN the Super_Admin deactivates a creator account, THE Admin_Panel SHALL set the creator status to "rejected" and hide the creator from public search results
4. WHEN the Super_Admin suspends a creator account, THE Admin_Panel SHALL set the subscription status to "suspended" and notify the creator with the suspension reason
5. WHEN the Super_Admin verifies a creator, THE Admin_Panel SHALL mark the creator as verified and display a verification badge on the creator profile
6. WHEN the Super_Admin features a creator, THE Admin_Panel SHALL set the featured flag to true and set a featured expiry date
7. WHEN the Super_Admin extends a creator subscription, THE Admin_Panel SHALL update the subscription end date and notify the creator
8. WHEN the Super_Admin resets creator settings, THE Admin_Panel SHALL restore default values for the creator profile preferences
9. WHEN any creator account action is performed, THE Audit_Log SHALL record the action, target creator, previous state, new state, timestamp, and the Super_Admin identity

### Requirement 10: Audit Logging

**User Story:** As a Super_Admin, I want every admin action recorded with full context, so that I can review the history of all administrative changes for accountability and troubleshooting.

#### Acceptance Criteria

1. WHEN any admin action is performed in the Admin_Panel, THE Audit_Log SHALL store the action type, timestamp, Super_Admin name, Super_Admin ID, target record type, and target record ID
2. THE Audit_Log SHALL store previous and new values for all data modification actions
3. WHEN the Super_Admin navigates to the Audit Log section, THE Admin_Panel SHALL display a searchable and filterable list of all audit entries
4. THE Admin_Panel SHALL provide filters for audit logs by action type, date range, Super_Admin name, and target record type
5. THE Audit_Log SHALL retain records indefinitely and the records SHALL be immutable once created
6. THE Admin_Panel SHALL display audit entries in reverse chronological order with pagination

### Requirement 11: Dashboard Overview

**User Story:** As a Super_Admin, I want a dashboard overview showing key platform metrics, so that I can quickly assess platform health and performance at a glance.

#### Acceptance Criteria

1. WHEN the Super_Admin navigates to the Dashboard, THE Admin_Panel SHALL display the following metrics: Total Creators, Active Creators, Featured Creators, Subscription Revenue, Commission Revenue, Featured Revenue, Search Boost Revenue, Total Revenue, Pending Payments count, and Pending Approvals count
2. THE Admin_Panel SHALL calculate all dashboard metrics from live database queries
3. WHEN any metric source data changes, THE Admin_Panel SHALL reflect updated values on the next dashboard load
4. THE Admin_Panel SHALL display revenue metrics in the currency configured in Platform_Settings
5. WHEN the Super_Admin clicks on a dashboard metric, THE Admin_Panel SHALL navigate to the corresponding detailed section

### Requirement 12: Database-Driven Configuration Architecture

**User Story:** As a Super_Admin, I want all business configuration stored in the database, so that I can run the business entirely from the Admin_Panel without developer assistance.

#### Acceptance Criteria

1. THE Admin_Panel SHALL store all pricing values in database collections with no hardcoded prices in application source code
2. THE Admin_Panel SHALL store all commission percentages in database collections with no hardcoded rates in application source code
3. THE Admin_Panel SHALL store all subscription plan configurations in database collections with no hardcoded plan details in application source code
4. THE Admin_Panel SHALL store all featured listing and search boost pricing in database collections with no hardcoded amounts in application source code
5. WHEN the application starts, THE Admin_Panel SHALL seed default values into configuration collections if no values exist
6. WHEN any configuration value is requested by the application, THE Admin_Panel SHALL read the value from the database at runtime
7. IF the database configuration collection is empty or unavailable, THEN THE Admin_Panel SHALL use fallback default values and log a warning to the server console
