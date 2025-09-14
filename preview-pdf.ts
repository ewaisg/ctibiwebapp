import { writeFileSync } from 'fs';
import { generatePreviewPDF } from './src/lib/timesheet-report-pdf';

async function createPreview() {
  try {
    console.log('Generating preview PDF...');
    const pdfBuffer = await generatePreviewPDF();
    writeFileSync('timesheet-preview.pdf', pdfBuffer);
    console.log('✅ Preview PDF generated: timesheet-preview.pdf');
    console.log('Open the file to see how your template looks!');
  } catch (error) {
    console.error('❌ Error generating preview:', error);
  }
}

createPreview();