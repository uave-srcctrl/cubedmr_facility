#!/usr/bin/env node

const facilityId = 5;
const LOCAL_API = 'http://localhost:5000';

async function verifyDateRangesDisplay() {
  console.log('\n📊 VERIFYING DATE RANGES DISPLAY ON DASHBOARD COMPONENTS\n');
  console.log('='.repeat(70));
  
  const components = [
    { 
      name: 'KPIs', 
      url: `${LOCAL_API}/api/dashboard/kpis`,
      description: 'Key Performance Indicators'
    },
    { 
      name: 'Wound Etiology Distribution', 
      url: `${LOCAL_API}/api/dashboard/wound-etiology`,
      description: 'Wound Etiology Data'
    },
    { 
      name: 'Average Wound Reduction', 
      url: `${LOCAL_API}/api/dashboard/wound-reduction`,
      description: 'Wound Reduction Data'
    },
    { 
      name: 'Wound Healing Status', 
      url: `${LOCAL_API}/api/dashboard/healing-status`,
      description: 'Healing Status Data'
    }
  ];
  
  for (const component of components) {
    console.log(`\n📌 ${component.name}`);
    console.log('-'.repeat(70));
    
    try {
      const response = await fetch(component.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Facility-Id': facilityId.toString()
        }
      });
      
      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status}`);
        continue;
      }
      
      const result = await response.json();
      
      // Check if period is present in response
      if (result.period) {
        console.log(`✅ Period included: ${result.period}`);
        console.log(`📅 Data will display at bottom of component`);
      } else {
        console.log(`⚠️  No period in response (component may use fallback data)`);
      }
      
      // Show data summary
      if (result.status && result.data) {
        if (Array.isArray(result.data)) {
          console.log(`📊 Records returned: ${result.data.length}`);
          if (result.data.length > 0 && typeof result.data[0] === 'object') {
            const firstItem = result.data[0];
            console.log(`📋 Sample keys: ${Object.keys(firstItem).slice(0, 3).join(', ')}`);
          }
        } else {
          console.log(`📊 Data type: ${typeof result.data}`);
        }
      }
      
      // Show source
      if (result.source) {
        console.log(`🔌 Source: ${result.source}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✨ DASHBOARD COMPONENT PERIOD DISPLAY VERIFICATION COMPLETE\n');
  console.log('Expected behavior:');
  console.log('  • Each component should show its data source period at the bottom');
  console.log('  • Format: "Data from: Last 30 days", "Data from: Last 90 days", etc.');
  console.log('  • All components should use the same period if possible\n');
}

verifyDateRangesDisplay().catch(console.error);
