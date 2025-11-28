const { watch } = require('fs');
const { exec } = require('child_process');

console.log('👀 Watching for changes...');

watch('./src/lib/timesheet-report-pdf.ts', () => {
  console.log('🔄 File changed, regenerating PDF...');
  exec('npm run preview-pdf', (error, stdout) => {
    if (error) console.error('❌', error.message);
    else console.log('✅ PDF updated');
  });
});