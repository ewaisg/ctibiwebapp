"use client";

import { registerLicense } from '@syncfusion/ej2-base';

// Registering Syncfusion license key
// This key was found in syncfusion-license.txt
// Check if window is defined to avoid server-side errors during SSR
if (typeof window !== 'undefined') {
  registerLicense('Ngo9BigBOggjHTQxAR8/V1JFaF5cXGRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWH5cd3VSRmBdWUN2XURWYEg=');
}

export default function SyncfusionLicenseRegistry() {
  return null;
}
