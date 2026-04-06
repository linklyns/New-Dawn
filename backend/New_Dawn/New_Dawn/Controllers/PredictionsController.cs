using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.DTOs;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/predictions")]
[Authorize(Roles = "Admin")]
public class PredictionsController(AppDbContext db) : ControllerBase
{
    private static readonly string[] DaysOfWeek =
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    [HttpPost("social-post")]
    public async Task<IActionResult> PredictSocialPost([FromBody] SocialPostPredictionRequest request)
    {
        var query = db.SocialMediaPosts.AsNoTracking().AsQueryable();

        // Build progressively relaxed filters to find matching posts
        var matchingPosts = await query
            .Where(p => p.Platform == request.Platform)
            .Where(p => p.PostType == request.PostType)
            .ToListAsync();

        // If too few matches, relax to just platform
        if (matchingPosts.Count < 3)
        {
            matchingPosts = await query
                .Where(p => p.Platform == request.Platform)
                .ToListAsync();
        }

        // If still too few, use all posts
        if (matchingPosts.Count < 3)
        {
            matchingPosts = await query.ToListAsync();
        }

        // Further refine with optional filters for weighting
        var refinedPosts = matchingPosts.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(request.ContentTopic))
            refinedPosts = refinedPosts.Where(p => p.ContentTopic == request.ContentTopic);

        var refined = refinedPosts.ToList();
        if (refined.Count < 2)
            refined = matchingPosts;

        var rng = new Random();
        var jitter = () => 0.85 + rng.NextDouble() * 0.30; // 0.85 to 1.15

        var avgDonationReferrals = refined.Count > 0
            ? refined.Average(p => (double)p.DonationReferrals) * jitter()
            : 2.0 * jitter();

        var avgDonationValue = refined.Count > 0
            ? refined.Average(p => (double)p.EstimatedDonationValuePhp) * jitter()
            : 5000.0 * jitter();

        var avgEngagement = refined.Count > 0
            ? refined.Average(p => (double)p.EngagementRate) * jitter()
            : 3.5 * jitter();

        var avgForwards = refined.Count > 0
            ? refined.Where(p => p.Forwards.HasValue).DefaultIfEmpty().Average(p => (double)(p?.Forwards ?? 0)) * jitter()
            : 5.0 * jitter();

        var avgProfileVisits = refined.Count > 0
            ? refined.Average(p => (double)p.ProfileVisits) * jitter()
            : 25.0 * jitter();

        var avgFollowerGrowth = refined.Count > 0
            ? refined.Average(p => (double)p.FollowerCountAtPost) * 0.002 * jitter()
            : 8.0 * jitter();

        // Apply time-of-day and day-of-week bonuses
        var timeMatchPosts = matchingPosts
            .Where(p => p.PostHour == request.PostHour && p.DayOfWeek == request.DayOfWeek)
            .ToList();

        if (timeMatchPosts.Count >= 2)
        {
            var timeBonus = timeMatchPosts.Average(p => (double)p.DonationReferrals) /
                            Math.Max(1, matchingPosts.Average(p => (double)p.DonationReferrals));
            timeBonus = Math.Clamp(timeBonus, 0.8, 1.5);
            avgDonationReferrals *= timeBonus;
            avgEngagement *= timeBonus;
        }

        // Apply media type bonus
        if (!string.IsNullOrWhiteSpace(request.MediaType))
        {
            var mediaPosts = matchingPosts.Where(p => p.MediaType == request.MediaType).ToList();
            if (mediaPosts.Count >= 2)
            {
                var mediaBonus = mediaPosts.Average(p => (double)p.EngagementRate) /
                                 Math.Max(0.01, matchingPosts.Average(p => (double)p.EngagementRate));
                mediaBonus = Math.Clamp(mediaBonus, 0.8, 1.4);
                avgEngagement *= mediaBonus;
            }
        }

        // Apply CTA bonus
        if (!string.IsNullOrWhiteSpace(request.CallToActionType) && request.CallToActionType != "None")
        {
            var ctaPosts = matchingPosts.Where(p => p.CallToActionType == request.CallToActionType).ToList();
            if (ctaPosts.Count >= 2)
            {
                var ctaBonus = ctaPosts.Average(p => (double)p.DonationReferrals) /
                               Math.Max(1, matchingPosts.Average(p => (double)p.DonationReferrals));
                ctaBonus = Math.Clamp(ctaBonus, 0.9, 1.5);
                avgDonationReferrals *= ctaBonus;
                avgDonationValue *= ctaBonus;
            }
        }

        return Ok(new SocialPostPredictionResponse
        {
            DonationReferrals = Math.Round(Math.Max(0, avgDonationReferrals), 1),
            EstimatedDonationValue = Math.Round(Math.Max(0, avgDonationValue), 0),
            EngagementRate = Math.Round(Math.Max(0, avgEngagement), 2),
            ForwardCount = Math.Round(Math.Max(0, avgForwards), 1),
            ProfileVisits = Math.Round(Math.Max(0, avgProfileVisits), 0),
            FollowerGrowth = Math.Round(Math.Max(0, avgFollowerGrowth), 1)
        });
    }

    [HttpPost("golden-window")]
    public async Task<IActionResult> GetGoldenWindow([FromBody] GoldenWindowRequest request)
    {
        var query = db.SocialMediaPosts.AsNoTracking().AsQueryable();

        // Apply available filters
        if (!string.IsNullOrWhiteSpace(request.Platform))
            query = query.Where(p => p.Platform == request.Platform);
        if (!string.IsNullOrWhiteSpace(request.PostType))
            query = query.Where(p => p.PostType == request.PostType);

        var posts = await query.ToListAsync();

        // If too few posts with filters, fall back to all posts
        if (posts.Count < 5)
        {
            posts = await db.SocialMediaPosts.AsNoTracking().ToListAsync();
        }

        // Further filter in memory for content topic
        var contentFiltered = posts.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(request.ContentTopic))
        {
            var topicFiltered = posts.Where(p => p.ContentTopic == request.ContentTopic).ToList();
            if (topicFiltered.Count >= 3)
                contentFiltered = topicFiltered;
        }

        var filteredList = contentFiltered.ToList();
        var rng = new Random();

        // Calculate predicted metrics for every day/hour combo
        var slots = new List<TimeSlotPrediction>();

        foreach (var day in DaysOfWeek)
        {
            for (var hour = 0; hour < 24; hour++)
            {
                var timePosts = filteredList
                    .Where(p => p.DayOfWeek == day && p.PostHour == hour)
                    .ToList();

                double predictedReferrals;
                double predictedEngagement;

                if (timePosts.Count >= 1)
                {
                    predictedReferrals = timePosts.Average(p => (double)p.DonationReferrals);
                    predictedEngagement = timePosts.Average(p => (double)p.EngagementRate);

                    // Add slight randomization
                    var jitter = 0.9 + rng.NextDouble() * 0.2;
                    predictedReferrals *= jitter;
                    predictedEngagement *= jitter;
                }
                else
                {
                    // Estimate from global averages with time-based heuristics
                    var globalAvgReferrals = filteredList.Count > 0
                        ? filteredList.Average(p => (double)p.DonationReferrals)
                        : 2.0;
                    var globalAvgEngagement = filteredList.Count > 0
                        ? filteredList.Average(p => (double)p.EngagementRate)
                        : 3.0;

                    // Apply time-of-day heuristic (peak hours get a boost)
                    var hourMultiplier = hour switch
                    {
                        >= 9 and <= 11 => 1.2,
                        >= 12 and <= 14 => 1.3,
                        >= 17 and <= 20 => 1.25,
                        >= 21 and <= 23 => 1.0,
                        >= 6 and <= 8 => 0.9,
                        _ => 0.7
                    };

                    // Weekend bonus for social media
                    var dayMultiplier = day is "Saturday" or "Sunday" ? 1.1 : 1.0;

                    predictedReferrals = globalAvgReferrals * hourMultiplier * dayMultiplier * (0.85 + rng.NextDouble() * 0.3);
                    predictedEngagement = globalAvgEngagement * hourMultiplier * dayMultiplier * (0.85 + rng.NextDouble() * 0.3);
                }

                slots.Add(new TimeSlotPrediction
                {
                    DayOfWeek = day,
                    Hour = hour,
                    PredictedDonationReferrals = Math.Round(Math.Max(0, predictedReferrals), 1),
                    PredictedEngagement = Math.Round(Math.Max(0, predictedEngagement), 2)
                });
            }
        }

        // Rank by predicted donation referrals, take top 10
        var ranked = slots
            .OrderByDescending(s => s.PredictedDonationReferrals)
            .ThenByDescending(s => s.PredictedEngagement)
            .Take(10)
            .ToList();

        return Ok(new GoldenWindowResponse { Ranked = ranked });
    }
}
