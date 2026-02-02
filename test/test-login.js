/**
 * Test script for login with facility information
 * This can be run in the browser console to test the authentication flow
 */

// Test 1: Health Check
console.log("=== Test 1: Health Check ===");
fetch("http://localhost:5000/api/health")
  .then((res) => res.json())
  .then((data) => {
    console.log("Health check response:", data);
  })
  .catch((err) => console.error("Health check error:", err));

// Test 2: Login with Facilities credentials (if running against real backend)
async function testLogin() {
  console.log("\n=== Test 2: Login with Email (TryLogin) ===");
  
  // Use test credentials from woundcareapp
  const email = "test@example.com";
  const password = "password123";

  try {
    const response = await fetch("http://localhost:5000/api/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "TryLogin",  // Email login uses TryLogin
        email: email,
        password: password,
      }),
    });

    const text = await response.text();
    console.log("Raw response:", text);

    const data = JSON.parse(text);
    console.log("Login response:", data);

    if (data.status === true && data.data?.[0]?.status === 1) {
      const token = data.data[0].token;
      const entity = data.data[0].entity;
      const entityName = data.data[0].entityName;
      const entityId = data.data[0].entityId;

      console.log("Login successful!");
      console.log("Token:", token);
      console.log("Entity:", entity);
      console.log("Entity Name:", entityName);
      console.log("Entity ID:", entityId);

      // Store in localStorage
      localStorage.setItem("authToken", token);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userEntity", entity);
      localStorage.setItem("userEntityName", entityName);
      localStorage.setItem("userEntityId", entityId);

      console.log("Auth data stored in localStorage");

      // Test 3: Protected route with token
      testProtectedRoute(token);
    } else {
      console.error("Login failed:", data.data?.[0]?.msg);
    }
  } catch (error) {
    console.error("Login error:", error);
  }
}

// Test 3: Protected route (requires token)
async function testProtectedRoute(token) {
  console.log("\n=== Test 3: Protected Route (/api/user/profile) ===");

  try {
    const response = await fetch("http://localhost:5000/api/user/profile", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      console.error("Unauthorized - token invalid or missing");
      return;
    }

    const data = await response.json();
    console.log("Protected route response:", data);
  } catch (error) {
    console.error("Protected route error:", error);
  }
}

// Test 4: Logout
async function testLogout() {
  console.log("\n=== Test 4: Logout ===");

  const token = localStorage.getItem("authToken");
  if (!token) {
    console.error("No token found");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/api/logout", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log("Logout response:", data);

    // Clear localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userEntity");
    localStorage.removeItem("userEntityName");
    localStorage.removeItem("userEntityId");

    console.log("Logged out and cleared localStorage");
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Run tests
console.log("Starting login flow tests...\n");
testLogin();

// Test alternative: Login with Facility Name instead of email
async function testLoginWithFacilityName() {
  console.log("\n=== Test 2b: Login with Facility Name (TryLoginFacilities) ===");
  
  // Use facility name instead of email
  const facilityName = "Your Facility Name";
  const password = "password123";

  try {
    const response = await fetch("http://localhost:5000/api/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "TryLoginFacilities",  // Facility login uses TryLoginFacilities
        email: facilityName,  // Facility name is sent as email field
        password: password,
        facilityName: facilityName,  // Also sent as facilityName for clarity
      }),
    });

    const text = await response.text();
    console.log("Raw response:", text);

    const data = JSON.parse(text);
    console.log("Login response:", data);

    if (data.status === true && data.data?.[0]?.status === 1) {
      const token = data.data[0].token;
      console.log("Login with facility name successful!");
      console.log("Token:", token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("userEmail", facilityName);
      console.log("Auth data stored in localStorage");
    } else {
      console.error("Login failed:", data.data?.[0]?.msg);
    }
  } catch (error) {
    console.error("Login error:", error);
  }
}

// Run tests
console.log("Starting login flow tests...\n");
testLogin();
// To test with facility name, uncomment:
// testLoginWithFacilityName();

// Additional test: Show current auth info
setTimeout(() => {
  console.log("\n=== Current Auth Info ===");
  console.log("Token:", localStorage.getItem("authToken"));
  console.log("Email:", localStorage.getItem("userEmail"));
  console.log("Entity:", localStorage.getItem("userEntity"));
  console.log("Entity Name:", localStorage.getItem("userEntityName"));
  console.log("Entity ID:", localStorage.getItem("userEntityId"));
}, 2000);
