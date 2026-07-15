# Implementation Plan: Category Navigation Redesign

## Overview

This plan implements the redesigned category navigation flow for BookMyShot (Website and Mobile App). The implementation follows an incremental approach: data model extensions first, then backend services and API routes, then mobile app components and screens, then website pages, and finally admin panel management. The stack uses JavaScript (Node.js/Express + Mongoose) for the backend, TypeScript (React Native/Expo) for the mobile app, and HTML/CSS/JS for the website. Property-based tests use fast-check.

## Tasks

- [ ] 1. Extend data models and add geospatial support
  - [ ] 1.1 Extend Creator model with geolocation fields
    - Add `coordinates` field (GeoJSON Point: `{ type: 'Point', coordinates: [lng, lat] }`) to `server/models/Creator.js`
    - Add `district` (String, default '') and `state` (String, default '') fields
    - Add `2dsphere` index on `coordinates` field
    - Add compound index on `{ categorySlug: 1, state: 1, district: 1, city: 1, status: 1 }`
    - Ensure existing creators without coordinates default to `[0, 0]` and are excluded from proximity queries
    - _Requirements: 5.3, 5.4, 5.7, 5.8, 5.9_

  - [ ] 1.2 Create PopularLocation model
    - Create `server/models/PopularLocation.js` with fields: name (String, required, 1-100 chars), type (enum: 'city', 'district', 'destination'), state (String), imageUrl (String), sortOrder (Number, default 0), isActive (Boolean, default true)
    - Add index on `{ type: 1, isActive: 1, sortOrder: 1 }`
    - Add unique compound index on `{ name: 1, type: 1 }`
    - Include timestamps
    - _Requirements: 6.1, 6.2, 6.3, 9.1, 9.2, 9.3, 9.4_

- [ ] 2. Implement backend services
  - [ ] 2.1 Create LocationService
    - Create `server/services/locationService.js` with methods:
      - `findNearbyCreators({ categorySlug, lat, lng, radiusKm = 25, limit = 20 })` — uses `$nearSphere` with `$maxDistance`, excludes `[0, 0]` coordinates
      - `findCreatorsByLocation({ categorySlug, city, district, state, limit })` — filters by location text fields (case-insensitive)
      - `resolveLocation(lat, lng)` — resolves coordinates to city/district/state by matching known locations
      - `getPopularLocations(type?)` — retrieves active popular locations sorted by sortOrder
      - `createPopularLocation(data)` — creates with validation (name 1-100 chars)
      - `updatePopularLocation(id, data)` — updates fields
      - `deletePopularLocation(id)` — hard deletes
      - `reorderPopularLocations(ids)` — bulk updates sortOrder based on array position
    - _Requirements: 5.3, 5.6, 5.7, 5.8, 5.9, 6.3, 6.5, 6.6, 9.1, 9.2, 9.3, 9.5, 9.6_

  - [ ] 2.2 Create SearchService
    - Create `server/services/searchService.js` with method:
      - `searchCreators({ categorySlug, subcategorySlug, search, district, city, state, ratingMin, priceMin, priceMax, availableDate, page, limit, sortBy, lat, lng })` — builds MongoDB query with `$and` logic for all active filters
    - Search: case-insensitive regex on creator name, category name, subcategory name (min 2 chars, max 100 chars)
    - Rating: `{ rating: { $gte: ratingMin } }` where ratingMin is 1-5
    - Price: overlap logic `{ budgetMax: { $gte: priceMin }, budgetMin: { $lte: priceMax } }`
    - Availability: exclude creators with confirmed booking on selected date
    - Return `{ creators, total, page }`
    - _Requirements: 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [ ] 3. Implement API routes for category navigation
  - [ ] 3.1 Create Near Me and location API routes
    - Create `server/routes/categoryPage.js` with endpoints:
      - `GET /api/categories/:slug/near-me` — requires `lat`, `lng` query params; returns nearby creators + resolved location
      - `GET /api/categories/:slug/by-location` — accepts `city`, `district`, `state` query params
      - `GET /api/locations/resolve` — resolves lat/lng to city/district/state
    - Validate: lat/lng required and within valid ranges (-90 to 90, -180 to 180)
    - Return 400 for missing/invalid params, 404 for invalid category slug
    - _Requirements: 5.3, 5.4, 5.6, 5.7, 5.8, 5.9_

  - [ ] 3.2 Create Search and Filter API route
    - Add to `server/routes/categoryPage.js`:
      - `GET /api/categories/:slug/search` — accepts search, subcategory, district, city, state, ratingMin, priceMin, priceMax, availableDate, page, limit, sortBy, lat, lng
    - Validate: search min 2 chars / max 100 chars, ratingMin 1-5, price range valid
    - Return 400 for invalid params with descriptive messages
    - _Requirements: 7.2, 7.3, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.12_

  - [ ] 3.3 Create Popular Locations public API route
    - Add to `server/routes/categoryPage.js`:
      - `GET /api/popular-locations` — returns all active popular locations grouped by type
      - `GET /api/popular-locations/:type` — returns active popular locations of specified type
    - Sort by sortOrder ascending
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 3.4 Create Admin Popular Locations CRUD routes
    - Create `server/routes/admin/popularLocations.js` with endpoints:
      - `POST /api/admin/popular-locations` — create (validate name 1-100 chars, type required)
      - `PUT /api/admin/popular-locations/:id` — update
      - `DELETE /api/admin/popular-locations/:id` — hard delete
      - `PUT /api/admin/popular-locations/reorder` — accepts ordered array of IDs
    - Protected with `protect` + `authorize("admin")` middleware
    - Return 409 for duplicate name+type
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 3.5 Register new routes in server index
    - Mount `categoryPage` routes in `server/index.js`
    - Mount `admin/popularLocations` routes under admin router
    - _Requirements: 1.1, 5.3, 6.3, 9.1_

- [ ] 4. Checkpoint - Ensure all backend models, services, and routes work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Build Mobile App - Category Grid and Card components
  - [ ] 5.1 Create CategoryCard component
    - Create `mobile/src/components/CategoryCard.tsx`
    - Premium card with: image (cover mode, no stretch), category name overlay (min 10sp font, 4.5:1 contrast ratio), rounded corners (≥12px border radius)
    - Color theme: background `#050403`, accent `#FF8C2B`
    - Press animation: scale-down 100-200ms using `react-native-reanimated`
    - Image fallback: placeholder with category icon in accent color on load failure
    - Text truncation: ellipsis after 2 lines if name exceeds card width
    - Equal height/width per row, min 100px width, min 70px height
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ] 5.2 Create CategoryGrid component
    - Create `mobile/src/components/CategoryGrid.tsx`
    - 2-column responsive FlatList grid replacing horizontal scroll
    - Exactly 2 cards per row with 8-16px spacing (horizontal and vertical)
    - Maintains layout from 320dp to 1440dp screen widths
    - Fetches categories from API sorted by `sortOrder`, shows loading indicator during fetch
    - Error state with "Couldn't load categories" message and retry button
    - Vertical scrolling for overflow content
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ] 5.3 Update HomeScreen to use CategoryGrid and fix navigation
    - Replace `FlatList horizontal` categories section with `<CategoryGrid>` component in `mobile/src/screens/HomeScreen.tsx`
    - Change navigation: `navigation.navigate('CategoryPage', { slug: item.id, name: item.label })` instead of `navigation.navigate('Discover', ...)`
    - Remove "See All →" link that navigated to Discover page for categories
    - Ensure Trending Wedding Styles cards also navigate to CategoryPage
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1_

- [ ] 6. Build Mobile App - CategoryPage screen and Near Me
  - [ ] 6.1 Create CategoryPage screen
    - Create `mobile/src/screens/CategoryPage.tsx`
    - Receives `slug` and `name` params from navigation
    - Displays: subcategories (sorted by admin sortOrder), Near Me section, Popular Locations, search bar, filter panel, creator listing
    - If category has 0 subcategories, skip subcategory section and show creators directly
    - If category has 0 creators, show empty-state message without redirecting
    - Load within 3 seconds (performance target)
    - _Requirements: 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 6.2 Create NearMeSection component
    - Create `mobile/src/components/NearMeSection.tsx`
    - Request location permission on mount (if not already determined)
    - On permission granted: get coordinates (10s timeout), call Near Me API, display up to 20 creators sorted by proximity within 50km
    - Display LocationFilterChips: [Near Me, City, District, State] in order
    - On permission denied: show ManualLocationSelector component
    - On geolocation timeout/error: show manual selector + "Automatic location unavailable" message
    - Update results within 3 seconds on filter change without full page reload
    - If no creators in area: show "no creators available" message suggesting broader filter
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14_

  - [ ] 6.3 Create LocationFilterChips component
    - Create `mobile/src/components/LocationFilterChips.tsx`
    - Render horizontal chip row: Near Me, City, District, State
    - "Near Me" selected by default when location available
    - Chip selection triggers parent callback to update creator listing
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ] 6.4 Create ManualLocationSelector component
    - Create `mobile/src/components/ManualLocationSelector.tsx`
    - State → District → City cascading dropdown selectors
    - Fetches available options from API
    - On selection, triggers creator listing update for selected location
    - _Requirements: 5.10, 5.11_

  - [ ] 6.5 Create PopularLocations component
    - Create `mobile/src/components/PopularLocations.tsx`
    - Display below Near Me section with three subsections: Popular Cities, Popular Districts, Popular Wedding Destinations
    - Fetch from `/api/popular-locations` API (no hardcoded data)
    - On tap: filter creator listing to that location within current category
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Build Mobile App - Search, Filters, and Navigation wiring
  - [ ] 7.1 Create CategorySearchBar component
    - Create `mobile/src/components/CategorySearchBar.tsx`
    - Text input with 500ms debounce before triggering search
    - Minimum 2 characters to trigger (no search for 0-1 chars)
    - Maximum 100 characters input limit (reject beyond)
    - Clear button to reset search and restore unfiltered listing
    - Case-insensitive partial match on creator name, category name, subcategory name
    - "No results" message with "Clear search" suggestion when empty
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ] 7.2 Create FilterPanel component
    - Create `mobile/src/components/FilterPanel.tsx` as a bottom sheet
    - Filter options: District, City, State, Rating (1-5), Price (0-10,000,000 INR range), Availability (date picker)
    - Multiple filters applied simultaneously with AND logic
    - Active filter count badge displayed on filter button
    - "Clear All Filters" action resets all controls and restores unfiltered listing
    - Empty results: show message + "Clear All Filters" action
    - Update results within 2 seconds on filter change
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12_

  - [ ] 7.3 Wire CategoryPage into navigation stack
    - Add `<Stack.Screen name="CategoryPage" component={CategoryPage} />` to both `CustomerNavigator.tsx` and `GuestNavigator.tsx`
    - Ensure navigation flow: Home → CategoryPage → SubcategoryPage → CreatorProfile (no Discover page)
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [ ] 8. Checkpoint - Ensure mobile app navigation and components work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Build Website - Category Grid and Category Page
  - [ ] 9.1 Create website category grid
    - Create `public/css/category-grid.css` — 2-column grid styling with premium card design (black `#050403` bg, orange `#FF8C2B` accent, ≥12px border-radius, 8-16px gap)
    - Create `public/js/category-grid.js` — fetches categories from API, renders 2-column grid on homepage
    - Replace existing horizontal category scroll on homepage with the new grid
    - Loading skeleton animation during fetch, error state with retry
    - Responsive from 320px to 1440px viewport
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.7_

  - [ ] 9.2 Create website category page
    - Create `public/category.html` — category browsing page with subcategories, Near Me, popular locations, search, filters, creator listing
    - Create `public/css/category-page.css` — category page styling
    - Create `public/js/category-page.js` — fetches data, handles search (500ms debounce, 2+ chars), filters, location chips, geolocation API
    - Navigate from homepage category cards to `/category.html?slug=xxx` instead of Discover page
    - Geolocation: use `navigator.geolocation`, fallback to manual dropdowns if denied/unavailable
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 5.1, 5.2, 5.3, 5.10, 6.1, 7.1, 7.2, 8.1_

- [ ] 10. Build Admin Panel - Popular Locations Management
  - [ ] 10.1 Create admin popular locations page
    - Create `public/admin/popular-locations.html` — CRUD interface with three tabs: Popular Cities, Popular Districts, Popular Wedding Destinations
    - Create `public/admin/js/popular-locations.js` — handles create, edit, delete, reorder (drag-and-drop or move up/down buttons)
    - Form fields: name (required, 1-100 chars), type (auto-set by tab), state (optional), image URL (optional), sort order
    - Validation: reject empty names, names > 100 chars
    - Changes reflect on next client API request
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2_

- [ ] 11. Checkpoint - Ensure website and admin panel work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Write property-based tests for backend services
  - [ ]* 12.1 Write property test for sort order invariant
    - **Property 1: Sort Order Invariant**
    - Test that for any set of active categories/subcategories with arbitrary sortOrder values, the API returns them in strictly ascending sortOrder
    - **Validates: Requirements 2.5, 4.1, 10.2**

  - [ ]* 12.2 Write property test for Near Me proximity correctness
    - **Property 2: Near Me Proximity Correctness**
    - Test that for any user coordinates and creator set, Near Me returns only creators ≤ 25km away, sorted by distance ascending, max 20 results
    - **Validates: Requirements 5.3, 5.6**

  - [ ]* 12.3 Write property test for location filter correctness
    - **Property 3: Location Filter Correctness**
    - Test that for any location filter (city/district/state), every returned creator has matching location field (case-insensitive) and no matching creator is excluded
    - **Validates: Requirements 5.7, 5.8, 5.9, 6.4, 8.2, 8.3, 8.4**

  - [ ]* 12.4 Write property test for subcategory filter correctness
    - **Property 4: Subcategory Filter Correctness**
    - Test that for any subcategory selection, all returned creators match the subcategory and none from other subcategories are included
    - **Validates: Requirements 4.2**

  - [ ]* 12.5 Write property test for search partial match correctness
    - **Property 5: Search Partial Match Correctness**
    - Test that for any 2+ char search query, every returned creator has the query as a case-insensitive substring in name, category, or subcategory, and no matching creator is excluded
    - **Validates: Requirements 7.2**

  - [ ]* 12.6 Write property test for rating filter correctness
    - **Property 6: Rating Filter Correctness**
    - Test that for any rating threshold 1-5, all returned creators have rating ≥ threshold and no qualifying creator is excluded
    - **Validates: Requirements 8.5**

  - [ ]* 12.7 Write property test for price range filter correctness
    - **Property 7: Price Range Filter Correctness**
    - Test that for any price range [min, max], all returned creators have overlapping budget (budgetMax ≥ min AND budgetMin ≤ max) and no qualifying creator is excluded
    - **Validates: Requirements 8.6**

  - [ ]* 12.8 Write property test for availability filter correctness
    - **Property 8: Availability Filter Correctness**
    - Test that for any selected date, no returned creator has a confirmed booking on that date, and every available creator is included
    - **Validates: Requirements 8.7**

  - [ ]* 12.9 Write property test for filter composition (AND logic)
    - **Property 9: Filter Composition (AND Logic)**
    - Test that for any combination of active filters, the result equals the intersection of individual filter results
    - **Validates: Requirements 8.8**

  - [ ]* 12.10 Write property test for clear filters restores original listing
    - **Property 10: Clear Filters Restores Original Listing**
    - Test that clearing all filters produces a result identical to the unfiltered category listing
    - **Validates: Requirements 7.6, 8.10**

  - [ ]* 12.11 Write property test for popular location name validation
    - **Property 11: Popular Location Name Validation**
    - Test that names with length 1-100 are accepted and names with length 0 or >100 are rejected
    - **Validates: Requirements 9.4**

  - [ ]* 12.12 Write property test for category grid completeness
    - **Property 12: Category Grid Completeness**
    - Test that for N active categories (isActive=true, showOnHomepage=true), exactly N cards are rendered with no omissions or duplicates
    - **Validates: Requirements 2.4**

- [ ] 13. Write unit and integration tests
  - [ ]* 13.1 Write unit tests for navigation flow
    - Test: CategoryCard tap calls `navigate('CategoryPage', { slug, name })`, NOT `navigate('Discover')`
    - Test: Trending Style card navigates to CategoryPage
    - Test: No Discover page appears in category navigation stack
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 13.2 Write unit tests for CategoryGrid and CategoryCard
    - Test: Grid renders 2 columns with correct dimensions
    - Test: Card displays accent `#FF8C2B`, background `#050403`
    - Test: Press animation fires scale-down 100-200ms
    - Test: Border radius ≥ 12px
    - Test: Broken image shows placeholder icon
    - Test: Text truncation with ellipsis at 2 lines
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 3.9_

  - [ ]* 13.3 Write unit tests for NearMe and Filter components
    - Test: Location permission requested on mount
    - Test: Permission denied shows ManualLocationSelector
    - Test: LocationFilterChips renders in order [Near Me, City, District, State]
    - Test: FilterPanel shows all 6 filter types
    - Test: Active filter count badge displays correct number
    - Test: SearchBar does not fire for 0-1 chars, fires after 500ms debounce, rejects >100 chars
    - _Requirements: 5.2, 5.5, 5.10, 7.3, 7.4, 7.7, 8.1, 8.9_

  - [ ]* 13.4 Write integration tests for API endpoints
    - Test: Near Me API with real 2dsphere query and test coordinates
    - Test: Search API partial match across creator name, category, subcategory
    - Test: Combined filters produce correct intersection
    - Test: Admin creates popular location → client API returns it
    - Test: Admin deletes popular location → excluded from response
    - Test: Admin reorders → client receives new order
    - Test: Location resolve returns expected district/city/state
    - _Requirements: 5.3, 7.2, 8.8, 9.1, 9.5, 9.6, 10.1, 10.2_

- [ ] 14. Final checkpoint - Ensure all tests pass and integration works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The backend uses JavaScript (Express.js + Mongoose) and the mobile app uses TypeScript (React Native/Expo)
- The website uses vanilla HTML/CSS/JS matching the existing public folder pattern
- Creator coordinates default to `[0, 0]` (null island) and are excluded from Near Me queries
- PopularLocation uses hard-delete (no soft-delete needed)
- The design extends the existing `category-driven-home-redesign` spec — existing Category/Subcategory models are NOT redefined
- Search debounce (500ms) is client-side to reduce API load
- All location filter comparisons are case-insensitive and trimmed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["3.5"] },
    { "id": 4, "tasks": ["5.1", "5.2", "9.1"] },
    { "id": 5, "tasks": ["5.3", "6.1", "9.2"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4", "6.5"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 8, "tasks": ["10.1"] },
    { "id": 9, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "12.9", "12.10", "12.11", "12.12"] },
    { "id": 10, "tasks": ["13.1", "13.2", "13.3", "13.4"] }
  ]
}
```
