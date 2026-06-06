const http = require("http");

const BASE = "http://localhost:5000/api";

async function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port: 5000,
      path: "/api" + path,
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) opts.headers["Authorization"] = "Bearer " + token;
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log("=== Test Inquiry Flow ===\n");

  // 1. Login as admin to get a token
  const login = await request("POST", "/auth/login", { email: "admin@bookmyshot.com", password: "admin123" });
  const adminToken = login.body.token;
  console.log("Admin logged in:", login.status);

  // 2. Get a creator
  const creators = await request("GET", "/creators", null, adminToken);
  const creator = creators.body.creators?.[0];
  if (!creator) {
    console.log("No creator found, creating one...");
    // Register a creator
    const reg = await request("POST", "/auth/register", {
      name: "Test Creator",
      email: "testcreator-" + Date.now() + "@example.com",
      password: "password123",
      role: "creator",
    });
    console.log("Creator registered:", reg.status, reg.body.user?.id);
    // Need to approve
    const approve = await request("PATCH", "/admin/creators/" + reg.body.user?.id + "/approve", {}, adminToken);
    console.log("Creator approved:", approve.status);
  } else {
    console.log("Found creator:", creator._id, creator.user?.name);
  }

  // 3. Submit an inquiry (public - no auth required)
  const inquiry = await request("POST", "/inquiries", {
    creatorId: creator?._id || "6a20880ad02aa60931f13597",
    name: "Test Client",
    email: "client@example.com",
    phone: "9999999999",
    eventType: "Wedding",
    eventDate: "2026-07-15",
    budget: 50000,
    message: "Test inquiry from automated test",
  });
  console.log("Inquiry submitted:", inquiry.status, inquiry.body.success);

  // 4. Get creator token
  const creatorLogin = await request("POST", "/auth/login", {
    email: creator?.user?.email || "testcreator-1780516874003@example.com",
    password: "password123",
  });
  const creatorToken = creatorLogin.body.token;
  console.log("Creator logged in:", creatorLogin.status);

  // 5. Get leads (inquiries) for creator
  const leads = await request("GET", "/creator/leads", null, creatorToken);
  console.log("Leads fetched:", leads.status, "count:", leads.body.inquiries?.length || 0);
  if (leads.body.inquiries?.length > 0) {
    console.log("First inquiry:", leads.body.inquiries[0].name, leads.body.inquiries[0].eventType);
  }

  console.log("\n=== Test Complete ===");
}

main().catch(console.error);