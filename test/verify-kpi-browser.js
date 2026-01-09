/**
 * Script to test KPI display in the browser
 * This extracts KPI values from the DOM for visual verification
 */

function extractKPIData() {
  const kpiCards = document.querySelectorAll('[class*="border-l-"]');
  const kpiData = [];

  kpiCards.forEach((card) => {
    const title = card.querySelector('[class*="text-sm font-medium"]')?.textContent?.trim();
    const value = card.querySelector('[class*="text-4xl font-bold"]')?.textContent?.trim();
    
    if (title && value) {
      kpiData.push({
        title: title,
        value: value
      });
    }
  });

  return kpiData;
}

function getDataSourceBadge() {
  const badge = document.querySelector('[class*="badge"]');
  return badge?.textContent?.trim() || 'Not found';
}

function verifyKPIDisplay() {
  const kpiData = extractKPIData();
  const source = getDataSourceBadge();
  
  console.log('=== KPI Display Verification ===');
  console.log('Data Source:', source);
  console.log('KPI Cards found:', kpiData.length);
  
  if (kpiData.length >= 4) {
    console.log('✅ All 4 KPI cards visible');
    kpiData.forEach((card) => {
      console.log(`  - ${card.title}: ${card.value}`);
    });
    return true;
  } else {
    console.log('❌ Not all KPI cards visible. Found:', kpiData.length);
    return false;
  }
}

// Make function available in console
window.verifyKPIDisplay = verifyKPIDisplay;
console.log('KPI verification script loaded. Run: verifyKPIDisplay()');
