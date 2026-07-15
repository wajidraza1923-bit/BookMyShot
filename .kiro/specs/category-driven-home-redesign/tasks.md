# Implementation Plan: Category-Driven Home Redesign

## Overview

This implementation transforms the BookMyShot Home Screen from a global creator listing to a category-driven experience. Work is structured as: data models → backend services → API routes → admin panel → mobile app → website. A cron-based ranking system caches curated creator sections per category. All changes share a single backend API consumed by both mobile and web clients.

## Tasks

- [ ] 1. Data Models and Schema Extensions
  - [ ] 1.1 Create the Subcategory model
    - Create `server/models/Subcategory.js` with fields: name, slug, parentCategory (ObjectId ref), icon, imageUrl, bannerImageUrl, description, sortOrder, isActive
    - Add indexes: unique slug, compound (parentCategory + sortOrder), compound unique (parentCategory + name)
    - Add validation: name 1–100 chars, slug 1–120 chars matching `^[a-z0-9]+(-[a-z0-9]+)*$`, description max 500 chars
    - _Requirements: 6.1, 6.2_

  - [ ] 1.2 Extend the Category model
    - Add fields to `server/models/Category.js`: bannerImageUrl, isFeatured (boolean, default false), showOnHomepage (boolean, default true)
    - Add indexes: compound (isActive + sortOrder), compound (isFeatured + isActive), unique slug
    - Ensure validation matches: name 1–100 chars, slug 1–120 chars, description max 500 chars
    - _Requirements: 6.3, 9.1_

  - [ ] 1.3 Extend the Creator model with subcategory and featured fields
    - Add fields to the existing Creator schema: subcategory (ObjectId ref to Subcategory, default null), subcategorySlug (String), featuredInCategory (ObjectId ref to Category, default null), featuredCategoryPosition (Number, min 1, max 10, default 0)
    - Add index on subcategory field for filtering queries
    - _Requirements: 12.3, 10.1_

  - [ ] 1.4 Create the CategoryRanking model
    - Create `server/models/CategoryRanking.js` with fields: category (ObjectId ref, required), type (enum: top_rated, trending, newly_joined), creators (array of ObjectId refs, max 10), computedAt (Date)
    - Add compound unique index on (category + type)
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ]* 1.5 Write property tests for data model validation
    - **Property 3: Schema Validation for Categories and Subcategories**
    - **Property 2: Slug Uniqueness Enforcement**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
    - Use fast-check to generate random valid/invalid inputs and verify schema accepts/rejects correctly

- [ ] 2. Category Service Implementation
  - [ ] 2.1 Implement Category CRUD in CategoryService
    - Create `server/services/categoryService.js`
    - Implement createCategory: validate input, auto-generate slug from name, check slug uniqueness across Category + Subcategory collections, save
    - Implement updateCategory: partial update of name, icon, imageUrl, bannerImageUrl, description, sortOrder, isActive, showOnHomepage
    - Implement deleteCategory: check for associated creators, return warning with count if unconfirmed, delete if confirmed
    - Implement getAllCategories (admin, includes inactive) and getActiveCategories (public, with optional homepage filter)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 11.5_

  - [ ] 2.2 Implement Subcategory CRUD in CategoryService
    - Implement createSubcategory: validate input, require parentCategory, check slug uniqueness, check name uniqueness within parent
    - Implement updateSubcategory: partial update of name, icon, imageUrl, bannerImageUrl, description, sortOrder, isActive
    - Implement deleteSubcategory: check for associated creators, warn with count, on confirmed deletion reassign creators to parent category only (clear subcategory reference)
    - Implement getSubcategoriesByCategory: return active subcategories sorted by sortOrder
    - Implement reorderSubcategories: batch update sortOrder for subcategories within a parent
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ] 2.3 Implement Featured Categories management
    - Implement setFeatured: toggle isFeatured on a category, enforce max 10 featured categories limit
    - Implement getFeaturedCategories: return categories where isFeatured=true AND isActive=true, sorted by sortOrder
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 2.4 Implement slug generation utility
    - Create generateSlug function: lowercase, replace spaces/special chars with hyphens, remove consecutive hyphens, trim leading/trailing hyphens
    - Create isSlugUnique function: check both Category and Subcategory collections for existing slug
    - _Requirements: 7.1, 6.4, 6.5_

  - [ ]* 2.5 Write property tests for Category Service
    - **Property 10: Slug Auto-Generation Format**
    - **Property 14: Featured Category Maximum Limit**
    - **Property 11: Deletion Warning Count Accuracy**
    - **Property 12: Subcategory Deletion Reassignment**
    - **Property 13: Parent Disable/Re-Enable Preserves Subcategory States**
    - **Validates: Requirements 7.1, 9.1, 9.5, 7.6, 8.7, 8.8, 8.6**

- [ ] 3. Creator Ranking Service Implementation
  - [ ] 3.1 Implement Creator Ranking Service
    - Create `server/services/creatorRankingService.js`
    - Implement getTopRated: query creators in category (or subcategory) with ≥3 reviews, sort by average rating desc, limit 10
    - Implement getTrending: query creators with most completed bookings in last 30 days, sort desc, limit 10
    - Implement getNewlyJoined: query creators registered within last 90 days, sort by registration date desc, limit 10
    - Implement getFeaturedCreators: query creators with featuredInCategory matching category, sorted by featuredCategoryPosition
    - If fewer than 3 creators qualify for a section, return only qualifying creators without padding
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.3, 10.4, 10.5, 10.7_

  - [ ] 3.2 Implement ranking recomputation and caching
    - Implement recomputeAllRankings: iterate all active categories, compute top_rated, trending, newly_joined, upsert into CategoryRanking collection
    - Implement recomputeCategoryRankings: recompute for a single category
    - Set up cron job (node-cron or similar) to run recomputeAllRankings every 24 hours
    - Cache serves stale data if recomputation fails
    - _Requirements: 10.3, 10.4, 10.5, 10.6_

  - [ ]* 3.3 Write property tests for Creator Ranking Service
    - **Property 5: Top Rated Computation Correctness**
    - **Property 6: Trending Computation Correctness**
    - **Property 7: Newly Joined Computation Correctness**
    - **Validates: Requirements 5.1, 5.2, 5.4, 10.3, 10.4, 10.5**

- [ ] 4. Checkpoint - Backend services verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Public Category API Routes
  - [ ] 5.1 Implement public category endpoints
    - Create `server/routes/api/categories.js`
    - GET `/api/categories` – list active categories, support `?homepage=true` filter, include creator count per category, sort by sortOrder, respond within 2 seconds
    - GET `/api/categories/:slug` – return category detail with banner, description, subcategory list, total creator count, total review count
    - GET `/api/categories/:slug/subcategories` – list active subcategories sorted by sortOrder
    - Register routes in `server/index.js`
    - _Requirements: 1.1, 1.4, 3.1, 3.2, 11.1, 11.2, 11.3, 11.5_

  - [ ] 5.2 Implement category creators and curated section endpoints
    - GET `/api/categories/:slug/creators` – list creators with optional `?subcategory=slug` filter, include pagination
    - GET `/api/categories/:slug/top-rated` – return cached top rated creators
    - GET `/api/categories/:slug/trending` – return cached trending creators
    - GET `/api/categories/:slug/newly-joined` – return cached newly joined creators
    - GET `/api/categories/:slug/featured-creators` – return admin-curated featured creators
    - All endpoints filter by subcategory when query param provided
    - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 5.3 Implement error handling and response formatting
    - Return appropriate HTTP status codes (404, 400, 409, 500, 504) per the error handling strategy
    - Ensure error responses never expose internal details (no stack traces, no file paths, no DB connection strings)
    - Implement 5-second timeout handling returning 504
    - _Requirements: 1.6, 3.6, 11.4_

  - [ ]* 5.4 Write property tests for API responses
    - **Property 1: Sort Order Invariant**
    - **Property 4: Subcategory Filtering Correctness**
    - **Property 9: Active/Inactive Filtering**
    - **Property 16: Homepage Filter Correctness**
    - **Property 17: Error Response Hides Internals**
    - **Validates: Requirements 1.4, 4.1, 4.2, 7.5, 11.4, 11.5**

- [ ] 6. Admin Category API Routes
  - [ ] 6.1 Implement admin category CRUD endpoints
    - Create `server/routes/admin/categories.js`
    - GET `/api/admin/categories` – all categories including inactive
    - POST `/api/admin/categories` – create category with validation
    - PUT `/api/admin/categories/:id` – update category fields
    - DELETE `/api/admin/categories/:id` – delete with confirmation flow (warn if creators exist)
    - POST `/api/admin/categories/:id/featured` – toggle featured status with max-10 check
    - Register routes in server
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 9.1, 9.5_

  - [ ] 6.2 Implement admin subcategory CRUD endpoints
    - GET `/api/admin/subcategories` – all subcategories
    - POST `/api/admin/subcategories` – create with parent category validation and duplicate checks
    - PUT `/api/admin/subcategories/:id` – update subcategory fields
    - DELETE `/api/admin/subcategories/:id` – delete with confirmation, reassign creators on confirm
    - PUT `/api/admin/subcategories/reorder` – batch reorder subcategories within a parent
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8_

  - [ ] 6.3 Implement admin featured creator management endpoint
    - PUT `/api/admin/categories/:id/featured-creators` – manage featured creators list for a category (add, remove, reorder, positions 1–10)
    - _Requirements: 10.1, 10.2_

  - [ ]* 6.4 Write integration tests for admin API routes
    - Test CRUD operations end-to-end for categories and subcategories
    - Test featured limit enforcement
    - Test deletion confirmation flow with creator reassignment
    - _Requirements: 7.1, 7.6, 8.7, 8.8, 9.5_

- [ ] 7. Checkpoint - API layer verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Admin Panel UI
  - [ ] 8.1 Implement admin category management page
    - Create `public/admin/categories.html` with category list, create/edit forms, and delete confirmation modals
    - Create `public/admin/js/categories.js` with API client logic for CRUD operations
    - Display all categories (including inactive) in sortable list with name, slug, icon, status, featured badge
    - Implement inline sort order editing and drag-to-reorder
    - Implement toggle for isActive and isFeatured with max-10 validation
    - Show warning modal with associated creator count before delete
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 9.1, 9.5_

  - [ ] 8.2 Implement admin subcategory management
    - Add subcategory section to `public/admin/categories.html` (or separate tab)
    - Implement create/edit subcategory forms with parent category dropdown
    - Show duplicate name/slug validation errors inline
    - Implement reorder functionality for subcategories within a parent
    - Implement enable/disable independent of parent category status
    - Show delete confirmation with affected creator count
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ] 8.3 Implement admin featured creator curation per category
    - Add featured creators management section: select category, add/remove creators, drag-to-reorder (positions 1–10)
    - Display current featured creators for selected category with position numbers
    - _Requirements: 10.1, 10.2_

- [ ] 9. Mobile App - Home Screen Redesign
  - [ ] 9.1 Implement CategorySlider component
    - Create `mobile/src/components/CategorySlider.tsx`
    - Render horizontal scrollable list of category cards with name, icon, and image
    - Fetch categories from `/api/categories?homepage=true`
    - Handle loading, error (with retry button), and empty states
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [ ] 9.2 Implement FeaturedCategories component
    - Create `mobile/src/components/FeaturedCategories.tsx`
    - Fetch featured categories from API and render section only when ≥1 featured category exists
    - Hide section entirely when no featured categories are available
    - _Requirements: 2.4, 9.2, 9.3_

  - [ ] 9.3 Redesign HomeScreen layout
    - Update `mobile/src/screens/HomeScreen.tsx`
    - Implement section order: Hero Banner → Statistics → Premium Wedding Moments → Wedding Services (CategorySlider) → Featured Categories (conditional) → Booking CTA → Why Choose BookMyShot
    - Remove global creator listing section
    - Remove "Best Reviewed" section
    - Implement pull-to-refresh to re-fetch category data
    - Handle per-section error states without blocking other sections (5-second timeout per section)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 1.7_

  - [ ]* 9.4 Write property test for Featured Section Visibility
    - **Property 8: Featured Section Visibility**
    - **Validates: Requirements 2.4, 9.2, 9.3, 9.4**

- [ ] 10. Mobile App - Category Page
  - [ ] 10.1 Implement SubcategoryChips component
    - Create `mobile/src/components/SubcategoryChips.tsx`
    - Render "All" chip followed by subcategory chips sorted by sortOrder
    - Support single-selection with visual highlight (primary accent color)
    - "All" chip clears active filter
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ] 10.2 Implement CuratedSection component
    - Create `mobile/src/components/CuratedSection.tsx`
    - Reusable horizontal scrollable creator card list with section title
    - Accept section type (Top Rated, Trending, Featured, Newly Joined) and data
    - Show only qualifying creators without padding when fewer than 3 qualify
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [ ] 10.3 Implement CategoryScreen
    - Create `mobile/src/screens/CategoryScreen.tsx`
    - Display banner image, description, SubcategoryChips, creator count, review count
    - Integrate CuratedSection components for all four curated sections
    - When subcategory selected: filter creators and curated sections, update count
    - Hide subcategory section when category has zero active subcategories
    - Handle empty state for subcategories with no creators
    - Handle API error with retry option
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.6, 5.5_

  - [ ]* 10.4 Write property test for Subcategory Selection
    - **Property 15: Single Subcategory Selection**
    - **Validates: Requirements 4.5**

- [ ] 11. Checkpoint - Mobile app verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Website - Home Page and Category Page
  - [ ] 12.1 Redesign website homepage
    - Update `public/index.html` to match new layout order: Hero Banner → Statistics → Premium Wedding Moments → Wedding Services → Featured Categories (conditional) → Booking CTA → Why Choose BookMyShot
    - Remove global creator listing and "Best Reviewed" section
    - Render categories dynamically from API (no hardcoded category data)
    - Create `public/js/categories.js` for API fetching and rendering logic
    - Implement error placeholder with retry for category section failures
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 12.2 Implement website category page
    - Create `public/category.html` with category detail layout
    - Display banner, description, subcategory chips, creator count, review count
    - Implement subcategory filtering with single-selection behavior and "All" chip
    - Render curated sections (Top Rated, Trending, Featured, Newly Joined)
    - Handle error states and empty states
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 13. Creator Profile - Subcategory Association
  - [ ] 13.1 Update creator registration/profile forms
    - Update creator registration form (mobile + web) to display Category dropdown followed by dependent Subcategory dropdown
    - Filter subcategory dropdown to show only subcategories belonging to selected category
    - Make category required, subcategory optional
    - Clear subcategory selection when category changes
    - Store subcategory reference on creator profile
    - When subcategory is disabled/deleted, continue displaying creator under parent category
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 14. Final Checkpoint - Full integration verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The design uses JavaScript (Node.js/Express/Mongoose) for backend and TypeScript (React Native/Expo) for mobile
- All category data must be dynamic from the API — no hardcoded categories in client code
- The ranking cron job runs every 24 hours; cached data is served if recomputation fails

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.4"] },
    { "id": 2, "tasks": ["1.5", "2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.5", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4", "6.1", "6.2", "6.3"] },
    { "id": 7, "tasks": ["6.4", "8.1"] },
    { "id": 8, "tasks": ["8.2", "8.3", "9.1", "9.2"] },
    { "id": 9, "tasks": ["9.3", "9.4", "10.1", "10.2"] },
    { "id": 10, "tasks": ["10.3", "10.4"] },
    { "id": 11, "tasks": ["12.1", "12.2", "13.1"] }
  ]
}
```
