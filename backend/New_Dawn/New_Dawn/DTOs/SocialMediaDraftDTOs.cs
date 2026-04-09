using System.ComponentModel.DataAnnotations;

namespace New_Dawn.DTOs;

public class SocialMediaDraftSummaryDto
{
    public int DraftId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Stage { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string ContentTopic { get; set; } = string.Empty;
    public string SentimentTone { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public int MediaCount { get; set; }
}

public class SocialMediaDraftMediaDto
{
    public int MediaId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string MediaKind { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class SocialMediaDraftChatMessageDto
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class SocialMediaDraftDto
{
    public int DraftId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Stage { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string CallToActionType { get; set; } = string.Empty;
    public string ContentTopic { get; set; } = string.Empty;
    public string SentimentTone { get; set; } = string.Empty;
    public string Hashtags { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string AdditionalInstructions { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string CtaText { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = "new-dawn-virid.vercel.app";
    public string? ScheduledDay { get; set; }
    public int? ScheduledHour { get; set; }
    public List<SocialMediaDraftChatMessageDto> ChatHistory { get; set; } = [];
    public List<SocialMediaDraftMediaDto> MediaItems { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertSocialMediaDraftRequest
{
    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Stage { get; set; } = "brief";

    [Required]
    public string Platform { get; set; } = "Instagram";

    [Required]
    public string PostType { get; set; } = "FundraisingAppeal";

    [Required]
    public string MediaType { get; set; } = "Photo";

    public string CallToActionType { get; set; } = string.Empty;
    public string ContentTopic { get; set; } = "Education";
    public string SentimentTone { get; set; } = "Informative";
    public string Hashtags { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string AdditionalInstructions { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string CtaText { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = "new-dawn-virid.vercel.app";
    public string? ScheduledDay { get; set; }
    public int? ScheduledHour { get; set; }
    public List<SocialMediaDraftChatMessageDto> ChatHistory { get; set; } = [];
}