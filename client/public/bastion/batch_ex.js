const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const axios = require('axios');

// Folder containing PDFs
const pdfFolder = path.join(__dirname, 'uploads'); // change as needed

// Column mapping (same as your previous prompts)
const columns = [
  "Patient name", "Wound location", "Etiology", "Wound size", "Wound Surface area",
  "Wound exudate", "Wound tissue type", "Dressing treatment plan", "Frequency",
  "Wound progress", "Disposition", "Date of service", "Facility name", "Provider",
  "Debridement", "Initial surface area", "Wound start date", "Present on admission",
  "Hospice", "Objective"
];

// Function to process one PDF
async function processPdf(filePath, fileName) {
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(pdfBuffer);
  const extractedText = pdfData.text;

  // Prepare BastionGPT prompt
  const prompt = `Please extract wound data from the text provided below and generate a wound rounds summary table for my nurses using the following columns in this exact order. Each column must match the specified Excel column letter... [column mapping and instructions as previously provided]\n\n${extractedText}`;

  // Call BastionGPT API (replace with your endpoint and key)
  const bastionResponse = await axios.post(
    'https://api.bastiongpt.example.com/v1/extract', // <-- replace with actual endpoint
    { prompt },
    { headers: { Authorization: `Bearer YOUR_API_KEY` } }
  );

  // Parse TSV response
  const tsv = bastionResponse.data.choices[0].text.replace(/```/g, '').trim();
  const rows = tsv.split('\n').map(line => line.split('\t'));
  const jsonResult = rows.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i] || '-'])));

  // Return filename and wounds
  return { filename: fileName, wounds: jsonResult };
}

async function batchProcessFolder() {
  const pdfFiles = fs.readdirSync(pdfFolder).filter(f => f.toLowerCase().endsWith('.pdf'));
  const results = [];

  for (const fileName of pdfFiles) {
    const filePath = path.join(pdfFolder, fileName);
    try {
      const result = await processPdf(filePath, fileName);
      results.push(result);
      console.log(`Processed: ${fileName}`);
    } catch (err) {
      console.error(`Error processing ${fileName}:`, err.message);
    }
  }

  // Save results to JSON file, or output to console
  fs.writeFileSync('batch_results.json', JSON.stringify(results, null, 2));
  console.log('All results saved to batch_results.json');
}

batchProcessFolder();