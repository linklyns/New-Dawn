using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Models;

namespace New_Dawn.Services;

public class NotificationService(
    IServiceScopeFactory scopeFactory,
    CsvPredictionService csvPredictions,
    ILogger<NotificationService> logger)
{
    // === Notification type constants ===
    public const string TypeMfaReminder = "MfaReminder";
    public const string TypeLowLikelihoodDonors = "LowLikelihoodDonors";
    public const string TypeForgottenParticipants = "ForgottenParticipants";
    public const string TypeSocialMediaReminder = "SocialMediaReminder";
    public const string TypeDonationMilestone = "DonationMilestone";
    public const string TypeAllocationBenchmark = "AllocationBenchmark";

    private const decimal DonationMilestoneThreshold = 100_000m;
    private const decimal AllocationBenchmarkThreshold = 50_000m;
    private const int ForgottenDaysThreshold = 30;
    private const int MfaReminderMonths = 6;

    public async Task GenerateAllAsync()
    {
        try
        {
            await GenerateMfaRemindersAsync();
            await GenerateLowLikelihoodDonorsAsync();
            await GenerateForgottenParticipantsAsync();
            await GenerateSocialMediaRemindersAsync();
            await GenerateDonationMilestonesAsync();
            await GenerateAllocationBenchmarksAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error generating notifications");
        }
    }

    /// <summary>
    /// MFA Reminders: Notify about users without MFA. Repeat every 6 months.
    /// </summary>
    private async Task GenerateMfaRemindersAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var groupKey = $"mfa-reminder-{DateTime.UtcNow:yyyy-MM}";
        var halfYear = DateTime.UtcNow.Month <= 6 ? "H1" : "H2";
        groupKey = $"mfa-reminder-{DateTime.UtcNow:yyyy}-{halfYear}";

        if (await db.Notifications.AnyAsync(n => n.GroupKey == groupKey))
            return;

        var users = await userManager.Users.ToListAsync();
        var usersWithoutMfa = users.Where(u => !u.TwoFactorEnabled).ToList();

        if (usersWithoutMfa.Count == 0)
            return;

        var names = usersWithoutMfa
            .Take(5)
            .Select(u => u.DisplayName)
            .ToList();
        var suffix = usersWithoutMfa.Count > 5 ? $" and {usersWithoutMfa.Count - 5} more" : "";

        db.Notifications.Add(new Notification
        {
            Type = TypeMfaReminder,
            Title = "MFA Setup Reminder",
            Message = $"{usersWithoutMfa.Count} user(s) haven't set up MFA: {string.Join(", ", names)}{suffix}. Consider reminding them to enable two-factor authentication.",
            Link = "/admin/users",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated MFA reminder notification for {Count} users", usersWithoutMfa.Count);
    }

    /// <summary>
    /// Low Likelihood Donors: Every Monday, list active donors with low likelihood to donate.
    /// </summary>
    private async Task GenerateLowLikelihoodDonorsAsync()
    {
        if (DateTime.UtcNow.DayOfWeek != DayOfWeek.Monday)
            return;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var groupKey = $"low-likelihood-{DateTime.UtcNow:yyyy-MM-dd}";
        if (await db.Notifications.AnyAsync(n => n.GroupKey == groupKey))
            return;

        var predictions = csvPredictions.GetSupporterPredictions();
        var lowLikelihood = predictions
            .Where(p =>
                p.TryGetValue("likelihood_category", out var cat)
                && cat.Equals("Low", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (lowLikelihood.Count == 0)
            return;

        var names = lowLikelihood
            .Take(5)
            .Select(p => p.GetValueOrDefault("display_name", "Unknown"))
            .ToList();
        var suffix = lowLikelihood.Count > 5 ? $" and {lowLikelihood.Count - 5} more" : "";

        db.Notifications.Add(new Notification
        {
            Type = TypeLowLikelihoodDonors,
            Title = "Low Likelihood Donors This Week",
            Message = $"{lowLikelihood.Count} active donor(s) have low donation likelihood: {string.Join(", ", names)}{suffix}. Consider targeted outreach.",
            Link = "/admin/supporters",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated low-likelihood donor notification for {Count} donors", lowLikelihood.Count);
    }

    /// <summary>
    /// Forgotten Participants: Open-case residents with no activity in 30+ days.
    /// </summary>
    private async Task GenerateForgottenParticipantsAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var groupKey = $"forgotten-participants-{DateTime.UtcNow:yyyy-MM-dd}";
        if (await db.Notifications.AnyAsync(n => n.GroupKey == groupKey))
            return;

        var cutoff = DateTime.UtcNow.AddDays(-ForgottenDaysThreshold);

        // Find open-case residents where the most recent activity is older than cutoff
        var forgotten = await db.Residents
            .Where(r => r.CaseStatus == "Open")
            .Select(r => new
            {
                r.ResidentId,
                r.InternalCode,
                LastActivity = new[]
                {
                    r.ProcessRecordings.Max(pr => (DateTime?)pr.SessionDate),
                    r.HomeVisitations.Max(hv => (DateTime?)hv.VisitDate),
                    r.HealthWellbeingRecords.Max(hw => (DateTime?)hw.RecordDate),
                    r.EducationRecords.Max(er => (DateTime?)er.RecordDate),
                    r.InterventionPlans.Max(ip => (DateTime?)ip.CaseConferenceDate),
                }.Max()
            })
            .Where(r => r.LastActivity == null || r.LastActivity < cutoff)
            .ToListAsync();

        if (forgotten.Count == 0)
            return;

        var codes = forgotten.Take(5).Select(r => r.InternalCode).ToList();
        var suffix = forgotten.Count > 5 ? $" and {forgotten.Count - 5} more" : "";

        db.Notifications.Add(new Notification
        {
            Type = TypeForgottenParticipants,
            Title = "Participants Need Attention",
            Message = $"{forgotten.Count} resident(s) with open cases have no recorded activity in {ForgottenDaysThreshold}+ days: {string.Join(", ", codes)}{suffix}.",
            Link = "/admin/residents",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated forgotten-participants notification for {Count} residents", forgotten.Count);
    }

    /// <summary>
    /// Social Media Reminders: Upcoming scheduled drafts at their predicted best posting times.
    /// </summary>
    private async Task GenerateSocialMediaRemindersAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var today = DateTime.UtcNow.DayOfWeek.ToString();
        var currentHour = DateTime.UtcNow.Hour;

        // Find drafts scheduled for today
        var scheduledDrafts = await db.SocialMediaDrafts
            .Where(d => d.Status == "scheduled"
                && d.ScheduledDay == today
                && d.ScheduledHour != null
                && d.ScheduledHour >= currentHour
                && d.ScheduledHour <= currentHour + 2)
            .Select(d => new { d.DraftId, d.Title, d.Platform, d.ScheduledHour })
            .ToListAsync();

        foreach (var draft in scheduledDrafts)
        {
            var groupKey = $"social-reminder-{draft.DraftId}-{DateTime.UtcNow:yyyy-MM-dd}";
            if (await db.Notifications.AnyAsync(n => n.GroupKey == groupKey))
                continue;

            db.Notifications.Add(new Notification
            {
                Type = TypeSocialMediaReminder,
                Title = "Time to Post on Social Media",
                Message = $"Scheduled post \"{draft.Title}\" on {draft.Platform} is due at {draft.ScheduledHour}:00 today. This is a predicted optimal posting time.",
                Link = "/admin/social/editor",
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                GroupKey = groupKey
            });
        }

        // Also check ML best posting times and remind if there's a top slot approaching
        var bestTimes = csvPredictions.GetBestPostingTimes();
        var topSlots = bestTimes
            .Where(t =>
                t.TryGetValue("day_of_week", out var day)
                && day.Equals(today, StringComparison.OrdinalIgnoreCase)
                && t.TryGetValue("post_hour", out var hourStr)
                && int.TryParse(hourStr, out var hour)
                && hour >= currentHour && hour <= currentHour + 2
                && t.TryGetValue("rank", out var rankStr)
                && int.TryParse(rankStr, out var rank)
                && rank <= 5)
            .ToList();

        if (topSlots.Count > 0)
        {
            var groupKey = $"best-time-{DateTime.UtcNow:yyyy-MM-dd}-{currentHour}";
            if (!await db.Notifications.AnyAsync(n => n.GroupKey == groupKey))
            {
                var slot = topSlots.First();
                slot.TryGetValue("post_hour", out var h);
                slot.TryGetValue("predicted_estimated_donation_value_php", out var val);

                db.Notifications.Add(new Notification
                {
                    Type = TypeSocialMediaReminder,
                    Title = "Optimal Posting Window Now",
                    Message = $"Right now is a top-ranked posting time ({today} {h}:00). Predicted donation value: PHP {val}. Consider publishing any ready drafts.",
                    Link = "/admin/social/editor",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    GroupKey = groupKey
                });
            }
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Donation Milestones: Notify when cumulative donations cross every 100,000 PHP.
    /// </summary>
    private async Task GenerateDonationMilestonesAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var totalDonations = await db.Donations
            .Where(d => d.Amount != null)
            .SumAsync(d => d.Amount!.Value);

        var milestoneCount = (int)(totalDonations / DonationMilestoneThreshold);

        if (milestoneCount < 1)
            return;

        var latestMilestone = milestoneCount * DonationMilestoneThreshold;
        var groupKey = $"donation-milestone-{latestMilestone}";

        if (await db.Notifications.AnyAsync(n => n.GroupKey == groupKey))
            return;

        db.Notifications.Add(new Notification
        {
            Type = TypeDonationMilestone,
            Title = "Donation Milestone Reached!",
            Message = $"Cumulative donations have crossed PHP {latestMilestone:N0}! Total: PHP {totalDonations:N0}.",
            Link = "/admin/donations",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated donation milestone notification at PHP {Milestone}", latestMilestone);
    }

    /// <summary>
    /// Allocation Benchmarks: Notify when cumulative allocations cross every 50,000 PHP.
    /// </summary>
    private async Task GenerateAllocationBenchmarksAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var totalAllocations = await db.DonationAllocations
            .SumAsync(da => da.AmountAllocated);

        var benchmarkCount = (int)(totalAllocations / AllocationBenchmarkThreshold);

        if (benchmarkCount < 1)
            return;

        var latestBenchmark = benchmarkCount * AllocationBenchmarkThreshold;
        var groupKey = $"allocation-benchmark-{latestBenchmark}";

        if (await db.Notifications.AnyAsync(n => n.GroupKey == groupKey))
            return;

        db.Notifications.Add(new Notification
        {
            Type = TypeAllocationBenchmark,
            Title = "Allocation Benchmark Reached!",
            Message = $"Cumulative donation allocations have crossed PHP {latestBenchmark:N0}! Total allocated: PHP {totalAllocations:N0}.",
            Link = "/admin/allocations",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated allocation benchmark notification at PHP {Benchmark}", latestBenchmark);
    }
}
