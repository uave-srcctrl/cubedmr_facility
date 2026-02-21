// src/components/PdfUpload.js
import React, { useState } from 'react';

function PdfUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [jsonResult, setJsonResult] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('pdf', selectedFile);

    const response = await fetch('/api/extract-wound-data', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    setJsonResult(data);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        <button type="submit">Upload PDF</button>
      </form>
      {jsonResult && (
        <pre>{JSON.stringify(jsonResult, null, 2)}</pre>
      )}
    </div>
  );
}

export default PdfUpload;