const fs = require('fs');
const { generatePreviewPDF } = require('./src/lib/timesheet-report-pdf');

async function createPreview() {
  try {
    const pdfBuffer = await generatePreviewPDF();
    fs.writeFileSync('timesheet-preview.pdf', pdfBuffer);
    console.log('Preview PDF generated: timesheet-preview.pdf');
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}

createPreview();