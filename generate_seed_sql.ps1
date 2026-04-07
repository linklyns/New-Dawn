# =============================================================
# New Dawn - SQL Seed Script Generator
# Run from workspace root:
#   powershell -ExecutionPolicy Bypass -File .\generate_seed_sql.ps1
# Output: new_dawn_seed.sql
# =============================================================
$ErrorActionPreference = "Stop"
$csvPath  = Join-Path $PSScriptRoot "lighthouse_csv_v7"
$outFile  = Join-Path $PSScriptRoot "new_dawn_seed.sql"

# ---- Helpers ----------------------------------------------------------------

# Non-nullable DateTime columns that use DateTime.MinValue when CSV is empty
# (mirrors CsvSeeder's FlexibleDateTimeConverter behavior)
$MinDateCols = @('created_at','first_donation_date','open_date','start_date',
                 'donation_date','record_date','session_date','visit_date',
                 'incident_date','target_date','case_conference_date',
                 'month_start','month_end','snapshot_date','published_at',
                 'date_of_birth','date_of_admission','date_enrolled')

# Known boolean column names
$BoolCols = @(
    'is_recurring','is_published','is_pwd','has_special_needs','family_is_4ps',
    'family_solo_parent','family_indigenous','family_parent_pwd','family_informal_settler',
    'sub_cat_orphaned','sub_cat_trafficked','sub_cat_child_labor','sub_cat_physical_abuse',
    'sub_cat_sexual_abuse','sub_cat_osaec','sub_cat_cicl','sub_cat_at_risk',
    'sub_cat_street_child','sub_cat_child_with_hiv','medical_checkup_done',
    'dental_checkup_done','psychological_checkup_done','safety_concerns_noted',
    'follow_up_needed','has_call_to_action','features_resident_story','is_boosted',
    'progress_noted','concerns_flagged','referral_made','resolved','follow_up_required',
    'is_primary'
)

function Fmt-Val($col, $raw) {
    $isEmpty = ($null -eq $raw -or ($raw -is [string] -and $raw.Trim() -eq ''))
    if ($isEmpty) {
        # Non-nullable DateTime → DateTime.MinValue (matches FlexibleDateTimeConverter)
        if ($MinDateCols -contains $col) { return "'0001-01-01T00:00:00+00'" }
        return 'NULL'
    }
    $v = if ($raw -is [string]) { $raw.Trim() } else { "$raw".Trim() }

    # Boolean by column name
    if ($BoolCols -contains $col) {
        if ($v -eq 'True' -or $v -eq '1' -or $v -eq 'true') { return 'TRUE' }
        return 'FALSE'
    }

    # Pure integer
    if ($v -match '^-?\d+$') { return $v }

    # Decimal number
    if ($v -match '^-?\d+\.\d+$') { return $v }

    # Date only YYYY-MM-DD
    if ($v -match '^\d{4}-\d{2}-\d{2}$') { return "'" + $v + "T00:00:00+00'" }

    # DateTime YYYY-MM-DD HH:MM:SS
    if ($v -match '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$') {
        return "'" + $v.Replace(' ','T') + "+00'"
    }

    # String - escape single quotes
    return "'" + $v.Replace("'", "''") + "'"
}

function Rows-ToInsert($table, $schema, $csvFile) {
    $rows = Import-Csv (Join-Path $csvPath $csvFile)
    if (-not $rows) { return '' }
    $cols = $rows[0].PSObject.Properties.Name
    $colList = ($cols | ForEach-Object { "`"$_`"" }) -join ', '
    $lines = @()
    foreach ($row in $rows) {
        $vals = ($cols | ForEach-Object { Fmt-Val $_ $row.$_ }) -join ', '
        $lines += "  ($vals)"
    }
    $schemaPrefix = if ($schema) { "public." } else { "" }
    $batches = @()
    # Chunk into 100-row inserts to avoid statement size limits
    $chunk = 100
    for ($i = 0; $i -lt $lines.Count; $i += $chunk) {
        $end = [Math]::Min($i + $chunk, $lines.Count) - 1
        $batch = $lines[$i..$end] -join ",`n"
        $batches += "INSERT INTO ${schemaPrefix}""$table"" ($colList)`nVALUES`n$batch;"
    }
    return $batches -join "`n"
}

# ---- Compute ASP.NET Identity V3 Password Hash (PBKDF2-SHA256) --------------
function Get-IdentityHash($password) {
    $prf       = [int]1      # HMACSHA256 = 1
    $iterCount = 100000
    $saltSize  = 16
    $keySize   = 32

    $salt = [byte[]]::new($saltSize)
    $rng  = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($salt)

    try {
        $pbkdf2 = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
            $password, $salt, $iterCount,
            [System.Security.Cryptography.HashAlgorithmName]::SHA256
        )
    } catch {
        # .NET Framework fallback (SHA1)
        $pbkdf2 = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
            $password, $salt, $iterCount
        )
        $prf = [int]0  # HMACSHA1
    }
    $key = $pbkdf2.GetBytes($keySize)

    $output = [byte[]]::new(1 + 4 + 4 + 4 + $saltSize + $keySize)
    $output[0] = 0x01

    $toBE = { param($n) [System.BitConverter]::GetBytes([System.Net.IPAddress]::HostToNetworkOrder([int]$n)) }
    [System.Array]::Copy((& $toBE $prf),       0, $output,  1, 4)
    [System.Array]::Copy((& $toBE $iterCount), 0, $output,  5, 4)
    [System.Array]::Copy((& $toBE $saltSize),  0, $output,  9, 4)
    [System.Array]::Copy($salt, 0, $output, 13, $saltSize)
    [System.Array]::Copy($key,  0, $output, 13 + $saltSize, $keySize)

    return [System.Convert]::ToBase64String($output)
}

Write-Host "Computing password hashes..." -ForegroundColor Cyan
$adminHash = Get-IdentityHash "adminadminadmin00"
$staffHash = Get-IdentityHash "staffstaffstaff00"
$donorHash = Get-IdentityHash "donordonordonor00"
$mfaHash   = Get-IdentityHash "mfausermfauser00"

# GUIDs for Identity rows
$adminRoleId = [System.Guid]::NewGuid().ToString()
$staffRoleId = [System.Guid]::NewGuid().ToString()
$donorRoleId = [System.Guid]::NewGuid().ToString()
$adminUserId = [System.Guid]::NewGuid().ToString()
$staffUserId = [System.Guid]::NewGuid().ToString()
$donorUserId = [System.Guid]::NewGuid().ToString()
$mfaUserId   = [System.Guid]::NewGuid().ToString()

Write-Host "Generating SQL..." -ForegroundColor Cyan

# ---- Build output list -------------------------------------------------------
$out = [System.Collections.Generic.List[string]]::new()

$out.Add(@"
-- ================================================================
-- NEW DAWN - Complete Database Reset and Seed Script
-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
--
-- DEMO ACCOUNTS:
--   Role    Email                    Password
--   -----   -----                    --------
--   Admin   admin@newdawn.ph         adminadminadmin00
--   Staff   staff@newdawn.ph         staffstaffstaff00
--   Donor   donor@newdawn.ph         donordonordonor00
--   MFA     mfa@newdawn.ph           mfausermfauser00
--
-- EXTRA DATA ADDED (beyond CSV files):
--   - ASP.NET Identity roles: Admin, Staff, Donor
--   - 4 demo user accounts (see above)
--   - Donor user linked to supporter_id=1 (Mila Alvarez)
--   - EF Core migration history entry recorded
-- ================================================================

-- Make sure we are in the right schema
SET search_path TO public;

"@)

# ===========================
# SECTION 1: DROP TABLES
# ===========================
$out.Add(@"
-- ================================================================
-- SECTION 1: DROP ALL TABLES (reverse FK order)
-- ================================================================

DROP TABLE IF EXISTS "AspNetUserTokens"        CASCADE;
DROP TABLE IF EXISTS "AspNetUserClaims"        CASCADE;
DROP TABLE IF EXISTS "AspNetUserLogins"        CASCADE;
DROP TABLE IF EXISTS "AspNetUserRoles"         CASCADE;
DROP TABLE IF EXISTS "AspNetRoleClaims"        CASCADE;
DROP TABLE IF EXISTS "AspNetRoles"             CASCADE;
DROP TABLE IF EXISTS "AspNetUsers"             CASCADE;
DROP TABLE IF EXISTS public.donation_allocations CASCADE;
DROP TABLE IF EXISTS public.in_kind_donation_items CASCADE;
DROP TABLE IF EXISTS public.donations          CASCADE;
DROP TABLE IF EXISTS public.education_records  CASCADE;
DROP TABLE IF EXISTS public.health_wellbeing_records CASCADE;
DROP TABLE IF EXISTS public.home_visitations   CASCADE;
DROP TABLE IF EXISTS public.incident_reports   CASCADE;
DROP TABLE IF EXISTS public.intervention_plans CASCADE;
DROP TABLE IF EXISTS public.process_recordings CASCADE;
DROP TABLE IF EXISTS public.residents          CASCADE;
DROP TABLE IF EXISTS public.safehouse_monthly_metrics CASCADE;
DROP TABLE IF EXISTS public.partner_assignments CASCADE;
DROP TABLE IF EXISTS public.supporters         CASCADE;
DROP TABLE IF EXISTS public.social_media_posts CASCADE;
DROP TABLE IF EXISTS public.partners           CASCADE;
DROP TABLE IF EXISTS public.safehouses         CASCADE;
DROP TABLE IF EXISTS public.public_impact_snapshots CASCADE;
DROP TABLE IF EXISTS public.connection_probe   CASCADE;
DROP TABLE IF EXISTS "__EFMigrationsHistory"   CASCADE;

"@)

# ===========================
# SECTION 2: CREATE TABLES
# ===========================
$out.Add(@"
-- ================================================================
-- SECTION 2: CREATE TABLES
-- ================================================================

-- EF Migrations History
CREATE TABLE "__EFMigrationsHistory" (
    "MigrationId"    character varying(150) NOT NULL,
    "ProductVersion" character varying(32)  NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

-- ASP.NET Core Identity tables
CREATE TABLE "AspNetRoles" (
    "Id"               text                         NOT NULL,
    "Name"             character varying(256),
    "NormalizedName"   character varying(256),
    "ConcurrencyStamp" text,
    CONSTRAINT "PK_AspNetRoles" PRIMARY KEY ("Id")
);

CREATE TABLE "AspNetRoleClaims" (
    "Id"          integer  GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "RoleId"      text     NOT NULL,
    "ClaimType"   text,
    "ClaimValue"  text,
    CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId"
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles"("Id") ON DELETE CASCADE
);

-- connection_probe
CREATE TABLE public.connection_probe (
    value text NOT NULL,
    CONSTRAINT "PK_connection_probe" PRIMARY KEY (value)
);

-- partners (no FK deps)
CREATE TABLE public.partners (
    partner_id      integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    partner_name    text    NOT NULL,
    partner_type    text    NOT NULL,
    role_type       text    NOT NULL,
    contact_name    text    NOT NULL,
    email           text    NOT NULL,
    phone           text    NOT NULL,
    region          text    NOT NULL,
    status          text    NOT NULL,
    start_date      timestamp with time zone NOT NULL,
    end_date        timestamp with time zone,
    notes           text    NOT NULL,
    CONSTRAINT "PK_partners" PRIMARY KEY (partner_id)
);

-- public_impact_snapshots (no FK deps)
CREATE TABLE public.public_impact_snapshots (
    snapshot_id         integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    snapshot_date       timestamp with time zone NOT NULL,
    headline            text NOT NULL,
    summary_text        text NOT NULL,
    metric_payload_json text NOT NULL,
    is_published        boolean NOT NULL,
    published_at        timestamp with time zone NOT NULL,
    CONSTRAINT "PK_public_impact_snapshots" PRIMARY KEY (snapshot_id)
);

-- safehouses (no FK deps)
CREATE TABLE public.safehouses (
    safehouse_id      integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    safehouse_code    text NOT NULL,
    name              text NOT NULL,
    region            text NOT NULL,
    city              text NOT NULL,
    province          text NOT NULL,
    country           text NOT NULL,
    open_date         timestamp with time zone NOT NULL,
    status            text NOT NULL,
    capacity_girls    integer NOT NULL,
    capacity_staff    integer NOT NULL,
    current_occupancy integer NOT NULL,
    notes             text,
    CONSTRAINT "PK_safehouses" PRIMARY KEY (safehouse_id)
);

-- social_media_posts (no FK deps)
CREATE TABLE public.social_media_posts (
    post_id                      integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    platform                     text NOT NULL,
    platform_post_id             text NOT NULL,
    post_url                     text NOT NULL,
    created_at                   timestamp with time zone NOT NULL,
    day_of_week                  text NOT NULL,
    post_hour                    integer NOT NULL,
    post_type                    text NOT NULL,
    media_type                   text,
    caption                      text NOT NULL,
    hashtags                     text,
    num_hashtags                 integer NOT NULL,
    mentions_count               integer NOT NULL,
    has_call_to_action           boolean NOT NULL,
    call_to_action_type          text,
    content_topic                text NOT NULL,
    sentiment_tone               text NOT NULL,
    caption_length               integer NOT NULL,
    features_resident_story      boolean NOT NULL,
    campaign_name                text,
    is_boosted                   boolean NOT NULL,
    boost_budget_php             numeric,
    impressions                  integer NOT NULL,
    reach                        integer NOT NULL,
    likes                        integer NOT NULL,
    comments                     integer NOT NULL,
    shares                       integer NOT NULL,
    saves                        integer NOT NULL,
    click_throughs               integer NOT NULL,
    video_views                  numeric,
    engagement_rate              numeric NOT NULL,
    profile_visits               integer NOT NULL,
    donation_referrals           integer NOT NULL,
    estimated_donation_value_php numeric NOT NULL,
    follower_count_at_post       integer NOT NULL,
    watch_time_seconds           numeric,
    avg_view_duration_seconds    numeric,
    subscriber_count_at_post     integer,
    forwards                     numeric,
    CONSTRAINT "PK_social_media_posts" PRIMARY KEY (post_id)
);

-- supporters (no FK deps)
CREATE TABLE public.supporters (
    supporter_id        integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    supporter_type      text NOT NULL,
    display_name        text NOT NULL,
    organization_name   text,
    first_name          text NOT NULL,
    last_name           text NOT NULL,
    relationship_type   text NOT NULL,
    region              text NOT NULL,
    country             text NOT NULL,
    email               text NOT NULL,
    phone               text NOT NULL,
    status              text NOT NULL,
    created_at          timestamp with time zone NOT NULL,
    first_donation_date timestamp with time zone NOT NULL,
    acquisition_channel text NOT NULL,
    CONSTRAINT "PK_supporters" PRIMARY KEY (supporter_id)
);

-- AspNetUsers (depends on supporters)
CREATE TABLE "AspNetUsers" (
    "Id"                   text NOT NULL,
    display_name           text NOT NULL,
    linked_supporter_id    integer,
    "UserName"             character varying(256),
    "NormalizedUserName"   character varying(256),
    "Email"                character varying(256),
    "NormalizedEmail"      character varying(256),
    "EmailConfirmed"       boolean NOT NULL,
    "PasswordHash"         text,
    "SecurityStamp"        text,
    "ConcurrencyStamp"     text,
    "PhoneNumber"          text,
    "PhoneNumberConfirmed" boolean NOT NULL,
    "TwoFactorEnabled"     boolean NOT NULL,
    "LockoutEnd"           timestamp with time zone,
    "LockoutEnabled"       boolean NOT NULL,
    "AccessFailedCount"    integer NOT NULL,
    CONSTRAINT "PK_AspNetUsers" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetUsers_supporters_linked_supporter_id"
        FOREIGN KEY (linked_supporter_id) REFERENCES public.supporters(supporter_id)
        ON DELETE RESTRICT
);

CREATE TABLE "AspNetUserClaims" (
    "Id"         integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "UserId"     text NOT NULL,
    "ClaimType"  text,
    "ClaimValue" text,
    CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserLogins" (
    "LoginProvider"       text NOT NULL,
    "ProviderKey"         text NOT NULL,
    "ProviderDisplayName" text,
    "UserId"              text NOT NULL,
    CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
    CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserRoles" (
    "UserId" text NOT NULL,
    "RoleId" text NOT NULL,
    CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
    CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId"
        FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

CREATE TABLE "AspNetUserTokens" (
    "UserId"        text NOT NULL,
    "LoginProvider" text NOT NULL,
    "Name"          text NOT NULL,
    "Value"         text,
    CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
    CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId"
        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE
);

-- partner_assignments (depends on partners, safehouses)
CREATE TABLE public.partner_assignments (
    assignment_id        integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    partner_id           integer NOT NULL,
    safehouse_id         integer,
    program_area         text NOT NULL,
    assignment_start     timestamp with time zone NOT NULL,
    assignment_end       timestamp with time zone,
    responsibility_notes text NOT NULL,
    is_primary           boolean NOT NULL,
    status               text NOT NULL,
    CONSTRAINT "PK_partner_assignments" PRIMARY KEY (assignment_id),
    CONSTRAINT "FK_partner_assignments_partners_partner_id"
        FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON DELETE RESTRICT,
    CONSTRAINT "FK_partner_assignments_safehouses_safehouse_id"
        FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) ON DELETE RESTRICT
);

-- residents (depends on safehouses)
CREATE TABLE public.residents (
    resident_id              integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    case_control_no          text NOT NULL,
    internal_code            text NOT NULL,
    safehouse_id             integer NOT NULL,
    case_status              text NOT NULL,
    sex                      text NOT NULL,
    date_of_birth            timestamp with time zone NOT NULL,
    birth_status             text NOT NULL,
    place_of_birth           text NOT NULL,
    religion                 text,
    case_category            text NOT NULL,
    sub_cat_orphaned         boolean NOT NULL,
    sub_cat_trafficked       boolean NOT NULL,
    sub_cat_child_labor      boolean NOT NULL,
    sub_cat_physical_abuse   boolean NOT NULL,
    sub_cat_sexual_abuse     boolean NOT NULL,
    sub_cat_osaec            boolean NOT NULL,
    sub_cat_cicl             boolean NOT NULL,
    sub_cat_at_risk          boolean NOT NULL,
    sub_cat_street_child     boolean NOT NULL,
    sub_cat_child_with_hiv   boolean NOT NULL,
    is_pwd                   boolean NOT NULL,
    pwd_type                 text,
    has_special_needs        boolean NOT NULL,
    special_needs_diagnosis  text,
    family_is_4ps            boolean NOT NULL,
    family_solo_parent       boolean NOT NULL,
    family_indigenous        boolean NOT NULL,
    family_parent_pwd        boolean NOT NULL,
    family_informal_settler  boolean NOT NULL,
    date_of_admission        timestamp with time zone NOT NULL,
    age_upon_admission       text NOT NULL,
    present_age              text NOT NULL,
    length_of_stay           text NOT NULL,
    referral_source          text NOT NULL,
    referring_agency_person  text,
    date_colb_registered     timestamp with time zone,
    date_colb_obtained       timestamp with time zone,
    assigned_social_worker   text NOT NULL,
    initial_case_assessment  text,
    date_case_study_prepared timestamp with time zone,
    reintegration_type       text,
    reintegration_status     text,
    initial_risk_level       text NOT NULL,
    current_risk_level       text NOT NULL,
    date_enrolled            timestamp with time zone NOT NULL,
    date_closed              timestamp with time zone,
    created_at               timestamp with time zone NOT NULL,
    notes_restricted         text,
    CONSTRAINT "PK_residents" PRIMARY KEY (resident_id),
    CONSTRAINT "FK_residents_safehouses_safehouse_id"
        FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) ON DELETE RESTRICT
);

-- safehouse_monthly_metrics (depends on safehouses)
CREATE TABLE public.safehouse_monthly_metrics (
    metric_id                integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    safehouse_id             integer NOT NULL,
    month_start              timestamp with time zone NOT NULL,
    month_end                timestamp with time zone NOT NULL,
    active_residents         integer NOT NULL,
    avg_education_progress   numeric,
    avg_health_score         numeric,
    process_recording_count  integer NOT NULL,
    home_visitation_count    integer NOT NULL,
    incident_count           integer NOT NULL,
    notes                    text,
    CONSTRAINT "PK_safehouse_monthly_metrics" PRIMARY KEY (metric_id),
    CONSTRAINT "FK_safehouse_monthly_metrics_safehouses_safehouse_id"
        FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) ON DELETE RESTRICT
);

-- donations (depends on supporters, social_media_posts)
CREATE TABLE public.donations (
    donation_id      integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    supporter_id     integer NOT NULL,
    donation_type    text NOT NULL,
    donation_date    timestamp with time zone NOT NULL,
    is_recurring     boolean NOT NULL,
    campaign_name    text,
    channel_source   text NOT NULL,
    currency_code    text,
    amount           numeric,
    estimated_value  numeric NOT NULL,
    impact_unit      text NOT NULL,
    notes            text,
    referral_post_id integer,
    CONSTRAINT "PK_donations" PRIMARY KEY (donation_id),
    CONSTRAINT "FK_donations_supporters_supporter_id"
        FOREIGN KEY (supporter_id) REFERENCES public.supporters(supporter_id) ON DELETE RESTRICT,
    CONSTRAINT "FK_donations_social_media_posts_referral_post_id"
        FOREIGN KEY (referral_post_id) REFERENCES public.social_media_posts(post_id) ON DELETE RESTRICT
);

-- donation_allocations (depends on donations, safehouses)
CREATE TABLE public.donation_allocations (
    allocation_id    integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    donation_id      integer NOT NULL,
    safehouse_id     integer NOT NULL,
    program_area     text NOT NULL,
    amount_allocated numeric NOT NULL,
    allocation_date  timestamp with time zone NOT NULL,
    allocation_notes text,
    CONSTRAINT "PK_donation_allocations" PRIMARY KEY (allocation_id),
    CONSTRAINT "FK_donation_allocations_donations_donation_id"
        FOREIGN KEY (donation_id) REFERENCES public.donations(donation_id) ON DELETE RESTRICT,
    CONSTRAINT "FK_donation_allocations_safehouses_safehouse_id"
        FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) ON DELETE RESTRICT
);

-- in_kind_donation_items (depends on donations)
CREATE TABLE public.in_kind_donation_items (
    item_id               integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    donation_id           integer NOT NULL,
    item_name             text NOT NULL,
    item_category         text NOT NULL,
    quantity              integer NOT NULL,
    unit_of_measure       text NOT NULL,
    estimated_unit_value  numeric NOT NULL,
    intended_use          text NOT NULL,
    received_condition    text NOT NULL,
    CONSTRAINT "PK_in_kind_donation_items" PRIMARY KEY (item_id),
    CONSTRAINT "FK_in_kind_donation_items_donations_donation_id"
        FOREIGN KEY (donation_id) REFERENCES public.donations(donation_id) ON DELETE RESTRICT
);

-- education_records (depends on residents)
CREATE TABLE public.education_records (
    education_record_id  integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    resident_id          integer NOT NULL,
    record_date          timestamp with time zone NOT NULL,
    education_level      text NOT NULL,
    school_name          text NOT NULL,
    enrollment_status    text NOT NULL,
    attendance_rate      numeric NOT NULL,
    progress_percent     numeric NOT NULL,
    completion_status    text NOT NULL,
    notes                text NOT NULL,
    CONSTRAINT "PK_education_records" PRIMARY KEY (education_record_id),
    CONSTRAINT "FK_education_records_residents_resident_id"
        FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) ON DELETE RESTRICT
);

-- health_wellbeing_records (depends on residents)
CREATE TABLE public.health_wellbeing_records (
    health_record_id          integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    resident_id               integer NOT NULL,
    record_date               timestamp with time zone NOT NULL,
    general_health_score      numeric NOT NULL,
    nutrition_score           numeric NOT NULL,
    sleep_quality_score       numeric NOT NULL,
    energy_level_score        numeric NOT NULL,
    height_cm                 numeric NOT NULL,
    weight_kg                 numeric NOT NULL,
    bmi                       numeric NOT NULL,
    medical_checkup_done      boolean NOT NULL,
    dental_checkup_done       boolean NOT NULL,
    psychological_checkup_done boolean NOT NULL,
    notes                     text NOT NULL,
    CONSTRAINT "PK_health_wellbeing_records" PRIMARY KEY (health_record_id),
    CONSTRAINT "FK_health_wellbeing_records_residents_resident_id"
        FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) ON DELETE RESTRICT
);

-- home_visitations (depends on residents)
CREATE TABLE public.home_visitations (
    visitation_id           integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    resident_id             integer NOT NULL,
    visit_date              timestamp with time zone NOT NULL,
    social_worker           text NOT NULL,
    visit_type              text NOT NULL,
    location_visited        text NOT NULL,
    family_members_present  text NOT NULL,
    purpose                 text NOT NULL,
    observations            text NOT NULL,
    family_cooperation_level text NOT NULL,
    safety_concerns_noted   boolean NOT NULL,
    follow_up_needed        boolean NOT NULL,
    follow_up_notes         text,
    visit_outcome           text NOT NULL,
    CONSTRAINT "PK_home_visitations" PRIMARY KEY (visitation_id),
    CONSTRAINT "FK_home_visitations_residents_resident_id"
        FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) ON DELETE RESTRICT
);

-- incident_reports (depends on residents, safehouses)
CREATE TABLE public.incident_reports (
    incident_id       integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    resident_id       integer NOT NULL,
    safehouse_id      integer NOT NULL,
    incident_date     timestamp with time zone NOT NULL,
    incident_type     text NOT NULL,
    severity          text NOT NULL,
    description       text NOT NULL,
    response_taken    text NOT NULL,
    resolved          boolean NOT NULL,
    resolution_date   timestamp with time zone,
    reported_by       text NOT NULL,
    follow_up_required boolean NOT NULL,
    CONSTRAINT "PK_incident_reports" PRIMARY KEY (incident_id),
    CONSTRAINT "FK_incident_reports_residents_resident_id"
        FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) ON DELETE RESTRICT,
    CONSTRAINT "FK_incident_reports_safehouses_safehouse_id"
        FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) ON DELETE RESTRICT
);

-- intervention_plans (depends on residents)
CREATE TABLE public.intervention_plans (
    plan_id             integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    resident_id         integer NOT NULL,
    plan_category       text NOT NULL,
    plan_description    text NOT NULL,
    services_provided   text NOT NULL,
    target_value        numeric NOT NULL,
    target_date         timestamp with time zone NOT NULL,
    status              text NOT NULL,
    case_conference_date timestamp with time zone NOT NULL,
    created_at          timestamp with time zone NOT NULL,
    updated_at          timestamp with time zone NOT NULL,
    CONSTRAINT "PK_intervention_plans" PRIMARY KEY (plan_id),
    CONSTRAINT "FK_intervention_plans_residents_resident_id"
        FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) ON DELETE RESTRICT
);

-- process_recordings (depends on residents)
CREATE TABLE public.process_recordings (
    recording_id             integer GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    resident_id              integer NOT NULL,
    session_date             timestamp with time zone NOT NULL,
    social_worker            text NOT NULL,
    session_type             text NOT NULL,
    session_duration_minutes integer NOT NULL,
    emotional_state_observed text NOT NULL,
    emotional_state_end      text NOT NULL,
    session_narrative        text NOT NULL,
    interventions_applied    text NOT NULL,
    follow_up_actions        text NOT NULL,
    progress_noted           boolean NOT NULL,
    concerns_flagged         boolean NOT NULL,
    referral_made            boolean NOT NULL,
    notes_restricted         text,
    CONSTRAINT "PK_process_recordings" PRIMARY KEY (recording_id),
    CONSTRAINT "FK_process_recordings_residents_resident_id"
        FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) ON DELETE RESTRICT
);

-- Indexes
CREATE UNIQUE INDEX "RoleNameIndex"    ON "AspNetRoles"  ("NormalizedName");
CREATE        INDEX "IX_AspNetRoleClaims_RoleId" ON "AspNetRoleClaims" ("RoleId");
CREATE        INDEX "EmailIndex"       ON "AspNetUsers"  ("NormalizedEmail");
CREATE UNIQUE INDEX "UserNameIndex"    ON "AspNetUsers"  ("NormalizedUserName");
CREATE        INDEX "IX_AspNetUsers_linked_supporter_id" ON "AspNetUsers" (linked_supporter_id);
CREATE        INDEX "IX_AspNetUserClaims_UserId"   ON "AspNetUserClaims"  ("UserId");
CREATE        INDEX "IX_AspNetUserLogins_UserId"   ON "AspNetUserLogins"  ("UserId");
CREATE        INDEX "IX_AspNetUserRoles_RoleId"    ON "AspNetUserRoles"   ("RoleId");
CREATE        INDEX "IX_donation_allocations_donation_id"  ON public.donation_allocations (donation_id);
CREATE        INDEX "IX_donation_allocations_safehouse_id" ON public.donation_allocations (safehouse_id);
CREATE        INDEX "IX_donations_campaign_name"   ON public.donations (campaign_name);
CREATE        INDEX "IX_donations_donation_date"   ON public.donations (donation_date);
CREATE        INDEX "IX_donations_donation_type"   ON public.donations (donation_type);
CREATE        INDEX "IX_donations_referral_post_id" ON public.donations (referral_post_id);
CREATE        INDEX "IX_donations_supporter_id"    ON public.donations (supporter_id);
CREATE        INDEX "IX_education_records_record_date"   ON public.education_records (record_date);
CREATE        INDEX "IX_education_records_resident_id"   ON public.education_records (resident_id);
CREATE        INDEX "IX_health_wellbeing_records_record_date" ON public.health_wellbeing_records (record_date);
CREATE        INDEX "IX_health_wellbeing_records_resident_id" ON public.health_wellbeing_records (resident_id);
CREATE        INDEX "IX_home_visitations_resident_id"    ON public.home_visitations (resident_id);
CREATE        INDEX "IX_in_kind_donation_items_donation_id" ON public.in_kind_donation_items (donation_id);
CREATE        INDEX "IX_incident_reports_incident_type"  ON public.incident_reports (incident_type);
CREATE        INDEX "IX_incident_reports_resident_id"    ON public.incident_reports (resident_id);
CREATE        INDEX "IX_incident_reports_safehouse_id"   ON public.incident_reports (safehouse_id);
CREATE        INDEX "IX_incident_reports_severity"       ON public.incident_reports (severity);
CREATE        INDEX "IX_intervention_plans_resident_id"  ON public.intervention_plans (resident_id);
CREATE        INDEX "IX_partner_assignments_partner_id"  ON public.partner_assignments (partner_id);
CREATE        INDEX "IX_partner_assignments_safehouse_id" ON public.partner_assignments (safehouse_id);
CREATE        INDEX "IX_process_recordings_resident_id"  ON public.process_recordings (resident_id);
CREATE        INDEX "IX_process_recordings_session_date" ON public.process_recordings (session_date);
CREATE        INDEX "IX_residents_case_status"           ON public.residents (case_status);
CREATE        INDEX "IX_residents_current_risk_level"    ON public.residents (current_risk_level);
CREATE        INDEX "IX_residents_reintegration_status"  ON public.residents (reintegration_status);
CREATE        INDEX "IX_residents_safehouse_id"          ON public.residents (safehouse_id);
CREATE        INDEX "IX_safehouse_monthly_metrics_safehouse_id" ON public.safehouse_monthly_metrics (safehouse_id);
CREATE        INDEX "IX_social_media_posts_platform"     ON public.social_media_posts (platform);
CREATE        INDEX "IX_supporters_supporter_type"       ON public.supporters (supporter_type);

"@)

# ===========================
# SECTION 3: SEED IDENTITY
# ===========================
$secStamp = [System.Guid]::NewGuid().ToString()
$concStamp1 = [System.Guid]::NewGuid().ToString()
$concStamp2 = [System.Guid]::NewGuid().ToString()
$concStamp3 = [System.Guid]::NewGuid().ToString()
$concStamp4 = [System.Guid]::NewGuid().ToString()
$concStamp5 = [System.Guid]::NewGuid().ToString()
$concStamp6 = [System.Guid]::NewGuid().ToString()
$concStamp7 = [System.Guid]::NewGuid().ToString()

$out.Add(@"
-- ================================================================
-- SECTION 3: SEED IDENTITY TABLES
-- ================================================================

-- Roles
INSERT INTO "AspNetRoles" ("Id","Name","NormalizedName","ConcurrencyStamp") VALUES
  ('$adminRoleId','Admin','ADMIN', '$([System.Guid]::NewGuid())'),
  ('$staffRoleId','Staff','STAFF', '$([System.Guid]::NewGuid())'),
  ('$donorRoleId','Donor','DONOR', '$([System.Guid]::NewGuid())');

-- Users: donor user inserted with NULL linked_supporter_id first (FK not yet satisfied).
-- It is linked to supporter_id=1 via UPDATE after the supporters table is seeded.
INSERT INTO "AspNetUsers"
  ("Id","display_name","linked_supporter_id","UserName","NormalizedUserName",
   "Email","NormalizedEmail","EmailConfirmed","PasswordHash","SecurityStamp",
   "ConcurrencyStamp","PhoneNumber","PhoneNumberConfirmed","TwoFactorEnabled",
   "LockoutEnd","LockoutEnabled","AccessFailedCount")
VALUES
  ('$adminUserId','Admin User',    NULL,  'admin@newdawn.ph','ADMIN@NEWDAWN.PH','admin@newdawn.ph','ADMIN@NEWDAWN.PH',TRUE,'$adminHash','$([System.Guid]::NewGuid())','$([System.Guid]::NewGuid())',NULL,FALSE,FALSE,NULL,FALSE,0),
  ('$staffUserId','Staff User',    NULL,  'staff@newdawn.ph','STAFF@NEWDAWN.PH','staff@newdawn.ph','STAFF@NEWDAWN.PH',TRUE,'$staffHash','$([System.Guid]::NewGuid())','$([System.Guid]::NewGuid())',NULL,FALSE,FALSE,NULL,FALSE,0),
  ('$donorUserId','Donor User',    NULL,  'donor@newdawn.ph','DONOR@NEWDAWN.PH','donor@newdawn.ph','DONOR@NEWDAWN.PH',TRUE,'$donorHash','$([System.Guid]::NewGuid())','$([System.Guid]::NewGuid())',NULL,FALSE,FALSE,NULL,FALSE,0),
  ('$mfaUserId',  'MFA User',      NULL,  'mfa@newdawn.ph',  'MFA@NEWDAWN.PH',  'mfa@newdawn.ph',  'MFA@NEWDAWN.PH',  TRUE,'$mfaHash',  '$([System.Guid]::NewGuid())','$([System.Guid]::NewGuid())',NULL,FALSE,TRUE, NULL,FALSE,0);

-- User Roles
INSERT INTO "AspNetUserRoles" ("UserId","RoleId") VALUES
  ('$adminUserId','$adminRoleId'),
  ('$staffUserId','$staffRoleId'),
  ('$donorUserId','$donorRoleId'),
  ('$mfaUserId',  '$adminRoleId');

"@)

# ===========================
# SECTION 4: CSV DATA
# ===========================
$out.Add("-- ================================================================")
$out.Add("-- SECTION 4: SEED CSV DATA")
$out.Add("-- ================================================================")
$out.Add("")

$tables = @(
    @{ name='safehouses';             schema='public'; file='safehouses.csv' },
    @{ name='partners';               schema='public'; file='partners.csv' },
    @{ name='public_impact_snapshots';schema='public'; file='public_impact_snapshots.csv' },
    @{ name='supporters';             schema='public'; file='supporters.csv' },
    @{ name='social_media_posts';     schema='public'; file='social_media_posts.csv' },
    @{ name='residents';              schema='public'; file='residents.csv' },
    @{ name='partner_assignments';    schema='public'; file='partner_assignments.csv' },
    @{ name='safehouse_monthly_metrics'; schema='public'; file='safehouse_monthly_metrics.csv' },
    @{ name='donations';              schema='public'; file='donations.csv' },
    @{ name='donation_allocations';   schema='public'; file='donation_allocations.csv' },
    @{ name='in_kind_donation_items'; schema='public'; file='in_kind_donation_items.csv' },
    @{ name='education_records';      schema='public'; file='education_records.csv' },
    @{ name='health_wellbeing_records';schema='public'; file='health_wellbeing_records.csv' },
    @{ name='home_visitations';       schema='public'; file='home_visitations.csv' },
    @{ name='incident_reports';       schema='public'; file='incident_reports.csv' },
    @{ name='intervention_plans';     schema='public'; file='intervention_plans.csv' },
    @{ name='process_recordings';     schema='public'; file='process_recordings.csv' }
)

foreach ($t in $tables) {
    Write-Host "  Generating INSERTs for $($t.name)..." -ForegroundColor Gray
    $out.Add("-- $($t.name)")
    $sql = Rows-ToInsert $t.name $t.schema $t.file
    $out.Add($sql)
    $out.Add("")

    # After supporters are seeded, link the donor user (mirrors CsvSeeder behavior)
    if ($t.name -eq 'supporters') {
        $out.Add("-- Link donor demo account to supporter_id=1 (Mila Alvarez)")
        $out.Add("UPDATE `"AspNetUsers`" SET linked_supporter_id = 1 WHERE `"Email`" = 'donor@newdawn.ph';")
        $out.Add("")
    }
}

# ===========================
# SECTION 5: RESET SEQUENCES
# ===========================
$out.Add(@"
-- ================================================================
-- SECTION 5: RESET SEQUENCES (so new rows auto-increment correctly)
-- ================================================================

SELECT setval(pg_get_serial_sequence('public.safehouses',              'safehouse_id'),      (SELECT MAX(safehouse_id)      FROM public.safehouses));
SELECT setval(pg_get_serial_sequence('public.partners',                'partner_id'),        (SELECT MAX(partner_id)        FROM public.partners));
SELECT setval(pg_get_serial_sequence('public.public_impact_snapshots', 'snapshot_id'),       (SELECT MAX(snapshot_id)       FROM public.public_impact_snapshots));
SELECT setval(pg_get_serial_sequence('public.supporters',              'supporter_id'),      (SELECT MAX(supporter_id)      FROM public.supporters));
SELECT setval(pg_get_serial_sequence('public.social_media_posts',      'post_id'),           (SELECT MAX(post_id)           FROM public.social_media_posts));
SELECT setval(pg_get_serial_sequence('public.residents',               'resident_id'),       (SELECT MAX(resident_id)       FROM public.residents));
SELECT setval(pg_get_serial_sequence('public.partner_assignments',     'assignment_id'),     (SELECT MAX(assignment_id)     FROM public.partner_assignments));
SELECT setval(pg_get_serial_sequence('public.safehouse_monthly_metrics','metric_id'),        (SELECT MAX(metric_id)         FROM public.safehouse_monthly_metrics));
SELECT setval(pg_get_serial_sequence('public.donations',               'donation_id'),       (SELECT MAX(donation_id)       FROM public.donations));
SELECT setval(pg_get_serial_sequence('public.donation_allocations',    'allocation_id'),     (SELECT MAX(allocation_id)     FROM public.donation_allocations));
SELECT setval(pg_get_serial_sequence('public.in_kind_donation_items',  'item_id'),           (SELECT MAX(item_id)           FROM public.in_kind_donation_items));
SELECT setval(pg_get_serial_sequence('public.education_records',       'education_record_id'),(SELECT MAX(education_record_id) FROM public.education_records));
SELECT setval(pg_get_serial_sequence('public.health_wellbeing_records','health_record_id'),  (SELECT MAX(health_record_id)  FROM public.health_wellbeing_records));
SELECT setval(pg_get_serial_sequence('public.home_visitations',        'visitation_id'),     (SELECT MAX(visitation_id)     FROM public.home_visitations));
SELECT setval(pg_get_serial_sequence('public.incident_reports',        'incident_id'),       (SELECT MAX(incident_id)       FROM public.incident_reports));
SELECT setval(pg_get_serial_sequence('public.intervention_plans',      'plan_id'),           (SELECT MAX(plan_id)           FROM public.intervention_plans));
SELECT setval(pg_get_serial_sequence('public.process_recordings',      'recording_id'),      (SELECT MAX(recording_id)      FROM public.process_recordings));

"@)

# ===========================
# SECTION 6: EF MIGRATIONS
# ===========================
$out.Add(@"
-- ================================================================
-- SECTION 6: EF CORE MIGRATION HISTORY
-- (Prevents the app from re-running the migration on startup)
-- ================================================================

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260406212624_InitialSchema', '9.0.4');

"@)

# ===========================
# SECTION 7: SUMMARY COMMENT
# ===========================
$out.Add(@"
-- ================================================================
-- ✓ Script complete.
-- ================================================================
-- DEMO ACCOUNT SUMMARY
-- ─────────────────────────────────────────
--  Role    │ Email                  │ Password
--  ────────┼────────────────────────┼──────────────────
--  Admin   │ admin@newdawn.ph       │ adminadminadmin00
--  Staff   │ staff@newdawn.ph       │ staffstaffstaff00
--  Donor   │ donor@newdawn.ph       │ donordonordonor00
--  MFA     │ mfa@newdawn.ph         │ mfausermfauser00
-- ─────────────────────────────────────────
-- EXTRA DATA ADDED (not from CSV files):
--  - ASP.NET Identity roles: Admin, Staff, Donor
--  - 4 demo user accounts
--  - Donor user (donor@newdawn.ph) is linked to Mila Alvarez (supporter_id=1)
--  - EF Core migration history entry for 20260406212624_InitialSchema
-- ================================================================
"@)

# Write output
$content = $out -join "`n"
[System.IO.File]::WriteAllText($outFile, $content, [System.Text.Encoding]::UTF8)

$size = (Get-Item $outFile).Length / 1KB
Write-Host ""
Write-Host "Done! Generated: $outFile  ($([Math]::Round($size)) KB)" -ForegroundColor Green
Write-Host ""
Write-Host "DEMO ACCOUNTS:" -ForegroundColor Yellow
Write-Host "  Admin:  admin@newdawn.ph  /  adminadminadmin00"
Write-Host "  Staff:  staff@newdawn.ph  /  staffstaffstaff00"
Write-Host "  Donor:  donor@newdawn.ph  /  donordonordonor00"
Write-Host "  MFA:    mfa@newdawn.ph    /  mfausermfauser00"
