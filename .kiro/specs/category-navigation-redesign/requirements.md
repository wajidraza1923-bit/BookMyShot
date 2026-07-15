# Requirements Document

## Introduction

This feature redesigns the Category Navigation flow for both the BookMyShot Website and Mobile App. The redesign addresses three core changes: (1) removing the incorrect redirect to the Discover page when a user taps a category, replacing it with a direct category browsing flow; (2) replacing the horizontal scroll category layout on the Home Screen with a 2-column responsive grid of premium category cards using a luxury black and orange theme; (3) adding location-based creator discovery ("Near Me") and advanced search/filter capabilities on category pages. The system also introduces admin-managed Popular Locations and ensures all category-related content is dynamically controlled from the Admin Panel.

This spec references the existing `category-driven-home-redesign` spec for base category data models, subcategory relationships, and admin CRUD operations. The requirements here focus exclusively on navigation flow, visual layout, location-based discovery, popular locations, and advanced search/filters.

## Glossary

- **Home_Screen**: The main landing screen of the BookMyShot mobile app and website that users see first
- **Category_Grid**: The 2-column responsive grid layout displaying category cards on the Home Screen
- **Category_Card**: A single card within the Category_Grid representing one main category, featuring a premium image, category name, rounded corners, and press animation
- **Category_Page**: The dedicated screen displayed when a user taps a Category_Card, showing subcategories, Near Me section, creators, and filters
- **Subcategory_Page**: The view displayed when a user selects a subcategory within a Category_Page, showing only creators belonging to that subcategory
- **Near_Me_Section**: A location-aware component displayed at the top of every Category_Page that shows nearby creators based on the user's geographic position
- **Location_Filter**: Quick-access filter chips (Near Me, City, District, State) allowing users to scope creator results by geographic proximity
- **Popular_Locations_Section**: An admin-managed section below Near Me displaying popular cities, districts, and wedding destinations
- **Search_Bar**: A text input component on the Category_Page enabling users to search by creator name, category, or subcategory
- **Filter_Panel**: A panel on the Category_Page providing filters by district, city, state, rating, price, and availability
- **Creator**: A service provider registered on the BookMyShot platform who offers wedding-related services
- **Category_API**: The backend REST API endpoints serving category, location, and search data to both Mobile App and Website
- **Admin_Panel**: The administrative interface used by admins to manage platform content and settings
- **Discover_Page**: The existing discovery/explore page that should no longer be part of the category navigation flow
- **Location_Permission**: The device-level permission granting access to the user's GPS coordinates
- **Geolocation_Service**: The backend service that resolves a user's coordinates into district, city, and state information

## Requirements

### Requirement 1: Remove Discover Page Redirect from Category Navigation

**User Story:** As a user, I want tapping a category to show me that category's creators directly, so that I do not get redirected to an unrelated Discover page.

#### Acceptance Criteria

1. WHEN a user taps a Category_Card in the Category_Grid on the Home_Screen, THE Home_Screen SHALL navigate to the Category_Page for that category, passing the selected category identifier, without displaying the Discover_Page at any point during the transition
2. THE Category navigation flow SHALL follow the path: Home_Screen → Category_Page → Subcategory_Page → Creator profile, with no intermediate Discover_Page step
3. WHEN a user taps any category-related navigation element on the Home_Screen (including Category_Cards in the Category_Grid and style cards in the Trending Wedding Styles section), THE Home_Screen SHALL navigate to the Category_Page for that category instead of the Discover_Page
4. WHEN a user taps a Category_Card on the Home_Screen, THE Category_Page SHALL load within 3 seconds and display the selected category's subcategories and a list of creators belonging to that category
5. IF the selected category contains zero creators, THEN THE Category_Page SHALL display an empty-state message indicating no creators are available for that category and the page SHALL remain on the Category_Page without redirecting
6. THE Mobile App and Website SHALL both navigate from Category_Card to Category_Page using the same number of navigation steps and displaying the same content sections (subcategories and creator listings), without routing through the Discover_Page

### Requirement 2: Two-Column Responsive Category Grid Layout

**User Story:** As a user, I want to see categories displayed in a clean 2-column grid instead of a horizontal scroll, so that I can see more categories at once and browse them easily.

#### Acceptance Criteria

1. THE Home_Screen SHALL display all active categories (where isActive is true and showOnHomepage is true) in a 2-column responsive grid layout, replacing the horizontal scroll slider
2. THE Category_Grid SHALL render exactly 2 category cards per row with a minimum spacing of 8dp between columns and a minimum spacing of 8dp between rows
3. THE Category_Grid SHALL maintain a 2-column layout on screen widths from 320dp to 1440dp, scaling card widths proportionally to fill available horizontal space minus spacing
4. THE Category_Grid SHALL display all active categories without truncation, allowing vertical scrolling when categories exceed the visible viewport
5. THE Category_Grid SHALL retrieve all category data dynamically from the Category_API sorted by sortOrder; no category names, images, or ordering SHALL be hardcoded in client code
6. WHEN the Category_API request is in progress, THE Category_Grid SHALL display a loading indicator in place of the grid content
7. IF the Category_API request fails or returns an error, THEN THE Category_Grid SHALL display an error message indicating that categories could not be loaded and SHALL provide a retry action to re-fetch the data
8. WHEN the Admin_Panel modifies category data (add, edit, reorder, disable), THE Category_Grid SHALL reflect the changes on the next screen visit or pull-to-refresh action without requiring an app update

### Requirement 3: Premium Category Card Design

**User Story:** As a user, I want category cards to look premium and inviting, so that the platform feels professional and luxurious.

#### Acceptance Criteria

1. THE Category_Card SHALL display an image sourced from the Category_API, scaled to cover the entire card area while maintaining the original aspect ratio (no stretching or letterboxing)
2. THE Category_Card SHALL display the category name as text overlaid on or below the image, with a minimum font size of 10sp and a contrast ratio of at least 4.5:1 against the background behind the text
3. THE Category_Card SHALL use a color theme with black (#050403 or equivalent dark tone) as the primary background color and orange (#FF8C2B or equivalent warm accent) as the accent color for text or decorative elements
4. THE Category_Card SHALL have rounded corners with a border-radius of at least 12 pixels
5. WHEN a user presses a Category_Card, THE Category_Card SHALL play a scale-down animation lasting between 100 and 200 milliseconds, providing tactile feedback before navigation occurs
6. THE Category_Card SHALL maintain equal height and equal width for all cards within the same row, with a minimum card width of 100 pixels and a minimum card height of 70 pixels, regardless of the length of the category name or image aspect ratio
7. THE Category_Grid SHALL maintain consistent spacing of between 8 and 16 pixels between adjacent cards in both horizontal and vertical directions
8. IF the category name exceeds the available card width, THEN THE Category_Card SHALL truncate the text with an ellipsis and display no more than 2 lines
9. IF the Category_API image fails to load or returns an error, THEN THE Category_Card SHALL display a placeholder containing the category icon centered within the card area, using the accent color for the icon

### Requirement 4: Category Page with Subcategories Flow

**User Story:** As a user, I want to see all subcategories when I open a main category, so that I can narrow down to the exact service type I need.

#### Acceptance Criteria

1. WHEN a user opens a Category_Page, THE Category_Page SHALL display all active subcategories belonging to that category in the sort order defined by the Admin_Panel
2. WHEN a user taps a subcategory on the Category_Page, THE Subcategory_Page SHALL display only creators whose registered subcategory matches the selected subcategory
3. THE Category_Page SHALL display each subcategory with its name and icon as configured in the Admin_Panel
4. IF a category has zero active subcategories, THEN THE Category_Page SHALL skip the subcategory section and display the creator listing directly
5. WHEN the Subcategory_Page loads, THE Subcategory_Page SHALL display the subcategory name as a page title and the total count of creators belonging to that subcategory

### Requirement 5: Near Me Location-Based Creator Discovery

**User Story:** As a user, I want to find creators near my location when I browse a category, so that I can hire local professionals without extensive searching.

#### Acceptance Criteria

1. THE Category_Page SHALL display the Near_Me_Section at the top of the page, above the creator listing and subcategory filter area
2. WHEN the Category_Page loads and Location_Permission has not yet been determined for this session, THE Near_Me_Section SHALL request Location_Permission from the user's device
3. WHEN Location_Permission is granted, THE Near_Me_Section SHALL retrieve the user's current coordinates within 10 seconds and display up to 20 creators sorted by geographic proximity within 50 km of the user's position in the selected category, with the "Near Me" Location_Filter chip selected by default
4. WHEN coordinates are retrieved, THE Geolocation_Service SHALL resolve the user's coordinates into district, city, and state values, and THE Near_Me_Section SHALL display creators matching those geographic levels
5. THE Near_Me_Section SHALL display Location_Filter chips in the following order: Near Me, City, District, State
6. WHEN a user taps the "Near Me" Location_Filter chip, THE Near_Me_Section SHALL sort and display up to 20 creators by closest geographic distance within a 50 km radius of the user's current position
7. WHEN a user taps the "City" Location_Filter chip, THE Near_Me_Section SHALL display only creators whose registered city matches the user's resolved city
8. WHEN a user taps the "District" Location_Filter chip, THE Near_Me_Section SHALL display only creators whose registered district matches the user's resolved district
9. WHEN a user taps the "State" Location_Filter chip, THE Near_Me_Section SHALL display only creators whose registered state matches the user's resolved state
10. IF Location_Permission is denied, THEN THE Near_Me_Section SHALL display a manual location selector allowing the user to choose a state, then district, then city from dropdown menus
11. WHEN the user selects a location manually, THE Near_Me_Section SHALL display creators matching the manually selected geographic area within the current category
12. WHEN the user changes a Location_Filter selection, THE Near_Me_Section SHALL update creator results within 3 seconds without requiring a full page reload
13. IF the Geolocation_Service fails to retrieve coordinates within 10 seconds or returns an error, THEN THE Near_Me_Section SHALL display the manual location selector and show a message indicating that automatic location detection is unavailable
14. IF no creators are found within the selected geographic area, THEN THE Near_Me_Section SHALL display a message indicating no creators are available in that area and suggest the user try a broader location filter

### Requirement 6: Popular Locations Display

**User Story:** As a user, I want to see popular cities and wedding destinations when browsing categories, so that I can explore creators in well-known locations even without enabling GPS.

#### Acceptance Criteria

1. THE Category_Page SHALL display the Popular_Locations_Section below the Near_Me_Section
2. THE Popular_Locations_Section SHALL display three subsections: Popular Cities, Popular Districts, and Popular Wedding Destinations
3. THE Popular_Locations_Section SHALL retrieve all location data dynamically from the Category_API; no location names SHALL be hardcoded
4. WHEN a user taps a popular location item, THE Category_Page SHALL filter the creator listing to show only creators registered in that location within the current category
5. THE Admin_Panel SHALL allow an admin to add, edit, remove, and reorder items within Popular Cities, Popular Districts, and Popular Wedding Destinations
6. WHEN the Admin_Panel modifies popular location data, THE Category_API SHALL reflect the changes on the next client request without requiring an app update

### Requirement 7: Search Functionality on Category Pages

**User Story:** As a user, I want to search within a category page by creator name, category, or subcategory, so that I can quickly find a specific creator or service type.

#### Acceptance Criteria

1. THE Category_Page SHALL display a Search_Bar at the top of the creator listing area allowing text input for searching within the current category context
2. WHEN a user enters text in the Search_Bar, THE Category_Page SHALL filter displayed creators by performing a case-insensitive partial match of the search text against creator name, category name, and subcategory name
3. THE Search_Bar SHALL begin returning filtered results after the user has typed at least 2 characters
4. THE Search_Bar SHALL update results within 500 milliseconds of the user stopping typing, using a debounce mechanism
5. IF no creators match the search text, THEN THE Category_Page SHALL display a message indicating no results were found for the entered search term and suggest clearing the search
6. WHEN the user clears the Search_Bar (by deleting all text or tapping a clear icon), THE Category_Page SHALL restore the full unfiltered creator listing for the current category or subcategory
7. THE Search_Bar SHALL accept a maximum of 100 characters and SHALL reject input beyond that length

### Requirement 8: Advanced Filters on Category Pages

**User Story:** As a user, I want to filter creators by location, rating, price, and availability, so that I can narrow results to match my budget and schedule.

#### Acceptance Criteria

1. THE Category_Page SHALL provide the Filter_Panel with the following filter options: District, City, State, Rating, Price, and Availability
2. WHEN a user selects a District filter value, THE Category_Page SHALL display only creators whose registered district matches the selected value
3. WHEN a user selects a City filter value, THE Category_Page SHALL display only creators whose registered city matches the selected value
4. WHEN a user selects a State filter value, THE Category_Page SHALL display only creators whose registered state matches the selected value
5. WHEN a user selects a Rating filter value, THE Category_Page SHALL display only creators whose average rating is greater than or equal to the selected rating threshold, where selectable thresholds are whole numbers from 1 to 5
6. WHEN a user selects a Price filter range, THE Category_Page SHALL display only creators whose listed price falls within the selected minimum and maximum price bounds, where the selectable range is between 0 and 10,000,000 INR
7. WHEN a user selects an Availability filter with a specific date, THE Category_Page SHALL display only creators who do not have a confirmed booking or unavailable status on the selected date
8. THE Filter_Panel SHALL allow multiple filters to be applied simultaneously; THE Category_Page SHALL display only creators satisfying all active filter conditions
9. THE Filter_Panel SHALL display the count of currently active filters as a numeric badge
10. WHEN a user taps a "Clear All Filters" action, THE Category_Page SHALL remove all active filters, reset all filter controls to their default unselected state, and restore the unfiltered creator listing
11. IF no creators match the currently active filter conditions, THEN THE Category_Page SHALL display an empty-state message indicating that no creators match the selected filters, and SHALL offer the "Clear All Filters" action
12. WHEN a user applies or modifies any filter, THE Category_Page SHALL update the displayed creator listing within 2 seconds

### Requirement 9: Admin Management of Popular Locations

**User Story:** As an admin, I want to manage popular cities, districts, and wedding destinations from the Admin Panel, so that users see curated location suggestions.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a management interface for creating, editing, deleting, and reordering Popular Cities
2. THE Admin_Panel SHALL provide a management interface for creating, editing, deleting, and reordering Popular Districts
3. THE Admin_Panel SHALL provide a management interface for creating, editing, deleting, and reordering Popular Wedding Destinations
4. WHEN an admin creates a popular location entry, THE Admin_Panel SHALL require a name (1 to 100 characters) and accept optional fields: image URL, state, and sort order
5. WHEN an admin changes the sort order of popular location items, THE Category_API SHALL serve the updated order on the next client request
6. WHEN an admin deletes a popular location entry, THE Category_API SHALL exclude that entry from responses on the next client request

### Requirement 10: Admin Dynamic Category Content Sync

**User Story:** As an admin, I want all category-related changes I make to automatically sync to both the Website and Mobile App, so that users always see up-to-date content.

#### Acceptance Criteria

1. WHEN the Admin_Panel modifies category images, THE Category_API SHALL serve the updated image URL to both the Mobile App and Website on the next request
2. WHEN the Admin_Panel modifies category ordering, THE Category_API SHALL serve categories in the updated sort order to both the Mobile App and Website on the next request
3. WHEN the Admin_Panel adds or removes a Featured Category, THE Category_API SHALL include or exclude the category from the featured response for both the Mobile App and Website on the next request
4. WHEN the Admin_Panel adds or removes a Trending Category, THE Category_API SHALL include or exclude the category from the trending response for both the Mobile App and Website on the next request
5. THE Category_API SHALL serve identical category data structures to both the Mobile App and Website using shared REST endpoints, ensuring consistent user experience across platforms
