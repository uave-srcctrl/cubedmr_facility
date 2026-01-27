const http = require("http");

const facilityId = 5;
const headers = {
  "x-facility-id": facilityId,
  "Content-Type": "application/json",
};

async function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: path,
      method: "GET",
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          console.log(`\n✅ ${name}:`);
          console.log(`   Response:`, JSON.stringify(response, null, 2).substring(0, 200) + "...");
          if (response.period) {
            console.log(`   📊 Period: ${response.period}`);
          }
        } catch (e) {
          console.log(`\n❌ ${name}: Invalid response`);
          console.log(`   Data:`, data.substring(0, 200));
        }
        resolve();
      });
    });

    req.on("error", (e) => {
      console.log(`\n❌ ${name}: Error - ${e.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log(`Testing unified date range fallback for facilityId ${facilityId}\n`);
  console.log("=" .repeat(60));

  await testEndpoint("/api/dashboard/kpis", "KPIs (should use fallback: 30d→90d→...)");
  await testEndpoint("/api/dashboard/wound-etiology", "Wound Etiology (should use fallback: 30d→90d→...)");
  await testEndpoint("/api/dashboard/healing-status", "Healing Status (should use fallback: 30d→90d→...)");
  await testEndpoint("/api/dashboard/wound-reduction", "Wound Reduction (should use fallback: 30d→90d→...)");

  console.log("\n" + "=".repeat(60));
  console.log("\n📊 EXPECTED RESULTS:");
  console.log("   All 4 endpoints should log which date range they're using");
  console.log("   All should report the same period (check server logs)");
  console.log("   Look for ✅ Found data messages in server terminal");
}

runTests().then(() => {
  console.log("\n✨ Test complete!\n");
  process.exit(0);
});
