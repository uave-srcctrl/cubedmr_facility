const express = require('express');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const axios = require('axios');

const app = express();
const PORT = 5000;

app.use(express.json()); // For parsing JSON request bodies

const columns = [
  "Patient name", "Wound location", "Etiology", "Wound size", "Wound Surface area",
  "Wound exudate", "Wound tissue type", "Dressing treatment plan", "Frequency",
  "Wound progress", "Disposition", "Date of service", "Facility name", "Provider",
  "Debridement", "Initial surface area", "Wound start date", "Present on admission",
  "Hospice", "Objective"
];

// Async function to process a single PDF
async function processPdf(filePath, fileName) {
  let wounds = [];
  let error = null;
  try {
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
    wounds = rows.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i] || '-'])));
  } catch (err) {
    error = err.message || 'Unknown error';
  }
  return { filename: fileName, wounds, error };
}

// POST endpoint for batch processing
app.post('/api/batch-extract-folder', async (req, res) => {
  try {
    // Accept custom folder path or use default
    const pdfFolder = req.body.folderPath
      ? path.resolve(req.body.folderPath)
      : path.join(__dirname, 'uploads');

    const pdfFiles = fs.readdirSync(pdfFolder).filter(f => f.toLowerCase().endsWith('.pdf'));

    // Parallel processing using Promise.all
    const promises = pdfFiles.map(fileName => {
      const filePath = path.join(pdfFolder, fileName);
      return processPdf(filePath, fileName);
    });

    const results = await Promise.all(promises);

    // Log errors and successes
    results.forEach(result => {
      if (result.error) {
        console.error(`Error processing ${result.filename}: ${result.error}`);
      } else {
        console.log(`Processed: ${result.filename}`);
      }
    });

    res.json(results); // Array of { filename, wounds, error }
  } catch (err) {
    console.error('Batch extraction failed:', err.message);
    res.status(500).json({ error: 'Batch extraction failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});