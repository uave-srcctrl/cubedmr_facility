const handleFileChange = (e) => {
  setSelectedFiles(Array.from(e.target.files));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!selectedFiles || selectedFiles.length === 0) return;
  const formData = new FormData();
  selectedFiles.forEach((file, idx) => {
    formData.append('pdfs', file); // 'pdfs' is the field name for all files
  });

  const response = await fetch('/api/extract-wound-data-multi', {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  setJsonResult(data); // This will be an array of JSON arrays
};