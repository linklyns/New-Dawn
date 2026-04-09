using System.Text.Json;

namespace New_Dawn.DTOs;

public class AiChatRequest
{
    public string Message { get; set; } = string.Empty;
    public JsonElement? EditorState { get; set; }
    public List<ChatMessage> ConversationHistory { get; set; } = [];
}

public class ChatMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class AiChatResponse
{
    public string Text { get; set; } = string.Empty;
    public List<AiCommand> Commands { get; set; } = [];
}

public class AiCommand
{
    public string Action { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class SocialDraftAiState
{
    public string Title { get; set; } = string.Empty;
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
}

public class GenerateSocialDraftRequest
{
    public SocialDraftAiState Brief { get; set; } = new();
}

public class RefineSocialDraftRequest
{
    public string Message { get; set; } = string.Empty;
    public SocialDraftAiState Draft { get; set; } = new();
    public List<ChatMessage> ConversationHistory { get; set; } = [];
}

public class SocialDraftAiResponse
{
    public string Text { get; set; } = string.Empty;
    public SocialDraftAiState Draft { get; set; } = new();
}
