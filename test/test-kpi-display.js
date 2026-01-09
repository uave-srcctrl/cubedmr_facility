#!/usr/bin/env node

/**
 * Test script to verify KPI data display for facilities 1, 2, and 3
 */

const facilities = [1, 2, 3];
const baseUrl = 'http://localhost:5000';

async function testFacilityKPIs(facilityId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing KPI display for FacilityId ${facilityId}`);
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${baseUrl}/api/dashboard/kpis`, {
      headers: {
        'X-Facility-Id': facilityId.toString(),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json();

    if (!data.status) {
      console.error(`❌ API returned status: false`);
      return false;
    }

    const kpiData = data.data;
    const source = data.source;

    console.log(`✅ Data source: ${source}`);
    console.log(`\nKPI Values:`);
    console.log(`  Active Wounds:      ${kpiData.activeWounds.value}`);
    console.log(`  Healing Rate:       ${kpiData.healingRate.value}%`);
    console.log(`  Reports Generated:  ${kpiData.reportsGenerated.value}`);
    console.log(`  Critical Cases:     ${kpiData.criticalCases.value}`);

    // Verify that Critical Cases varies by facility
    if (facilityId === 1 && kpiData.criticalCases.value !== 10) {
      console.error(`❌ Expected Critical Cases=10 for facility 1, got ${kpiData.criticalCases.value}`);
      return false;
    }
    if (facilityId === 2 && kpiData.criticalCases.value !== 2) {
      console.error(`❌ Expected Critical Cases=2 for facility 2, got ${kpiData.criticalCases.value}`);
      return false;
    }
    if (facilityId === 3 && kpiData.criticalCases.value !== 9) {
      console.error(`❌ Expected Critical Cases=9 for facility 3, got ${kpiData.criticalCases.value}`);
      return false;
    }

    console.log(`✅ Critical Cases value matches expected value for facility ${facilityId}`);
    return true;

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 KPI Display Verification Tests');
  console.log('==================================\n');

  const results = [];
  for (const facilityId of facilities) {
    const result = await testFacilityKPIs(facilityId);
    results.push({ facilityId, passed: result });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log('='.repeat(60));

  let allPassed = true;
  for (const { facilityId, passed } of results) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`FacilityId ${facilityId}: ${status}`);
    if (!passed) allPassed = false;
  }

  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}\n`);
  process.exit(allPassed ? 0 : 1);
}

runTests();
