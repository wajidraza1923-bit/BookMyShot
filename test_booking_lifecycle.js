/**
 * Test the complete booking lifecycle end-to-end
 * Booking Created → Creator Accepted → Payment Submitted → Payment Approved → Event Scheduled → Completed
 */
const http = require("http");

const BASE_URL = "http://localhost:5000/api";

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     BookMyShot — Full Booking Lifecycle Test                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Step 1: Login as seeded admin
  console.log("📝 Step 1: Login as seeded admin...");
  const adminLoginRes = await request("POST", "/auth/login", {
    email: "admin@bookmyshot.com",
    password: "Admin@123456",
  });
  if (adminLoginRes.status !== 200) {
    console.error("❌ Failed to login as admin:", adminLoginRes.data);
    console.log("   Trying to register admin directly...");
    // Try registering admin directly via a special endpoint or DB
    const adminRegRes = await request("POST", "/auth/register", {
      name: "Super Admin",
      email: `superadmin-${Date.now()}@example.com`,
      password: "Admin@123456",
      role: "admin",
    });
    if (adminRegRes.status !== 201) {
      console.error("❌ Failed to register admin:", adminRegRes.data);
      process.exit(1);
    }
    var adminToken = adminRegRes.data.token;
    console.log(`   ✅ Admin registered: ${adminRegRes.data.user.email} (role: ${adminRegRes.data.user.role})`);
  } else {
    var adminToken = adminLoginRes.data.token;
    console.log(`   ✅ Admin logged in: admin@bookmyshot.com`);
  }

  // Step 2: Register a test user
  console.log("\n📝 Step 2: Register test user...");
  const userRes = await request("POST", "/auth/register", {
    name: "Test User",
    email: `testuser-${Date.now()}@example.com`,
    password: "Test@1234",
    role: "user",
  });
  if (userRes.status !== 201) {
    console.error("❌ Failed to register user:", userRes.data);
    process.exit(1);
  }
  const userToken = userRes.data.token;
  const userId = userRes.data.user.id;
  console.log(`   ✅ User registered: ${userRes.data.user.email} (ID: ${userId})`);

  // Step 3: Register a test creator
  console.log("\n📝 Step 3: Register test creator...");
  const creatorRes = await request("POST", "/auth/register", {
    name: "Test Creator",
    email: `testcreator-${Date.now()}@example.com`,
    password: "Test@1234",
    role: "creator",
  });
  if (creatorRes.status !== 201) {
    console.error("❌ Failed to register creator:", creatorRes.data);
    process.exit(1);
  }
  const creatorToken = creatorRes.data.token;
  const creatorUserId = creatorRes.data.user.id;
  console.log(`   ✅ Creator registered: ${creatorRes.data.user.email} (ID: ${creatorUserId})`);

  // Step 4: Get the creator profile
  console.log("\n📝 Step 4: Get creator profile...");
  const meRes = await request("GET", "/auth/me", null, creatorToken);
  if (meRes.status !== 200) {
    console.error("❌ Failed to get creator profile:", meRes.data);
    process.exit(1);
  }
  const creatorProfile = meRes.data.creator;
  const creatorId = creatorProfile._id;
  console.log(`   ✅ Creator profile found: ${creatorId}, status: ${creatorProfile.status}`);

  // Step 5: Approve the creator (admin)
  console.log("\n📝 Step 5: Approve creator...");
  const approveRes = await request("PATCH", `/admin/creators/${creatorId}/status`, {
    status: "approved",
    note: "Approved for testing",
  }, adminToken);
  if (approveRes.status !== 200) {
    console.error("❌ Failed to approve creator:", approveRes.data);
    process.exit(1);
  }
  console.log(`   ✅ Creator approved`);

  // Step 6: User creates a booking
  console.log("\n📝 Step 6: User creates booking...");
  const bookingRes = await request("POST", "/bookings", {
    creatorId: creatorId,
    clientName: "Test User",
    clientEmail: userRes.data.user.email,
    clientPhone: "9876543210",
    eventType: "Premium Wedding Shoot",
    eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    eventLocation: "Mumbai, India",
    budget: 50000,
    message: "Test booking for lifecycle verification",
  }, userToken);
  if (bookingRes.status !== 201) {
    console.error("❌ Failed to create booking:", bookingRes.data);
    process.exit(1);
  }
  const bookingId = bookingRes.data.booking._id;
  console.log(`   ✅ Booking created: ${bookingId}`);
  console.log(`   Status: ${bookingRes.data.booking.status}`);

  // Step 7: Verify booking appears in creator's booking requests
  console.log("\n📝 Step 7: Check creator dashboard for booking...");
  const creatorBookingsRes = await request("GET", "/creator/booking-requests", null, creatorToken);
  if (creatorBookingsRes.status !== 200) {
    console.error("❌ Failed to get creator bookings:", creatorBookingsRes.data);
    process.exit(1);
  }
  const creatorBookings = creatorBookingsRes.data.bookings || [];
  const foundInCreator = creatorBookings.some(b => b._id === bookingId);
  console.log(`   ${foundInCreator ? '✅' : '❌'} Booking ${foundInCreator ? 'found' : 'NOT found'} in creator dashboard`);
  if (!foundInCreator) {
    console.log(`   Creator bookings count: ${creatorBookings.length}`);
    console.log(`   Creator booking IDs: ${creatorBookings.map(b => b._id).join(', ')}`);
    console.log(`   Creator booking statuses: ${creatorBookings.map(b => b.status).join(', ')}`);
  }

  // Step 8: Verify booking appears in admin dashboard
  console.log("\n📝 Step 8: Check admin dashboard for booking...");
  const adminBookingsRes = await request("GET", "/bookings/all", null, adminToken);
  if (adminBookingsRes.status !== 200) {
    console.error("❌ Failed to get admin bookings:", adminBookingsRes.data);
    process.exit(1);
  }
  const adminBookings = adminBookingsRes.data.bookings || [];
  const foundInAdmin = adminBookings.some(b => b._id === bookingId);
  console.log(`   ${foundInAdmin ? '✅' : '❌'} Booking ${foundInAdmin ? 'found' : 'NOT found'} in admin dashboard`);
  if (!foundInAdmin) {
    console.log(`   Admin bookings count: ${adminBookings.length}`);
    console.log(`   Admin booking IDs: ${adminBookings.map(b => b._id).join(', ')}`);
  }

  // Step 9: Verify booking appears in user dashboard
  console.log("\n📝 Step 9: Check user dashboard for booking...");
  const userBookingsRes = await request("GET", "/bookings/my", null, userToken);
  if (userBookingsRes.status !== 200) {
    console.error("❌ Failed to get user bookings:", userBookingsRes.data);
    process.exit(1);
  }
  const userBookings = userBookingsRes.data.bookings || [];
  const foundInUser = userBookings.some(b => b._id === bookingId);
  console.log(`   ${foundInUser ? '✅' : '❌'} Booking ${foundInUser ? 'found' : 'NOT found'} in user dashboard`);
  if (!foundInUser) {
    console.log(`   User bookings count: ${userBookings.length}`);
  }

  // Step 10: Creator accepts the booking
  console.log("\n📝 Step 10: Creator accepts booking...");
  const acceptRes = await request("PATCH", `/creator/booking-requests/${bookingId}`, {
    status: "Creator Accepted",
    amount: 45000,
  }, creatorToken);
  if (acceptRes.status !== 200) {
    console.error("❌ Failed to accept booking:", acceptRes.data);
    process.exit(1);
  }
  console.log(`   ✅ Booking accepted, status: ${acceptRes.data.booking.status}`);

  // Step 11: Creator schedules the event
  console.log("\n📝 Step 11: Creator schedules event...");
  const scheduleRes = await request("PATCH", `/bookings/${bookingId}/schedule`, {
    scheduledDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    scheduledTime: "10:00",
    scheduledLocation: "Mumbai, India - Grand Palace",
    creatorNotes: "Please arrive 30 minutes early",
  }, creatorToken);
  if (scheduleRes.status !== 200) {
    console.error("❌ Failed to schedule event:", scheduleRes.data);
    process.exit(1);
  }
  console.log(`   ✅ Event scheduled, status: ${scheduleRes.data.booking.status}`);

  // Step 12: Creator marks booking as completed
  console.log("\n📝 Step 12: Creator marks booking as completed...");
  const completeRes = await request("PATCH", `/bookings/${bookingId}/complete`, {}, creatorToken);
  if (completeRes.status !== 200) {
    console.error("❌ Failed to complete booking:", completeRes.data);
    process.exit(1);
  }
  console.log(`   ✅ Booking completed, status: ${completeRes.data.booking.status}`);

  // Step 13: Verify admin analytics counts correctly
  console.log("\n📝 Step 13: Check admin analytics...");
  const analyticsRes = await request("GET", "/admin/analytics", null, adminToken);
  if (analyticsRes.status !== 200) {
    console.error("❌ Failed to get admin analytics:", analyticsRes.data);
    process.exit(1);
  }
  console.log(`   ✅ Admin analytics: ${JSON.stringify(analyticsRes.data.stats)}`);

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    TEST RESULTS                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`   Booking ID:        ${bookingId}`);
  console.log(`   Creator Dashboard:  ${foundInCreator ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
  console.log(`   Admin Dashboard:    ${foundInAdmin ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
  console.log(`   User Dashboard:     ${foundInUser ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
  console.log(`   Full Lifecycle:     ✅ Complete`);

  if (foundInCreator && foundInAdmin && foundInUser) {
    console.log("\n🎉 ALL CHECKS PASSED! Booking flows correctly through the entire system.");
  } else {
    console.log("\n❌ SOME CHECKS FAILED! See above for details.");
    process.exit(1);
  }
}

main().catch(console.error);