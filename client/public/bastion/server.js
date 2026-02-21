// server.js
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const app = express();
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

app.post('/api/extract-wound-data', upload.single('pdf'), async (req, res) => {
  try {
    // Step 1: Read PDF and extract text
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text;

    // Step 2: Prepare BastionGPT prompt
    const prompt = `Please extract wound data from the text provided below and generate a wound rounds summary table for my nurses using the following columns in this exact order. Each column must match the specified Excel column letter... [column mapping and instructions as previously provided]\n\n${extractedText}`;

    // Step 3: Call BastionGPT (replace with your BastionGPT API endpoint and auth)
    const bastionResponse = await axios.post(
      'https://api.bastiongpt.example.com/v1/extract', // <-- replace with actual endpoint
      { prompt },
      { headers: { Authorization: `Bearer YOUR_API_KEY` } }
    );

    // Step 4: Parse BastionGPT response (TSV in code block)
    const tsv = bastionResponse.data.choices[0].text
      .replace(/```/g, '').trim();

    // Step 5: Convert TSV to JSON
    const columns = [
      "Patient name", "Wound location", "Etiology", "Wound size", "Wound Surface area",
      "Wound exudate", "Wound tissue type", "Dressing treatment plan", "Frequency",
      "Wound progress", "Disposition", "Date of service", "Facility name", "Provider",
      "Debridement", "Initial surface area", "Wound start date", "Present on admission",
      "Hospice", "Objective"
    ];
    const rows = tsv.split('\n').map(line => line.split('\t'));
    const jsonResult = rows.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i] || '-'])));

    // Step 6: Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(jsonResult);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));