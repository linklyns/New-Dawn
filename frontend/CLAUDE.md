# Frontend Instructions

## Structure
```
frontend/src/
  assets/              # Logo PNGs, static images
  components/
    ui/                # Button, Input, Modal, Table, Card, Spinner, Badge
    layout/            # AppShell, Sidebar, Navbar, Footer, PageHeader
    charts/            # Recharts wrapper components
  features/
    auth/              # Login, Register, MFA, ProtectedRoute
    landing/           # Public landing page
    impact/            # Public impact dashboard
    privacy/           # Privacy policy, cookie consent
    dashboard/         # Admin dashboard
    residents/         # Caseload inventory, resident CRUD
    case-management/   # Process recordings, home visits, education, health, interventions, incidents
    donors/            # Supporters, donations, allocations
    reports/           # Reports & analytics
    social-media/      # Social analytics + AI editor
  hooks/               # useAuth, useDarkMode, useDebounce, usePagination
  lib/                 # api.ts, constants, utils
  stores/              # Zustand: authStore, themeStore, editorStore
  types/               # TypeScript interfaces matching backend models
  App.tsx              # Router configuration
  main.tsx             # Entry point
  index.css            # Tailwind imports + theme CSS vars
```

## Component Pattern
- Functional components with TypeScript
- Props typed with interface, not type alias
- Use React Query `useQuery`/`useMutation` for API calls
- Use react-hook-form + zod for forms
- Use lucide-react for icons (import specific icons)

## Styling
- Tailwind CSS v4 with CSS-first configuration
- Custom theme colors defined in index.css via @theme
- Dark mode via `dark:` variant, toggled by class on `<html>`
- No inline styles. No CSS modules. Tailwind utilities only.
- Responsive: mobile-first with sm:/md:/lg:/xl: breakpoints

## API Integration
- All calls through `lib/api.ts` fetch wrapper
- JWT stored in localStorage, attached as Bearer token
- 401 responses redirect to /login
- Environment: VITE_API_BASE_URL

## Key Libraries
- react-router-dom v7 (routing)
- zustand (client state)
- @tanstack/react-query v5 (server state)
- recharts (charts)
- react-hook-form + zod (forms)
- framer-motion (animations)
- lucide-react (icons)
- js-cookie (cookie management)
- date-fns (date formatting)
