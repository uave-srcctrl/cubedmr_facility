#!/usr/bin/env node

/**
 * Test script to verify what data the facility acuity index endpoint returns for facilityId 5
 */

const BACKEND_BASE_URL = "https://cubed-mr.app";
const facilityId = "5";

async function testFacilityAcuityIndex() {
  try {
    const url = `${BACKEND_BASE_URL}/api/reports/facility-acuity-index/${facilityId}`;
    console.log(`\n📊 Testing Facility Acuity Index for facilityId: ${facilityId}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`⏱️  Timestamp: ${new Date().toISOString()}\n`);

    const response = await fetch(url);
    const data = await response.json();

    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📋 Response Structure:\n`);
    console.log(JSON.stringify(data, null, 2));

    // Extract useful information
    if (data.status && data.data) {
      console.log(`\n🎯 Data Summary:`);
      console.log(`  - Status: ${data.status}`);
      console.log(`  - Data Type: ${Array.isArray(data.data) ? 'Array' : 'Object'}`);
      console.log(`  - Data Length: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);

      if (Array.isArray(data.data) && data.data.length > 0) {
        console.log(`\n📌 First Record Keys:`, Object.keys(data.data[0]));
        console.log(`\n📌 First Record Data:`);
        console.log(JSON.stringify(data.data[0], null, 2));

        // Extract acuity index info
        const firstRecord = data.data[0];
        console.log(`\n🔍 Extracted Fields:`);
        console.log(`  - Acuity Index: ${firstRecord.acuityIndex || firstRecord.AcuityIndex || 'N/A'}`);
        console.log(`  - Active Wounds: ${firstRecord.activeWounds || firstRecord.ActiveWounds || 'N/A'}`);
        console.log(`  - Active Patients: ${firstRecord.activePatients || firstRecord.ActivePatients || 'N/A'}`);
        console.log(`  - Patients: ${firstRecord.patients || firstRecord.Patients || 'N/A'}`);
        console.log(`  - Score: ${firstRecord.score || firstRecord.Score || 'N/A'}`);
      }
    } else {
      console.log(`\n⚠️  Unexpected response structure`);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(`\nDetails: ${error.stack}`);
  }
}

// Run the test
testFacilityAcuityIndex();
