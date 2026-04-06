using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace New_Dawn.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "connection_probe",
                schema: "public",
                columns: table => new
                {
                    value = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_connection_probe", x => x.value);
                });

            migrationBuilder.CreateTable(
                name: "partners",
                schema: "public",
                columns: table => new
                {
                    partner_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    partner_name = table.Column<string>(type: "text", nullable: false),
                    partner_type = table.Column<string>(type: "text", nullable: false),
                    role_type = table.Column<string>(type: "text", nullable: false),
                    contact_name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    phone = table.Column<string>(type: "text", nullable: false),
                    region = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partners", x => x.partner_id);
                });

            migrationBuilder.CreateTable(
                name: "public_impact_snapshots",
                schema: "public",
                columns: table => new
                {
                    snapshot_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    snapshot_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    headline = table.Column<string>(type: "text", nullable: false),
                    summary_text = table.Column<string>(type: "text", nullable: false),
                    metric_payload_json = table.Column<string>(type: "text", nullable: false),
                    is_published = table.Column<bool>(type: "boolean", nullable: false),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_public_impact_snapshots", x => x.snapshot_id);
                });

            migrationBuilder.CreateTable(
                name: "safehouses",
                schema: "public",
                columns: table => new
                {
                    safehouse_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    safehouse_code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    region = table.Column<string>(type: "text", nullable: false),
                    city = table.Column<string>(type: "text", nullable: false),
                    province = table.Column<string>(type: "text", nullable: false),
                    country = table.Column<string>(type: "text", nullable: false),
                    open_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    capacity_girls = table.Column<int>(type: "integer", nullable: false),
                    capacity_staff = table.Column<int>(type: "integer", nullable: false),
                    current_occupancy = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safehouses", x => x.safehouse_id);
                });

            migrationBuilder.CreateTable(
                name: "social_media_posts",
                schema: "public",
                columns: table => new
                {
                    post_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    platform = table.Column<string>(type: "text", nullable: false),
                    platform_post_id = table.Column<string>(type: "text", nullable: false),
                    post_url = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    day_of_week = table.Column<string>(type: "text", nullable: false),
                    post_hour = table.Column<int>(type: "integer", nullable: false),
                    post_type = table.Column<string>(type: "text", nullable: false),
                    media_type = table.Column<string>(type: "text", nullable: true),
                    caption = table.Column<string>(type: "text", nullable: false),
                    hashtags = table.Column<string>(type: "text", nullable: true),
                    num_hashtags = table.Column<int>(type: "integer", nullable: false),
                    mentions_count = table.Column<int>(type: "integer", nullable: false),
                    has_call_to_action = table.Column<bool>(type: "boolean", nullable: false),
                    call_to_action_type = table.Column<string>(type: "text", nullable: true),
                    content_topic = table.Column<string>(type: "text", nullable: false),
                    sentiment_tone = table.Column<string>(type: "text", nullable: false),
                    caption_length = table.Column<int>(type: "integer", nullable: false),
                    features_resident_story = table.Column<bool>(type: "boolean", nullable: false),
                    campaign_name = table.Column<string>(type: "text", nullable: true),
                    is_boosted = table.Column<bool>(type: "boolean", nullable: false),
                    boost_budget_php = table.Column<decimal>(type: "numeric", nullable: true),
                    impressions = table.Column<int>(type: "integer", nullable: false),
                    reach = table.Column<int>(type: "integer", nullable: false),
                    likes = table.Column<int>(type: "integer", nullable: false),
                    comments = table.Column<int>(type: "integer", nullable: false),
                    shares = table.Column<int>(type: "integer", nullable: false),
                    saves = table.Column<int>(type: "integer", nullable: false),
                    click_throughs = table.Column<int>(type: "integer", nullable: false),
                    video_views = table.Column<decimal>(type: "numeric", nullable: true),
                    engagement_rate = table.Column<decimal>(type: "numeric", nullable: false),
                    profile_visits = table.Column<int>(type: "integer", nullable: false),
                    donation_referrals = table.Column<int>(type: "integer", nullable: false),
                    estimated_donation_value_php = table.Column<decimal>(type: "numeric", nullable: false),
                    follower_count_at_post = table.Column<int>(type: "integer", nullable: false),
                    watch_time_seconds = table.Column<decimal>(type: "numeric", nullable: true),
                    avg_view_duration_seconds = table.Column<decimal>(type: "numeric", nullable: true),
                    subscriber_count_at_post = table.Column<int>(type: "integer", nullable: true),
                    forwards = table.Column<decimal>(type: "numeric", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_social_media_posts", x => x.post_id);
                });

            migrationBuilder.CreateTable(
                name: "supporters",
                schema: "public",
                columns: table => new
                {
                    supporter_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    supporter_type = table.Column<string>(type: "text", nullable: false),
                    display_name = table.Column<string>(type: "text", nullable: false),
                    organization_name = table.Column<string>(type: "text", nullable: true),
                    first_name = table.Column<string>(type: "text", nullable: false),
                    last_name = table.Column<string>(type: "text", nullable: false),
                    relationship_type = table.Column<string>(type: "text", nullable: false),
                    region = table.Column<string>(type: "text", nullable: false),
                    country = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    phone = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    first_donation_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    acquisition_channel = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supporters", x => x.supporter_id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<string>(type: "text", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "partner_assignments",
                schema: "public",
                columns: table => new
                {
                    assignment_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    partner_id = table.Column<int>(type: "integer", nullable: false),
                    safehouse_id = table.Column<int>(type: "integer", nullable: true),
                    program_area = table.Column<string>(type: "text", nullable: false),
                    assignment_start = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    assignment_end = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    responsibility_notes = table.Column<string>(type: "text", nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_assignments", x => x.assignment_id);
                    table.ForeignKey(
                        name: "FK_partner_assignments_partners_partner_id",
                        column: x => x.partner_id,
                        principalSchema: "public",
                        principalTable: "partners",
                        principalColumn: "partner_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_assignments_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalSchema: "public",
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "residents",
                schema: "public",
                columns: table => new
                {
                    resident_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    case_control_no = table.Column<string>(type: "text", nullable: false),
                    internal_code = table.Column<string>(type: "text", nullable: false),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false),
                    case_status = table.Column<string>(type: "text", nullable: false),
                    sex = table.Column<string>(type: "text", nullable: false),
                    date_of_birth = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    birth_status = table.Column<string>(type: "text", nullable: false),
                    place_of_birth = table.Column<string>(type: "text", nullable: false),
                    religion = table.Column<string>(type: "text", nullable: true),
                    case_category = table.Column<string>(type: "text", nullable: false),
                    sub_cat_orphaned = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_trafficked = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_child_labor = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_physical_abuse = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_sexual_abuse = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_osaec = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_cicl = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_at_risk = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_street_child = table.Column<bool>(type: "boolean", nullable: false),
                    sub_cat_child_with_hiv = table.Column<bool>(type: "boolean", nullable: false),
                    is_pwd = table.Column<bool>(type: "boolean", nullable: false),
                    pwd_type = table.Column<string>(type: "text", nullable: true),
                    has_special_needs = table.Column<bool>(type: "boolean", nullable: false),
                    special_needs_diagnosis = table.Column<string>(type: "text", nullable: true),
                    family_is_4ps = table.Column<bool>(type: "boolean", nullable: false),
                    family_solo_parent = table.Column<bool>(type: "boolean", nullable: false),
                    family_indigenous = table.Column<bool>(type: "boolean", nullable: false),
                    family_parent_pwd = table.Column<bool>(type: "boolean", nullable: false),
                    family_informal_settler = table.Column<bool>(type: "boolean", nullable: false),
                    date_of_admission = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    age_upon_admission = table.Column<string>(type: "text", nullable: false),
                    present_age = table.Column<string>(type: "text", nullable: false),
                    length_of_stay = table.Column<string>(type: "text", nullable: false),
                    referral_source = table.Column<string>(type: "text", nullable: false),
                    referring_agency_person = table.Column<string>(type: "text", nullable: true),
                    date_colb_registered = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    date_colb_obtained = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    assigned_social_worker = table.Column<string>(type: "text", nullable: false),
                    initial_case_assessment = table.Column<string>(type: "text", nullable: true),
                    date_case_study_prepared = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reintegration_type = table.Column<string>(type: "text", nullable: true),
                    reintegration_status = table.Column<string>(type: "text", nullable: true),
                    initial_risk_level = table.Column<string>(type: "text", nullable: false),
                    current_risk_level = table.Column<string>(type: "text", nullable: false),
                    date_enrolled = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    date_closed = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notes_restricted = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_residents", x => x.resident_id);
                    table.ForeignKey(
                        name: "FK_residents_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalSchema: "public",
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "safehouse_monthly_metrics",
                schema: "public",
                columns: table => new
                {
                    metric_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false),
                    month_start = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    month_end = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    active_residents = table.Column<int>(type: "integer", nullable: false),
                    avg_education_progress = table.Column<decimal>(type: "numeric", nullable: true),
                    avg_health_score = table.Column<decimal>(type: "numeric", nullable: true),
                    process_recording_count = table.Column<int>(type: "integer", nullable: false),
                    home_visitation_count = table.Column<int>(type: "integer", nullable: false),
                    incident_count = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safehouse_monthly_metrics", x => x.metric_id);
                    table.ForeignKey(
                        name: "FK_safehouse_monthly_metrics_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalSchema: "public",
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    display_name = table.Column<string>(type: "text", nullable: false),
                    linked_supporter_id = table.Column<int>(type: "integer", nullable: true),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_supporters_linked_supporter_id",
                        column: x => x.linked_supporter_id,
                        principalSchema: "public",
                        principalTable: "supporters",
                        principalColumn: "supporter_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "donations",
                schema: "public",
                columns: table => new
                {
                    donation_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    supporter_id = table.Column<int>(type: "integer", nullable: false),
                    donation_type = table.Column<string>(type: "text", nullable: false),
                    donation_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_recurring = table.Column<bool>(type: "boolean", nullable: false),
                    campaign_name = table.Column<string>(type: "text", nullable: true),
                    channel_source = table.Column<string>(type: "text", nullable: false),
                    currency_code = table.Column<string>(type: "text", nullable: true),
                    amount = table.Column<decimal>(type: "numeric", nullable: true),
                    estimated_value = table.Column<decimal>(type: "numeric", nullable: false),
                    impact_unit = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    referral_post_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donations", x => x.donation_id);
                    table.ForeignKey(
                        name: "FK_donations_social_media_posts_referral_post_id",
                        column: x => x.referral_post_id,
                        principalSchema: "public",
                        principalTable: "social_media_posts",
                        principalColumn: "post_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_donations_supporters_supporter_id",
                        column: x => x.supporter_id,
                        principalSchema: "public",
                        principalTable: "supporters",
                        principalColumn: "supporter_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "education_records",
                schema: "public",
                columns: table => new
                {
                    education_record_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    resident_id = table.Column<int>(type: "integer", nullable: false),
                    record_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    education_level = table.Column<string>(type: "text", nullable: false),
                    school_name = table.Column<string>(type: "text", nullable: false),
                    enrollment_status = table.Column<string>(type: "text", nullable: false),
                    attendance_rate = table.Column<decimal>(type: "numeric", nullable: false),
                    progress_percent = table.Column<decimal>(type: "numeric", nullable: false),
                    completion_status = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_education_records", x => x.education_record_id);
                    table.ForeignKey(
                        name: "FK_education_records_residents_resident_id",
                        column: x => x.resident_id,
                        principalSchema: "public",
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "health_wellbeing_records",
                schema: "public",
                columns: table => new
                {
                    health_record_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    resident_id = table.Column<int>(type: "integer", nullable: false),
                    record_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    general_health_score = table.Column<decimal>(type: "numeric", nullable: false),
                    nutrition_score = table.Column<decimal>(type: "numeric", nullable: false),
                    sleep_quality_score = table.Column<decimal>(type: "numeric", nullable: false),
                    energy_level_score = table.Column<decimal>(type: "numeric", nullable: false),
                    height_cm = table.Column<decimal>(type: "numeric", nullable: false),
                    weight_kg = table.Column<decimal>(type: "numeric", nullable: false),
                    bmi = table.Column<decimal>(type: "numeric", nullable: false),
                    medical_checkup_done = table.Column<bool>(type: "boolean", nullable: false),
                    dental_checkup_done = table.Column<bool>(type: "boolean", nullable: false),
                    psychological_checkup_done = table.Column<bool>(type: "boolean", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_health_wellbeing_records", x => x.health_record_id);
                    table.ForeignKey(
                        name: "FK_health_wellbeing_records_residents_resident_id",
                        column: x => x.resident_id,
                        principalSchema: "public",
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "home_visitations",
                schema: "public",
                columns: table => new
                {
                    visitation_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    resident_id = table.Column<int>(type: "integer", nullable: false),
                    visit_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    social_worker = table.Column<string>(type: "text", nullable: false),
                    visit_type = table.Column<string>(type: "text", nullable: false),
                    location_visited = table.Column<string>(type: "text", nullable: false),
                    family_members_present = table.Column<string>(type: "text", nullable: false),
                    purpose = table.Column<string>(type: "text", nullable: false),
                    observations = table.Column<string>(type: "text", nullable: false),
                    family_cooperation_level = table.Column<string>(type: "text", nullable: false),
                    safety_concerns_noted = table.Column<bool>(type: "boolean", nullable: false),
                    follow_up_needed = table.Column<bool>(type: "boolean", nullable: false),
                    follow_up_notes = table.Column<string>(type: "text", nullable: true),
                    visit_outcome = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_home_visitations", x => x.visitation_id);
                    table.ForeignKey(
                        name: "FK_home_visitations_residents_resident_id",
                        column: x => x.resident_id,
                        principalSchema: "public",
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "incident_reports",
                schema: "public",
                columns: table => new
                {
                    incident_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    resident_id = table.Column<int>(type: "integer", nullable: false),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false),
                    incident_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    incident_type = table.Column<string>(type: "text", nullable: false),
                    severity = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    response_taken = table.Column<string>(type: "text", nullable: false),
                    resolved = table.Column<bool>(type: "boolean", nullable: false),
                    resolution_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reported_by = table.Column<string>(type: "text", nullable: false),
                    follow_up_required = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incident_reports", x => x.incident_id);
                    table.ForeignKey(
                        name: "FK_incident_reports_residents_resident_id",
                        column: x => x.resident_id,
                        principalSchema: "public",
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_incident_reports_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalSchema: "public",
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "intervention_plans",
                schema: "public",
                columns: table => new
                {
                    plan_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    resident_id = table.Column<int>(type: "integer", nullable: false),
                    plan_category = table.Column<string>(type: "text", nullable: false),
                    plan_description = table.Column<string>(type: "text", nullable: false),
                    services_provided = table.Column<string>(type: "text", nullable: false),
                    target_value = table.Column<decimal>(type: "numeric", nullable: false),
                    target_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    case_conference_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intervention_plans", x => x.plan_id);
                    table.ForeignKey(
                        name: "FK_intervention_plans_residents_resident_id",
                        column: x => x.resident_id,
                        principalSchema: "public",
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "process_recordings",
                schema: "public",
                columns: table => new
                {
                    recording_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    resident_id = table.Column<int>(type: "integer", nullable: false),
                    session_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    social_worker = table.Column<string>(type: "text", nullable: false),
                    session_type = table.Column<string>(type: "text", nullable: false),
                    session_duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    emotional_state_observed = table.Column<string>(type: "text", nullable: false),
                    emotional_state_end = table.Column<string>(type: "text", nullable: false),
                    session_narrative = table.Column<string>(type: "text", nullable: false),
                    interventions_applied = table.Column<string>(type: "text", nullable: false),
                    follow_up_actions = table.Column<string>(type: "text", nullable: false),
                    progress_noted = table.Column<bool>(type: "boolean", nullable: false),
                    concerns_flagged = table.Column<bool>(type: "boolean", nullable: false),
                    referral_made = table.Column<bool>(type: "boolean", nullable: false),
                    notes_restricted = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_process_recordings", x => x.recording_id);
                    table.ForeignKey(
                        name: "FK_process_recordings_residents_resident_id",
                        column: x => x.resident_id,
                        principalSchema: "public",
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    RoleId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "donation_allocations",
                schema: "public",
                columns: table => new
                {
                    allocation_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    donation_id = table.Column<int>(type: "integer", nullable: false),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false),
                    program_area = table.Column<string>(type: "text", nullable: false),
                    amount_allocated = table.Column<decimal>(type: "numeric", nullable: false),
                    allocation_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    allocation_notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donation_allocations", x => x.allocation_id);
                    table.ForeignKey(
                        name: "FK_donation_allocations_donations_donation_id",
                        column: x => x.donation_id,
                        principalSchema: "public",
                        principalTable: "donations",
                        principalColumn: "donation_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_donation_allocations_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalSchema: "public",
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "in_kind_donation_items",
                schema: "public",
                columns: table => new
                {
                    item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    donation_id = table.Column<int>(type: "integer", nullable: false),
                    item_name = table.Column<string>(type: "text", nullable: false),
                    item_category = table.Column<string>(type: "text", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    unit_of_measure = table.Column<string>(type: "text", nullable: false),
                    estimated_unit_value = table.Column<decimal>(type: "numeric", nullable: false),
                    intended_use = table.Column<string>(type: "text", nullable: false),
                    received_condition = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_in_kind_donation_items", x => x.item_id);
                    table.ForeignKey(
                        name: "FK_in_kind_donation_items_donations_donation_id",
                        column: x => x.donation_id,
                        principalSchema: "public",
                        principalTable: "donations",
                        principalColumn: "donation_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_linked_supporter_id",
                table: "AspNetUsers",
                column: "linked_supporter_id");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_donation_allocations_donation_id",
                schema: "public",
                table: "donation_allocations",
                column: "donation_id");

            migrationBuilder.CreateIndex(
                name: "IX_donation_allocations_safehouse_id",
                schema: "public",
                table: "donation_allocations",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_donations_campaign_name",
                schema: "public",
                table: "donations",
                column: "campaign_name");

            migrationBuilder.CreateIndex(
                name: "IX_donations_donation_date",
                schema: "public",
                table: "donations",
                column: "donation_date");

            migrationBuilder.CreateIndex(
                name: "IX_donations_donation_type",
                schema: "public",
                table: "donations",
                column: "donation_type");

            migrationBuilder.CreateIndex(
                name: "IX_donations_referral_post_id",
                schema: "public",
                table: "donations",
                column: "referral_post_id");

            migrationBuilder.CreateIndex(
                name: "IX_donations_supporter_id",
                schema: "public",
                table: "donations",
                column: "supporter_id");

            migrationBuilder.CreateIndex(
                name: "IX_education_records_record_date",
                schema: "public",
                table: "education_records",
                column: "record_date");

            migrationBuilder.CreateIndex(
                name: "IX_education_records_resident_id",
                schema: "public",
                table: "education_records",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_health_wellbeing_records_record_date",
                schema: "public",
                table: "health_wellbeing_records",
                column: "record_date");

            migrationBuilder.CreateIndex(
                name: "IX_health_wellbeing_records_resident_id",
                schema: "public",
                table: "health_wellbeing_records",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_home_visitations_resident_id",
                schema: "public",
                table: "home_visitations",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_in_kind_donation_items_donation_id",
                schema: "public",
                table: "in_kind_donation_items",
                column: "donation_id");

            migrationBuilder.CreateIndex(
                name: "IX_incident_reports_incident_type",
                schema: "public",
                table: "incident_reports",
                column: "incident_type");

            migrationBuilder.CreateIndex(
                name: "IX_incident_reports_resident_id",
                schema: "public",
                table: "incident_reports",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_incident_reports_safehouse_id",
                schema: "public",
                table: "incident_reports",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_incident_reports_severity",
                schema: "public",
                table: "incident_reports",
                column: "severity");

            migrationBuilder.CreateIndex(
                name: "IX_intervention_plans_resident_id",
                schema: "public",
                table: "intervention_plans",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_assignments_partner_id",
                schema: "public",
                table: "partner_assignments",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_assignments_safehouse_id",
                schema: "public",
                table: "partner_assignments",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_process_recordings_resident_id",
                schema: "public",
                table: "process_recordings",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_process_recordings_session_date",
                schema: "public",
                table: "process_recordings",
                column: "session_date");

            migrationBuilder.CreateIndex(
                name: "IX_residents_case_status",
                schema: "public",
                table: "residents",
                column: "case_status");

            migrationBuilder.CreateIndex(
                name: "IX_residents_current_risk_level",
                schema: "public",
                table: "residents",
                column: "current_risk_level");

            migrationBuilder.CreateIndex(
                name: "IX_residents_reintegration_status",
                schema: "public",
                table: "residents",
                column: "reintegration_status");

            migrationBuilder.CreateIndex(
                name: "IX_residents_safehouse_id",
                schema: "public",
                table: "residents",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_safehouse_monthly_metrics_safehouse_id",
                schema: "public",
                table: "safehouse_monthly_metrics",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_social_media_posts_platform",
                schema: "public",
                table: "social_media_posts",
                column: "platform");

            migrationBuilder.CreateIndex(
                name: "IX_supporters_supporter_type",
                schema: "public",
                table: "supporters",
                column: "supporter_type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "connection_probe",
                schema: "public");

            migrationBuilder.DropTable(
                name: "donation_allocations",
                schema: "public");

            migrationBuilder.DropTable(
                name: "education_records",
                schema: "public");

            migrationBuilder.DropTable(
                name: "health_wellbeing_records",
                schema: "public");

            migrationBuilder.DropTable(
                name: "home_visitations",
                schema: "public");

            migrationBuilder.DropTable(
                name: "in_kind_donation_items",
                schema: "public");

            migrationBuilder.DropTable(
                name: "incident_reports",
                schema: "public");

            migrationBuilder.DropTable(
                name: "intervention_plans",
                schema: "public");

            migrationBuilder.DropTable(
                name: "partner_assignments",
                schema: "public");

            migrationBuilder.DropTable(
                name: "process_recordings",
                schema: "public");

            migrationBuilder.DropTable(
                name: "public_impact_snapshots",
                schema: "public");

            migrationBuilder.DropTable(
                name: "safehouse_monthly_metrics",
                schema: "public");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "donations",
                schema: "public");

            migrationBuilder.DropTable(
                name: "partners",
                schema: "public");

            migrationBuilder.DropTable(
                name: "residents",
                schema: "public");

            migrationBuilder.DropTable(
                name: "social_media_posts",
                schema: "public");

            migrationBuilder.DropTable(
                name: "supporters",
                schema: "public");

            migrationBuilder.DropTable(
                name: "safehouses",
                schema: "public");
        }
    }
}
