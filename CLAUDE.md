# New Dawn - Project Instructions

## Project Overview
Nonprofit safehouse management app for girls rescued from abuse/trafficking in the Philippines.
Two audiences: (1) internal staff managing cases/operations, (2) donors/public viewing impact.

## Tech Stack
- Backend: .NET 10 / C# Web API, EF Core 9, PostgreSQL (Supabase)
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- State: Zustand (client), React Query (server)
- Auth: ASP.NET Identity + JWT + Google OAuth
- Charts: Recharts
- Forms: react-hook-form + zod
- Icons: lucide-react
- ML: Python, scikit-learn, statsmodels, Jupyter notebooks

## Build Commands
```bash
# Backend
cd backend/New_Dawn/New_Dawn && dotnet build
cd backend/New_Dawn/New_Dawn && dotnet run
cd backend/New_Dawn/New_Dawn && dotnet ef migrations add <Name>
cd backend/New_Dawn/New_Dawn && dotnet ef database update

# Frontend
cd frontend && npm install
cd frontend && npm run dev
cd frontend && npm run build

# ML
cd ml-pipelines && pip install -r requirements.txt
```

## Code Conventions

### C# / Backend
- Use primary constructors (C# 12): `public class FooController(AppDbContext db) : ControllerBase`
- Models use `[Table("snake_case", Schema = "public")]` and `[Column("snake_case")]`
- C# properties: PascalCase. DB columns: snake_case
- Namespace: `New_Dawn.{Feature}` (Models, Controllers, Data, Middleware, DTOs, Services)
- API responses: anonymous objects `new { success, message, data }`
- All list endpoints return `{ items, totalCount, page, pageSize, totalPages }`
- DELETE endpoints require `?confirm=true` query parameter
- Pagination: `?page=1&pageSize=20`, default 20, max 100

### TypeScript / Frontend
- Functional components with hooks
- Feature-based folder structure: `src/features/{feature}/`
- Shared UI in `src/components/ui/` and `src/components/layout/`
- API calls through `src/lib/api.ts` wrapper
- Types in `src/types/`
- Zustand stores in `src/stores/`
- Use react-hook-form + zod for all forms
- Use React Query for all API data fetching

### Style Guide
- Colors: White (#FFFFFF), Sky Blue (#A2C9E1), Sage Green (#91B191), Slate Navy (#2D3A4A), Golden Honey (#FFCC66), Coral Pink (#FFE6E1)
- Headings: Inter/Poppins, Title Case
- Body: Montserrat, Sentence case
- Dark mode: class strategy on `<html>`, stored in cookie `nd_theme`
- Aesthetic: Clean, minimal, calming, significant whitespace. No harsh imagery.

## Architecture Rules
- Never commit .env files or secrets
- All secrets via environment variables
- CSP header via middleware (not meta tag)
- RBAC: Admin = full CRUD, Donor = read own data, Public = unauthenticated endpoints
- All sensitive data endpoints require `[Authorize]`
- Frontend route guards via ProtectedRoute component
- Logo assets in `frontend/src/assets/`

## Data
- 17 CSV files in `lighthouse_csv_v7/` with seed data
- Primary keys are integer IDs (e.g., resident_id, safehouse_id)
- Foreign keys follow pattern: `child.parent_id -> parent.parent_id`

## When Compacting
Always preserve: modified file list, current phase progress, build errors encountered, and architectural decisions made.
