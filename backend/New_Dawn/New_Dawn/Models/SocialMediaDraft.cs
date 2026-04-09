using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("social_media_drafts", Schema = "public")]
public class SocialMediaDraft
{
    [Key]
    [Column("draft_id")]
    public int DraftId { get; set; }

    [Column("created_by_id")]
    public string CreatedById { get; set; } = string.Empty;

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("stage")]
    public string Stage { get; set; } = "brief";

    [Column("status")]
    public string Status { get; set; } = "draft";

    [Column("platform")]
    public string Platform { get; set; } = "Instagram";

    [Column("post_type")]
    public string PostType { get; set; } = "FundraisingAppeal";

    [Column("media_type")]
    public string MediaType { get; set; } = "Photo";

    [Column("call_to_action_type")]
    public string CallToActionType { get; set; } = string.Empty;

    [Column("content_topic")]
    public string ContentTopic { get; set; } = "Education";

    [Column("sentiment_tone")]
    public string SentimentTone { get; set; } = "Informative";

    [Column("hashtags")]
    public string Hashtags { get; set; } = string.Empty;

    [Column("audience")]
    public string Audience { get; set; } = string.Empty;

    [Column("campaign_name")]
    public string CampaignName { get; set; } = string.Empty;

    [Column("additional_instructions")]
    public string AdditionalInstructions { get; set; } = string.Empty;

    [Column("headline")]
    public string Headline { get; set; } = string.Empty;

    [Column("body")]
    public string Body { get; set; } = string.Empty;

    [Column("cta_text")]
    public string CtaText { get; set; } = string.Empty;

    [Column("website_url")]
    public string WebsiteUrl { get; set; } = "new-dawn-virid.vercel.app";

    [Column("scheduled_day")]
    public string? ScheduledDay { get; set; }

    [Column("scheduled_hour")]
    public int? ScheduledHour { get; set; }

    [Column("chat_history_json")]
    public string ChatHistoryJson { get; set; } = "[]";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(CreatedById))]
    public ApplicationUser? CreatedBy { get; set; }

    public ICollection<SocialMediaDraftMedia> MediaItems { get; set; } = new List<SocialMediaDraftMedia>();
}