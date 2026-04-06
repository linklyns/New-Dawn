using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using CsvHelper.TypeConversion;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Models;

namespace New_Dawn.Data.SeedData;

public static class CsvSeeder
{
    public static async Task SeedAsync(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        string csvBasePath)
    {
        // Create roles if they don't exist
        foreach (var roleName in new[] { "Admin", "Donor" })
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        // Seed user accounts
        await SeedUsersAsync(userManager);

        // Seed each table only if it is empty (idempotent, survives partial failures)
        if (!await context.Safehouses.AnyAsync())
            await SeedEntity<Safehouse, SafehouseMap>(context, csvBasePath, "safehouses.csv", context.Safehouses);
        if (!await context.Partners.AnyAsync())
            await SeedEntity<Partner, PartnerMap>(context, csvBasePath, "partners.csv", context.Partners);
        if (!await context.Supporters.AnyAsync())
            await SeedEntity<Supporter, SupporterMap>(context, csvBasePath, "supporters.csv", context.Supporters);
        if (!await context.SocialMediaPosts.AnyAsync())
            await SeedEntity<SocialMediaPost, SocialMediaPostMap>(context, csvBasePath, "social_media_posts.csv", context.SocialMediaPosts);
        if (!await context.PublicImpactSnapshots.AnyAsync())
            await SeedEntity<PublicImpactSnapshot, PublicImpactSnapshotMap>(context, csvBasePath, "public_impact_snapshots.csv", context.PublicImpactSnapshots);
        if (!await context.Residents.AnyAsync())
            await SeedEntity<Resident, ResidentMap>(context, csvBasePath, "residents.csv", context.Residents);
        if (!await context.Donations.AnyAsync())
            await SeedEntity<Donation, DonationMap>(context, csvBasePath, "donations.csv", context.Donations);
        if (!await context.DonationAllocations.AnyAsync())
            await SeedEntity<DonationAllocation, DonationAllocationMap>(context, csvBasePath, "donation_allocations.csv", context.DonationAllocations);
        if (!await context.InKindDonationItems.AnyAsync())
            await SeedEntity<InKindDonationItem, InKindDonationItemMap>(context, csvBasePath, "in_kind_donation_items.csv", context.InKindDonationItems);
        if (!await context.PartnerAssignments.AnyAsync())
            await SeedEntity<PartnerAssignment, PartnerAssignmentMap>(context, csvBasePath, "partner_assignments.csv", context.PartnerAssignments);
        if (!await context.ProcessRecordings.AnyAsync())
            await SeedEntity<ProcessRecording, ProcessRecordingMap>(context, csvBasePath, "process_recordings.csv", context.ProcessRecordings);
        if (!await context.HomeVisitations.AnyAsync())
            await SeedEntity<HomeVisitation, HomeVisitationMap>(context, csvBasePath, "home_visitations.csv", context.HomeVisitations);
        if (!await context.EducationRecords.AnyAsync())
            await SeedEntity<EducationRecord, EducationRecordMap>(context, csvBasePath, "education_records.csv", context.EducationRecords);
        if (!await context.HealthWellbeingRecords.AnyAsync())
            await SeedEntity<HealthWellbeingRecord, HealthWellbeingRecordMap>(context, csvBasePath, "health_wellbeing_records.csv", context.HealthWellbeingRecords);
        if (!await context.InterventionPlans.AnyAsync())
            await SeedEntity<InterventionPlan, InterventionPlanMap>(context, csvBasePath, "intervention_plans.csv", context.InterventionPlans);
        if (!await context.IncidentReports.AnyAsync())
            await SeedEntity<IncidentReport, IncidentReportMap>(context, csvBasePath, "incident_reports.csv", context.IncidentReports);
        if (!await context.SafehouseMonthlyMetrics.AnyAsync())
            await SeedEntity<SafehouseMonthlyMetric, SafehouseMonthlyMetricMap>(context, csvBasePath, "safehouse_monthly_metrics.csv", context.SafehouseMonthlyMetrics);

        // Link donor user to supporter 1 now that supporters are seeded
        var donorUser = await userManager.FindByEmailAsync("donor@newdawn.ph");
        if (donorUser != null && donorUser.LinkedSupporterId == null)
        {
            donorUser.LinkedSupporterId = 1;
            await userManager.UpdateAsync(donorUser);
        }
    }

    private static async Task SeedUsersAsync(UserManager<ApplicationUser> userManager)
    {
        // Admin user
        if (await userManager.FindByEmailAsync("admin@newdawn.ph") == null)
        {
            var admin = new ApplicationUser
            {
                UserName = "admin@newdawn.ph",
                Email = "admin@newdawn.ph",
                DisplayName = "Admin User",
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(admin, "Admin123!@");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, "Admin");
            }
        }

        // Donor user (LinkedSupporterId set after supporters are seeded)
        if (await userManager.FindByEmailAsync("donor@newdawn.ph") == null)
        {
            var donor = new ApplicationUser
            {
                UserName = "donor@newdawn.ph",
                Email = "donor@newdawn.ph",
                DisplayName = "Donor User",
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(donor, "Donor123!@");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(donor, "Donor");
            }
        }

        // MFA user
        if (await userManager.FindByEmailAsync("mfa@newdawn.ph") == null)
        {
            var mfaUser = new ApplicationUser
            {
                UserName = "mfa@newdawn.ph",
                Email = "mfa@newdawn.ph",
                DisplayName = "MFA User",
                TwoFactorEnabled = true,
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(mfaUser, "MfaUser123!@");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(mfaUser, "Admin");
            }
        }
    }

    private static async Task SeedEntity<TEntity, TMap>(
        AppDbContext context,
        string csvBasePath,
        string fileName,
        DbSet<TEntity> dbSet)
        where TEntity : class
        where TMap : ClassMap<TEntity>
    {
        var filePath = Path.Combine(csvBasePath, fileName);
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"CSV file not found: {filePath}");
            return;
        }

        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HeaderValidated = null,
            MissingFieldFound = null,
            PrepareHeaderForMatch = args => args.Header.Trim(),
        };

        using var reader = new StreamReader(filePath);
        using var csv = new CsvReader(reader, config);
        csv.Context.TypeConverterCache.AddConverter<bool>(new FlexibleBoolConverter());
        csv.Context.TypeConverterCache.AddConverter<DateTime>(new FlexibleDateTimeConverter());
        csv.Context.TypeConverterCache.AddConverter<DateTime?>(new NullableFlexibleDateTimeConverter());
        csv.Context.RegisterClassMap<TMap>();

        var records = csv.GetRecords<TEntity>().ToList();
        await dbSet.AddRangeAsync(records);
        await context.SaveChangesAsync();
    }

    // === Custom Type Converters ===

    private class FlexibleBoolConverter : DefaultTypeConverter
    {
        public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        {
            if (string.IsNullOrWhiteSpace(text))
                return false;

            return text.Trim().Equals("True", StringComparison.OrdinalIgnoreCase)
                || text.Trim().Equals("1", StringComparison.Ordinal);
        }
    }

    private class FlexibleDateTimeConverter : DefaultTypeConverter
    {
        private static readonly string[] Formats =
        {
            "yyyy-MM-dd",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-ddTHH:mm:ss",
            "M/d/yyyy",
            "M/d/yyyy HH:mm:ss",
        };

        public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        {
            if (string.IsNullOrWhiteSpace(text))
                return DateTime.SpecifyKind(DateTime.MinValue, DateTimeKind.Utc);

            if (DateTime.TryParseExact(text.Trim(), Formats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var dt))
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);

            if (DateTime.TryParse(text.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);

            return DateTime.SpecifyKind(DateTime.MinValue, DateTimeKind.Utc);
        }
    }

    private class NullableFlexibleDateTimeConverter : DefaultTypeConverter
    {
        private static readonly string[] Formats =
        {
            "yyyy-MM-dd",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-ddTHH:mm:ss",
            "M/d/yyyy",
            "M/d/yyyy HH:mm:ss",
        };

        public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            if (DateTime.TryParseExact(text.Trim(), Formats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var dt))
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);

            if (DateTime.TryParse(text.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);

            return null;
        }
    }

    private class NullableIntConverter : DefaultTypeConverter
    {
        public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Handle decimal values like "8.0"
            if (double.TryParse(text.Trim(), CultureInfo.InvariantCulture, out var d))
                return (int?)Convert.ToInt32(d);

            return null;
        }
    }

    private class NullableDecimalConverter : DefaultTypeConverter
    {
        public override object? ConvertFromString(string? text, IReaderRow row, MemberMapData memberMapData)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            if (decimal.TryParse(text.Trim(), CultureInfo.InvariantCulture, out var d))
                return d;

            return null;
        }
    }

    // === CsvHelper Class Maps ===

    private sealed class SafehouseMap : ClassMap<Safehouse>
    {
        public SafehouseMap()
        {
            Map(m => m.SafehouseId).Name("safehouse_id");
            Map(m => m.SafehouseCode).Name("safehouse_code");
            Map(m => m.Name).Name("name");
            Map(m => m.Region).Name("region");
            Map(m => m.City).Name("city");
            Map(m => m.Province).Name("province");
            Map(m => m.Country).Name("country");
            Map(m => m.OpenDate).Name("open_date");
            Map(m => m.Status).Name("status");
            Map(m => m.CapacityGirls).Name("capacity_girls");
            Map(m => m.CapacityStaff).Name("capacity_staff");
            Map(m => m.CurrentOccupancy).Name("current_occupancy");
            Map(m => m.Notes).Name("notes").Optional();
        }
    }

    private sealed class ResidentMap : ClassMap<Resident>
    {
        public ResidentMap()
        {
            Map(m => m.ResidentId).Name("resident_id");
            Map(m => m.CaseControlNo).Name("case_control_no");
            Map(m => m.InternalCode).Name("internal_code");
            Map(m => m.SafehouseId).Name("safehouse_id");
            Map(m => m.CaseStatus).Name("case_status");
            Map(m => m.Sex).Name("sex");
            Map(m => m.DateOfBirth).Name("date_of_birth");
            Map(m => m.BirthStatus).Name("birth_status");
            Map(m => m.PlaceOfBirth).Name("place_of_birth");
            Map(m => m.Religion).Name("religion").Optional();
            Map(m => m.CaseCategory).Name("case_category");
            Map(m => m.SubCatOrphaned).Name("sub_cat_orphaned");
            Map(m => m.SubCatTrafficked).Name("sub_cat_trafficked");
            Map(m => m.SubCatChildLabor).Name("sub_cat_child_labor");
            Map(m => m.SubCatPhysicalAbuse).Name("sub_cat_physical_abuse");
            Map(m => m.SubCatSexualAbuse).Name("sub_cat_sexual_abuse");
            Map(m => m.SubCatOsaec).Name("sub_cat_osaec");
            Map(m => m.SubCatCicl).Name("sub_cat_cicl");
            Map(m => m.SubCatAtRisk).Name("sub_cat_at_risk");
            Map(m => m.SubCatStreetChild).Name("sub_cat_street_child");
            Map(m => m.SubCatChildWithHiv).Name("sub_cat_child_with_hiv");
            Map(m => m.IsPwd).Name("is_pwd");
            Map(m => m.PwdType).Name("pwd_type").Optional();
            Map(m => m.HasSpecialNeeds).Name("has_special_needs");
            Map(m => m.SpecialNeedsDiagnosis).Name("special_needs_diagnosis").Optional();
            Map(m => m.FamilyIs4ps).Name("family_is_4ps");
            Map(m => m.FamilySoloParent).Name("family_solo_parent");
            Map(m => m.FamilyIndigenous).Name("family_indigenous");
            Map(m => m.FamilyParentPwd).Name("family_parent_pwd");
            Map(m => m.FamilyInformalSettler).Name("family_informal_settler");
            Map(m => m.DateOfAdmission).Name("date_of_admission");
            Map(m => m.AgeUponAdmission).Name("age_upon_admission");
            Map(m => m.PresentAge).Name("present_age");
            Map(m => m.LengthOfStay).Name("length_of_stay");
            Map(m => m.ReferralSource).Name("referral_source");
            Map(m => m.ReferringAgencyPerson).Name("referring_agency_person").Optional();
            Map(m => m.DateColbRegistered).Name("date_colb_registered").Optional();
            Map(m => m.DateColbObtained).Name("date_colb_obtained").Optional();
            Map(m => m.AssignedSocialWorker).Name("assigned_social_worker");
            Map(m => m.InitialCaseAssessment).Name("initial_case_assessment").Optional();
            Map(m => m.DateCaseStudyPrepared).Name("date_case_study_prepared").Optional();
            Map(m => m.ReintegrationType).Name("reintegration_type").Optional();
            Map(m => m.ReintegrationStatus).Name("reintegration_status").Optional();
            Map(m => m.InitialRiskLevel).Name("initial_risk_level");
            Map(m => m.CurrentRiskLevel).Name("current_risk_level");
            Map(m => m.DateEnrolled).Name("date_enrolled");
            Map(m => m.DateClosed).Name("date_closed").Optional();
            Map(m => m.CreatedAt).Name("created_at");
            Map(m => m.NotesRestricted).Name("notes_restricted").Optional();
        }
    }

    private sealed class SupporterMap : ClassMap<Supporter>
    {
        public SupporterMap()
        {
            Map(m => m.SupporterId).Name("supporter_id");
            Map(m => m.SupporterType).Name("supporter_type");
            Map(m => m.DisplayName).Name("display_name");
            Map(m => m.OrganizationName).Name("organization_name").Optional();
            Map(m => m.FirstName).Name("first_name");
            Map(m => m.LastName).Name("last_name");
            Map(m => m.RelationshipType).Name("relationship_type");
            Map(m => m.Region).Name("region");
            Map(m => m.Country).Name("country");
            Map(m => m.Email).Name("email");
            Map(m => m.Phone).Name("phone");
            Map(m => m.Status).Name("status");
            Map(m => m.CreatedAt).Name("created_at").TypeConverter<FlexibleDateTimeConverter>();
            Map(m => m.FirstDonationDate).Name("first_donation_date").TypeConverter<FlexibleDateTimeConverter>();
            Map(m => m.AcquisitionChannel).Name("acquisition_channel");
        }
    }

    private sealed class DonationMap : ClassMap<Donation>
    {
        public DonationMap()
        {
            Map(m => m.DonationId).Name("donation_id");
            Map(m => m.SupporterId).Name("supporter_id");
            Map(m => m.DonationType).Name("donation_type");
            Map(m => m.DonationDate).Name("donation_date");
            Map(m => m.IsRecurring).Name("is_recurring");
            Map(m => m.CampaignName).Name("campaign_name").Optional();
            Map(m => m.ChannelSource).Name("channel_source");
            Map(m => m.CurrencyCode).Name("currency_code").Optional();
            Map(m => m.Amount).Name("amount").TypeConverter<NullableDecimalConverter>();
            Map(m => m.EstimatedValue).Name("estimated_value");
            Map(m => m.ImpactUnit).Name("impact_unit");
            Map(m => m.Notes).Name("notes").Optional();
            Map(m => m.ReferralPostId).Name("referral_post_id").TypeConverter<NullableIntConverter>();
        }
    }

    private sealed class DonationAllocationMap : ClassMap<DonationAllocation>
    {
        public DonationAllocationMap()
        {
            Map(m => m.AllocationId).Name("allocation_id");
            Map(m => m.DonationId).Name("donation_id");
            Map(m => m.SafehouseId).Name("safehouse_id");
            Map(m => m.ProgramArea).Name("program_area");
            Map(m => m.AmountAllocated).Name("amount_allocated");
            Map(m => m.AllocationDate).Name("allocation_date");
            Map(m => m.AllocationNotes).Name("allocation_notes").Optional();
        }
    }

    private sealed class SocialMediaPostMap : ClassMap<SocialMediaPost>
    {
        public SocialMediaPostMap()
        {
            Map(m => m.PostId).Name("post_id");
            Map(m => m.Platform).Name("platform");
            Map(m => m.PlatformPostId).Name("platform_post_id");
            Map(m => m.PostUrl).Name("post_url");
            Map(m => m.CreatedAt).Name("created_at");
            Map(m => m.DayOfWeek).Name("day_of_week");
            Map(m => m.PostHour).Name("post_hour");
            Map(m => m.PostType).Name("post_type");
            Map(m => m.MediaType).Name("media_type").Optional();
            Map(m => m.Caption).Name("caption");
            Map(m => m.Hashtags).Name("hashtags").Optional();
            Map(m => m.NumHashtags).Name("num_hashtags");
            Map(m => m.MentionsCount).Name("mentions_count");
            Map(m => m.HasCallToAction).Name("has_call_to_action");
            Map(m => m.CallToActionType).Name("call_to_action_type").Optional();
            Map(m => m.ContentTopic).Name("content_topic");
            Map(m => m.SentimentTone).Name("sentiment_tone");
            Map(m => m.CaptionLength).Name("caption_length");
            Map(m => m.FeaturesResidentStory).Name("features_resident_story");
            Map(m => m.CampaignName).Name("campaign_name").Optional();
            Map(m => m.IsBoosted).Name("is_boosted");
            Map(m => m.BoostBudgetPhp).Name("boost_budget_php").TypeConverter<NullableDecimalConverter>();
            Map(m => m.Impressions).Name("impressions");
            Map(m => m.Reach).Name("reach");
            Map(m => m.Likes).Name("likes");
            Map(m => m.Comments).Name("comments");
            Map(m => m.Shares).Name("shares");
            Map(m => m.Saves).Name("saves");
            Map(m => m.ClickThroughs).Name("click_throughs");
            Map(m => m.VideoViews).Name("video_views").TypeConverter<NullableDecimalConverter>();
            Map(m => m.EngagementRate).Name("engagement_rate");
            Map(m => m.ProfileVisits).Name("profile_visits");
            Map(m => m.DonationReferrals).Name("donation_referrals");
            Map(m => m.EstimatedDonationValuePhp).Name("estimated_donation_value_php");
            Map(m => m.FollowerCountAtPost).Name("follower_count_at_post");
            Map(m => m.WatchTimeSeconds).Name("watch_time_seconds").TypeConverter<NullableDecimalConverter>();
            Map(m => m.AvgViewDurationSeconds).Name("avg_view_duration_seconds").TypeConverter<NullableDecimalConverter>();
            Map(m => m.SubscriberCountAtPost).Name("subscriber_count_at_post").TypeConverter<NullableIntConverter>();
            Map(m => m.Forwards).Name("forwards").TypeConverter<NullableDecimalConverter>();
        }
    }

    private sealed class ProcessRecordingMap : ClassMap<ProcessRecording>
    {
        public ProcessRecordingMap()
        {
            Map(m => m.RecordingId).Name("recording_id");
            Map(m => m.ResidentId).Name("resident_id");
            Map(m => m.SessionDate).Name("session_date");
            Map(m => m.SocialWorker).Name("social_worker");
            Map(m => m.SessionType).Name("session_type");
            Map(m => m.SessionDurationMinutes).Name("session_duration_minutes");
            Map(m => m.EmotionalStateObserved).Name("emotional_state_observed");
            Map(m => m.EmotionalStateEnd).Name("emotional_state_end");
            Map(m => m.SessionNarrative).Name("session_narrative");
            Map(m => m.InterventionsApplied).Name("interventions_applied");
            Map(m => m.FollowUpActions).Name("follow_up_actions");
            Map(m => m.ProgressNoted).Name("progress_noted");
            Map(m => m.ConcernsFlagged).Name("concerns_flagged");
            Map(m => m.ReferralMade).Name("referral_made");
            Map(m => m.NotesRestricted).Name("notes_restricted").Optional();
        }
    }

    private sealed class HomeVisitationMap : ClassMap<HomeVisitation>
    {
        public HomeVisitationMap()
        {
            Map(m => m.VisitationId).Name("visitation_id");
            Map(m => m.ResidentId).Name("resident_id");
            Map(m => m.VisitDate).Name("visit_date");
            Map(m => m.SocialWorker).Name("social_worker");
            Map(m => m.VisitType).Name("visit_type");
            Map(m => m.LocationVisited).Name("location_visited");
            Map(m => m.FamilyMembersPresent).Name("family_members_present");
            Map(m => m.Purpose).Name("purpose");
            Map(m => m.Observations).Name("observations");
            Map(m => m.FamilyCooperationLevel).Name("family_cooperation_level");
            Map(m => m.SafetyConcernsNoted).Name("safety_concerns_noted");
            Map(m => m.FollowUpNeeded).Name("follow_up_needed");
            Map(m => m.FollowUpNotes).Name("follow_up_notes").Optional();
            Map(m => m.VisitOutcome).Name("visit_outcome");
        }
    }

    private sealed class EducationRecordMap : ClassMap<EducationRecord>
    {
        public EducationRecordMap()
        {
            Map(m => m.EducationRecordId).Name("education_record_id");
            Map(m => m.ResidentId).Name("resident_id");
            Map(m => m.RecordDate).Name("record_date");
            Map(m => m.EducationLevel).Name("education_level");
            Map(m => m.SchoolName).Name("school_name");
            Map(m => m.EnrollmentStatus).Name("enrollment_status");
            Map(m => m.AttendanceRate).Name("attendance_rate");
            Map(m => m.ProgressPercent).Name("progress_percent");
            Map(m => m.CompletionStatus).Name("completion_status");
            Map(m => m.Notes).Name("notes");
        }
    }

    private sealed class HealthWellbeingRecordMap : ClassMap<HealthWellbeingRecord>
    {
        public HealthWellbeingRecordMap()
        {
            Map(m => m.HealthRecordId).Name("health_record_id");
            Map(m => m.ResidentId).Name("resident_id");
            Map(m => m.RecordDate).Name("record_date");
            Map(m => m.GeneralHealthScore).Name("general_health_score");
            Map(m => m.NutritionScore).Name("nutrition_score");
            Map(m => m.SleepQualityScore).Name("sleep_quality_score");
            Map(m => m.EnergyLevelScore).Name("energy_level_score");
            Map(m => m.HeightCm).Name("height_cm");
            Map(m => m.WeightKg).Name("weight_kg");
            Map(m => m.Bmi).Name("bmi");
            Map(m => m.MedicalCheckupDone).Name("medical_checkup_done");
            Map(m => m.DentalCheckupDone).Name("dental_checkup_done");
            Map(m => m.PsychologicalCheckupDone).Name("psychological_checkup_done");
            Map(m => m.Notes).Name("notes");
        }
    }

    private sealed class InterventionPlanMap : ClassMap<InterventionPlan>
    {
        public InterventionPlanMap()
        {
            Map(m => m.PlanId).Name("plan_id");
            Map(m => m.ResidentId).Name("resident_id");
            Map(m => m.PlanCategory).Name("plan_category");
            Map(m => m.PlanDescription).Name("plan_description");
            Map(m => m.ServicesProvided).Name("services_provided");
            Map(m => m.TargetValue).Name("target_value");
            Map(m => m.TargetDate).Name("target_date");
            Map(m => m.Status).Name("status");
            Map(m => m.CaseConferenceDate).Name("case_conference_date");
            Map(m => m.CreatedAt).Name("created_at");
            Map(m => m.UpdatedAt).Name("updated_at");
        }
    }

    private sealed class IncidentReportMap : ClassMap<IncidentReport>
    {
        public IncidentReportMap()
        {
            Map(m => m.IncidentId).Name("incident_id");
            Map(m => m.ResidentId).Name("resident_id");
            Map(m => m.SafehouseId).Name("safehouse_id");
            Map(m => m.IncidentDate).Name("incident_date");
            Map(m => m.IncidentType).Name("incident_type");
            Map(m => m.Severity).Name("severity");
            Map(m => m.Description).Name("description");
            Map(m => m.ResponseTaken).Name("response_taken");
            Map(m => m.Resolved).Name("resolved");
            Map(m => m.ResolutionDate).Name("resolution_date").Optional();
            Map(m => m.ReportedBy).Name("reported_by");
            Map(m => m.FollowUpRequired).Name("follow_up_required");
        }
    }

    private sealed class InKindDonationItemMap : ClassMap<InKindDonationItem>
    {
        public InKindDonationItemMap()
        {
            Map(m => m.ItemId).Name("item_id");
            Map(m => m.DonationId).Name("donation_id");
            Map(m => m.ItemName).Name("item_name");
            Map(m => m.ItemCategory).Name("item_category");
            Map(m => m.Quantity).Name("quantity");
            Map(m => m.UnitOfMeasure).Name("unit_of_measure");
            Map(m => m.EstimatedUnitValue).Name("estimated_unit_value");
            Map(m => m.IntendedUse).Name("intended_use");
            Map(m => m.ReceivedCondition).Name("received_condition");
        }
    }

    private sealed class PartnerMap : ClassMap<Partner>
    {
        public PartnerMap()
        {
            Map(m => m.PartnerId).Name("partner_id");
            Map(m => m.PartnerName).Name("partner_name");
            Map(m => m.PartnerType).Name("partner_type");
            Map(m => m.RoleType).Name("role_type");
            Map(m => m.ContactName).Name("contact_name");
            Map(m => m.Email).Name("email");
            Map(m => m.Phone).Name("phone");
            Map(m => m.Region).Name("region");
            Map(m => m.Status).Name("status");
            Map(m => m.StartDate).Name("start_date");
            Map(m => m.EndDate).Name("end_date").Optional();
            Map(m => m.Notes).Name("notes");
        }
    }

    private sealed class PartnerAssignmentMap : ClassMap<PartnerAssignment>
    {
        public PartnerAssignmentMap()
        {
            Map(m => m.AssignmentId).Name("assignment_id");
            Map(m => m.PartnerId).Name("partner_id");
            Map(m => m.SafehouseId).Name("safehouse_id").TypeConverter<NullableIntConverter>();
            Map(m => m.ProgramArea).Name("program_area");
            Map(m => m.AssignmentStart).Name("assignment_start");
            Map(m => m.AssignmentEnd).Name("assignment_end").Optional();
            Map(m => m.ResponsibilityNotes).Name("responsibility_notes");
            Map(m => m.IsPrimary).Name("is_primary");
            Map(m => m.Status).Name("status");
        }
    }

    private sealed class SafehouseMonthlyMetricMap : ClassMap<SafehouseMonthlyMetric>
    {
        public SafehouseMonthlyMetricMap()
        {
            Map(m => m.MetricId).Name("metric_id");
            Map(m => m.SafehouseId).Name("safehouse_id");
            Map(m => m.MonthStart).Name("month_start");
            Map(m => m.MonthEnd).Name("month_end");
            Map(m => m.ActiveResidents).Name("active_residents");
            Map(m => m.AvgEducationProgress).Name("avg_education_progress").TypeConverter<NullableDecimalConverter>();
            Map(m => m.AvgHealthScore).Name("avg_health_score").TypeConverter<NullableDecimalConverter>();
            Map(m => m.ProcessRecordingCount).Name("process_recording_count");
            Map(m => m.HomeVisitationCount).Name("home_visitation_count");
            Map(m => m.IncidentCount).Name("incident_count");
            Map(m => m.Notes).Name("notes").Optional();
        }
    }

    private sealed class PublicImpactSnapshotMap : ClassMap<PublicImpactSnapshot>
    {
        public PublicImpactSnapshotMap()
        {
            Map(m => m.SnapshotId).Name("snapshot_id");
            Map(m => m.SnapshotDate).Name("snapshot_date");
            Map(m => m.Headline).Name("headline");
            Map(m => m.SummaryText).Name("summary_text");
            Map(m => m.MetricPayloadJson).Name("metric_payload_json");
            Map(m => m.IsPublished).Name("is_published");
            Map(m => m.PublishedAt).Name("published_at");
        }
    }
}
