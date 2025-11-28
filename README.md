<p align="center">
  <img src="public/CTI_Icon.svg" alt="CTI BI" width="96" />
</p>

# CTI BI Web App

A Next.js 15 business intelligence platform for CTI operations: timesheets, projects, invoicing, dashboards and PDF reporting. Built with React 19, Tailwind CSS 4, shadcn/Radix UI, Firebase (Auth, Firestore, Storage) and Syncfusion.

[!TIP]
Use the command palette (⌘K) and keyboard shortcuts to speed up navigation and tasks.

## Features

- Authentication with Firebase; protected routes via middleware
- Role-based access control and permissions
- Management modules: companies, departments, employees, projects, contracts
- Timesheets upload, utilization and manpower dashboards
- Invoicing workflows and payment tracking
- PDF generation for reports and packets, in-app PDF viewing (Syncfusion)
- Modern UI components, theming and accessibility helpers
- Error boundary and toast notifications

## Tech Stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4, shadcn UI, Radix UI primitives
- Firebase (Auth, Firestore, Storage) client and Admin SDK
- Syncfusion PDF Viewer
- Testing with Vitest

## Quick Start

Prerequisites:
- Node.js >= 20

Install and run:

```zsh
# Install dependencies
npm install

# Start the dev server
npm run dev
# http://localhost:3000
```

[!NOTE]
The route `/login` redirects to `/dashboard` after auth.

## Environment Variables

Create `.env.local` with client and server settings:

```dotenv
# Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Optional: Firebase emulators for local development
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://localhost:9099
NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080
NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199

# Server (secret)
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=... # keep line breaks, or use \n
FIREBASE_PROJECT_ID=...

# Syncfusion
NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY=...
```

[!IMPORTANT]
Never commit secrets. Configure server-side creds for PDF generation and Admin APIs.

## Scripts

```zsh
npm run dev         # Start Next.js in dev
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run test        # Run Vitest once
npm run test:watch  # Run Vitest in watch mode
npm run preview-pdf # Generate a preview timesheet PDF
npm run watch-pdf   # Watch template changes and re-generate PDF
```

## Architecture

- `src/app/*` Next.js routes and layouts (App Router)
- `middleware.ts` Security headers, CSRF validation, rate limiting and route protection
- `src/lib/firebase-client.ts` Client Firebase init; optional emulator support in dev
- `src/lib/firebase-admin.ts` Admin SDK init for server-side tasks (PDF, storage)
- `src/services/firestore.ts` Firestore access layer for core collections
- `src/components/*` UI, PDF viewer and feature components
- `src/hooks/*` Auth, forms, keyboard shortcuts and utilities
- `public/*` Static assets, service worker

[!NOTE]
Firestore indexes are defined in `firestore.indexes.json`. Ensure they are deployed for production queries.

## Data & Modules

Primary collections used:
- `users`, `employees`, `departments`, `companies`, `clients`, `contracts`, `services`
- `projects`, `resource_allocations`, `cti_timesheets`, `companyRateTemplates`

PDF & reporting:
- Generators in `src/lib/*pdf*.ts` and Syncfusion viewer in `src/components/pdf-viewer/`
- Preview tooling via `preview-pdf.ts` and `watch-pdf.js`

## Security

- Strict security headers and Content Security Policy
- CSRF token validation for state-changing requests
- Rate limiting on auth endpoints
- Server-side route protection with auth checks

[!WARNING]
In production, use secure stores (e.g., Redis) for rate limits and CSRF/session management.

## Testing

Run tests:

```zsh
npm run test
```

Add tests under `src/**/__tests__` or co-located with modules.

## Deployment

1. Set environment variables on the hosting platform (Vercel/Azure/Custom).
2. Build and start:
   ```zsh
   npm run build && npm run start
   ```
3. Configure Firebase service account for server-side features.

[!TIP]
Enable Firebase emulators locally for faster iteration (Auth, Firestore, Storage).

## Project Structure

```
ctibiwebapp/
  public/                 # Icons, service worker
  src/
    app/                  # App routes and pages
    components/           # UI and feature components
    hooks/                # React hooks
    lib/                  # Firebase init, PDF generators, utils
    services/             # Firestore access layer
    types/                # Shared types
  middleware.ts           # Security & protection
  package.json            # Scripts and dependencies
```

---

For issues or improvements, open an issue and describe the context and expected behavior.