using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("social_media_posts", Schema = "public")]
public class SocialMediaPost
{
    [Key]
    [Column("post_id")]
    public int PostId { get; set; }

    [Column("platform")]
    public string Platform { get; set; } = string.Empty;

    [Column("platform_post_id")]
    public string PlatformPostId { get; set; } = string.Empty;

    [Column("post_url")]
    public string PostUrl { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("day_of_week")]
    public string DayOfWeek { get; set; } = string.Empty;

    [Column("post_hour")]
    public int PostHour { get; set; }

    [Column("post_type")]
    public string PostType { get; set; } = string.Empty;

    [Column("media_type")]
    public string? MediaType { get; set; }

    [Column("caption")]
    public string Caption { get; set; } = string.Empty;

    [Column("hashtags")]
    public string? Hashtags { get; set; }

    [Column("num_hashtags")]
    public int NumHashtags { get; set; }

    [Column("mentions_count")]
    public int MentionsCount { get; set; }

    [Column("has_call_to_action")]
    public bool HasCallToAction { get; set; }

    [Column("call_to_action_type")]
    public string? CallToActionType { get; set; }

    [Column("content_topic")]
    public string ContentTopic { get; set; } = string.Empty;

    [Column("sentiment_tone")]
    public string SentimentTone { get; set; } = string.Empty;

    [Column("caption_length")]
    public int CaptionLength { get; set; }

    [Column("features_resident_story")]
    public bool FeaturesResidentStory { get; set; }

    [Column("campaign_name")]
    public string? CampaignName { get; set; }

    [Column("is_boosted")]
    public bool IsBoosted { get; set; }

    [Column("boost_budget_php")]
    public decimal? BoostBudgetPhp { get; set; }

    [Column("impressions")]
    public int Impressions { get; set; }

    [Column("reach")]
    public int Reach { get; set; }

    [Column("likes")]
    public int Likes { get; set; }

    [Column("comments")]
    public int Comments { get; set; }

    [Column("shares")]
    public int Shares { get; set; }

    [Column("saves")]
    public int Saves { get; set; }

    [Column("click_throughs")]
    public int ClickThroughs { get; set; }

    [Column("video_views")]
    public decimal? VideoViews { get; set; }

    [Column("engagement_rate")]
    public decimal EngagementRate { get; set; }

    [Column("profile_visits")]
    public int ProfileVisits { get; set; }

    [Column("donation_referrals")]
    public int DonationReferrals { get; set; }

    [Column("estimated_donation_value_php")]
    public decimal EstimatedDonationValuePhp { get; set; }

    [Column("follower_count_at_post")]
    public int FollowerCountAtPost { get; set; }

    [Column("watch_time_seconds")]
    public decimal? WatchTimeSeconds { get; set; }

    [Column("avg_view_duration_seconds")]
    public decimal? AvgViewDurationSeconds { get; set; }

    [Column("subscriber_count_at_post")]
    public int? SubscriberCountAtPost { get; set; }

    [Column("forwards")]
    public decimal? Forwards { get; set; }

    // Navigation properties
    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
