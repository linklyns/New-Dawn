using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.DTOs;
using New_Dawn.Services;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/predictions")]
[Authorize(Roles = "Admin,Staff")]
public class PredictionsController(AppDbContext db, CsvPredictionService csv) : ControllerBase
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

    // ── ML Pipeline Endpoints ──

    [HttpGet("ml/supporter-likelihood")]
    public IActionResult GetSupporterLikelihood()
    {
        var rows = csv.GetSupporterPredictions();
        var result = rows.Select(r => new SupporterLikelihoodDto
        {
            SupporterId = ParseInt(r, "supporter_id"),
            DisplayName = r.GetValueOrDefault("display_name", ""),
            FirstName = r.GetValueOrDefault("first_name", ""),
            LastName = r.GetValueOrDefault("last_name", ""),
            Email = r.GetValueOrDefault("email", ""),
            LikelihoodScore = ParseDouble(r, "likelihood_score"),
            LikelihoodCategory = r.GetValueOrDefault("likelihood_category", ""),
            TotalDonationAmount = ParseDouble(r, "total_donation_amount"),
            DonationCount = ParseInt(r, "donation_count"),
            DaysSinceLastDonation = ParseInt(r, "days_since_last_donation"),
            TopReason1 = r.GetValueOrDefault("top_reason_1", ""),
            TopReason2 = r.GetValueOrDefault("top_reason_2", ""),
        }).ToList();

        return Ok(new { items = result, totalCount = result.Count });
    }

    [HttpPost("ml/social-lookup")]
    public IActionResult LookupSocialPredictions([FromBody] MlSocialPostLookupRequest request)
    {
        var rows = csv.LookupSocialPredictions(
            request.Platform, request.PostType, request.MediaType,
            request.ContentTopic, request.SentimentTone, request.CallToActionType,
            request.HasCallToAction, request.FeaturesResidentStory,
            request.IsBosted, request.BoostBudgetPhp);

        var result = rows.Select(r => new MlSocialPostPredictionDto
        {
            Platform = r.GetValueOrDefault("platform", ""),
            PostType = r.GetValueOrDefault("post_type", ""),
            MediaType = r.GetValueOrDefault("media_type", ""),
            ContentTopic = r.GetValueOrDefault("content_topic", ""),
            SentimentTone = r.GetValueOrDefault("sentiment_tone", ""),
            CallToActionType = r.GetValueOrDefault("call_to_action_type", ""),
            HasCallToAction = r.GetValueOrDefault("has_call_to_action", ""),
            FeaturesResidentStory = r.GetValueOrDefault("features_resident_story", ""),
            IsBosted = r.GetValueOrDefault("is_boosted", ""),
            BoostBudgetPhpBin = r.GetValueOrDefault("boost_budget_php_bin", ""),
            PredictedDonationReferrals = ParseDouble(r, "predicted_donation_referrals"),
            PredictedEstimatedDonationValuePhp = ParseDouble(r, "predicted_estimated_donation_value_php"),
            PredictedForwards = ParseDouble(r, "predicted_forwards"),
            PredictedProfileVisits = ParseDouble(r, "predicted_profile_visits"),
            PredictedEngagementRate = ParseDouble(r, "predicted_engagement_rate"),
            PredictedImpressions = ParseDouble(r, "predicted_impressions"),
        }).ToList();

        return Ok(new { items = result, totalCount = result.Count });
    }

    [HttpPost("ml/best-posting-times")]
    public IActionResult GetBestPostingTimes([FromBody] MlBestPostingTimesRequest? request)
    {
        var rows = csv.LookupBestPostingTimes(
            request?.Platform, request?.PostType, request?.MediaType,
            request?.ContentTopic, request?.SentimentTone, request?.CallToActionType,
            request?.HasCallToAction, request?.FeaturesResidentStory,
            request?.IsBosted, request?.BoostBudgetPhp);

        var result = rows.Select(r => new BestPostingTimeDto
        {
            Platform = r.GetValueOrDefault("platform", ""),
            PostType = r.GetValueOrDefault("post_type", ""),
            MediaType = r.GetValueOrDefault("media_type", ""),
            ContentTopic = r.GetValueOrDefault("content_topic", ""),
            SentimentTone = r.GetValueOrDefault("sentiment_tone", ""),
            CallToActionType = r.GetValueOrDefault("call_to_action_type", ""),
            HasCallToAction = r.GetValueOrDefault("has_call_to_action", ""),
            FeaturesResidentStory = r.GetValueOrDefault("features_resident_story", ""),
            IsBosted = r.GetValueOrDefault("is_boosted", ""),
            BoostBudgetPhpBin = r.GetValueOrDefault("boost_budget_php_bin", ""),
            DayOfWeek = r.GetValueOrDefault("day_of_week", ""),
            PostHour = ParseInt(r, "post_hour"),
            PredictedEstimatedDonationValuePhp = ParseDouble(r, "predicted_estimated_donation_value_php"),
            Rank = ParseInt(r, "rank"),
            HistoricalPostCount = ParseInt(r, "historical_post_count"),
            ConfidenceIndicator = r.GetValueOrDefault("confidence_indicator", ""),
        }).ToList();

        return Ok(new { items = result, totalCount = result.Count });
    }

    [HttpGet("ml/reintegration-factors")]
    public IActionResult GetReintegrationFactors()
    {
        var rows = csv.GetReintegrationFactors();
        var result = rows.Select(r => new ReintegrationFactorDto
        {
            Feature = r.GetValueOrDefault("feature", ""),
            Coefficient = ParseDouble(r, "coefficient"),
            OddsRatio = ParseDouble(r, "odds_ratio"),
            PValue = ParseDouble(r, "p_value"),
            SignificanceFlag = r.GetValueOrDefault("significance_flag", ""),
            EffectDirection = r.GetValueOrDefault("effect_direction", ""),
            PlainLanguageInterpretation = r.GetValueOrDefault("plain_language_interpretation", ""),
        }).ToList();

        return Ok(new { items = result, totalCount = result.Count });
    }

    [HttpGet("ml/risk-predictions")]
    public IActionResult GetRiskPredictions()
    {
        var rows = csv.GetRiskPredictions();
        var result = rows.Select(r => new RiskPredictionDto
        {
            ResidentId = ParseInt(r, "resident_id"),
            InternalCode = r.GetValueOrDefault("internal_code", ""),
            CaseControlNo = r.GetValueOrDefault("case_control_no", ""),
            PredictedRiskScore = ParseDouble(r, "predicted_risk_score"),
            RiskScoreMax = 4,
            PredictedRiskLevel = r.GetValueOrDefault("predicted_risk_level", ""),
            Confidence = r.GetValueOrDefault("confidence", ""),
            TopRiskFactor1 = r.GetValueOrDefault("top_risk_factor_1", ""),
            TopRiskFactor2 = r.GetValueOrDefault("top_risk_factor_2", ""),
        }).ToList();

        return Ok(new { items = result, totalCount = result.Count });
    }

    [HttpGet("ml/risk-predictions/{residentId}")]
    public IActionResult GetRiskPrediction(int residentId)
    {
        var rows = csv.GetRiskPredictions();
        var row = rows.FirstOrDefault(r => ParseInt(r, "resident_id") == residentId);
        if (row == null) return NotFound(new { success = false, message = "No prediction for this resident" });

        return Ok(new RiskPredictionDto
        {
            ResidentId = ParseInt(row, "resident_id"),
            InternalCode = row.GetValueOrDefault("internal_code", ""),
            CaseControlNo = row.GetValueOrDefault("case_control_no", ""),
            PredictedRiskScore = ParseDouble(row, "predicted_risk_score"),
            RiskScoreMax = 4,
            PredictedRiskLevel = row.GetValueOrDefault("predicted_risk_level", ""),
            Confidence = row.GetValueOrDefault("confidence", ""),
            TopRiskFactor1 = row.GetValueOrDefault("top_risk_factor_1", ""),
            TopRiskFactor2 = row.GetValueOrDefault("top_risk_factor_2", ""),
        });
    }

    private static int ParseInt(Dictionary<string, string> row, string key)
    {
        var val = row.GetValueOrDefault(key, "");
        return int.TryParse(val, out var i) ? i : (int)ParseDouble(row, key);
    }

    private static double ParseDouble(Dictionary<string, string> row, string key)
    {
        var val = row.GetValueOrDefault(key, "");
        return double.TryParse(val, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : 0;
    }
}
