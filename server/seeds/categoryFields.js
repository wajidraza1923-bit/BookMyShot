/**
 * Seed service-specific registration fields for each category.
 * Run: node server/seeds/categoryFields.js
 * These fields appear during vendor registration after selecting a service.
 */
const mongoose = require("mongoose");
require("dotenv").config();
const Category = require("../models/Category");

const CATEGORY_FIELDS = {
  "photography-videography": [
    { key: "studioName", label: "Studio Name", type: "text", required: true, placeholder: "e.g. Memories Studio" },
    { key: "experience", label: "Years of Experience", type: "number", required: true, unit: "years" },
    { key: "teamSize", label: "Team Size", type: "number", placeholder: "How many people in your team" },
    { key: "equipment", label: "Equipment", type: "tags", placeholder: "Canon, Nikon, DJI, etc." },
    { key: "styles", label: "Photography Styles", type: "multiselect", options: ["Candid", "Traditional", "Cinematic", "Documentary", "Fine Art", "Drone", "Pre-Wedding"] },
    { key: "startingPrice", label: "Starting Price", type: "price", required: true, unit: "₹" },
    { key: "travelAvailable", label: "Travel Available", type: "boolean" },
    { key: "deliveryTime", label: "Editing Delivery Time", type: "select", options: ["1 Week", "2 Weeks", "3 Weeks", "1 Month", "2 Months"] },
  ],
  "makeup-artists": [
    { key: "specialization", label: "Specialization", type: "multiselect", options: ["Bridal Makeup", "Party Makeup", "Engagement", "Hair Styling", "HD Makeup", "Airbrush"] },
    { key: "experience", label: "Years of Experience", type: "number", required: true, unit: "years" },
    { key: "brands", label: "Brands Used", type: "tags", placeholder: "MAC, Huda Beauty, Lakme, etc." },
    { key: "startingPrice", label: "Starting Price", type: "price", required: true, unit: "₹" },
    { key: "homeService", label: "Home Service Available", type: "boolean" },
    { key: "trialAvailable", label: "Trial Session Available", type: "boolean" },
  ],
  "decoration-floral": [
    { key: "businessName", label: "Business Name", type: "text", required: true },
    { key: "services", label: "Services Offered", type: "multiselect", options: ["Mandap", "Stage", "Floral", "Lighting", "Car Decoration", "LED Walls", "Balloon"] },
    { key: "experience", label: "Years of Experience", type: "number", unit: "years" },
    { key: "teamSize", label: "Team Size", type: "number" },
    { key: "startingPrice", label: "Starting Price", type: "price", required: true, unit: "₹" },
    { key: "setupTime", label: "Setup Time Required", type: "select", options: ["Same Day", "1 Day Before", "2 Days Before"] },
  ],
  "catering-services": [
    { key: "businessName", label: "Business/Kitchen Name", type: "text", required: true },
    { key: "cuisineTypes", label: "Cuisine Types", type: "multiselect", options: ["North Indian", "South Indian", "Chinese", "Continental", "Mughlai", "Kashmiri", "Rajasthani", "Gujarati", "Street Food"] },
    { key: "vegNonveg", label: "Food Type", type: "select", required: true, options: ["Veg Only", "Non-Veg Only", "Both"] },
    { key: "minGuests", label: "Minimum Guests", type: "number", required: true, unit: "guests" },
    { key: "maxGuests", label: "Maximum Guests", type: "number", unit: "guests" },
    { key: "pricePerPlate", label: "Starting Price Per Plate", type: "price", required: true, unit: "₹" },
    { key: "liveCounter", label: "Live Food Counter Available", type: "boolean" },
  ],
  "djs-entertainment": [
    { key: "djName", label: "DJ/Artist Name", type: "text", required: true },
    { key: "genres", label: "Music Genres", type: "multiselect", options: ["Bollywood", "Punjabi", "EDM", "Hip Hop", "Sufi", "Classical", "Retro", "International"] },
    { key: "soundSystem", label: "Sound System Details", type: "textarea", placeholder: "Describe your sound setup" },
    { key: "lightingSetup", label: "Lighting Setup", type: "boolean" },
    { key: "startingPrice", label: "Starting Price", type: "price", required: true, unit: "₹" },
    { key: "travelAvailable", label: "Travel Available", type: "boolean" },
  ],
  "venues": [
    { key: "venueName", label: "Venue Name", type: "text", required: true },
    { key: "venueType", label: "Venue Type", type: "select", options: ["Banquet Hall", "Hotel", "Resort", "Farm House", "Open Lawn", "Heritage Property", "Beach", "Rooftop"] },
    { key: "capacity", label: "Guest Capacity", type: "number", required: true, unit: "guests" },
    { key: "acAvailable", label: "AC Available", type: "boolean" },
    { key: "parkingCapacity", label: "Parking Capacity", type: "number", unit: "vehicles" },
    { key: "startingPrice", label: "Starting Price", type: "price", required: true, unit: "₹" },
    { key: "cateringIncluded", label: "In-house Catering", type: "boolean" },
    { key: "roomsAvailable", label: "Rooms Available", type: "number" },
  ],
  "wedding-planners": [
    { key: "companyName", label: "Company Name", type: "text", required: true },
    { key: "services", label: "Services", type: "multiselect", options: ["Full Planning", "Day-of Coordination", "Destination Wedding", "Budget Planning", "Vendor Management"] },
    { key: "experience", label: "Years of Experience", type: "number", unit: "years" },
    { key: "weddingsManaged", label: "Weddings Managed", type: "number" },
    { key: "startingPrice", label: "Starting Package", type: "price", required: true, unit: "₹" },
    { key: "travelAvailable", label: "Travel for Destination", type: "boolean" },
  ],
  "mehndi-artist": [
    { key: "artistName", label: "Artist Name", type: "text", required: true },
    { key: "styles", label: "Mehndi Styles", type: "multiselect", options: ["Bridal", "Arabic", "Rajasthani", "Moroccan", "Indo-Arabic", "Minimal", "Finger Mehndi"] },
    { key: "experience", label: "Years of Experience", type: "number", unit: "years" },
    { key: "startingPrice", label: "Starting Price", type: "price", required: true, unit: "₹" },
    { key: "homeService", label: "Home Service Available", type: "boolean" },
    { key: "bridalPackage", label: "Bridal Package Price", type: "price", unit: "₹" },
  ],
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const [slug, fields] of Object.entries(CATEGORY_FIELDS)) {
      const result = await Category.updateOne(
        { slug },
        { $set: { fields } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated fields for: ${slug} (${fields.length} fields)`);
      } else {
        console.log(`⚠️ Category not found or unchanged: ${slug}`);
      }
    }

    console.log("\n✅ Category fields seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

seed();
