# New Dawn -- Full-Build Prompt Outline

## 1. PROJECT CONTEXT

You are building "New Dawn," a full-stack web application for a nonprofit that operates safehouses for girls who are survivors of abuse/trafficking in the Philippines. The app serves two audiences: (1) internal staff managing cases and operations, and (2) donors/public viewing impact. The organization is donation-funded, runs multiple safehouses with limited staff, and relies on social media for outreach.

**Tech stack (locked in):**
- Backend: .NET 10 / C# Web API
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL (Supabase)
- Deployment target: Cloud (Azure recommended)

**Existing scaffolding:** Barebones project with health endpoint, DB smoke test, CORS configured for localhost:5173. Folder contract: `Models/`, `Controllers/`, `Data/`.

**Data:** 17 CSV files in `lighthouse_csv_v7/` covering 3 domains -- provide the full CSV header list and data dictionary summary for each table.

---

## 2. DATABASE LAYER

### 2a. Schema Design
- Create EF Core entity models for all 17 tables with proper types, nullable fields, and data annotations
- Define all foreign key relationships:
  - `residents.safehouse_id` -> `safehouses`
  - `donations.supporter_id` -> `supporters`
  - `donations.referral_post_id` -> `social_media_posts`
  - `donation_allocations.donation_id` -> `donations`, `.safehouse_id` -> `safehouses`
  - `in_kind_donation_items.donation_id` -> `donations`
  - `partner_assignments.partner_id` -> `partners`, `.safehouse_id` -> `safehouses`
  - `process_recordings.resident_id` -> `residents`
  - `home_visitations.resident_id` -> `residents`
  - `education_records.resident_id` -> `residents`
  - `health_wellbeing_records.resident_id` -> `residents`
  - `intervention_plans.resident_id` -> `residents`
  - `incident_reports.resident_id` -> `residents`, `.safehouse_id` -> `safehouses`
  - `safehouse_monthly_metrics.safehouse_id` -> `safehouses`
- Add indexes on frequently filtered columns (case_status, safehouse_id, supporter_type, donation_date, etc.)
- Add an `ApplicationUser` entity extending `IdentityUser` for ASP.NET Identity

### 2b. Seed Data
- Build a CSV import utility/migration that loads all 17 CSVs into the database
- Seed at least 3 user accounts: admin (no MFA), donor (no MFA, linked to existing supporter/donation data), and one account with MFA enabled

### 2c. Identity Database
- Use a "real" DBMS for the identity store (not SQLite) -- same Postgres instance or separate
- Configure ASP.NET Identity with custom `PasswordOptions` (as taught in class -- do NOT use default or Microsoft-suggested values)

---

## 3. BACKEND API (ASP.NET Web API)

### 3a. Authentication & Authorization
- **ASP.NET Identity** with username/password login, JWT or cookie-based auth
- **Role-Based Access Control (RBAC):** Roles: `Admin`, `Donor` (and optionally `Staff`)
  - Admin: full CRUD on all operational data
  - Donor: read-only on their own donation history + impact data
  - Unauthenticated: public pages only (home, impact dashboard, privacy policy)
- **Password policy:** Custom `PasswordOptions` configured as taught in class lab
- **MFA:** At least one form of two-factor or multi-factor authentication
- **Third-party auth:** At least one OAuth provider (Google, Facebook, etc.)
- All CUD endpoints require `[Authorize(Roles = "Admin")]`
- Login/register/auth endpoints are unauthenticated
- Read endpoints: public data unauthenticated, sensitive data requires auth

### 3b. Controllers (RESTful CRUD)

| Controller | Key Endpoints | Auth |
|---|---|---|
| `AuthController` | POST /api/auth/register, /login, /logout, /me, /mfa/* | Public (login/register), Auth (me) |
| `SafehousesController` | GET/POST/PUT/DELETE /api/safehouses | Read: Auth, CUD: Admin |
| `ResidentsController` | Full CRUD + filtering by case_status, safehouse, category | Admin/Staff |
| `ProcessRecordingsController` | CRUD per resident, chronological listing | Admin/Staff |
| `HomeVisitationsController` | CRUD per resident | Admin/Staff |
| `EducationRecordsController` | CRUD per resident | Admin/Staff |
| `HealthRecordsController` | CRUD per resident | Admin/Staff |
| `InterventionPlansController` | CRUD per resident | Admin/Staff |
| `IncidentReportsController` | CRUD per resident/safehouse | Admin/Staff |
| `SupportersController` | Full CRUD + filtering by type, status | Admin (full), Donor (own) |
| `DonationsController` | Full CRUD + filtering by type, campaign, date range | Admin (full), Donor (own) |
| `DonationAllocationsController` | CRUD, view by safehouse/program | Admin |
| `InKindDonationItemsController` | CRUD per donation | Admin |
| `PartnersController` | Full CRUD | Admin |
| `PartnerAssignmentsController` | CRUD | Admin |
| `SocialMediaPostsController` | Full CRUD + analytics queries | Admin |
| `PublicImpactController` | GET aggregated anonymized impact data | Public |
| `ReportsController` | Aggregation endpoints for dashboards | Admin |
| `SafehouseMetricsController` | GET monthly metrics | Admin |

### 3c. Additional Backend Requirements
- **Delete confirmation:** All DELETE endpoints require a confirmation parameter/header
- **Data sanitization:** Sanitize all incoming data to prevent injection
- **Pagination:** Support pagination on all list endpoints
- **Filtering/Search:** Support filtering on key fields (Caseload: case_status, safehouse, category; Donors: type, status; Donations: type, date range, campaign)
- **CSP Header:** Add `Content-Security-Policy` HTTP header via middleware (not meta tag)
- **HSTS:** Enable HTTP Strict Transport Security
- **HTTPS:** Enforce HTTPS, redirect HTTP -> HTTPS
- **Credentials:** Use .env / environment variables for all secrets, never commit to repo

---

## 4. FRONTEND (React + TypeScript + Vite)

### 4a. Public Pages (Unauthenticated)

**Home / Landing Page**
- Organization name, mission statement, hero section
- Key impact stats (pulled from `public_impact_snapshots`)
- Call-to-action buttons (Donate, Learn More, Login)
- Footer with privacy policy link
- Modern, professional design -- not generic AI look

**Impact / Donor-Facing Dashboard**
- Aggregated, anonymized data visualizations (charts/graphs)
- Total residents served, donation totals, education outcomes, health improvements
- Safehouse performance comparisons
- Use charting library (Recharts, Chart.js, etc.)

**Login Page**
- Username/password form with validation and error handling
- Link to register
- Third-party OAuth login button(s)
- MFA challenge flow when required

**Privacy Policy + Cookie Consent**
- Full GDPR-compliant privacy policy page (customized to the organization)
- GDPR cookie consent banner (functional, not just cosmetic)
- Browser-accessible cookie saving a user preference (e.g., dark/light mode) that React reads and applies

### 4b. Admin / Staff Portal (Authenticated)

**Admin Dashboard**
- Active residents count per safehouse
- Recent donations summary
- Upcoming case conferences
- Summarized progress data
- Quick-nav cards to each section
- OKR metric display (one meaningful metric with explanation)

**Donors & Contributions**
- Table/list of all supporters with filtering by type (MonetaryDonor, Volunteer, etc.) and status
- Create/edit supporter profiles
- View all donations for a supporter across all types (monetary, in-kind, time, skills, social media)
- Donation allocation view by safehouse and program area
- For Donor role: show only their own history + impact of their donations

**Caseload Inventory (Core Case Management)**
- Table of all residents with rich filtering and search (case_status, safehouse, case_category, risk_level, sub-categories)
- Resident detail/profile page showing:
  - Demographics, case info, sub-categories
  - Disability info, family socio-demographic profile
  - Admission details, referral info
  - Assigned social worker, case assessment
  - Reintegration tracking
- Create/edit resident records
- All fields from the `residents` table represented

**Process Recording**
- Form to create new counseling session entries per resident
- Fields: session_date, social_worker, session_type, duration, emotional_state_observed, emotional_state_end, narrative, interventions, follow_up_actions, progress_noted, concerns_flagged, referral_made
- Chronological history view per resident
- Restricted notes field (access-controlled)

**Home Visitation & Case Conferences**
- Log visits with all fields (visit_type, location, family_members, purpose, observations, cooperation_level, safety_concerns, follow_up, outcome)
- View visit history per resident
- Case conference scheduling/history view

**Education Records**
- Monthly records per resident (education_level, school_name, enrollment_status, attendance_rate, progress_percent, completion_status)
- Progress visualization over time

**Health & Wellbeing Records**
- Monthly records per resident (health scores, nutrition, sleep, energy, BMI, checkups)
- Trend visualization

**Intervention Plans**
- Per-resident plans with category, description, services, targets, status, case conference dates
- Status tracking (Open, In Progress, Achieved, On Hold, Closed)

**Incident Reports**
- Per-resident and per-safehouse view
- Full form: type, severity, description, response, resolution tracking
- Filter by type, severity, resolved status

**Reports & Analytics**
- Donation trends over time (line/bar charts)
- Resident outcome metrics (education progress, health improvements)
- Safehouse performance comparisons
- Reintegration success rates
- Structure aligned with Annual Accomplishment Report format (caring, healing, teaching, beneficiary counts, program outcomes)

**Social Media Analytics**
- Post performance table with engagement metrics
- Best performing content analysis (by platform, post_type, media_type, day_of_week, post_hour)
- Donation referral tracking from social posts
- Campaign effectiveness comparison

### 4c. Cross-Cutting Frontend Requirements
- **Responsiveness:** Every page works on desktop and mobile
- **Accessibility:** Lighthouse score >= 90 on every page
- **Consistent design:** Titles, icons, consistent look and feel, pagination
- **Dark/light mode:** Toggle saved in browser-accessible cookie
- **Delete confirmation:** Modal/dialog before any delete operation
- **Error handling:** Form validation, API error display
- **Loading states:** Spinners/skeletons for async data

---

## 5. SECURITY REQUIREMENTS (IS 414 -- 18 pts rubric)

| Requirement | Points | Implementation |
|---|---|---|
| HTTPS/TLS | 1 | Cloud provider cert, enforce HTTPS |
| HTTP -> HTTPS redirect | 0.5 | Middleware or cloud config |
| Username/password auth | 3 | ASP.NET Identity, JWT/cookies |
| Better password policy | 1 | Custom PasswordOptions (as taught in class) |
| Auth on pages/API endpoints | 1 | `[Authorize]` attributes, React route guards |
| RBAC -- Admin only CUD | 1.5 | Role-based `[Authorize(Roles="Admin")]` |
| Delete confirmation | 1 | Confirmation dialogs + backend param |
| Credentials stored securely | 1 | .env files, not in repo |
| Privacy policy | 1 | Custom GDPR-compliant page |
| GDPR cookie consent | 1 | Functional consent banner |
| CSP header | 2 | Backend middleware, proper directives |
| Deployed publicly | 4 | Azure App Service (or similar) |
| Additional security features | 2 | Third-party OAuth, MFA, HSTS, browser cookie for user setting, data sanitization, real DBMS for identity, Docker deployment |

---

## 6. DEPLOYMENT

- Deploy backend to Azure App Service (or equivalent cloud)
- Deploy frontend (build output) -- either same service or static hosting
- PostgreSQL database accessible from deployed backend
- HTTPS with valid certificate
- HTTP -> HTTPS redirect
- HSTS enabled
- CSP header present in response headers (verifiable in browser DevTools)
- Seed database with CSV data on deployment
- Create seeded user accounts (admin without MFA, donor without MFA, one with MFA)

---

## 7. ML PIPELINES (IS 455 -- 20 pts)

Submit Jupyter notebooks in `ml-pipelines/` folder. Each pipeline must follow the full lifecycle and address a **different business problem**. Target 2-4 quality pipelines.

### Pipeline 1: Donor Churn / Lapse Prediction (Predictive)
- **Problem:** Which donors are at risk of lapsing? Enable proactive retention outreach.
- **Tables:** `supporters`, `donations`, `donation_allocations`, `social_media_posts`
- **Features to engineer:** days since last donation, donation frequency, average amount, recurring flag, total lifetime value, acquisition channel, relationship type, time since first donation
- **Model options:** Classification (logistic regression, decision tree, random forest, gradient boosting)
- **Deploy:** API endpoint + dashboard widget showing at-risk donors

### Pipeline 2: Social Media Effectiveness -> Donations (Explanatory)
- **Problem:** What content factors actually drive donation referrals? Guide social media strategy.
- **Tables:** `social_media_posts`, `donations` (via referral_post_id)
- **Features:** platform, post_type, media_type, day_of_week, post_hour, content_topic, sentiment_tone, has_call_to_action, call_to_action_type, is_boosted, caption_length, num_hashtags, features_resident_story
- **Model:** OLS regression for causal interpretation, coefficients matter more than R-squared
- **Deploy:** Analytics dashboard showing which content strategies convert

### Pipeline 3: Resident Reintegration Readiness (Predictive)
- **Problem:** Can we forecast which residents are ready for reintegration to help staff prioritize?
- **Tables:** `residents`, `process_recordings`, `education_records`, `health_wellbeing_records`, `intervention_plans`, `home_visitations`, `incident_reports`
- **Features to engineer:** length of stay, education progress trend, health score trend, counseling session count, emotional state improvements, incident frequency, home visit cooperation scores, intervention plan completion rate, risk level trajectory
- **Model:** Classification (ready vs. not ready) or regression (readiness score)
- **Deploy:** Staff dashboard indicator per resident

### Pipeline 4 (stretch): Safehouse Resource Optimization (Explanatory)
- **Problem:** What factors drive better resident outcomes across safehouses?
- **Tables:** `safehouse_monthly_metrics`, `safehouses`, `partner_assignments`, `residents`
- **Model:** Regression explaining what operational inputs correlate with better outcomes
- **Deploy:** Comparative dashboard

### Each Notebook Must Include:
1. **Problem Framing** -- business problem, who cares, predictive vs. explanatory justification
2. **Data Acquisition, Preparation & Exploration** -- load CSVs, EDA with visualizations, missing value handling, feature engineering, reproducible pipeline
3. **Modeling & Feature Selection** -- multiple approaches compared, feature selection justified, hyperparameter tuning
4. **Evaluation & Interpretation** -- proper validation (train/test split, cross-validation), metrics in business terms, real-world consequences of errors
5. **Causal and Relationship Analysis** -- feature importances, coefficients, honest about correlation vs. causation
6. **Deployment Notes** -- how it integrates with the web app (API endpoint, dashboard component)

---

## 8. BUILD ORDER (Suggested Implementation Sequence)

1. **Database schema + migrations** -- all 17 entity models, AppDbContext, relationships, indexes
2. **Identity setup** -- ASP.NET Identity with custom password policy, roles, JWT auth
3. **CSV seed migration** -- load all data
4. **Core API controllers** -- CRUD for all entities with auth/RBAC
5. **Frontend auth flow** -- login, register, route guards, role-based nav
6. **Public pages** -- landing, impact dashboard, privacy policy, cookie consent
7. **Admin dashboard** -- overview metrics
8. **Caseload inventory** -- residents CRUD with full filtering
9. **Case management pages** -- process recordings, home visits, education, health, interventions, incidents
10. **Donors & contributions** -- supporter management, donation tracking, allocations
11. **Reports & analytics** -- charts, trend visualizations
12. **Social media analytics** -- post performance, content strategy insights
13. **Security hardening** -- CSP header, HSTS, HTTPS redirect, MFA, OAuth, data sanitization, delete confirmations
14. **Dark/light mode** -- cookie-based preference
15. **ML pipelines** -- notebooks with full lifecycle
16. **ML integration** -- API endpoints serving model predictions, dashboard widgets
17. **Deployment** -- Azure, HTTPS, seed data, user accounts
18. **Responsiveness + accessibility** -- every page mobile-friendly, Lighthouse >= 90
19. **Polish** -- pagination everywhere, loading states, error handling, icons, consistent design
