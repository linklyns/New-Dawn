using System.Text.Json;
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
    public const string TypeHighRiskResidents = "HighRiskResidents";
    public const string TypeSocialMediaReminder = "SocialMediaReminder";
    public const string TypeDonationMilestone = "DonationMilestone";
    public const string TypeAllocationBenchmark = "AllocationBenchmark";

    private const decimal DonationMilestoneThreshold = 100_000m;
    private const decimal AllocationBenchmarkThreshold = 50_000m;

    public async Task GenerateAllAsync(bool force = false)
    {
        try
        {
            await GenerateMfaRemindersAsync();
            await GenerateLowLikelihoodDonorsAsync(force);
            await GenerateHighRiskResidentsAsync(force);
            await GenerateSocialMediaRemindersAsync(force);
            await GenerateDonationMilestonesAsync();
            await GenerateAllocationBenchmarksAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error generating notifications");
        }
    }

    /// <summary>
    /// MFA Reminders: Per-user notification for users without MFA. Respects snooze intervals.
    /// </summary>
    private async Task GenerateMfaRemindersAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var users = await userManager.Users.ToListAsync();
        var usersWithoutMfa = users.Where(u => !u.TwoFactorEnabled).ToList();

        foreach (var user in usersWithoutMfa)
        {
            // Check if there's an active snooze for this user
            var hasActiveSnooze = await db.Notifications
                .Where(n => n.Type == "MfaSnooze"
                    && n.UserId == user.Id
                    && n.GroupKey != null
                    && n.GroupKey.StartsWith($"mfa-snooze-{user.Id}-"))
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => n.GroupKey)
                .FirstOrDefaultAsync();

            if (hasActiveSnooze != null)
            {
                // Parse the snooze expiry from the group key: mfa-snooze-{userId}-{yyyy-MM-dd}
                var parts = hasActiveSnooze.Split('-');
                if (parts.Length >= 5)
                {
                    var datePart = string.Join("-", parts[^3..]);
                    if (DateTime.TryParse(datePart, out var snoozeUntil) && snoozeUntil > DateTime.UtcNow)
                        continue; // Snooze still active
                }
            }

            // Check if there's already an unread MFA reminder for this user
            var hasExisting = await db.Notifications.AnyAsync(n =>
                n.Type == TypeMfaReminder
                && n.UserId == user.Id
                && !n.IsRead);

            if (hasExisting)
                continue;

            // Weekly group key per user to avoid spamming
            var weekKey = $"mfa-reminder-{user.Id}-{DateTime.UtcNow:yyyy}-W{System.Globalization.ISOWeek.GetWeekOfYear(DateTime.UtcNow)}";
            if (await db.Notifications.AnyAsync(n => n.GroupKey == weekKey))
                continue;

            db.Notifications.Add(new Notification
            {
                Type = TypeMfaReminder,
                Title = "Enable Two-Factor Authentication",
                Message = "Your account doesn't have MFA enabled. Set up two-factor authentication to secure your account.",
                Link = "/admin/profile",
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                GroupKey = weekKey,
                UserId = user.Id,
                TargetRole = null
            });
        }

        await db.SaveChangesAsync();
        if (usersWithoutMfa.Count > 0)
            logger.LogInformation("Processed MFA reminders for {Count} users without MFA", usersWithoutMfa.Count);
    }

    /// <summary>
    /// Low Likelihood Donors: Weekly on Mondays for Admin. Stores donor list in ListData.
    /// </summary>
    private async Task GenerateLowLikelihoodDonorsAsync(bool force = false)
    {
        if (!force && DateTime.UtcNow.DayOfWeek != DayOfWeek.Monday)
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

        var listItems = lowLikelihood.Select(p => new
        {
            supporterId = p.GetValueOrDefault("supporter_id", ""),
            displayName = p.GetValueOrDefault("display_name", "Unknown"),
            likelihoodScore = p.GetValueOrDefault("likelihood_score", "0"),
            topReason = p.GetValueOrDefault("top_reason_1", "N/A")
        }).ToList();

        var names = listItems.Take(5).Select(p => p.displayName).ToList();
        var suffix = lowLikelihood.Count > 5 ? $" and {lowLikelihood.Count - 5} more" : "";

        db.Notifications.Add(new Notification
        {
            Type = TypeLowLikelihoodDonors,
            Title = "Low Likelihood Donors This Week",
            Message = $"{lowLikelihood.Count} active donor(s) have low donation likelihood: {string.Join(", ", names)}{suffix}. Click to view the full list.",
            Link = null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey,
            UserId = null,
            TargetRole = "Admin",
            ListData = JsonSerializer.Serialize(listItems)
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated low-likelihood donor notification for {Count} donors", lowLikelihood.Count);
    }

    /// <summary>
    /// High Risk Residents: Weekly on Mondays for Admin. Combines ML predictions + DB risk levels.
    /// </summary>
    private async Task GenerateHighRiskResidentsAsync(bool force = false)
    {
        if (!force && DateTime.UtcNow.DayOfWeek != DayOfWeek.Monday)
            return;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var groupKey = $"high-risk-residents-{DateTime.UtcNow:yyyy-MM-dd}";
        if (await db.Notifications.AnyAsync(n => n.GroupKey == groupKey))
            return;

        // Source 1: ML risk predictions (Medium/High/Critical)
        var mlPredictions = csvPredictions.GetRiskPredictions()
            .Where(p =>
                p.TryGetValue("predicted_risk_level", out var level)
                && (level.Equals("Medium", StringComparison.OrdinalIgnoreCase)
                    || level.Equals("High", StringComparison.OrdinalIgnoreCase)
                    || level.Equals("Critical", StringComparison.OrdinalIgnoreCase)))
            .Select(p => new
            {
                ResidentId = int.TryParse(p.GetValueOrDefault("resident_id", ""), out var rid) ? rid : 0,
                InternalCode = p.GetValueOrDefault("internal_code", ""),
                RiskLevel = p.GetValueOrDefault("predicted_risk_level", ""),
                RiskSource = "ML",
                TopFactor = p.GetValueOrDefault("top_risk_factor_1", "N/A")
            })
            .Where(p => p.ResidentId > 0)
            .ToList();

        // Source 2: DB current risk level (Medium/High/Critical) for open cases
        var dbHighRisk = await db.Residents
            .Where(r => r.CaseStatus == "Open"
                && (r.CurrentRiskLevel == "Medium" || r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical"))
            .Select(r => new
            {
                r.ResidentId,
                r.InternalCode,
                RiskLevel = r.CurrentRiskLevel ?? "High",
                RiskSource = "DB",
                TopFactor = "Current case assessment"
            })
            .ToListAsync();

        // Combine and deduplicate by ResidentId (prefer ML source if both exist)
        var combined = mlPredictions
            .Concat(dbHighRisk.Select(d => new
            {
                d.ResidentId,
                d.InternalCode,
                d.RiskLevel,
                d.RiskSource,
                d.TopFactor
            }))
            .GroupBy(r => r.ResidentId)
            .Select(g => g.First())
            .ToList();

        if (combined.Count == 0)
            return;

        var listItems = combined.Select(r => new
        {
            residentId = r.ResidentId,
            internalCode = r.InternalCode,
            riskLevel = r.RiskLevel,
            riskSource = r.RiskSource,
            topFactor = r.TopFactor
        }).ToList();

        var codes = listItems.Take(5).Select(r => r.internalCode).ToList();
        var suffix = combined.Count > 5 ? $" and {combined.Count - 5} more" : "";

        db.Notifications.Add(new Notification
        {
            Type = TypeHighRiskResidents,
            Title = "At-Risk Residents Alert",
            Message = $"{combined.Count} resident(s) flagged as medium/high risk: {string.Join(", ", codes)}{suffix}. Click to view the full list.",
            Link = null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey,
            UserId = null,
            TargetRole = "Admin",
            ListData = JsonSerializer.Serialize(listItems)
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated high-risk residents notification for {Count} residents", combined.Count);
    }

    /// <summary>
    /// Social Media Reminders: Upcoming scheduled drafts and optimal posting times. Weekly for Admin + Staff.
    /// </summary>
    private async Task GenerateSocialMediaRemindersAsync(bool force = false)
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

            // Create one for Admin and one for Staff
            foreach (var role in new[] { "Admin", "Staff" })
            {
                db.Notifications.Add(new Notification
                {
                    Type = TypeSocialMediaReminder,
                    Title = "Time to Post on Social Media",
                    Message = $"Scheduled post \"{draft.Title}\" on {draft.Platform} is due at {draft.ScheduledHour}:00 today.",
                    Link = "/admin/social/editor",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    GroupKey = $"{groupKey}-{role}",
                    UserId = null,
                    TargetRole = role
                });
            }
        }

        // Weekly optimal posting time summary (Mondays only, or forced)
        if (force || DateTime.UtcNow.DayOfWeek == DayOfWeek.Monday)
        {
            var weekGroupKey = $"best-time-weekly-{DateTime.UtcNow:yyyy-MM-dd}";
            if (!await db.Notifications.AnyAsync(n => n.GroupKey == weekGroupKey + "-Admin"))
            {
                var bestTimes = csvPredictions.GetBestPostingTimes();
                var topSlots = bestTimes
                    .Where(t =>
                        t.TryGetValue("rank", out var rankStr)
                        && int.TryParse(rankStr, out var rank)
                        && rank <= 5)
                    .OrderBy(t =>
                    {
                        t.TryGetValue("rank", out var r);
                        int.TryParse(r, out var rv);
                        return rv;
                    })
                    .Take(5)
                    .Select(t =>
                    {
                        t.TryGetValue("day_of_week", out var day);
                        t.TryGetValue("post_hour", out var hour);
                        return $"{day} {hour}:00";
                    })
                    .ToList();

                if (topSlots.Count > 0)
                {
                    var message = $"This week's top posting slots: {string.Join(", ", topSlots)}. Schedule your content for maximum engagement.";

                    foreach (var role in new[] { "Admin", "Staff" })
                    {
                        db.Notifications.Add(new Notification
                        {
                            Type = TypeSocialMediaReminder,
                            Title = "Optimal Posting Windows This Week",
                            Message = message,
                            Link = "/admin/social/editor",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow,
                            GroupKey = $"{weekGroupKey}-{role}",
                            UserId = null,
                            TargetRole = role
                        });
                    }
                }
            }
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Donation Milestones: Notify when cumulative donations cross every 100,000 PHP. Admin only.
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
            Link = null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey,
            UserId = null,
            TargetRole = "Admin"
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated donation milestone notification at PHP {Milestone}", latestMilestone);
    }

    /// <summary>
    /// Allocation Benchmarks: Notify when cumulative allocations cross every 50,000 PHP. Admin only.
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
            Link = null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            GroupKey = groupKey,
            UserId = null,
            TargetRole = "Admin"
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Generated allocation benchmark notification at PHP {Benchmark}", latestBenchmark);
    }
}
