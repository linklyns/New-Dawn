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
