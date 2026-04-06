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

Submit Jupyter notebooks in `ml-pipelines/` folder. Each pipeline must demonstrate **pipeline thinking** (Foreword) -- not just algorithm execution, but a complete end-to-end decision system from problem framing through deployment. Each pipeline must address a **genuinely different business problem**. Target 2-4 quality pipelines. Quality over quantity.

### Textbook Chapter-to-Pipeline Mapping

The textbook structures the full pipeline as follows (use this as your chapter reference for each stage):

| Pipeline Stage | Chapters | What to Demonstrate |
|---|---|---|
| **Problem Framing** | Foreword, Ch. 1 (CRISP-DM) | Business problem, success criteria, prediction vs. explanation choice, feasibility assessment (practical impact + data availability + analytical feasibility) |
| **Data Acquisition** | Ch. 4 (Pandas I/O), Ch. 5 (APIs) | Load CSVs from `lighthouse_csv_v7/`, join across tables, document data sources |
| **Data Preparation** | Ch. 2-3 (DataFrames, Wrangling), Ch. 7 (Automating Data Preparation Pipelines) | Build a **reproducible two-tier pipeline**: (1) dataset-specific `wrangle_*()` function for project-specific cleaning, (2) generalizable functions from `functions.py` -- `bin_categories()`, `skew_correct()`, `missing_drop()`, `missing_fill()`, `clean_outlier()`. Use `unistats()` output as diagnostic input. Handle missing values, outliers, skewed distributions, categorical encoding (dummy-code with reference category dropped), scaling/standardization. Expect 60-80% of pipeline effort here. |
| **Exploration** | Ch. 6 (Automating Feature-Level Exploration), Ch. 8 (Automating Relationship Discovery) | Run `unistats()` for univariate profiling. Automate bivariate analysis using the four relationship types: N2N (Pearson r, scatterplots), N2C (t-test/ANOVA F, mean-value bar charts), C2C (chi-square, crosstab heatmaps). Document distributions, correlations, anomalies -- these should directly inform modeling choices. |
| **Modeling** | Ch. 9 (MLR Concepts), Ch. 10 (MLR Diagnostics for Causal Inference), Ch. 11 (MLR for Predictive Inference), Ch. 12 (Decision Trees), Ch. 13 (Classification), Ch. 14 (Ensemble Methods) | For each pipeline, produce **both** a causal/explanatory model and a predictive model. Choose the right tool: explanatory pipelines should use carefully specified MLR with `statsmodels` (interpret coefficients, p-values, R-squared, Adjusted R-squared); predictive pipelines should use `scikit-learn` (train/test split, MAE/RMSE for regression, accuracy/AUC for classification). Available algorithms: MLR (Ch. 9-11), decision trees (Ch. 12), logistic regression and classification decision trees (Ch. 13), ensemble methods -- bagging, boosting (gradient boosting), stacking (Ch. 14). |
| **Evaluation & Selection** | Ch. 15 (Model Evaluation, Selection & Tuning) | Use proper validation: train/test splits, cross-validation (K-Fold, Stratified K-Fold, GroupKFold, TimeSeriesSplit as appropriate). Hyperparameter tuning via `GridSearchCV` or `RandomizedSearchCV`. Use learning curves and validation curves to diagnose overfitting/underfitting. Nested cross-validation for unbiased performance estimates. Compare multiple algorithms fairly. Interpret results **in business terms** -- not just R-squared or accuracy, but what the numbers mean for the organization's decisions. Discuss real-world consequences of false positives and false negatives. |
| **Feature Selection** | Ch. 16 (Feature Selection) | Distinguish between **causal feature selection** (focused on coefficient validity, removing confounders/multicollinearity via VIF) and **predictive feature selection** (focused on out-of-sample performance). Apply filter methods (variance thresholds, univariate tests, correlation analysis), wrapper methods (RFECV, sequential selection), and/or permutation feature importance. Integrate feature selection into scikit-learn pipelines to prevent data leakage. |
| **Deployment** | Ch. 17 (Deploying ML Pipelines) | Implement as an end-to-end ML pipeline with separate training and inference code paths. Use ETL to extract data from the operational database. Serialize trained models using `joblib` with training metadata (versioning). Build inference pipelines that load saved models and generate predictions on new data. Integrate into the web application via API endpoint, dashboard component, or interactive form. Consider scheduled retraining workflows and model drift monitoring. |

### Pipeline 1: Donor Churn / Lapse Prediction (Predictive)
- **Business Problem (Ch. 1):** The organization depends entirely on donations and loses donors without understanding why. Which donors are at risk of lapsing? This is a **predictive** pipeline -- the goal is to generate reliable classifications on new data so staff can proactively reach out to at-risk donors before they lapse.
- **Tables:** `supporters`, `donations`, `donation_allocations`, `social_media_posts`
- **Data Preparation (Ch. 7):** Engineer features: days since last donation, donation frequency, average amount, recurring flag, total lifetime value, acquisition channel, relationship type, time since first donation, donation type mix. Build a reproducible `wrangle_donors()` function, then apply generalizable cleaning pipeline.
- **Exploration (Ch. 6, 8):** Run `unistats()` on engineered features. Use bivariate automation to discover which features relate to the churn label (N2C: ANOVA F-tests for numeric features vs. churned/retained; C2C: chi-square for categorical features vs. churn).
- **Modeling (Ch. 13, 14):** Classification problem. Compare logistic regression (Ch. 13), classification decision tree (Ch. 13), and ensemble methods -- random forest, gradient boosting (Ch. 14). For each pipeline, also build an explanatory MLR/logistic model using `statsmodels` to understand which features are most important and why.
- **Evaluation (Ch. 15):** Stratified K-Fold cross-validation (class imbalance likely). Metrics: accuracy, precision, recall, F1, AUC-ROC. Interpret in business terms: what does a false negative mean (missed an at-risk donor) vs. false positive (wasted outreach on a loyal donor)? Hyperparameter tune the best model via `GridSearchCV`.
- **Feature Selection (Ch. 16):** Predictive feature selection -- RFECV or permutation importance to identify the minimal feature set that maintains performance.
- **Deployment (Ch. 17):** Serialize model with `joblib`. Build API endpoint that scores donors on demand. Dashboard widget showing at-risk donors ranked by churn probability.

### Pipeline 2: Social Media Content -> Donation Referrals (Explanatory)
- **Business Problem (Ch. 1):** The founders are not experienced with social media and want data-driven guidance. What content factors actually drive donation referrals? This is an **explanatory** pipeline -- the goal is to understand cause-and-effect relationships between content decisions and donation outcomes so the organization can make better strategic choices. Interpretability and coefficient validity matter more than predictive accuracy.
- **Tables:** `social_media_posts`, `donations` (linked via `referral_post_id`)
- **Data Preparation (Ch. 7):** Join posts to donation referral counts. Engineer features from post metadata. Dummy-code categoricals (platform, post_type, media_type, content_topic, sentiment_tone, call_to_action_type) dropping one reference category each to avoid multicollinearity. Apply `skew_correct()` to numeric features (impressions, reach, caption_length).
- **Exploration (Ch. 6, 8):** N2N analysis (Pearson r between engagement metrics and donation_referrals), N2C analysis (ANOVA F: does donation referral count differ by platform? by post_type?), C2C (chi-square: is call_to_action_type independent of content_topic?).
- **Modeling (Ch. 9, 10):** Primary model: MLR using `statsmodels` OLS. Interpret coefficients (e.g., "posts with DonateNow CTA are associated with X more referrals, holding other factors constant"). Run full **regression diagnostics (Ch. 10)**: check the five core assumptions -- normality (residual plots, Q-Q), multicollinearity (VIF, correlation heatmaps), autocorrelation, linearity (residual-vs-fitted), homoscedasticity. Apply label transformations (log, Box-Cox, Yeo-Johnson) if residual normality is violated. Address multicollinearity by removing high-VIF features or using polynomial features for nonlinearity. Also build a predictive comparison model with `scikit-learn` to show the tradeoff.
- **Evaluation (Ch. 15):** For the explanatory model: R-squared, Adjusted R-squared, F-statistic, individual t-values/p-values, coefficient confidence intervals. For predictive comparison: train/test split, MAE, RMSE. Be honest about the limitations -- correlation is not causation, and discuss which causal claims are defensible vs. which are observational associations.
- **Feature Selection (Ch. 16):** Causal feature selection -- focus on VIF analysis and domain reasoning. Remove features that introduce confounding rather than features that reduce accuracy.
- **Deployment (Ch. 17):** Analytics dashboard showing coefficient magnitudes and actionable recommendations (e.g., "prioritize Video content on Instagram with DonateNow CTAs"). Not a real-time prediction endpoint -- the value is the insight, not the score.

### Pipeline 3: Resident Reintegration Readiness (Predictive)
- **Business Problem (Ch. 1):** Staff worry about girls falling through the cracks. Can we forecast which residents are progressing toward reintegration readiness? This is a **predictive** pipeline -- the goal is to generate a readiness score/classification that helps staff prioritize attention, not to explain why certain factors matter (though we will discuss that).
- **Tables:** `residents`, `process_recordings`, `education_records`, `health_wellbeing_records`, `intervention_plans`, `home_visitations`, `incident_reports`
- **Data Preparation (Ch. 7):** Heavy multi-table join and aggregation. For each resident, engineer: length of stay, mean education progress_percent, education progress trend (slope), mean general_health_score, health trend, total counseling sessions, emotional improvement ratio (sessions ending in positive state / total), incident count and severity distribution, home visit cooperation mode, intervention plan completion rate, risk level trajectory (initial vs. current). Build `wrangle_residents()` to handle all resident-specific joins, then apply generalizable pipeline.
- **Exploration (Ch. 6, 8):** Automated univariate and bivariate exploration of engineered features against the target (reintegration_status as label). Identify which features show the strongest signal.
- **Modeling (Ch. 12, 13, 14):** Target: classify reintegration_status (Completed vs. Not Started/In Progress/On Hold). Compare decision tree (Ch. 12 -- useful for interpretability of splits), logistic regression (Ch. 13), and gradient boosting ensemble (Ch. 14). Also build an explanatory MLR with `statsmodels` to identify which features are most associated with readiness.
- **Evaluation (Ch. 15):** Cross-validation with stratification (class imbalance expected). Metrics: precision (critical -- false positives mean prematurely reintegrating a girl who isn't ready), recall, F1, AUC. Business interpretation: a false positive here has real safety consequences. Tune with `GridSearchCV`.
- **Feature Selection (Ch. 16):** Permutation feature importance to identify which factors matter most for prediction. Discuss whether the features make domain sense.
- **Deployment (Ch. 17):** Serialize with `joblib`. API endpoint that scores residents. Staff dashboard with per-resident readiness indicators (color-coded risk levels). Inference pipeline that loads fresh data from the operational DB.

### Pipeline 4 (stretch): Safehouse Operational Effectiveness (Explanatory)
- **Business Problem (Ch. 1):** What operational factors drive better resident outcomes across safehouses? This is **explanatory** -- the goal is to understand which operational inputs (staffing levels, partner assignments, intervention plans, counseling frequency) are associated with better outcomes, so leadership can allocate resources effectively.
- **Tables:** `safehouse_monthly_metrics`, `safehouses`, `partner_assignments`, `residents`, `intervention_plans`
- **Modeling (Ch. 9, 10):** MLR with `statsmodels`. Target: avg_education_progress or avg_health_score from safehouse_monthly_metrics. Full regression diagnostics. Interpret standardized coefficients to compare effect sizes across features.
- **Deployment (Ch. 17):** Comparative dashboard showing safehouse performance drivers with actionable recommendations.

### Each Notebook Must Include These Sections:
1. **Problem Framing (Foreword, Ch. 1)** -- Clear written explanation (not just code) of the business problem, who in the organization cares, and why it matters. Explicitly state whether your approach is **predictive** or **explanatory** and justify using the textbook framework. Assess feasibility: practical impact, data availability, analytical feasibility.
2. **Data Acquisition, Preparation & Exploration (Ch. 2-8)** -- Load relevant CSVs, explore visually (univariate via `unistats()`, bivariate via automated relationship discovery), document findings (distributions, correlations, missing values, outliers). Build a **reproducible data preparation pipeline** (Ch. 7) -- not a one-off script. Show `wrangle_*()` function + generalizable cleaning functions. Document all feature engineering decisions and joins.
3. **Modeling & Feature Selection (Ch. 9-14, 16)** -- Build both a causal and predictive model for each pipeline. Compare multiple approaches and document choices. For explanatory work: `statsmodels` OLS, interpret coefficients, run diagnostics (Ch. 10), causal feature selection via VIF. For predictive work: `scikit-learn`, train/test split, compare algorithms, predictive feature selection via RFECV or permutation importance. Include hyperparameter tuning where appropriate.
4. **Evaluation & Interpretation (Ch. 15)** -- Proper validation (train/test split, cross-validation). Appropriate metrics for the problem type. Interpret in **business terms** -- explain what the numbers mean for the organization, not just report a score. Discuss real-world consequences of errors (false positives, false negatives) specific to this context. Use learning curves to diagnose model behavior.
5. **Causal and Relationship Analysis** -- Written discussion of discovered relationships. What features matter most and why? For explanatory models: are causal claims defensible? For predictive models: what does the model reveal about data structure even if the goal isn't causal? Be honest about correlation vs. causation. This demonstrates understanding of the prediction vs. explanation distinction (Foreword, Ch. 9-11).
6. **Deployment Notes (Ch. 17)** -- Describe how the model is deployed and integrated into the web application. Include: serialization approach (`joblib`), training vs. inference code path separation, API endpoint or dashboard component, and reference to where integration code lives in the repo. Consider monitoring and retraining strategy.

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
13. **AI-Driven Social Editor** -- agentic post editor with predictive analytics sidebar, scheduling optimizer
14. **Security hardening** -- CSP header, HSTS, HTTPS redirect, MFA, OAuth, data sanitization, delete confirmations
15. **Dark/light mode** -- cookie-based preference
16. **ML pipelines** -- notebooks with full lifecycle
17. **ML integration** -- API endpoints serving model predictions, dashboard widgets, social editor predictions
18. **Deployment** -- Azure, HTTPS, seed data, user accounts
19. **Responsiveness + accessibility** -- every page mobile-friendly, Lighthouse >= 90
20. **Polish** -- pagination everywhere, loading states, error handling, icons, consistent design

---

## 9. AI-DRIVEN SOCIAL EDITOR & PREDICTIVE ANALYTICS

### Core Objective
A high-fidelity social media post editor where a React-based UI and a Generative AI agent share a synchronized state. The AI must be capable of directly manipulating the UI elements while providing real-time performance forecasting based on specialized machine learning pipelines.

### 9a. Agentic UI Integration

**Command-Pattern Architecture:**
- The AI agent outputs structured JSON payloads (hidden or inline) alongside its conversational text
- Commands follow a defined schema that maps to UI state mutations (e.g., `{ action: "updateHeadline", value: "..." }`, `{ action: "changePlatform", value: "instagram" }`)

**State Synchronization:**
- Use a centralized state store (e.g., Zustand or React Context) that the AI can "write" to
- When the user asks to "make the headline more urgent" or "change the image layout," the AI sends a command that triggers an immediate, smooth UI update
- Use Framer Motion for fluid transitions between state changes

**Bi-Directional Context:**
- The AI must have "sight" of the current editor state (text, platform, image metadata) to make relevant suggestions
- Editor state is serialized and passed as context with each AI interaction
- Changes made manually by the user are reflected back to the AI's context in real time

### 9b. Predictive ML Pipelines (Social Editor)

**Multi-Metric Forecasting:**
Integrate individual pipelines to predict:
- Total donor referrals and resulting donation amounts ($)
- Engagement metrics: forward counts, profile views, and follower growth

**Two-Stage Scheduling Optimization ("The Golden Window"):**
- **Phase 1 (Day Selection):** Run the post content through a simulation across all seven days to identify the peak donation-probability day
- **Phase 2 (Hourly Simulation):** Once the day is selected, iterate through a 24-hour cycle to pinpoint the specific hour that maximizes predicted donor yield

**Platform Specificity:**
- The ML model should default to cross-platform predictions unless the user locks the post to a specific platform (e.g., LinkedIn vs. Instagram)
- Platform-specific feature weights should adjust predictions accordingly

### 9c. UX Requirements (Social Editor)

**Real-time Feedback:**
- As the user or AI edits the post, the prediction sidebar must update dynamically
- Show a "calculating" state (spinner/skeleton) during ML inference
- Debounce updates to avoid excessive API calls during rapid editing

**Visual Suggestions:**
- The UI should visually highlight suggested posting times and platforms based on the simulation results
- Allow the user to "Apply" any suggestion with one click (e.g., clicking a suggested time auto-fills the schedule)
- Show a ranked list of platform + time combinations with predicted performance metrics

**Editor Layout:**
- Left panel: post content editor (text, media, platform selector, CTA picker)
- Right panel: AI chat + prediction sidebar with live-updating metrics
- Bottom bar: scheduling timeline with highlighted "golden windows"
