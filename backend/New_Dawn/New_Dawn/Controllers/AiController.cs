using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using New_Dawn.DTOs;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize(Roles = "Admin,Staff")]
public class AiController : ControllerBase
{
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AiChatRequest request)
    {
        var apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            return await CallOpenAi(apiKey, request);
        }

        return Ok(GenerateFallbackResponse(request));
    }

    private static async Task<IActionResult> CallOpenAi(string apiKey, AiChatRequest request)
    {
        using var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

        var systemPrompt = BuildSystemPrompt(request.EditorState);

        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };

        foreach (var msg in request.ConversationHistory)
        {
            messages.Add(new { role = msg.Role, content = msg.Content });
        }

        messages.Add(new { role = "user", content = request.Message });

        var payload = new
        {
            model = "gpt-4o",
            messages,
            temperature = 0.7,
            max_tokens = 1000,
            response_format = new { type = "json_object" }
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            return new ObjectResult(new { text = "Sorry, I encountered an error connecting to the AI service.", commands = Array.Empty<object>() })
            {
                StatusCode = 200
            };
        }

        using var doc = JsonDocument.Parse(responseBody);
        var messageContent = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "{}";

        using var parsed = JsonDocument.Parse(messageContent);
        var root = parsed.RootElement;

        var text = root.TryGetProperty("text", out var textProp) ? textProp.GetString() ?? "" : "";
        var commands = new List<AiCommand>();

        if (root.TryGetProperty("commands", out var cmdArray) && cmdArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var cmd in cmdArray.EnumerateArray())
            {
                commands.Add(new AiCommand
                {
                    Action = cmd.TryGetProperty("action", out var a) ? a.GetString() ?? "" : "",
                    Value = cmd.TryGetProperty("value", out var v) ? v.GetString() ?? "" : ""
                });
            }
        }

        return new OkObjectResult(new AiChatResponse { Text = text, Commands = commands });
    }

    private static string BuildSystemPrompt(JsonElement? editorState)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a social media content assistant for New Dawn, a nonprofit supporting girls rescued from trafficking in the Philippines.");
        sb.AppendLine("Respond ONLY with valid JSON: { \"text\": \"your message\", \"commands\": [ { \"action\": \"...\", \"value\": \"...\" } ] }");
        sb.AppendLine("Available command actions: updateHeadline, changePlatform, updateBody, setSentimentTone, setCtaType, setMediaType, setContentTopic");
        sb.AppendLine("Only include commands when the user asks you to modify the post. Otherwise return an empty commands array.");

        if (editorState.HasValue)
        {
            sb.AppendLine($"Current editor state: {editorState.Value.GetRawText()}");
        }

        return sb.ToString();
    }

    private static AiChatResponse GenerateFallbackResponse(AiChatRequest request)
    {
        var commands = new List<AiCommand>();
        var editorState = ParseEditorState(request.EditorState);
        var message = request.Message.ToLowerInvariant();
        var responseText = new StringBuilder();

        // Check for specific user intents
        if (message.Contains("headline") || message.Contains("title"))
        {
            var headline = GenerateHeadline(editorState.ContentTopic, editorState.SentimentTone);
            responseText.AppendLine($"Here's a headline suggestion: \"{headline}\"");
            responseText.AppendLine("I've applied it to the editor. Feel free to refine it!");
            commands.Add(new AiCommand { Action = "updateHeadline", Value = headline });
        }
        else if (message.Contains("caption") || message.Contains("body") || message.Contains("write"))
        {
            var body = GenerateCaption(editorState.Platform, editorState.ContentTopic, editorState.SentimentTone, editorState.CtaType);
            responseText.AppendLine("I've drafted a caption for you:");
            responseText.AppendLine($"\"{body}\"");
            commands.Add(new AiCommand { Action = "updateBody", Value = body });
        }
        else if (message.Contains("platform") || message.Contains("where") || message.Contains("channel"))
        {
            var suggestion = SuggestPlatform(editorState.ContentTopic, editorState.MediaType);
            responseText.AppendLine(suggestion.Reasoning);
            commands.Add(new AiCommand { Action = "changePlatform", Value = suggestion.Platform });
        }
        else if (message.Contains("improve") || message.Contains("better") || message.Contains("optimize"))
        {
            responseText.AppendLine(AnalyzeAndSuggest(editorState, commands));
        }
        else if (message.Contains("hashtag"))
        {
            var tags = GenerateHashtags(editorState.ContentTopic, editorState.Platform);
            responseText.AppendLine($"Here are some relevant hashtags: {tags}");
            responseText.AppendLine("These combine cause-related tags with platform-optimized discovery tags.");
        }
        else if (message.Contains("tone") || message.Contains("sentiment"))
        {
            var toneSuggestion = SuggestTone(editorState.ContentTopic, editorState.CtaType);
            responseText.AppendLine(toneSuggestion.Reasoning);
            commands.Add(new AiCommand { Action = "setSentimentTone", Value = toneSuggestion.Tone });
        }
        else if (message.Contains("cta") || message.Contains("call to action"))
        {
            var ctaSuggestion = SuggestCta(editorState.ContentTopic, editorState.SentimentTone);
            responseText.AppendLine(ctaSuggestion.Reasoning);
            commands.Add(new AiCommand { Action = "setCtaType", Value = ctaSuggestion.Cta });
        }
        else if (message.Contains("help") || message.Contains("what can you"))
        {
            responseText.AppendLine("I can help you with your social media post! Here are some things I can do:");
            responseText.AppendLine("- **Write a headline** - Ask me to suggest a headline");
            responseText.AppendLine("- **Draft a caption** - I'll write a platform-optimized caption");
            responseText.AppendLine("- **Suggest a platform** - I'll recommend the best channel for your content");
            responseText.AppendLine("- **Optimize your post** - I'll analyze and suggest improvements");
            responseText.AppendLine("- **Generate hashtags** - Get relevant hashtag suggestions");
            responseText.AppendLine("- **Adjust tone** - I'll suggest the best sentiment for your goal");
            responseText.AppendLine("- **Recommend a CTA** - Get call-to-action suggestions");
        }
        else
        {
            // General contextual response based on editor state
            responseText.AppendLine(GenerateContextualResponse(editorState, commands));
        }

        return new AiChatResponse
        {
            Text = responseText.ToString().Trim(),
            Commands = commands
        };
    }

    private static string AnalyzeAndSuggest(EditorSnapshot state, List<AiCommand> commands)
    {
        var suggestions = new List<string>();

        if (string.IsNullOrWhiteSpace(state.Headline))
        {
            var headline = GenerateHeadline(state.ContentTopic, state.SentimentTone);
            suggestions.Add($"Your post is missing a headline. I've added: \"{headline}\"");
            commands.Add(new AiCommand { Action = "updateHeadline", Value = headline });
        }

        if (state.CaptionLength < 50 && !string.IsNullOrWhiteSpace(state.Body))
        {
            suggestions.Add("Your caption is quite short. Longer captions (100-200 chars) tend to drive more engagement on most platforms.");
        }
        else if (state.CaptionLength > 300 && state.Platform is "Twitter" or "TikTok")
        {
            suggestions.Add($"Your caption might be too long for {state.Platform}. Consider trimming it for better readability.");
        }

        if (state.CtaType is "" or "None")
        {
            var cta = SuggestCta(state.ContentTopic, state.SentimentTone);
            suggestions.Add($"Adding a call-to-action can boost engagement. I've set it to \"{cta.Cta}\".");
            commands.Add(new AiCommand { Action = "setCtaType", Value = cta.Cta });
        }

        if (state.MediaType is "" or "Text")
        {
            suggestions.Add("Posts with visual media (Photo or Video) typically get 2-3x more engagement than text-only posts.");
            commands.Add(new AiCommand { Action = "setMediaType", Value = "Photo" });
        }

        if (suggestions.Count == 0)
        {
            suggestions.Add("Your post looks well-structured! The combination of your current platform, content topic, and CTA type should perform well.");
            suggestions.Add("Consider A/B testing different sentiment tones to see which resonates most with your audience.");
        }

        return string.Join("\n\n", suggestions);
    }

    private static string GenerateContextualResponse(EditorSnapshot state, List<AiCommand> commands)
    {
        if (string.IsNullOrWhiteSpace(state.Headline) && string.IsNullOrWhiteSpace(state.Body))
        {
            var headline = GenerateHeadline(state.ContentTopic, state.SentimentTone);
            commands.Add(new AiCommand { Action = "updateHeadline", Value = headline });

            return $"Looks like you're starting fresh! I've suggested a headline based on your content topic ({(string.IsNullOrWhiteSpace(state.ContentTopic) ? "General" : state.ContentTopic)}). " +
                   "Try asking me to draft a caption, suggest hashtags, or optimize your post settings.";
        }

        if (!string.IsNullOrWhiteSpace(state.Headline) && string.IsNullOrWhiteSpace(state.Body))
        {
            var body = GenerateCaption(state.Platform, state.ContentTopic, state.SentimentTone, state.CtaType);
            commands.Add(new AiCommand { Action = "updateBody", Value = body });
            return "Great headline! I've drafted a caption to go with it. You can ask me to adjust the tone, change the CTA, or suggest improvements.";
        }

        var tips = GetPlatformTips(state.Platform);
        return $"Your post is shaping up nicely! Here are some tips for {(string.IsNullOrWhiteSpace(state.Platform) ? "your chosen platform" : state.Platform)}:\n\n{tips}";
    }

    private static string GenerateHeadline(string contentTopic, string sentimentTone)
    {
        var headlines = new Dictionary<string, string[]>
        {
            ["Education"] = [
                "Empowering Futures Through Education",
                "Every Girl Deserves a Chance to Learn",
                "Education Changes Everything",
                "Building Brighter Tomorrows, One Lesson at a Time",
                "Knowledge Is Freedom"
            ],
            ["Health"] = [
                "Healing Hearts, Restoring Hope",
                "Wellness for Every Girl in Our Care",
                "Health Is the Foundation of Recovery",
                "Nurturing Mind, Body, and Spirit",
                "A Healthier Tomorrow Starts Today"
            ],
            ["Reintegration"] = [
                "From Survival to Thriving",
                "A New Chapter Begins",
                "Welcome Home: Stories of Reintegration",
                "Rebuilding Lives With Love and Support",
                "The Journey Home"
            ],
            ["Operations"] = [
                "Behind the Scenes at New Dawn",
                "How Your Support Makes It Happen",
                "The Team That Makes It Possible",
                "Inside Our Mission",
                "Keeping the Light On"
            ],
            ["Fundraising"] = [
                "Your Gift Changes Lives",
                "Be the Light in a Child's Life",
                "Every Donation Matters",
                "Join the Movement for Change",
                "Together We Can Do More"
            ],
            ["Community"] = [
                "Stronger Together",
                "Our Community in Action",
                "Voices of Hope and Resilience",
                "Building a Network of Care",
                "United for the Girls of New Dawn"
            ]
        };

        var topic = string.IsNullOrWhiteSpace(contentTopic) ? "Fundraising" : contentTopic;
        var options = headlines.GetValueOrDefault(topic, headlines["Fundraising"]);

        var index = Math.Abs((sentimentTone?.GetHashCode() ?? DateTime.UtcNow.Millisecond) % options.Length);
        return options[index];
    }

    private static string GenerateCaption(string platform, string contentTopic, string sentimentTone, string ctaType)
    {
        var topic = string.IsNullOrWhiteSpace(contentTopic) ? "Fundraising" : contentTopic;
        var tone = string.IsNullOrWhiteSpace(sentimentTone) ? "Informational" : sentimentTone;

        var captions = new Dictionary<string, Dictionary<string, string>>
        {
            ["Education"] = new()
            {
                ["Grateful"] = "We're so grateful for the incredible progress our girls are making in school! Thanks to your support, they're discovering their potential and dreaming big.",
                ["Celebratory"] = "Celebration time! Our girls just completed another semester with flying colors. Their determination inspires us every single day.",
                ["Emotional"] = "When a girl picks up a book for the first time and realizes she CAN learn, everything changes. These moments remind us why we do what we do.",
                ["Urgent"] = "Right now, girls in our care need school supplies and tutoring support. Your help today means a brighter tomorrow for a child who deserves every opportunity.",
                ["Informational"] = "Did you know? 100% of the girls in our program are enrolled in school or vocational training. Education is the cornerstone of our rehabilitation approach."
            },
            ["Health"] = new()
            {
                ["Grateful"] = "Thank you to our medical partners who ensure every girl receives the care she needs. Your generosity makes wellness possible.",
                ["Celebratory"] = "Amazing news! Our latest health assessments show significant improvements across all our safehouses. Healthy girls are happy girls!",
                ["Emotional"] = "Recovery isn't just physical - it's emotional, mental, and spiritual. Watch as our girls find strength they never knew they had.",
                ["Urgent"] = "Medical supplies are running low at our safehouses. A small donation can provide check-ups, vitamins, and mental health support for a girl in need.",
                ["Informational"] = "Our holistic health program covers physical check-ups, dental care, nutrition, and psychological support - because every aspect of wellness matters."
            },
            ["Fundraising"] = new()
            {
                ["Grateful"] = "Because of donors like you, we've been able to provide safe shelter, education, and care to girls who need it most. Thank you for being part of their story.",
                ["Celebratory"] = "We just hit our fundraising milestone! Every peso brings us closer to opening another safehouse and reaching more girls in need.",
                ["Emotional"] = "Behind every donation is a story of transformation. Your giving doesn't just change a life - it rewrites an entire future.",
                ["Urgent"] = "We urgently need your support. Girls are waiting for a safe place to call home. Your donation today can be the difference between hope and despair.",
                ["Informational"] = "Your donations fund safe housing, education, healthcare, and reintegration programs for girls rescued from trafficking and abuse in the Philippines."
            }
        };

        var topicCaptions = captions.GetValueOrDefault(topic, captions["Fundraising"]);
        var caption = topicCaptions.GetValueOrDefault(tone, topicCaptions["Informational"]);

        // Add platform-specific CTA
        if (!string.IsNullOrWhiteSpace(ctaType) && ctaType != "None")
        {
            var ctaText = ctaType switch
            {
                "DonateNow" => "\n\nDonate now via the link in our bio.",
                "LearnMore" => "\n\nLearn more at our website - link in bio.",
                "ShareStory" => "\n\nShare this story to spread awareness.",
                "VolunteerSignup" => "\n\nInterested in volunteering? DM us or visit our website!",
                _ => ""
            };
            caption += ctaText;
        }

        // Platform-specific adjustments
        if (platform == "Twitter" && caption.Length > 250)
        {
            caption = caption[..247] + "...";
        }

        return caption;
    }

    private static (string Platform, string Reasoning) SuggestPlatform(string contentTopic, string mediaType)
    {
        var topic = string.IsNullOrWhiteSpace(contentTopic) ? "Fundraising" : contentTopic;
        var media = string.IsNullOrWhiteSpace(mediaType) ? "Photo" : mediaType;

        return (topic, media) switch
        {
            (_, "Video" or "Reel") => ("Instagram", "Video and Reel content performs best on Instagram, where visual storytelling drives the highest engagement for nonprofits. I've switched the platform for you."),
            (_, "Carousel") => ("Instagram", "Carousel posts get the highest save rates on Instagram, making it the ideal platform for multi-image storytelling. Switched to Instagram!"),
            ("Education" or "Health", _) => ("Facebook", "Educational and health-focused content resonates strongly on Facebook, where longer-form posts drive meaningful discussions. I've set the platform to Facebook."),
            ("Fundraising", _) => ("Facebook", "Facebook has the strongest donation referral pipeline for nonprofits. I've switched to Facebook to maximize your fundraising impact."),
            ("Community", _) => ("Instagram", "Community stories shine on Instagram where visual narratives create emotional connections. I've set the platform for you."),
            ("Reintegration", _) => ("LinkedIn", "Reintegration success stories perform well on LinkedIn, reaching professional networks that support social causes. Set to LinkedIn!"),
            _ => ("Instagram", "Instagram generally delivers the best overall engagement for nonprofit content. I've set it as your platform.")
        };
    }

    private static (string Tone, string Reasoning) SuggestTone(string contentTopic, string ctaType)
    {
        var topic = string.IsNullOrWhiteSpace(contentTopic) ? "Fundraising" : contentTopic;
        var cta = string.IsNullOrWhiteSpace(ctaType) ? "None" : ctaType;

        return (topic, cta) switch
        {
            ("Fundraising", "DonateNow") => ("Urgent", "For donation-focused posts, an urgent tone creates a sense of immediacy that drives action. I've adjusted the sentiment for you."),
            ("Fundraising", _) => ("Emotional", "Emotional storytelling is the most effective tone for fundraising content. It helps donors connect with the mission. Updated!"),
            ("Education", _) => ("Celebratory", "Celebrating educational achievements creates positive association with your mission. I've set a celebratory tone!"),
            ("Health", _) => ("Grateful", "A grateful tone works beautifully for health updates, showing appreciation for the care teams and donors who make wellness possible. Updated!"),
            ("Community", _) => ("Celebratory", "Community content shines with a celebratory tone that highlights togetherness and shared accomplishment. Set!"),
            ("Reintegration", _) => ("Emotional", "Reintegration stories carry deep emotional weight. An emotional tone helps your audience connect with the journey. Updated!"),
            _ => ("Informational", "An informational tone is a solid default that builds credibility and trust. I've applied it to your post.")
        };
    }

    private static (string Cta, string Reasoning) SuggestCta(string contentTopic, string sentimentTone)
    {
        var topic = string.IsNullOrWhiteSpace(contentTopic) ? "Fundraising" : contentTopic;

        return topic switch
        {
            "Fundraising" => ("DonateNow", "For fundraising content, a direct \"Donate Now\" CTA converts best. I've applied it to your post."),
            "Education" => ("LearnMore", "For educational content, \"Learn More\" invites curiosity and deeper engagement. Updated your CTA!"),
            "Health" => ("ShareStory", "Health stories are powerful when shared widely. \"Share Story\" helps amplify your reach. Set!"),
            "Reintegration" => ("ShareStory", "Reintegration stories deserve to be heard. \"Share Story\" encourages your audience to spread the word. Updated!"),
            "Community" => ("VolunteerSignup", "Community-focused content pairs perfectly with a volunteer recruitment CTA. I've set it for you!"),
            "Operations" => ("LearnMore", "For operational updates, \"Learn More\" drives transparency and trust. Applied!"),
            _ => ("DonateNow", "\"Donate Now\" is the most impactful CTA for nonprofit content. I've applied it to your post.")
        };
    }

    private static string GenerateHashtags(string contentTopic, string platform)
    {
        var baseTags = "#NewDawn #EndTrafficking #ChildProtection #Philippines #Nonprofit";

        var topicTags = contentTopic switch
        {
            "Education" => "#EducationMatters #GirlsEducation #EmpowerGirls #LearnToLead",
            "Health" => "#WellnessJourney #MentalHealthMatters #HealingHappensHere #HolisticCare",
            "Reintegration" => "#NewBeginnings #Resilience #SurvivorStrong #RestoreHope",
            "Operations" => "#BehindTheScenes #NonprofitLife #MakingADifference #ImpactDriven",
            "Fundraising" => "#GiveHope #DonateForChange #EveryPesoHelps #ChangeALife",
            "Community" => "#StrongerTogether #CommunityImpact #TogetherWeRise #SocialGood",
            _ => "#GiveHope #MakingADifference"
        };

        return $"{baseTags} {topicTags}";
    }

    private static string GetPlatformTips(string platform)
    {
        return platform switch
        {
            "Instagram" => "- Use high-quality visuals (1080x1080 for feed, 1080x1920 for stories)\n- Optimal caption length: 138-150 characters for max engagement\n- Use 5-10 relevant hashtags\n- Post during 11am-1pm or 7pm-9pm local time\n- Stories and Reels boost visibility significantly",
            "Facebook" => "- Longer captions (100-250 chars) perform well for nonprofits\n- Native video gets 10x more reach than shared links\n- Best posting times: 1pm-4pm on weekdays\n- Engage in comments within the first hour\n- Use Facebook's fundraising tools for donation posts",
            "TikTok" => "- Keep videos 15-60 seconds for best retention\n- Hook viewers in the first 3 seconds\n- Use trending sounds and effects\n- Post 1-3 times daily for algorithm favor\n- Authentic, unpolished content outperforms polished ads",
            "LinkedIn" => "- Professional tone works best\n- Optimal post length: 1300-2000 characters\n- Post on Tuesday-Thursday for max reach\n- Tag relevant organizations and partners\n- Impact metrics and data resonate with this audience",
            "Twitter" => "- Keep tweets concise (under 280 chars)\n- Use 1-2 hashtags maximum\n- Threads perform well for storytelling\n- Engage in conversations quickly\n- Visuals increase retweets by 150%",
            "WhatsApp" => "- Keep messages brief and personal\n- Use broadcast lists for updates\n- Include a clear single CTA\n- Rich media (photos/videos) increase open rates\n- Best for direct supporter communication",
            _ => "- Use compelling visuals to catch attention\n- Write clear, concise captions\n- Include a call-to-action\n- Post consistently at optimal times\n- Engage with your audience in comments"
        };
    }

    private static EditorSnapshot ParseEditorState(JsonElement? editorState)
    {
        var snapshot = new EditorSnapshot();
        if (!editorState.HasValue || editorState.Value.ValueKind != JsonValueKind.Object)
            return snapshot;

        var state = editorState.Value;

        if (state.TryGetProperty("platform", out var p)) snapshot.Platform = p.GetString() ?? "";
        if (state.TryGetProperty("headline", out var h)) snapshot.Headline = h.GetString() ?? "";
        if (state.TryGetProperty("body", out var b)) snapshot.Body = b.GetString() ?? "";
        if (state.TryGetProperty("mediaType", out var m)) snapshot.MediaType = m.GetString() ?? "";
        if (state.TryGetProperty("ctaType", out var c)) snapshot.CtaType = c.GetString() ?? "";
        if (state.TryGetProperty("contentTopic", out var ct)) snapshot.ContentTopic = ct.GetString() ?? "";
        if (state.TryGetProperty("sentimentTone", out var s)) snapshot.SentimentTone = s.GetString() ?? "";
        if (state.TryGetProperty("captionLength", out var cl)) snapshot.CaptionLength = cl.GetInt32();

        return snapshot;
    }

    private class EditorSnapshot
    {
        public string Platform { get; set; } = "";
        public string Headline { get; set; } = "";
        public string Body { get; set; } = "";
        public string MediaType { get; set; } = "";
        public string CtaType { get; set; } = "";
        public string ContentTopic { get; set; } = "";
        public string SentimentTone { get; set; } = "";
        public int CaptionLength { get; set; }
    }
}
