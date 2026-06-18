/**
 * seedContent.js — Populate all CMS collections with real initial data
 * 
 * This seeds: Categories, Districts, TrendingSearches, InspirationGallery, 
 * FeaturedMoments, and Testimonials into MongoDB.
 * 
 * After running this, the Admin Content Management panel will show all
 * existing content. Changes made there will reflect on website + app immediately.
 * 
 * Usage: node server/seedContent.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const Category = require("./models/Category");
const District = require("./models/District");
const TrendingSearch = require("./models/TrendingSearch");
const InspirationGallery = require("./models/InspirationGallery");
const FeaturedMoment = require("./models/FeaturedMoment");
const Testimonial = require("./models/Testimonial");

const CATEGORIES = [
  { name: "Wedding Photography", slug: "wedding-photography", icon: "camera", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400", sortOrder: 1 },
  { name: "Cinematography", slug: "cinematography", icon: "film", imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400", sortOrder: 2 },
  { name: "Wedding Films", slug: "wedding-films", icon: "videocam", imageUrl: "https://images.unsplash.com/photo-1505932794465-147d1f1b2c97?w=400", sortOrder: 3 },
  { name: "Drone Coverage", slug: "drone-coverage", icon: "airplane", imageUrl: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400", sortOrder: 4 },
  { name: "Pre Wedding", slug: "pre-wedding", icon: "heart-circle", imageUrl: "https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=400", sortOrder: 5 },
  { name: "Bridal Shoot", slug: "bridal-shoot", icon: "diamond", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400", sortOrder: 6 },
  { name: "Candid Photography", slug: "candid-photography", icon: "aperture", imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400", sortOrder: 7 },
  { name: "Makeup Artist", slug: "makeup-artist", icon: "color-palette", imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400", sortOrder: 8 },
  { name: "Anchors & DJs", slug: "anchors-djs", icon: "mic", imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400", sortOrder: 9 },
  { name: "Destination Wedding", slug: "destination-wedding", icon: "navigate", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400", sortOrder: 10 },
];

const DISTRICTS = [
  { name: "Poonch", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400", sortOrder: 1 },
  { name: "Surankote", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400", sortOrder: 2 },
  { name: "Rajouri", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=400", sortOrder: 3 },
  { name: "Jammu", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400", sortOrder: 4 },
  { name: "Srinagar", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1597074866923-dc0589150458?w=400", sortOrder: 5 },
  { name: "Kathua", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400", sortOrder: 6 },
  { name: "Udhampur", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400", sortOrder: 7 },
  { name: "Anantnag", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400", sortOrder: 8 },
  { name: "Baramulla", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400", sortOrder: 9 },
  { name: "Doda", state: "Jammu & Kashmir", imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400", sortOrder: 10 },
];

const TRENDING_SEARCHES = [
  { title: "Pre Wedding", icon: "heart-circle", sortOrder: 1 },
  { title: "Wedding Photography", icon: "camera", sortOrder: 2 },
  { title: "Cinematography", icon: "film", sortOrder: 3 },
  { title: "Drone Coverage", icon: "airplane", sortOrder: 4 },
  { title: "Bridal Shoot", icon: "diamond", sortOrder: 5 },
  { title: "Destination Wedding", icon: "navigate", sortOrder: 6 },
  { title: "Candid Photography", icon: "aperture", sortOrder: 7 },
  { title: "Makeup Artist", icon: "color-palette", sortOrder: 8 },
];

const INSPIRATION = [
  { title: "Royal Kashmiri Weddings", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", category: "Traditional", sortOrder: 1 },
  { title: "Mountain Weddings", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600", category: "Destination", sortOrder: 2 },
  { title: "Traditional Ceremonies", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600", category: "Traditional", sortOrder: 3 },
  { title: "Cinematic Wedding Films", imageUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600", category: "Cinematic", sortOrder: 4 },
  { title: "Palace Weddings", imageUrl: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600", category: "Luxury", sortOrder: 5 },
  { title: "Intimate Celebrations", imageUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600", category: "Intimate", sortOrder: 6 },
];

const FEATURED_MOMENTS = [
  { title: "Royal Wedding", location: "Udaipur, India", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", sortOrder: 1 },
  { title: "Bride Portrait", location: "Jaipur, India", imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600", sortOrder: 2 },
  { title: "Mehndi Ceremony", location: "Delhi, India", imageUrl: "https://images.unsplash.com/photo-1606216794079-73f85bbd57d5?w=600", sortOrder: 3 },
  { title: "Reception Night", location: "Mumbai, India", imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600", sortOrder: 4 },
  { title: "Destination Wedding", location: "Goa, India", imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600", sortOrder: 5 },
  { title: "Cinematic Couple", location: "Kerala, India", imageUrl: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600", sortOrder: 6 },
  { title: "Palace Wedding", location: "Jodhpur, India", imageUrl: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600", sortOrder: 7 },
  { title: "Wedding Film", location: "Bangalore, India", imageUrl: "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=600", sortOrder: 8 },
];

const TESTIMONIALS = [
  { name: "Priya & Rahul", city: "Mumbai", eventType: "Wedding", rating: 5, review: "Found our dream photographer in minutes. The quality was beyond expectations!", verifiedBooking: true, sortOrder: 1 },
  { name: "Ankit & Meera", city: "Delhi", eventType: "Pre Wedding", rating: 5, review: "BookMyShot made our pre-wedding shoot magical. Highly recommend!", verifiedBooking: true, sortOrder: 2 },
  { name: "Sneha & Varun", city: "Bangalore", eventType: "Cinematography", rating: 5, review: "Professional, verified creators. Our wedding film is absolutely stunning.", verifiedBooking: true, sortOrder: 3 },
  { name: "Fatima & Imran", city: "Srinagar", eventType: "Wedding", rating: 5, review: "The best platform for finding wedding creators in Kashmir. Amazing experience!", verifiedBooking: true, sortOrder: 4 },
  { name: "Riya & Karan", city: "Jammu", eventType: "Pre Wedding", rating: 5, review: "Loved every moment captured. The creator understood our vision perfectly.", verifiedBooking: true, sortOrder: 5 },
  { name: "Aditi & Rohan", city: "Poonch", eventType: "Wedding", rating: 5, review: "From booking to delivery, everything was seamless. Beautiful memories forever!", verifiedBooking: true, sortOrder: 6 },
  { name: "Zara & Ahmed", city: "Rajouri", eventType: "Cinematography", rating: 5, review: "Our wedding film brought tears of joy. Absolutely cinematic quality work.", verifiedBooking: true, sortOrder: 7 },
  { name: "Neha & Vikram", city: "Udhampur", eventType: "Drone Coverage", rating: 5, review: "The drone shots of our wedding venue were breathtaking. Worth every penny!", verifiedBooking: true, sortOrder: 8 },
];

async function seedContent() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found in .env");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅ Connected\n");

  // Categories
  const existingCats = await Category.countDocuments();
  if (existingCats === 0) {
    await Category.insertMany(CATEGORIES);
    console.log(`✅ Categories: ${CATEGORIES.length} records inserted`);
  } else {
    console.log(`⏭  Categories: ${existingCats} records already exist (skipped)`);
  }

  // Districts
  const existingDist = await District.countDocuments();
  if (existingDist === 0) {
    await District.insertMany(DISTRICTS);
    console.log(`✅ Districts: ${DISTRICTS.length} records inserted`);
  } else {
    console.log(`⏭  Districts: ${existingDist} records already exist (skipped)`);
  }

  // Trending Searches
  const existingTrending = await TrendingSearch.countDocuments();
  if (existingTrending === 0) {
    await TrendingSearch.insertMany(TRENDING_SEARCHES);
    console.log(`✅ Trending Searches: ${TRENDING_SEARCHES.length} records inserted`);
  } else {
    console.log(`⏭  Trending Searches: ${existingTrending} records already exist (skipped)`);
  }

  // Inspiration Gallery
  const existingInsp = await InspirationGallery.countDocuments();
  if (existingInsp === 0) {
    await InspirationGallery.insertMany(INSPIRATION);
    console.log(`✅ Inspiration Gallery: ${INSPIRATION.length} records inserted`);
  } else {
    console.log(`⏭  Inspiration Gallery: ${existingInsp} records already exist (skipped)`);
  }

  // Featured Moments
  const existingMoments = await FeaturedMoment.countDocuments();
  if (existingMoments === 0) {
    await FeaturedMoment.insertMany(FEATURED_MOMENTS);
    console.log(`✅ Featured Moments: ${FEATURED_MOMENTS.length} records inserted`);
  } else {
    console.log(`⏭  Featured Moments: ${existingMoments} records already exist (skipped)`);
  }

  // Testimonials
  const existingTest = await Testimonial.countDocuments();
  if (existingTest === 0) {
    await Testimonial.insertMany(TESTIMONIALS);
    console.log(`✅ Testimonials: ${TESTIMONIALS.length} records inserted`);
  } else {
    console.log(`⏭  Testimonials: ${existingTest} records already exist (skipped)`);
  }

  console.log("\n🎉 Content seed complete!");
  console.log("   All data is now in the database.");
  console.log("   Admin Content Management will show these records.");
  console.log("   Website & App will load from the same database.\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedContent().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
