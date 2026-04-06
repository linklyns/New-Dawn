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
