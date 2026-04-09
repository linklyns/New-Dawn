namespace New_Dawn.DTOs;

public class SocialPostPredictionRequest
{
    public string Platform { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string ContentTopic { get; set; } = string.Empty;
    public string SentimentTone { get; set; } = string.Empty;
    public string CallToActionType { get; set; } = string.Empty;
    public int CaptionLength { get; set; }
    public int PostHour { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
}

public class SocialPostPredictionResponse
{
    public double DonationReferrals { get; set; }
    public double EstimatedDonationValue { get; set; }
    public double EngagementRate { get; set; }
    public double ForwardCount { get; set; }
    public double ProfileVisits { get; set; }
    public double FollowerGrowth { get; set; }
}

public class GoldenWindowRequest
{
    public string Platform { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string ContentTopic { get; set; } = string.Empty;
    public string SentimentTone { get; set; } = string.Empty;
    public string CallToActionType { get; set; } = string.Empty;
    public int CaptionLength { get; set; }
}

public class GoldenWindowResponse
{
    public List<TimeSlotPrediction> Ranked { get; set; } = [];
}

public class TimeSlotPrediction
{
    public string DayOfWeek { get; set; } = string.Empty;
    public int Hour { get; set; }
    public double PredictedDonationReferrals { get; set; }
    public double PredictedEngagement { get; set; }
}

// ── ML Pipeline DTOs ──

public class SupporterLikelihoodDto
{
    public int SupporterId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public double LikelihoodScore { get; set; }
    public string LikelihoodCategory { get; set; } = string.Empty;
    public double TotalDonationAmount { get; set; }
    public int DonationCount { get; set; }
    public int DaysSinceLastDonation { get; set; }
    public string TopReason1 { get; set; } = string.Empty;
    public string TopReason2 { get; set; } = string.Empty;
}

public class MlSocialPostLookupRequest
{
    public string? Platform { get; set; }
    public string? PostType { get; set; }
    public string? MediaType { get; set; }
    public string? ContentTopic { get; set; }
    public string? SentimentTone { get; set; }
    public string? CallToActionType { get; set; }
    // Extended lookup dimensions — used when provided, dropped in relaxation when absent
    public string? HasCallToAction { get; set; }
    public string? FeaturesResidentStory { get; set; }
    public string? IsBosted { get; set; }
    public decimal? BoostBudgetPhp { get; set; }
}

public class MlBestPostingTimesRequest
{
    public string? Platform { get; set; }
    public string? PostType { get; set; }
    public string? MediaType { get; set; }
    public string? ContentTopic { get; set; }
    public string? SentimentTone { get; set; }
    public string? CallToActionType { get; set; }
    public string? HasCallToAction { get; set; }
    public string? FeaturesResidentStory { get; set; }
    public string? IsBosted { get; set; }
    public decimal? BoostBudgetPhp { get; set; }
}

public class MlSocialPostPredictionDto
{
    public string Platform { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string ContentTopic { get; set; } = string.Empty;
    public string SentimentTone { get; set; } = string.Empty;
    public string CallToActionType { get; set; } = string.Empty;
    public string HasCallToAction { get; set; } = string.Empty;
    public string FeaturesResidentStory { get; set; } = string.Empty;
    public string IsBosted { get; set; } = string.Empty;
    public string BoostBudgetPhpBin { get; set; } = string.Empty;
    public double PredictedDonationReferrals { get; set; }
    public double PredictedEstimatedDonationValuePhp { get; set; }
    public double PredictedForwards { get; set; }
    public double PredictedProfileVisits { get; set; }
    public double PredictedEngagementRate { get; set; }
    public double PredictedImpressions { get; set; }
}

public class BestPostingTimeDto
{
    public string Platform { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string ContentTopic { get; set; } = string.Empty;
    public string SentimentTone { get; set; } = string.Empty;
    public string CallToActionType { get; set; } = string.Empty;
    public string HasCallToAction { get; set; } = string.Empty;
    public string FeaturesResidentStory { get; set; } = string.Empty;
    public string IsBosted { get; set; } = string.Empty;
    public string BoostBudgetPhpBin { get; set; } = string.Empty;
    public string DayOfWeek { get; set; } = string.Empty;
    public int PostHour { get; set; }
    public double PredictedEstimatedDonationValuePhp { get; set; }
    public int Rank { get; set; }
    public int HistoricalPostCount { get; set; }
    public string ConfidenceIndicator { get; set; } = string.Empty;
}

public class ReintegrationFactorDto
{
    public string Feature { get; set; } = string.Empty;
    public double Coefficient { get; set; }
    public double OddsRatio { get; set; }
    public double PValue { get; set; }
    public string SignificanceFlag { get; set; } = string.Empty;
    public string EffectDirection { get; set; } = string.Empty;
    public string PlainLanguageInterpretation { get; set; } = string.Empty;
}

public class RiskPredictionDto
{
    public int ResidentId { get; set; }
    public string InternalCode { get; set; } = string.Empty;
    public string CaseControlNo { get; set; } = string.Empty;
    public double PredictedRiskScore { get; set; }
    public double RiskScoreMax { get; set; } = 4;
    public string PredictedRiskLevel { get; set; } = string.Empty;
    public string Confidence { get; set; } = string.Empty;
    public string TopRiskFactor1 { get; set; } = string.Empty;
    public string TopRiskFactor2 { get; set; } = string.Empty;
}
