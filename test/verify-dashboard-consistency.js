#!/usr/bin/env node

/**
 * Dashboard Data Consistency Verification Script
 * Checks if all dashboard components are using consistent data sources and date ranges
 */

import https from 'https';

const FACILITY_ID = 5;
const REMOTE_API = 'https://cubed-mr.app/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(color, label, message) {
  console.log(`${colors[color]}[${label}]${colors.reset} ${message}`);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, error: e.message });
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllComponentData() {
  log('blue', 'DASHBOARD', 'Fetching all dashboard component data sources...\n');

  const today = new Date();
  
  // Data for each component
  const components = {
    KPIs: {
      endpoints: [
        {
          name: '30-day wound-outcome',
          url: null, // will be set dynamically
          startDate: new Date(today),
          endDate: today
        },
        {
          name: '90-day wound-outcome',
          url: null,
          startDate: new Date(today),
          endDate: today
        },
        {
          name: 'facility-acuity-index (fallback)',
          url: `${REMOTE_API}/reports/facility-acuity-index/${FACILITY_ID}`,
          noDateRange: true
        }
      ]
    },
    'Wound Etiology': {
      name: 'etiology-distribution',
      url: `${REMOTE_API}/reports/etiology-distribution/${FACILITY_ID}/`,
      date: today.toISOString().split('T')[0]
    },
    'Healing Status': {
      name: 'facility-acuity-index',
      url: `${REMOTE_API}/reports/facility-acuity-index/${FACILITY_ID}`
    },
    'Wound Reduction': {
      name: 'facility-acuity-index',
      url: `${REMOTE_API}/reports/facility-acuity-index/${FACILITY_ID}`
    }
  };

  // Fetch 30-day data
  const date30dAgo = new Date(today);
  date30dAgo.setDate(date30dAgo.getDate() - 30);
  const url30d = `${REMOTE_API}/reports/facility-wound-outcome/${FACILITY_ID}/${date30dAgo.toISOString().split('T')[0]}/${today.toISOString().split('T')[0]}`;
  
  // Fetch 90-day data
  const date90dAgo = new Date(today);
  date90dAgo.setDate(date90dAgo.getDate() - 90);
  const url90d = `${REMOTE_API}/reports/facility-wound-outcome/${FACILITY_ID}/${date90dAgo.toISOString().split('T')[0]}/${today.toISOString().split('T')[0]}`;

  const results = {
    kpi30d: await fetchUrl(url30d),
    kpi90d: await fetchUrl(url90d),
    acuityIndex: await fetchUrl(`${REMOTE_API}/reports/facility-acuity-index/${FACILITY_ID}`),
    etiology: await fetchUrl(`${REMOTE_API}/reports/etiology-distribution/${FACILITY_ID}/${today.toISOString().split('T')[0]}`)
  };

  return { results, date30dAgo, date90dAgo };
}

async function analyzeData(results, date30dAgo, date90dAgo) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          DASHBOARD DATA CONSISTENCY ANALYSIS                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. KPI Data Analysis
  log('blue', 'KPI COMPONENT', 'Data Source Analysis');
  console.log(`
  Endpoint Sequence:
    1. facility-wound-outcome (30 days: ${date30dAgo.toISOString().split('T')[0]} to today)
    2. facility-wound-outcome (90 days: ${date90dAgo.toISOString().split('T')[0]} to today)
    3. facility-acuity-index (fallback, no date range)
`);

  if (results.kpi30d.data?.data?.length > 0) {
    const data30 = results.kpi30d.data.data[0];
    log('green', 'DATA_30D', 'Found data in 30-day range');
    console.log(`    Active Wounds: ${data30["Number of Active Wounds"]}`);
    console.log(`    Resolved: ${data30["Number of Resolved Wounds"]}, New: ${data30["Number of New Wounds"]}`);
    console.log(`    Healing Rate: ${data30["Percent of Wounds Improving"]}%\n`);
  } else {
    log('yellow', 'NO_DATA_30D', 'No data in 30-day range (will fallback to 90-day)');
  }

  if (results.kpi90d.data?.data?.length > 0) {
    const data90 = results.kpi90d.data.data[0];
    log('green', 'DATA_90D', 'Found data in 90-day range');
    const activeWounds = data90["Number of Active Wounds"];
    const resolved = data90["Number of Resolved Wounds"];
    const newWounds = data90["Number of New Wounds"];
    const healingRate = data90["Percent of Wounds Improving"];
    const criticalCases = data90["Facility Acuity Index"];
    
    console.log(`    Active Wounds: ${activeWounds}`);
    console.log(`    Resolved: ${resolved}, New: ${newWounds}`);
    console.log(`    Reports Generated: ${resolved + newWounds}`);
    console.log(`    Healing Rate: ${healingRate}%`);
    console.log(`    Critical Cases: ${criticalCases}\n`);
  } else {
    log('yellow', 'NO_DATA_90D', 'No data in 90-day range (will use acuity-index fallback)');
  }

  // 2. Etiology Data Analysis
  log('blue', 'ETIOLOGY COMPONENT', 'Data Source Analysis');
  console.log('  Endpoint: etiology-distribution (one specific date, today)\n');

  if (results.etiology.data?.data?.length > 0) {
    log('green', 'ETIOLOGY_DATA', 'Etiology distribution found');
    const totalWounds = results.etiology.data.data.reduce((sum, item) => sum + (item.count || 0), 0);
    console.log(`    Total Wounds: ${totalWounds}`);
    console.log(`    Etiologies: ${results.etiology.data.data.length}`);
    results.etiology.data.data.slice(0, 3).forEach(item => {
      console.log(`      - ${item.woundEtiology}: ${item.count} (${item.percentage}%)`);
    });
    console.log();
  }

  // 3. Data Consistency Check
  log('blue', 'CONSISTENCY CHECK', 'Comparing wound counts across components\n');

  const analysis = {
    kpiActiveWounds: results.kpi90d.data?.data?.[0]?.["Number of Active Wounds"] || 0,
    etiologyTotalWounds: results.etiology.data?.data?.reduce((sum, item) => sum + (item.count || 0), 0) || 0,
    acuityWeeklyWounds: results.acuityIndex.data?.data?.reduce((sum, week) => sum + (week.wounds || 0), 0) || 0
  };

  console.log(`  KPI Active Wounds (90-day):        ${analysis.kpiActiveWounds}`);
  console.log(`  Etiology Total Wounds (today):     ${analysis.etiologyTotalWounds}`);
  console.log(`  Acuity Weekly Wounds (all):        ${analysis.acuityWeeklyWounds}\n`);

  // Data consistency matrix
  const matchKpiEtiology = analysis.kpiActiveWounds === analysis.etiologyTotalWounds;
  const matchKpiAcuity = analysis.kpiActiveWounds <= analysis.acuityWeeklyWounds;
  
  log(matchKpiEtiology ? 'green' : 'yellow', 'KPI vs ETIOLOGY', 
    matchKpiEtiology 
      ? `✅ MATCH: ${analysis.kpiActiveWounds} wounds` 
      : `⚠️  MISMATCH: KPI=${analysis.kpiActiveWounds}, Etiology=${analysis.etiologyTotalWounds}`
  );
  
  log(matchKpiAcuity ? 'green' : 'yellow', 'KPI vs ACUITY', 
    matchKpiAcuity 
      ? `✅ CONSISTENT: KPI (${analysis.kpiActiveWounds}) ≤ Acuity (${analysis.acuityWeeklyWounds})` 
      : `⚠️  ISSUE: KPI (${analysis.kpiActiveWounds}) > Acuity (${analysis.acuityWeeklyWounds})`
  );

  // 4. Date Range Differences
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  log('blue', 'DATE RANGE ANALYSIS', 'Different components use different date ranges\n');

  console.log(`  KPIs:                 30-90-180-365 day dynamic fallback`);
  console.log(`  Wound Etiology:       Today only (${new Date().toISOString().split('T')[0]})`);
  console.log(`  Healing Status:       All weeks in acuity-index`);
  console.log(`  Wound Reduction:      All weeks in acuity-index\n`);

  console.log(`⚠️  IMPORTANT: Etiology uses TODAY\'S data only`);
  console.log(`   while KPIs use 90-day range`);
  console.log(`   This explains the difference in wound counts!\n`);

  // 5. Recommendations
  console.log('╔════════════════════════════════════════════════════════════════╗');
  log('yellow', 'RECOMMENDATIONS', 'To achieve data consistency\n');

  console.log(`  1. DECISION: Should all components use the SAME date range?`);
  console.log(`     Option A: All use "today" only (like etiology currently does)`);
  console.log(`     Option B: All use 90-day range (like KPIs now do)\n`);

  console.log(`  2. SUGGESTED: Use 90-day range for all components`);
  console.log(`     Why: More representative of actual facility status\n`);

  console.log(`  3. IMPLEMENTATION:`);
  console.log(`     - Update Wound Etiology to use date range instead of single day`);
  console.log(`     - Update Healing Status to use same 90-day range`);
  console.log(`     - Update Wound Reduction to use same 90-day range\n`);

  console.log(`  4. CODE CHANGES NEEDED:`);
  console.log(`     - dashboardEtiologyHandler: Accept date range parameters`);
  console.log(`     - dashboardHealingStatusHandler: Use wound-outcome or wider date range`);
  console.log(`     - dashboardWoundReductionHandler: Use wound-outcome endpoint with dates\n`);

  // 6. Current Issues Summary
  console.log('╔════════════════════════════════════════════════════════════════╗');
  log('red', 'ISSUES', 'Current data inconsistencies\n');

  const issues = [];
  
  if (!matchKpiEtiology) {
    issues.push(`❌ KPI shows ${analysis.kpiActiveWounds} wounds (90-day), Etiology shows ${analysis.etiologyTotalWounds} (today only)`);
  }
  
  issues.push(`❌ Etiology uses TODAY\'S data, KPIs use 90-day data - not comparable`);
  issues.push(`❌ Healing Status uses all-time acuity data, KPIs use 90-day data`);
  issues.push(`❌ Wound Reduction has mock data calculation, not using actual wound counts`);

  issues.forEach(issue => console.log(`  ${issue}`));
  console.log();
}

async function main() {
  try {
    const { results, date30dAgo, date90dAgo } = await fetchAllComponentData();
    await analyzeData(results, date30dAgo, date90dAgo);

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                        NEXT STEPS                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    log('green', 'DECISION', 'Choose consistency approach:');
    console.log(`
  A) RECOMMENDED: Align all components to use 90-day range
     - Consistent with KPI implementation
     - Better represents facility trend
     - More predictable for users

  B) ALTERNATIVE: Use today\'s data for all (simpler)
     - Easier to understand (single day snapshot)
     - Less code changes
     - Less database load
     - But less informative

  Status: Awaiting decision on consistency approach
`);

  } catch (error) {
    log('red', 'ERROR', error.message);
    process.exit(1);
  }
}

main();
