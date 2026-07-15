# Requirements Document

## Introduction

This feature redesigns the BookMyShot Home Screen to be category-driven rather than showing global creator listings. The home screen will display dynamically-managed categories from the Admin Panel, and each category will have its own dedicated page with subcategories, filtered creators, and curated sections (Top Rated, Trending, Featured, Newly Joined). The existing "Best Reviewed" section is removed from the home screen and replaced with per-category curation. The Admin Panel gains full management capabilities for categories, subcategories, and category-level creator curation. All changes sync across the Mobile App and Website using a shared backend.

## Glossary

- **Home_Screen**: The main landing screen of the BookMyShot mobile app and website that users see first
- **Category**: A top-level service grouping (e.g., Photography & Videography, Makeup Artists) managed dynamically via the Admin Panel
- **Subcategory**: A child grouping under a Category representing a specialized service (e.g., Wedding Photography under Photography & Videography)
- **Category_Page**: A dedicated screen opened when a user taps a Category, showing banner, description, subcategories, and curated creator lists
- **Admin_Panel**: The administrative interface used by admins to manage platform content and settings
- **Creator**: A service provider registered on the BookMyShot platform who offers wedding-related services
- **Category_API**: The backend REST API endpoints serving category and subcategory data to both Mobile App and Website
- **Category_Model**: The MongoDB/Mongoose data model storing category and subcategory information
- **Home_Screen_Layout**: The ordered arrangement of sections displayed on the Home Screen

## Requirements

### Requirement 1: Dynamic Category Display on Home Screen

**User Story:** As a user, I want to see all main wedding service categories on the Home Screen, so that I can quickly browse services by category.

#### Acceptance Criteria

1. WHEN the Home_Screen loads, THE Home_Screen SHALL display all active Categories retrieved from the Category_API in a horizontal scrollable slider
2. THE Home_Screen SHALL display each Category with its name, icon, and image as configured in the Admin_Panel
3. WHEN the Admin_Panel adds, edits, or disables a Category, THE Home_Screen SHALL reflect the change on the next data fetch without requiring an app update
4. THE Home_Screen SHALL display Categories in the ascending sort order defined by the Admin_Panel
5. THE Home_Screen SHALL NOT contain any hardcoded category data; all category names, icons, images, and ordering SHALL be sourced exclusively from the Category_API
6. IF the Category_API returns an error or times out after 5 seconds, THEN THE Home_Screen SHALL display a placeholder indicating categories could not be loaded and provide a retry action
7. WHEN the user performs a pull-to-refresh gesture on the Home_Screen, THE Home_Screen SHALL re-fetch category data from the Category_API and update the displayed categories

### Requirement 2: Home Screen Layout Reordering

**User Story:** As a user, I want the Home Screen to follow a structured layout focused on categories, so that I can find services efficiently.

#### Acceptance Criteria

1. THE Home_Screen_Layout SHALL display sections in the following top-to-bottom order, with no other content sections between them: (1) Hero Banner, (2) Statistics, (3) Premium Wedding Moments, (4) Wedding Services showing all main categories, (5) Featured Categories (if applicable), (6) Booking CTA, (7) Why Choose BookMyShot
2. THE Home_Screen SHALL NOT display a global creator listing section that shows all creators regardless of category
3. THE Home_Screen SHALL NOT display a "Best Reviewed" section
4. WHERE the Featured Categories section has at least 1 admin-designated featured category available, THE Home_Screen SHALL display the Featured Categories section between Wedding Services and Booking CTA; IF no featured categories are designated, THEN THE Home_Screen SHALL omit the Featured Categories section and display Booking CTA immediately after Wedding Services
5. IF any section's data fails to load within 5 seconds, THEN THE Home_Screen SHALL display the remaining sections in their specified order and show a non-blocking indication in place of the failed section

### Requirement 3: Category Page with Subcategories and Metadata

**User Story:** As a user, I want to see a dedicated page for each category with relevant details, so that I can explore subcategories and find the right service provider.

#### Acceptance Criteria

1. WHEN a user taps a Category on the Home_Screen, THE Category_Page SHALL open within 3 seconds displaying the Category banner image, description, all active Subcategories, total creator count, and total review count
2. THE Category_Page SHALL display all active Subcategories belonging to that Category in the sort order defined by the Admin_Panel, showing each Subcategory's name and icon
3. IF a Category has zero active Subcategories, THEN THE Category_Page SHALL hide the Subcategories section and display only the banner image, description, creator count, and review count
4. THE Category_Page SHALL display the total number of approved Creators belonging to that Category as an integer value, displaying "0" when no approved Creators exist
5. THE Category_Page SHALL display the total number of reviews for Creators belonging to that Category as an integer value, displaying "0" when no reviews exist
6. IF the Category_API fails to return data for the Category_Page, THEN THE Category_Page SHALL display an error message indicating the data could not be loaded and provide a retry option

### Requirement 4: Subcategory Filtering of Creators

**User Story:** As a user, I want to click a subcategory and see only creators belonging to that subcategory, so that I can find specialists for my specific need.

#### Acceptance Criteria

1. WHEN a user taps a Subcategory on the Category_Page, THE Category_Page SHALL display only Creators whose registered subcategory matches the selected Subcategory
2. WHEN a Subcategory is selected, THE Category_Page SHALL update the displayed creator count to reflect only Creators in that Subcategory
3. THE Category_Page SHALL display a visible "All" or "Clear Filter" chip at the beginning of the Subcategory list; WHEN a user taps it, THE Category_Page SHALL remove the Subcategory filter and show all Creators in the parent Category
4. WHEN a Subcategory is selected, THE Category_Page SHALL visually highlight the selected Subcategory chip with the primary accent color to indicate active selection
5. THE Category_Page SHALL allow only one Subcategory to be selected at a time; WHEN a user taps a different Subcategory, THE Category_Page SHALL replace the active filter rather than adding multiple filters
6. IF no Creators exist for a selected Subcategory, THEN THE Category_Page SHALL display an empty state message indicating no creators are available for this subcategory

### Requirement 5: Per-Category Curated Creator Sections

**User Story:** As a user, I want to see Top Rated, Trending, Featured, and Newly Joined creators within each category, so that I can discover quality service providers relevant to my chosen category.

#### Acceptance Criteria

1. THE Category_Page SHALL display a "Top Rated" section showing up to 10 Creators with the highest average rating (minimum 3 reviews) belonging to the selected Category or Subcategory
2. THE Category_Page SHALL display a "Trending" section showing up to 10 Creators with the most completed bookings within the last 30 days belonging to the selected Category or Subcategory
3. THE Category_Page SHALL display a "Featured" section showing Creators marked as featured by the Admin_Panel belonging to the selected Category or Subcategory, in admin-defined order
4. THE Category_Page SHALL display a "Newly Joined" section showing up to 10 Creators whose registration date is within the last 90 days belonging to the selected Category or Subcategory, ordered by most recent first
5. WHEN a Subcategory filter is active, THE Category_Page SHALL restrict all curated sections to Creators belonging to that Subcategory
6. IF fewer than 3 Creators qualify for any curated section, THEN THE Category_Page SHALL display only the qualifying Creators without padding the list with unrelated Creators

### Requirement 6: Subcategory Data Model Extension

**User Story:** As a developer, I want the Category model to support subcategories with full metadata, so that the system can store and serve hierarchical category data.

#### Acceptance Criteria

1. THE Category_Model SHALL support a single-level parent-child relationship where a Subcategory references its parent Category by the parent Category's unique identifier, and a Subcategory SHALL NOT reference another Subcategory as its parent
2. THE Category_Model SHALL store for each Subcategory the following fields: name (required, 1–100 characters), slug (required, 1–120 characters, lowercase alphanumeric and hyphens only), icon (optional), image URL (optional), banner image URL (optional), description (optional, maximum 500 characters), sort order (integer, default 0), and active status (boolean, default true)
3. THE Category_Model SHALL store for each Category the following fields: name (required, 1–100 characters), slug (required, 1–120 characters, lowercase alphanumeric and hyphens only), icon (optional), image URL (optional), banner image URL (optional), description (optional, maximum 500 characters), sort order (integer, default 0), active status (boolean, default true), and featured status (boolean, default false)
4. THE Category_Model SHALL enforce unique slugs across all Categories and Subcategories combined within a single namespace
5. IF a create or update operation would result in a duplicate slug, THEN THE Category_Model SHALL reject the operation and return an error indicating the slug is already in use

### Requirement 7: Admin Category Management

**User Story:** As an admin, I want to fully manage categories from the Admin Panel, so that I can control what users see without developer intervention.

#### Acceptance Criteria

1. WHEN an admin submits the create Category form with a name (1–100 characters), icon, image URL, and description (0–500 characters), THE Admin_Panel SHALL create the Category, auto-generate a URL slug from the name, and display it in the category list
2. IF an admin attempts to create a Category with a name that produces a slug matching an existing Category's slug, THEN THE Admin_Panel SHALL reject the creation and display an error message indicating the category name already exists
3. WHEN an admin submits changes to an existing Category's name, icon, image URL, description, or active status, THE Admin_Panel SHALL update only the modified fields and display the updated Category
4. WHEN an admin changes a Category's sort order value, THE Admin_Panel SHALL persist the new numeric sort order and display all Categories ordered by ascending sort order value
5. WHEN an admin sets a Category's active status to disabled, THE Admin_Panel SHALL hide that Category from all user-facing views while keeping it accessible in the admin category list
6. IF an admin attempts to delete a Category that has one or more associated Creators, THEN THE Admin_Panel SHALL display a warning indicating the number of associated Creators and require explicit confirmation before proceeding with deletion
7. IF an admin attempts to delete a Category that does not exist, THEN THE Admin_Panel SHALL display an error message indicating the Category was not found
8. WHEN an admin confirms deletion of a Category, THE Admin_Panel SHALL remove the Category and no longer display it in either admin or user-facing category lists

### Requirement 8: Admin Subcategory Management

**User Story:** As an admin, I want to manage subcategories under each category, so that I can organize services into granular specializations.

#### Acceptance Criteria

1. WHEN an admin creates a new Subcategory, THE Admin_Panel SHALL require a parent Category selection, a name (1 to 100 characters), and a slug, and SHALL accept optional fields: icon, image, banner image, description (up to 500 characters), and active status
2. IF an admin attempts to create a Subcategory with a name or slug that already exists under the same parent Category, THEN THE Admin_Panel SHALL reject the creation and display an error message indicating the duplicate conflict
3. THE Admin_Panel SHALL allow an admin to edit a Subcategory's name, icon, image, banner image, description, and active status
4. WHEN an admin reorders Subcategories within a parent Category, THE Admin_Panel SHALL persist the new sort order and reflect it in all consumer-facing displays on the next request
5. THE Admin_Panel SHALL allow an admin to enable or disable a Subcategory independently of its parent Category's active status
6. IF an admin disables a parent Category, THEN THE Admin_Panel SHALL continue to preserve each Subcategory's individual active status so that re-enabling the parent Category restores the previous Subcategory states
7. IF an admin attempts to delete a Subcategory that has associated Creators, THEN THE Admin_Panel SHALL display a warning indicating the number of affected Creators and require confirmation before deletion
8. WHEN an admin confirms deletion of a Subcategory with associated Creators, THE Admin_Panel SHALL reassign those Creators to the parent Category only and remove the Subcategory reference from their profiles

### Requirement 9: Admin Featured Categories Management

**User Story:** As an admin, I want to mark certain categories as featured, so that they appear in the optional Featured Categories section on the Home Screen.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow an admin to mark a Category as featured or unfeatured, up to a maximum of 10 featured Categories at any time
2. WHEN at least one active Category is marked as featured, THE Home_Screen SHALL display the Featured Categories section showing those Categories in the sort order defined by the Admin_Panel
3. WHEN no active Categories are marked as featured, THE Home_Screen SHALL hide the Featured Categories section entirely
4. IF a Category that is marked as featured is disabled, THEN THE Home_Screen SHALL exclude that Category from the Featured Categories section until it is re-enabled
5. IF an admin attempts to mark a Category as featured and the maximum of 10 featured Categories has been reached, THEN THE Admin_Panel SHALL prevent the action and display an error message indicating the featured limit has been reached

### Requirement 10: Admin Per-Category Creator Curation

**User Story:** As an admin, I want to manage which creators appear in Trending, Top Rated, Featured, and Newly Joined sections per category, so that I can highlight quality providers.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow an admin to mark a Creator as featured within a specific Category and assign a position from 1 to 10 within that Category's Featured section
2. THE Admin_Panel SHALL allow an admin to add, remove, and reorder Creators in the Featured list for a given Category
3. THE Category_API SHALL return the top 10 highest-rated Creators per Category, ranked by average rating among Creators with at least 3 reviews, recomputed every 24 hours
4. THE Category_API SHALL return up to 10 Trending Creators per Category, ranked by total completed booking count within the last 30 days, recomputed every 24 hours
5. THE Category_API SHALL return up to 10 Newly Joined Creators per Category, including only Creators whose registration date is within the last 90 days, ordered by most recent first
6. IF a Creator's category assignment changes, THEN THE Category_API SHALL exclude that Creator from computed sections of the previous Category within the next recomputation cycle
7. IF fewer than 3 Creators in a Category qualify for a computed section, THEN THE Category_API SHALL return only the qualifying Creators without padding the list

### Requirement 11: Shared Backend API for Website and Mobile App

**User Story:** As a developer, I want a single backend API serving both the website and mobile app, so that category data stays consistent across platforms.

#### Acceptance Criteria

1. THE Category_API SHALL serve category and featured creator data through a single set of REST endpoints consumed by both the Mobile App and Website, where each category response includes the category name, slug, icon, image URL, description, group, sort order, active status, and creator count
2. WHEN an admin creates, updates, or deletes a category via the Admin_Panel, THE Category_API SHALL reflect that change in the response for both the Mobile App and Website on the next request made after the admin operation completes
3. THE Category_API SHALL return category data including creator counts per category in a single response, with a maximum response time of 2 seconds for up to 100 categories
4. IF the Category_API fails to retrieve category data from the data store, THEN THE Category_API SHALL return an error response indicating the failure, without exposing internal system details
5. WHEN the Mobile App or Website requests categories with the homepage filter parameter set to true, THE Category_API SHALL return only categories marked for homepage display, sorted by their configured sort order

### Requirement 12: Creator Subcategory Association

**User Story:** As a creator, I want to register under a specific subcategory, so that users searching that subcategory can find me.

#### Acceptance Criteria

1. WHEN a Creator registers or updates their profile, THE Creator registration form SHALL display a Category dropdown followed by a Subcategory dropdown that is filtered to show only Subcategories belonging to the selected Category
2. THE Creator registration form SHALL require a Category selection and allow an optional Subcategory selection; IF no Subcategory is selected, THEN THE Creator SHALL be associated with the parent Category only
3. THE Creator profile SHALL store the selected Subcategory reference as a foreign key to the Subcategory document, in addition to the Category reference
4. IF a Creator changes their selected Category, THEN THE Creator registration form SHALL clear the previously selected Subcategory and require a new selection from the updated Subcategory list
5. IF a Subcategory is disabled or deleted, THEN THE Category_API SHALL continue to display affected Creators under the parent Category without requiring manual reassignment by the Creator
