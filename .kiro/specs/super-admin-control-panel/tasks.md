# Implementation Plan: Super Admin Control Panel

## Overview

This plan implements a comprehensive, database-driven admin control panel for the BookMyShot platform. The implementation follows an incremental approach: new Mongoose models first, then backend services and utilities, then API route handlers, and finally the Next.js admin frontend pages — with testing integrated throughout. All code uses JavaScript (Node.js/Express backend, Next.js/TypeScript frontend) matching the existing project stack.

## Tasks

- [x] 1. Create new data models and enhance existing models
  - [x] 1.1 Create PlatformSettings, SubscriptionSettings, and CommissionSettings models
    - Create `server/models/PlatformSettings.js` with single-document pattern (siteName, siteDescription, supportEmail, supportPhone, currency, maintenanceMode, platformStatus)
    - Create `server/models/SubscriptionSettings.js` with single-document pattern (monthlyPlanPrice, yearlyPlanPrice, trialDays, autoRenewDefault, gracePeriodDays, featuredPortfolioPrice, searchBoostPrice, homepageFeaturedPrice)
    - Create `server/models/CommissionSettings.js` with single-document pattern (bmsLeadCommissionPercent, creatorLeadCommissionPercent, latePaymentFeePercent, manualAdjustmentPercent)
    - _Requirements: 1.1, 2.1, 3.1, 12.1, 12.2, 12.3, 12.4_

  - [x] 1.2 Create SearchBoost and Announcement models
    - Create `server/models/SearchBoost.js` with fields: creator (ref), boostType enum, status enum, startDate, endDate, paymentStatus, paymentAmount, rejectionReason, approvedBy (ref), and indexes on (creator, status) and (endDate, status)
    - Create `server/models/Announcement.js` with fields: title, message, type enum, audience enum, recipientIds array, recipientCount, isPopup, sentBy (ref)
    - _Requirements: 5.1, 7.1, 7.2_

  - [x] 1.3 Enhance existing AuditLog and Creator models
    - Add fields to `server/models/AuditLog.js`: adminName, previousValues (Mixed), newValues (Mixed), targetType
    - Add fields to `server/models/Creator.js`: featuredStartDate, featuredEndDate, featuredPaymentStatus enum, verified, verifiedAt
    - _Requirements: 10.1, 10.2, 4.1, 9.5_

- [x] 2. Implement backend services
  - [x] 2.1 Create Configuration Service with caching
    - Create `server/services/configService.js` with methods: getPlatformSettings(), getSubscriptionSettings(), getCommissionSettings(), invalidateCache(collection), seedDefaults()
    - Implement 60-second TTL in-memory cache for config reads
    - Implement seedDefaults() that inserts default documents only if collections are empty (idempotent)
    - _Requirements: 12.5, 12.6, 12.7_

  - [x] 2.2 Create Audit Service
    - Create `server/services/auditService.js` with logAction() method accepting: adminId, adminName, action, target, targetId, previousValues, newValues, ip
    - Implement best-effort logging with try/catch (primary operation succeeds even if audit fails)
    - _Requirements: 10.1, 10.2, 1.6, 2.6, 3.6_

  - [ ]* 2.3 Write property test for settings round-trip persistence
    - **Property 1: Settings Round-Trip Persistence**
    - **Validates: Requirements 1.3**

  - [ ]* 2.4 Write property test for configuration seeding idempotence
    - **Property 19: Configuration Seeding Idempotence**
    - **Validates: Requirements 12.5**

- [x] 3. Implement validation middleware
  - [x] 3.1 Create validation middleware for admin endpoints
    - Create `server/middleware/validate.js` with validation functions for: platformSettings (email format, non-empty siteName, valid currency), subscriptionSettings (non-negative prices), commissionSettings (0-100 range), financeControl (required fields for manual payment, refund, adjustment)
    - Return all validation errors at once in the standard error format: `{ success: false, message: "...", errors: [...] }`
    - _Requirements: 1.5, 2.5, 3.5, 8.2, 8.4, 8.5, 8.6_

  - [ ]* 3.2 Write property tests for validation rules
    - **Property 2: Invalid Email Rejection**
    - **Property 3: Numeric Settings Range Validation**
    - **Property 11: Required Field Validation for Financial Operations**
    - **Property 12: Refund Cannot Exceed Original Payment**
    - **Validates: Requirements 1.5, 2.5, 3.5, 8.2, 8.4, 8.5, 8.6**

- [x] 4. Implement Platform Settings, Subscription Settings, and Commission Settings routes
  - [x] 4.1 Create Platform Settings API route
    - Create `server/routes/admin/platformSettings.js` with GET and PUT endpoints
    - GET returns current settings (seeded defaults if empty)
    - PUT validates input, persists to DB, invalidates cache, logs to AuditLog with previous/new values
    - _Requirements: 1.2, 1.3, 1.5, 1.6_

  - [x] 4.2 Create Subscription Settings API route
    - Create `server/routes/admin/subscriptionSettings.js` with GET and PUT endpoints
    - PUT validates non-negative prices, persists, invalidates cache, logs to AuditLog
    - _Requirements: 2.2, 2.3, 2.5, 2.6_

  - [x] 4.3 Create Commission Settings API route
    - Create `server/routes/admin/commissionSettings.js` with GET and PUT endpoints
    - PUT validates 0-100 range, persists, invalidates cache, logs to AuditLog
    - _Requirements: 3.2, 3.3, 3.5, 3.6_

  - [ ]* 4.4 Write property test for configuration changes not affecting existing records
    - **Property 4: Configuration Changes Do Not Affect Existing Records**
    - **Validates: Requirements 2.3, 3.3**

- [x] 5. Checkpoint - Ensure models, services, and settings routes work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Featured Portfolios and Search Boost routes
  - [x] 6.1 Create Featured Portfolios API route
    - Create `server/routes/admin/featuredPortfolios.js` with GET, POST (feature), DELETE (unfeature), and PATCH (payment approve/reject) endpoints
    - POST sets featured=true, records startDate and endDate on Creator document
    - DELETE sets featured=false, records endDate
    - PATCH updates featuredPaymentStatus and notifies creator on rejection
    - All actions log to AuditLog
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7_

  - [x] 6.2 Create Search Boost API route
    - Create `server/routes/admin/searchBoosts.js` with GET, PATCH approve, PATCH reject, and PATCH extend endpoints
    - Approve sets status="active", startDate=now, endDate=startDate+duration
    - Reject sets status="rejected", notifies creator with reason
    - Extend updates endDate by the extension duration
    - All actions log to AuditLog
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.8_

  - [ ]* 6.3 Write property tests for featured portfolio and search boost
    - **Property 6: Feature/Unfeature Round-Trip**
    - **Property 7: Search Boost Approval Activates for Correct Duration**
    - **Property 8: Search Boost Extension Increases End Date**
    - **Validates: Requirements 4.2, 4.3, 5.4, 5.6**

- [x] 7. Implement Revenue Center, Announcements, and Finance Control routes
  - [x] 7.1 Create Revenue Center API route
    - Create `server/routes/admin/revenueCenter.js` with GET endpoint accepting `period` query param (today, week, month, year)
    - Aggregate revenue from subscriptions, BMS lead commissions, creator lead commissions, featured portfolios, and search boosts for the selected period
    - Calculate total as sum of all streams
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Create Announcements API route
    - Create `server/routes/admin/announcements.js` with GET (list) and POST (create+send) endpoints
    - POST validates required fields (title, message, type, audience), creates Announcement document, creates Notification for each recipient
    - Emergency/maintenance announcements set popup flag on notifications
    - Logs to AuditLog
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

  - [x] 7.3 Create Finance Control API route
    - Create `server/routes/admin/financeControl.js` with endpoints for: GET history (with filters), POST manual-payment, PATCH approve/reject, POST adjust, POST refund
    - Validate required fields for each operation type
    - Refund validation: reject if amount > original payment
    - All actions notify affected creator and log to AuditLog
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 7.4 Write property tests for revenue and announcements
    - **Property 9: Revenue Time Filter Correctness**
    - **Property 10: Announcement Notification Fan-Out**
    - **Validates: Requirements 6.3, 6.4, 7.4, 7.5**

  - [ ]* 7.5 Write property test for finance control validation and filters
    - **Property 13: Payment History Filter Correctness**
    - **Validates: Requirements 8.7**

- [x] 8. Implement Creator Accounts, Audit Logs, and Dashboard routes
  - [x] 8.1 Create Creator Accounts API route
    - Create `server/routes/admin/creatorAccounts.js` with GET (list with search) and PATCH endpoints for: activate, deactivate, suspend, verify, feature, extend-subscription, reset
    - Activate sets status="approved" and notifies creator
    - Deactivate sets status="rejected" and hides from search
    - Suspend sets subscriptionStatus="suspended" and notifies with reason
    - Verify sets verified=true and verifiedAt
    - Extend-subscription updates subscription end date and notifies
    - Reset restores default profile preferences
    - All actions log to AuditLog with previous/new state
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [x] 8.2 Create Audit Logs API route
    - Create `server/routes/admin/auditLogs.js` with GET endpoint supporting filters: action, dateFrom, dateTo, admin, target
    - Return paginated results in reverse chronological order
    - Records are read-only (no PUT/PATCH/DELETE endpoints)
    - _Requirements: 10.3, 10.4, 10.5, 10.6_

  - [x] 8.3 Create Dashboard Overview API route
    - Create `server/routes/admin/dashboard.js` with GET endpoint
    - Aggregate: total creators, active creators, featured creators, subscription revenue, commission revenue, featured revenue, search boost revenue, total revenue, pending payments count, pending approvals count
    - Use live DB queries with the currency from PlatformSettings
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 8.4 Write property tests for creator state transitions and audit logs
    - **Property 5: Universal Audit Logging**
    - **Property 14: Creator State Transitions Produce Correct Outcomes**
    - **Property 15: Subscription Extension Advances End Date**
    - **Property 16: Creator Settings Reset Restores Defaults**
    - **Property 17: Audit Log Immutability**
    - **Property 18: Audit Log Ordering**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.7, 9.8, 10.1, 10.5, 10.6**

- [x] 9. Wire admin sub-routers and add maintenance middleware
  - [x] 9.1 Register all admin sub-routers in the main admin router
    - Update `server/routes/admin.js` to mount all new sub-routers under their respective base paths
    - All sub-routes protected with `protect` and `authorize("admin")` middleware
    - _Requirements: 1.2, 2.2, 3.2, 4.1, 5.3, 6.1, 7.3, 8.1, 9.1, 10.3, 11.1_

  - [x] 9.2 Add maintenance mode middleware
    - Create middleware that checks `PlatformSettings.maintenanceMode` via ConfigService (cached) on non-admin, non-auth requests
    - Return 503 with maintenance message for non-admin users when enabled
    - Admin users bypass the check
    - _Requirements: 1.4_

  - [x] 9.3 Call seedDefaults on application startup
    - Add `configService.seedDefaults()` call in `server/index.js` after DB connection
    - Ensures configuration collections have valid default documents on first run
    - _Requirements: 12.5_

- [x] 10. Checkpoint - Ensure all backend routes and services are functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Build Next.js admin frontend - Dashboard and Settings pages
  - [x] 11.1 Create admin dashboard overview page
    - Create `frontend/app/admin/page.tsx` with metrics display: stat cards for creator counts, revenue figures, pending counts
    - Fetch data from `/api/admin/dashboard-overview`
    - Clicking a metric navigates to the corresponding detail section
    - Use existing DashboardShell layout and StatCard components
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 11.2 Create platform settings page
    - Create `frontend/app/admin/platform-settings/page.tsx` with form fields for all platform settings
    - Fetch current values on load, submit updates via PUT
    - Display validation errors inline
    - _Requirements: 1.2, 1.3, 1.5_

  - [x] 11.3 Create subscription settings page
    - Create `frontend/app/admin/subscriptions/page.tsx` with editable fields for all subscription pricing
    - Validate non-negative values client-side before submit
    - _Requirements: 2.2, 2.5_

  - [x] 11.4 Create commission settings page
    - Create `frontend/app/admin/commissions/page.tsx` with editable fields for commission rates
    - Validate 0-100 range client-side before submit
    - _Requirements: 3.2, 3.5_

- [x] 12. Build Next.js admin frontend - Feature management pages
  - [x] 12.1 Create featured portfolios page
    - Create `frontend/app/admin/featured/page.tsx` with creator list showing featured status, dates, payment status
    - Actions: feature (with expiry date picker), unfeature, approve/reject payment
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 12.2 Create search boosts page
    - Create `frontend/app/admin/search-boosts/page.tsx` with boost request list showing creator, type, duration, status
    - Actions: approve, reject (with reason), extend (with duration input)
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [x] 12.3 Create revenue center page
    - Create `frontend/app/admin/revenue/page.tsx` with revenue breakdown by stream and time period filter (today/week/month/year)
    - Display total as sum of all streams
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 12.4 Create announcements page
    - Create `frontend/app/admin/announcements/page.tsx` with form: title, message, type select, audience select, optional recipient search/selector
    - List of previously sent announcements
    - _Requirements: 7.1, 7.2, 7.3, 7.6_

- [x] 13. Build Next.js admin frontend - Finance, Creators, and Audit pages
  - [x] 13.1 Create finance control page
    - Create `frontend/app/admin/finance/page.tsx` with tabs/sections for: manual payment form, payment approval queue, adjustment form, refund form, filterable payment history table
    - Client-side validation for required fields and refund amount <= original
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7_

  - [x] 13.2 Create creator accounts page
    - Create `frontend/app/admin/creators/page.tsx` with searchable creator list and action buttons: activate, deactivate, suspend (with reason), verify, feature, extend subscription, reset settings
    - Display current status, subscription status, featured status per creator
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 13.3 Create audit logs page
    - Create `frontend/app/admin/audit-logs/page.tsx` with filterable, paginated table
    - Filters: action type, date range, admin name, target type
    - Display entries in reverse chronological order
    - _Requirements: 10.3, 10.4, 10.6_

- [x] 14. Final checkpoint - Ensure all tests pass and full integration works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend uses JavaScript (Express.js + Mongoose) and the frontend uses TypeScript (Next.js + Tailwind CSS)
- All admin routes are protected with existing `protect` + `authorize("admin")` middleware
- The ConfigService provides cached reads with 60s TTL to avoid excessive DB queries
- Audit logging is best-effort to avoid blocking primary operations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.2"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3", "7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["7.4", "7.5", "8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4", "9.1", "9.2", "9.3"] },
    { "id": 9, "tasks": ["11.1", "11.2", "11.3", "11.4"] },
    { "id": 10, "tasks": ["12.1", "12.2", "12.3", "12.4"] },
    { "id": 11, "tasks": ["13.1", "13.2", "13.3"] }
  ]
}
```
