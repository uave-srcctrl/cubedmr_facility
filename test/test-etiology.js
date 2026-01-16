// Test script to check etiology endpoint response
const facilityId = "5";
const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

const url = `https://cubed-mr.app/api/reports/etiology-distribution/${facilityId}/${date}`;

console.log(`Testing etiology endpoint: ${url}`);
console.log(`Date: ${date}`);

fetch(url)
  .then(response => {
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    return response.text();
  })
  .then(text => {
    console.log(`Response length: ${text.length}`);
    console.log(`First 500 characters: ${text.substring(0, 500)}`);
    
    // Try to parse as JSON
    try {
      const json = JSON.parse(text);
      console.log(`Successfully parsed as JSON`);
      console.log(`Status: ${json.status}`);
      console.log(`Data length: ${json.data ? json.data.length : 'no data'}`);
      if (json.data && json.data.length > 0) {
        console.log(`First record:`, json.data[0]);
      }
    } catch (e) {
      console.log(`Failed to parse as JSON: ${e.message}`);
    }
  })
  .catch(error => {
    console.error(`Fetch error: ${error.message}`);
  });
