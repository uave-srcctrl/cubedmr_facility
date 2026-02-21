const pLimit = require('p-limit');
const limit = pLimit(5); // Only 5 concurrent requests

const promises = pdfFiles.map(fileName => {
  const filePath = path.join(pdfFolder, fileName);
  return limit(() => processPdf(filePath, fileName));
});

const results = await Promise.all(promises);