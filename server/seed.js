require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Creator = require("./models/Creator");
const Homepage = require("./models/Homepage");
const Planning = require("./models/Planning");

const seed = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bookmyshot";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error("\n❌ Could not connect to MongoDB at:", uri);
    console.error("   Start MongoDB locally, or set MONGODB_URI in .env to your Atlas connection string.\n");
    console.error("   Windows (if installed):  net start MongoDB");
    console.error("   Or install: https://www.mongodb.com/try/download/community\n");
    process.exit(1);
  }

  await User.deleteMany({});
  await Creator.deleteMany({});
  await Homepage.deleteMany({});

  const admin = await User.create({
    name: "Admin",
    email: process.env.ADMIN_EMAIL || "admin@bookmyshott.com",
    password: process.env.ADMIN_PASSWORD || "REDACTED_PASSWORD",
    role: "admin",
    emailVerified: true,
  });

  const creatorUser = await User.create({
    name: "Sarah Mitchell",
    email: "sarah@bookmyshot.com",
    password: "Creator@123",
    phone: "+1 555-0100",
    role: "creator",
    emailVerified: true,
  });

  const creator = await Creator.create({
    user: creatorUser._id,
    status: "approved",
    specialty: "Fine Art & Editorial",
    bio: "Award-winning wedding photographer with 10+ years experience.",
    experience: "10+ years",
    location: "Napa Valley, CA",
    city: "Napa",
    category: "wedding",
    budgetMin: 2500,
    budgetMax: 8000,
    rating: 4.9,
    weddingsCount: 120,
    featured: true,
    packages: [
      { name: "Silver", price: 2499, description: "6 hours coverage", features: ["400 photos", "Online gallery"] },
      { name: "Gold", price: 4999, description: "Full day", features: ["800 photos", "Engagement session", "Album"] },
    ],
  });

  await Planning.create({ creator: creator._id });

  await User.create({
    name: "John Client",
    email: "user@bookmyshot.com",
    password: "User@123456",
    role: "user",
    emailVerified: true,
  });

  await Homepage.create({
    heroTitle: "Capture Your Dream Wedding",
    heroSubtitle: "Premium Wedding Photography",
    testimonials: [
      { name: "Emma & David", event: "Napa Valley", text: "Sarah captured our day beyond our wildest dreams.", stars: 5 },
    ],
    gallery: [
      { url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600", label: "Ceremony" },
    ],
  });

  console.log("Seed complete!");
  console.log("Admin:", admin.email, "/ Admin@123456");
  console.log("Creator:", creatorUser.email, "/ Creator@123");
  console.log("User: user@bookmyshot.com / User@123456");
  process.exit();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
