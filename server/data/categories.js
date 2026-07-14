/**
 * BookMyShot — Complete Wedding Marketplace Categories
 * Used to seed the Category collection via /api/admin/seed-categories
 */

module.exports = [
  // ─── PHOTOGRAPHY & VIDEO ───
  {
    name: "Wedding Photographer", slug: "wedding-photographer", group: "Photography & Video",
    icon: "camera-outline", sortOrder: 1,
    description: "Professional wedding photography services",
    fields: [
      { key: "cameraBrands", label: "Camera Brands", type: "tags", placeholder: "e.g. Canon, Nikon, Sony", required: false },
      { key: "editingSoftware", label: "Editing Software", type: "tags", placeholder: "e.g. Lightroom, Photoshop" },
      { key: "droneAvailable", label: "Drone Available", type: "boolean" },
      { key: "teamSize", label: "Team Size", type: "number", unit: "members", placeholder: "e.g. 3" },
      { key: "deliveryDays", label: "Photo Delivery Days", type: "number", unit: "days", placeholder: "e.g. 30" },
    ],
    searchFilters: [
      { key: "droneAvailable", label: "Drone", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Candid Photographer", slug: "candid-photographer", group: "Photography & Video",
    icon: "aperture-outline", sortOrder: 2,
    fields: [
      { key: "cameraBrands", label: "Camera Brands", type: "tags" },
      { key: "editingSoftware", label: "Editing Software", type: "tags" },
      { key: "shootingStyle", label: "Shooting Style", type: "multiselect", options: ["Candid", "Traditional", "Documentary", "Editorial"] },
      { key: "teamSize", label: "Team Size", type: "number", unit: "members" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Traditional Photographer", slug: "traditional-photographer", group: "Photography & Video",
    icon: "camera", sortOrder: 3,
    fields: [
      { key: "cameraBrands", label: "Camera Brands", type: "tags" },
      { key: "teamSize", label: "Team Size", type: "number", unit: "members" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Wedding Videographer", slug: "wedding-videographer", group: "Photography & Video",
    icon: "videocam-outline", sortOrder: 4,
    fields: [
      { key: "cameraBrands", label: "Camera Brands", type: "tags" },
      { key: "droneAvailable", label: "Drone Available", type: "boolean" },
      { key: "deliveryDays", label: "Video Delivery Days", type: "number", unit: "days" },
      { key: "videoFormats", label: "Delivery Formats", type: "multiselect", options: ["4K", "1080p", "Reels/Shorts", "Cinematic Film"] },
    ],
    searchFilters: [
      { key: "droneAvailable", label: "Drone", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Cinematographer", slug: "cinematographer", group: "Photography & Video",
    icon: "film-outline", sortOrder: 5,
    fields: [
      { key: "cameraBrands", label: "Camera Brands", type: "tags" },
      { key: "droneAvailable", label: "Drone Available", type: "boolean" },
      { key: "filmStyle", label: "Film Style", type: "multiselect", options: ["Cinematic", "Documentary", "Bollywood Style", "Destination"] },
      { key: "deliveryDays", label: "Delivery Days", type: "number", unit: "days" },
    ],
    searchFilters: [
      { key: "droneAvailable", label: "Drone", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Drone Operator", slug: "drone-operator", group: "Photography & Video",
    icon: "airplane-outline", sortOrder: 6,
    fields: [
      { key: "droneModel", label: "Drone Model", type: "tags", placeholder: "e.g. DJI Mavic, Phantom" },
      { key: "maxFlightTime", label: "Max Flight Time", type: "number", unit: "minutes" },
      { key: "nightFlying", label: "Night Flying", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Pre-Wedding Photographer", slug: "pre-wedding-photographer", group: "Photography & Video",
    icon: "heart-circle-outline", sortOrder: 7,
    fields: [
      { key: "locationTypes", label: "Location Types", type: "multiselect", options: ["Mountains", "Beach", "City", "Forest", "Heritage", "Studio"] },
      { key: "droneAvailable", label: "Drone Available", type: "boolean" },
      { key: "travelReady", label: "Travel Ready", type: "boolean" },
    ],
    searchFilters: [
      { key: "travelReady", label: "Travel Ready", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Photo Editor", slug: "photo-editor", group: "Photography & Video",
    icon: "color-wand-outline", sortOrder: 8,
    fields: [
      { key: "editingSoftware", label: "Software", type: "tags" },
      { key: "deliveryDays", label: "Delivery Days", type: "number", unit: "days" },
      { key: "editingStyles", label: "Editing Styles", type: "multiselect", options: ["Candid", "Traditional", "Moody", "Bright & Airy", "Black & White"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Video Editor", slug: "video-editor", group: "Photography & Video",
    icon: "cut-outline", sortOrder: 9,
    fields: [
      { key: "editingSoftware", label: "Software", type: "tags" },
      { key: "deliveryDays", label: "Delivery Days", type: "number", unit: "days" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Wedding Studio", slug: "wedding-studio", group: "Photography & Video",
    icon: "business-outline", sortOrder: 10,
    fields: [
      { key: "studioSize", label: "Studio Size", type: "select", options: ["Small (< 500 sqft)", "Medium (500-1000 sqft)", "Large (1000+ sqft)"] },
      { key: "backgroundCount", label: "Background Options", type: "number", unit: "backdrops" },
      { key: "equipmentIncluded", label: "Equipment Included", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },

  // ─── BEAUTY ───
  {
    name: "Bridal Makeup Artist", slug: "bridal-makeup-artist", group: "Beauty",
    icon: "color-palette-outline", sortOrder: 20,
    description: "Professional bridal makeup and beauty services",
    fields: [
      { key: "bridalPackagePrice", label: "Bridal Package Starting Price", type: "price", unit: "₹", required: true },
      { key: "partyMakeupPrice", label: "Party Makeup Price", type: "price", unit: "₹" },
      { key: "homeService", label: "Home Service Available", type: "boolean" },
      { key: "makeupBrands", label: "Makeup Brands Used", type: "tags", placeholder: "e.g. MAC, NARS, Huda Beauty" },
      { key: "hairstylingIncluded", label: "Hairstyling Included", type: "boolean" },
      { key: "trialSession", label: "Trial Session Available", type: "boolean" },
    ],
    searchFilters: [
      { key: "homeService", label: "Home Service", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Makeup Artist", slug: "makeup-artist", group: "Beauty",
    icon: "brush-outline", sortOrder: 21,
    fields: [
      { key: "makeupStyles", label: "Makeup Styles", type: "multiselect", options: ["Bridal", "Party", "Engagement", "Reception", "Mehendi", "Natural", "HD Makeup"] },
      { key: "homeService", label: "Home Service Available", type: "boolean" },
      { key: "makeupBrands", label: "Makeup Brands Used", type: "tags" },
    ],
    searchFilters: [
      { key: "homeService", label: "Home Service", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Beauty Parlour", slug: "beauty-parlour", group: "Beauty",
    icon: "sparkles-outline", sortOrder: 22,
    fields: [
      { key: "salonAddress", label: "Salon Address", type: "textarea" },
      { key: "homeService", label: "Home Service Available", type: "boolean" },
      { key: "services", label: "Services Offered", type: "multiselect", options: ["Makeup", "Facial", "Waxing", "Threading", "Hair", "Nails", "Mehndi"] },
    ],
    searchFilters: [
      { key: "homeService", label: "Home Service", type: "boolean" },
    ],
  },
  {
    name: "Hair Stylist", slug: "hair-stylist", group: "Beauty",
    icon: "cut-outline", sortOrder: 23,
    fields: [
      { key: "hairStyles", label: "Hair Styles", type: "multiselect", options: ["Bridal Updo", "Open Hair", "Curls", "Braids", "Extensions", "Juda"] },
      { key: "homeService", label: "Home Service Available", type: "boolean" },
    ],
    searchFilters: [{ key: "homeService", label: "Home Service", type: "boolean" }],
  },
  {
    name: "Mehndi Artist", slug: "mehndi-artist", group: "Beauty",
    icon: "hand-left-outline", sortOrder: 24,
    fields: [
      { key: "mehndiStyles", label: "Mehndi Styles", type: "multiselect", options: ["Arabic", "Indian", "Rajasthani", "Moroccan", "Fusion", "Minimal"] },
      { key: "bridalMehndiPrice", label: "Bridal Mehndi Starting Price", type: "price", unit: "₹", required: true },
      { key: "homeService", label: "Home Service Available", type: "boolean" },
      { key: "artistCount", label: "Number of Artists", type: "number", unit: "artists" },
    ],
    searchFilters: [
      { key: "homeService", label: "Home Service", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Nail Artist", slug: "nail-artist", group: "Beauty",
    icon: "sparkles", sortOrder: 25,
    fields: [
      { key: "nailTypes", label: "Nail Types", type: "multiselect", options: ["Gel", "Acrylic", "Nail Art", "Natural", "Extensions"] },
      { key: "homeService", label: "Home Service Available", type: "boolean" },
    ],
    searchFilters: [{ key: "homeService", label: "Home Service", type: "boolean" }],
  },
  {
    name: "Saree Draping Artist", slug: "saree-draping-artist", group: "Beauty",
    icon: "rose-outline", sortOrder: 26,
    fields: [
      { key: "drapingStyles", label: "Draping Styles", type: "tags", placeholder: "e.g. Nauvari, Bengali, Gujarati" },
      { key: "homeService", label: "Home Service Available", type: "boolean" },
    ],
    searchFilters: [{ key: "homeService", label: "Home Service", type: "boolean" }],
  },

  // ─── CLOTHING ───
  {
    name: "Bridal Lehenga Store", slug: "bridal-lehenga-store", group: "Clothing",
    icon: "shirt-outline", sortOrder: 30,
    fields: [
      { key: "rentalOrSale", label: "Rental or Sale", type: "select", options: ["Rental", "Sale", "Both"], required: true },
      { key: "brands", label: "Brands Available", type: "tags" },
      { key: "sizeRange", label: "Size Range", type: "text", placeholder: "e.g. XS to 4XL" },
      { key: "trialAvailable", label: "Trial Available", type: "boolean" },
      { key: "deliveryAvailable", label: "Delivery Available", type: "boolean" },
    ],
    searchFilters: [
      { key: "rentalOrSale", label: "Rental/Sale", type: "select", options: ["Rental", "Sale", "Both"] },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Groom Sherwani Store", slug: "groom-sherwani-store", group: "Clothing",
    icon: "shirt-outline", sortOrder: 31,
    fields: [
      { key: "rentalOrSale", label: "Rental or Sale", type: "select", options: ["Rental", "Sale", "Both"], required: true },
      { key: "brands", label: "Brands", type: "tags" },
      { key: "customTailoring", label: "Custom Tailoring", type: "boolean" },
    ],
    searchFilters: [
      { key: "rentalOrSale", label: "Rental/Sale", type: "select", options: ["Rental", "Sale"] },
    ],
  },
  {
    name: "Wedding Boutique", slug: "wedding-boutique", group: "Clothing",
    icon: "bag-outline", sortOrder: 32,
    fields: [
      { key: "categories", label: "Categories", type: "multiselect", options: ["Lehenga", "Saree", "Salwar Suit", "Gown", "Sherwani", "Accessories"] },
      { key: "customDesign", label: "Custom Design Available", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Jewellery Store", slug: "jewellery-store", group: "Clothing",
    icon: "diamond-outline", sortOrder: 33,
    fields: [
      { key: "jewelleryTypes", label: "Types", type: "multiselect", options: ["Gold", "Silver", "Diamond", "Kundan", "Polki", "Imitation"] },
      { key: "rentalAvailable", label: "Rental Available", type: "boolean" },
    ],
    searchFilters: [
      { key: "rentalAvailable", label: "Rental", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  // ─── DECORATION ───
  {
    name: "Wedding Decorator", slug: "wedding-decorator", group: "Decoration",
    icon: "flower-outline", sortOrder: 40,
    fields: [
      { key: "decorStyles", label: "Decoration Styles", type: "multiselect", options: ["Traditional", "Modern", "Rustic", "Royal", "Floral", "Minimalist"] },
      { key: "outdoor", label: "Outdoor Decoration", type: "boolean" },
      { key: "indoor", label: "Indoor Decoration", type: "boolean" },
      { key: "teamSize", label: "Team Size", type: "number", unit: "members" },
    ],
    searchFilters: [
      { key: "outdoor", label: "Outdoor", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Flower Decorator", slug: "flower-decorator", group: "Decoration",
    icon: "leaf-outline", sortOrder: 41,
    fields: [
      { key: "flowerTypes", label: "Flower Types", type: "tags", placeholder: "e.g. Rose, Marigold, Lily" },
      { key: "garlandMaking", label: "Garland Making", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Stage Decoration", slug: "stage-decoration", group: "Decoration",
    icon: "star-outline", sortOrder: 42,
    fields: [
      { key: "stageTypes", label: "Stage Types", type: "multiselect", options: ["Bridal Seating", "Mandap", "Reception Stage", "Sangeet Stage"] },
      { key: "lightingIncluded", label: "Lighting Included", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Mandap Decoration", slug: "mandap-decoration", group: "Decoration",
    icon: "home-outline", sortOrder: 43,
    fields: [
      { key: "mandapStyles", label: "Mandap Styles", type: "multiselect", options: ["Traditional", "Modern", "Floral", "Royal"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Lighting Services", slug: "lighting-services", group: "Decoration",
    icon: "bulb-outline", sortOrder: 44,
    fields: [
      { key: "lightingTypes", label: "Lighting Types", type: "multiselect", options: ["LED", "Fairy Lights", "Neon", "Spotlights", "Draping Lights"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Balloon Decorator", slug: "balloon-decorator", group: "Decoration",
    icon: "happy-outline", sortOrder: 45,
    fields: [
      { key: "balloonTypes", label: "Balloon Types", type: "multiselect", options: ["Chrome", "Foil", "LED", "Organic", "Arch"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },

  // ─── FOOD ───
  {
    name: "Caterer", slug: "caterer", group: "Food",
    icon: "restaurant-outline", sortOrder: 50,
    fields: [
      { key: "cuisineTypes", label: "Cuisine Types", type: "multiselect", options: ["North Indian", "South Indian", "Mughlai", "Continental", "Chinese", "Kashmiri", "Multi-cuisine"] },
      { key: "vegNonVeg", label: "Veg / Non-Veg", type: "select", options: ["Veg Only", "Non-Veg Only", "Both"], required: true },
      { key: "minGuests", label: "Minimum Guests", type: "number", unit: "guests", required: true },
      { key: "maxGuests", label: "Maximum Guests", type: "number", unit: "guests" },
      { key: "pricePerPlate", label: "Starting Price Per Plate", type: "price", unit: "₹", required: true },
      { key: "teamSize", label: "Staff Size", type: "number", unit: "staff" },
      { key: "serviceType", label: "Service Type", type: "multiselect", options: ["Buffet", "Sit-Down", "Live Counters", "Cocktail"] },
    ],
    searchFilters: [
      { key: "vegNonVeg", label: "Veg/Non-Veg", type: "select", options: ["Veg Only", "Non-Veg Only", "Both"] },
      { key: "minGuests", label: "Min Guests", type: "range" },
      { key: "budget", label: "Price/Plate", type: "range" },
    ],
  },
  {
    name: "Sweet Shop", slug: "sweet-shop", group: "Food",
    icon: "ice-cream-outline", sortOrder: 51,
    fields: [
      { key: "sweetTypes", label: "Sweet Types", type: "tags", placeholder: "e.g. Barfi, Ladoo, Halwa" },
      { key: "delivery", label: "Delivery Available", type: "boolean" },
      { key: "customOrders", label: "Custom Orders", type: "boolean" },
    ],
    searchFilters: [{ key: "delivery", label: "Delivery", type: "boolean" }],
  },
  {
    name: "Bakery", slug: "bakery", group: "Food",
    icon: "cafe-outline", sortOrder: 52,
    fields: [
      { key: "specialties", label: "Specialties", type: "tags" },
      { key: "delivery", label: "Delivery Available", type: "boolean" },
      { key: "customCakes", label: "Custom Cakes", type: "boolean" },
    ],
    searchFilters: [{ key: "delivery", label: "Delivery", type: "boolean" }],
  },
  {
    name: "Wedding Cake Designer", slug: "wedding-cake-designer", group: "Food",
    icon: "gift-outline", sortOrder: 53,
    fields: [
      { key: "cakeStyles", label: "Cake Styles", type: "multiselect", options: ["Tiered", "Fondant", "Naked Cake", "Floral", "Custom Design"] },
      { key: "minPrice", label: "Starting Price", type: "price", unit: "₹", required: true },
      { key: "delivery", label: "Delivery Available", type: "boolean" },
      { key: "tastingSession", label: "Tasting Session Available", type: "boolean" },
    ],
    searchFilters: [
      { key: "delivery", label: "Delivery", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  // ─── ENTERTAINMENT ───
  {
    name: "DJ", slug: "dj", group: "Entertainment",
    icon: "musical-notes-outline", sortOrder: 60,
    fields: [
      { key: "equipmentOwned", label: "Equipment Owned", type: "boolean" },
      { key: "musicTypes", label: "Music Types", type: "multiselect", options: ["Bollywood", "Punjabi", "Sufi", "EDM", "Bhangra", "Classical"] },
      { key: "lightingIncluded", label: "Lighting Included", type: "boolean" },
    ],
    searchFilters: [
      { key: "lightingIncluded", label: "Lighting Included", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Live Band", slug: "live-band", group: "Entertainment",
    icon: "musical-note-outline", sortOrder: 61,
    fields: [
      { key: "bandSize", label: "Band Size", type: "number", unit: "members" },
      { key: "genres", label: "Music Genres", type: "multiselect", options: ["Bollywood", "Sufi", "Ghazal", "Jazz", "Punjabi Folk", "Classical"] },
      { key: "equipmentIncluded", label: "Equipment Included", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Anchor", slug: "anchor", group: "Entertainment",
    icon: "mic-outline", sortOrder: 62,
    fields: [
      { key: "languages", label: "Languages", type: "tags", placeholder: "e.g. Hindi, Urdu, English" },
      { key: "eventTypes", label: "Event Types", type: "multiselect", options: ["Sangeet", "Reception", "Mehendi", "Nikah", "Engagement"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Dhol Group", slug: "dhol-group", group: "Entertainment",
    icon: "volume-high-outline", sortOrder: 63,
    fields: [
      { key: "groupSize", label: "Group Size", type: "number", unit: "members" },
      { key: "costumeIncluded", label: "Costume Included", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Singer", slug: "singer", group: "Entertainment",
    icon: "mic", sortOrder: 64,
    fields: [
      { key: "genres", label: "Music Genres", type: "multiselect", options: ["Bollywood", "Ghazal", "Sufi", "Classical", "Devotional", "Punjabi"] },
      { key: "languages", label: "Languages", type: "tags" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Choreographer", slug: "choreographer", group: "Entertainment",
    icon: "body-outline", sortOrder: 65,
    fields: [
      { key: "danceStyles", label: "Dance Styles", type: "multiselect", options: ["Bollywood", "Classical", "Contemporary", "Bhangra", "Western"] },
      { key: "groupClasses", label: "Group Classes Available", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Dance Group", slug: "dance-group", group: "Entertainment",
    icon: "people-outline", sortOrder: 66,
    fields: [
      { key: "groupSize", label: "Group Size", type: "number", unit: "dancers" },
      { key: "danceStyles", label: "Dance Styles", type: "multiselect", options: ["Bollywood", "Bhangra", "Classical", "Folk", "Western"] },
      { key: "costumeIncluded", label: "Costume Included", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },

  // ─── TRANSPORT ───
  {
    name: "Luxury Car Rental", slug: "luxury-car-rental", group: "Transport",
    icon: "car-outline", sortOrder: 70,
    fields: [
      { key: "vehicleTypes", label: "Vehicle Types", type: "multiselect", options: ["SUV", "Sedan", "Limousine", "Luxury", "Sports"] },
      { key: "vehicleCount", label: "Number of Vehicles", type: "number", unit: "vehicles" },
      { key: "driverIncluded", label: "Driver Included", type: "boolean" },
      { key: "pricePerDay", label: "Price Per Day", type: "price", unit: "₹" },
      { key: "decorationAvailable", label: "Decoration Available", type: "boolean" },
    ],
    searchFilters: [
      { key: "vehicleTypes", label: "Vehicle Type", type: "select", options: ["SUV", "Sedan", "Limousine", "Luxury", "Sports"] },
      { key: "decorationAvailable", label: "Decoration", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Vintage Car Rental", slug: "vintage-car-rental", group: "Transport",
    icon: "car-sport-outline", sortOrder: 71,
    fields: [
      { key: "vehicleModels", label: "Vehicle Models", type: "tags", placeholder: "e.g. Ambassador, Contessa, Fiat" },
      { key: "vehicleCount", label: "Number of Vehicles", type: "number", unit: "vehicles" },
      { key: "driverIncluded", label: "Driver Included", type: "boolean" },
      { key: "decorationAvailable", label: "Decoration Available", type: "boolean" },
    ],
    searchFilters: [
      { key: "decorationAvailable", label: "Decoration", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Bus Rental", slug: "bus-rental", group: "Transport",
    icon: "bus-outline", sortOrder: 72,
    fields: [
      { key: "busTypes", label: "Bus Types", type: "multiselect", options: ["Mini Bus (20-30 seats)", "Standard Bus (30-45 seats)", "Luxury Bus (45+ seats)"] },
      { key: "acAvailable", label: "AC Available", type: "boolean" },
    ],
    searchFilters: [
      { key: "acAvailable", label: "AC", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Bridal Entry Services", slug: "bridal-entry-services", group: "Transport",
    icon: "flower", sortOrder: 73,
    fields: [
      { key: "entryTypes", label: "Entry Types", type: "multiselect", options: ["Doli", "Flower Shower", "Drone Entry", "Horse/Buggy", "Vintage Car", "Royal Chariot"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Horse/Buggy", slug: "horse-buggy", group: "Transport",
    icon: "paw-outline", sortOrder: 74,
    fields: [
      { key: "horseCount", label: "Number of Horses", type: "number", unit: "horses" },
      { key: "decorationIncluded", label: "Decoration Included", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  // ─── VENUE ───
  {
    name: "Banquet Hall", slug: "banquet-hall", group: "Venue",
    icon: "business-outline", sortOrder: 80,
    fields: [
      { key: "seatingCapacity", label: "Seating Capacity", type: "number", unit: "guests", required: true },
      { key: "parking", label: "Parking Available", type: "boolean" },
      { key: "rooms", label: "Number of Rooms", type: "number", unit: "rooms" },
      { key: "acAvailable", label: "AC Available", type: "boolean" },
      { key: "cateringAvailable", label: "In-House Catering", type: "boolean" },
      { key: "decorationAvailable", label: "Decoration Available", type: "boolean" },
      { key: "pricePerDay", label: "Price Per Day", type: "price", unit: "₹", required: true },
    ],
    searchFilters: [
      { key: "seatingCapacity", label: "Capacity", type: "range" },
      { key: "acAvailable", label: "AC", type: "boolean" },
      { key: "cateringAvailable", label: "In-House Catering", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Marriage Hall", slug: "marriage-hall", group: "Venue",
    icon: "home-outline", sortOrder: 81,
    fields: [
      { key: "seatingCapacity", label: "Seating Capacity", type: "number", unit: "guests", required: true },
      { key: "parking", label: "Parking Available", type: "boolean" },
      { key: "acAvailable", label: "AC Available", type: "boolean" },
      { key: "cateringAvailable", label: "In-House Catering", type: "boolean" },
      { key: "pricePerDay", label: "Price Per Day", type: "price", unit: "₹", required: true },
    ],
    searchFilters: [
      { key: "seatingCapacity", label: "Capacity", type: "range" },
      { key: "acAvailable", label: "AC", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Hotel", slug: "hotel", group: "Venue",
    icon: "bed-outline", sortOrder: 82,
    fields: [
      { key: "starRating", label: "Star Rating", type: "select", options: ["3 Star", "4 Star", "5 Star"] },
      { key: "banquetCapacity", label: "Banquet Capacity", type: "number", unit: "guests" },
      { key: "roomCount", label: "Number of Rooms", type: "number", unit: "rooms" },
      { key: "pool", label: "Swimming Pool", type: "boolean" },
    ],
    searchFilters: [
      { key: "starRating", label: "Stars", type: "select", options: ["3 Star", "4 Star", "5 Star"] },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Resort", slug: "resort", group: "Venue",
    icon: "sunny-outline", sortOrder: 83,
    fields: [
      { key: "seatingCapacity", label: "Capacity", type: "number", unit: "guests" },
      { key: "outdoor", label: "Outdoor Available", type: "boolean" },
      { key: "pool", label: "Swimming Pool", type: "boolean" },
    ],
    searchFilters: [
      { key: "outdoor", label: "Outdoor", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Farm House", slug: "farm-house", group: "Venue",
    icon: "leaf-outline", sortOrder: 84,
    fields: [
      { key: "area", label: "Area", type: "number", unit: "acres" },
      { key: "capacity", label: "Capacity", type: "number", unit: "guests" },
      { key: "cateringAvailable", label: "Catering Available", type: "boolean" },
    ],
    searchFilters: [
      { key: "capacity", label: "Capacity", type: "range" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  // ─── WEDDING MANAGEMENT ───
  {
    name: "Wedding Planner", slug: "wedding-planner", group: "Wedding Management",
    icon: "clipboard-outline", sortOrder: 90,
    fields: [
      { key: "servicesIncluded", label: "Services Included", type: "multiselect", options: ["Venue Booking", "Vendor Management", "Decoration", "Catering", "Photography", "Full Day Coordination"] },
      { key: "budgetManaged", label: "Budget Range Managed", type: "select", options: ["Under ₹5L", "₹5L-₹15L", "₹15L-₹50L", "₹50L+"] },
      { key: "destinationWeddings", label: "Destination Weddings", type: "boolean" },
    ],
    searchFilters: [
      { key: "destinationWeddings", label: "Destination", type: "boolean" },
      { key: "budget", label: "Budget", type: "range" },
    ],
  },
  {
    name: "Event Management Company", slug: "event-management-company", group: "Wedding Management",
    icon: "people-circle-outline", sortOrder: 91,
    fields: [
      { key: "teamSize", label: "Team Size", type: "number", unit: "members" },
      { key: "servicesOffered", label: "Services Offered", type: "multiselect", options: ["Planning", "Coordination", "Decoration", "Catering", "Entertainment", "Photography"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Invitation Designer", slug: "invitation-designer", group: "Wedding Management",
    icon: "mail-outline", sortOrder: 92,
    fields: [
      { key: "invitationTypes", label: "Types", type: "multiselect", options: ["Digital", "Printed", "Video Invite", "Box Invite", "Custom"] },
      { key: "deliveryAvailable", label: "Delivery Available", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  // ─── RELIGIOUS ───
  {
    name: "Pandit", slug: "pandit", group: "Religious Services",
    icon: "flame-outline", sortOrder: 100,
    fields: [
      { key: "ceremonies", label: "Ceremonies", type: "multiselect", options: ["Hindu Wedding", "Engagement", "Griha Pravesh", "Satyanarayan Puja", "Navgraha Puja"] },
      { key: "languages", label: "Languages", type: "tags" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Qazi", slug: "qazi", group: "Religious Services",
    icon: "moon-outline", sortOrder: 101,
    fields: [
      { key: "ceremonies", label: "Ceremonies", type: "multiselect", options: ["Nikah", "Engagement", "Islamic Rituals"] },
      { key: "languages", label: "Languages", type: "tags" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Granthi", slug: "granthi", group: "Religious Services",
    icon: "book-outline", sortOrder: 102,
    fields: [
      { key: "ceremonies", label: "Ceremonies", type: "multiselect", options: ["Anand Karaj", "Engagement", "Sikh Rituals"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  // ─── OTHERS ───
  {
    name: "Tent House", slug: "tent-house", group: "Others",
    icon: "umbrella-outline", sortOrder: 110,
    fields: [
      { key: "tentTypes", label: "Tent Types", type: "multiselect", options: ["Shamiana", "Swiss Tent", "Pagoda", "Structure Tent"] },
      { key: "seatingCapacity", label: "Seating Capacity", type: "number", unit: "guests" },
      { key: "lightingIncluded", label: "Lighting Included", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Sound System", slug: "sound-system", group: "Others",
    icon: "volume-high-outline", sortOrder: 111,
    fields: [
      { key: "systemTypes", label: "System Types", type: "multiselect", options: ["PA System", "Line Array", "DJ Setup", "Basic Setup"] },
      { key: "operatorIncluded", label: "Operator Included", type: "boolean" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Generator Services", slug: "generator-services", group: "Others",
    icon: "flash-outline", sortOrder: 112,
    fields: [
      { key: "capacity", label: "Generator Capacity", type: "tags", placeholder: "e.g. 25KVA, 62.5KVA" },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Fireworks", slug: "fireworks", group: "Others",
    icon: "sparkles-outline", sortOrder: 113,
    fields: [
      { key: "fireworkTypes", label: "Types", type: "multiselect", options: ["Ground Show", "Sky Shots", "Cold Pyro", "Paper Confetti", "Snow Machine"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
  {
    name: "Honeymoon Planner", slug: "honeymoon-planner", group: "Others",
    icon: "airplane-outline", sortOrder: 114,
    fields: [
      { key: "destinations", label: "Destinations", type: "tags", placeholder: "e.g. Goa, Maldives, Kashmir" },
      { key: "packageTypes", label: "Package Types", type: "multiselect", options: ["Domestic", "International", "Budget", "Luxury"] },
    ],
    searchFilters: [{ key: "budget", label: "Budget", type: "range" }],
  },
];
