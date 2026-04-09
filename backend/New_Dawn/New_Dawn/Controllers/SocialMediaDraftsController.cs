using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.DTOs;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/social-media-drafts")]
[Authorize(Roles = "Admin,Staff")]
public class SocialMediaDraftsController(AppDbContext db, IWebHostEnvironment environment) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "User context missing" });
        }

        var query = db.Set<SocialMediaDraft>()
            .AsNoTracking()
            .Where(d => d.CreatedById == userId)
            .OrderByDescending(d => d.UpdatedAt)
            .Select(d => new SocialMediaDraftSummaryDto
            {
                DraftId = d.DraftId,
                Title = d.Title,
                Stage = d.Stage,
                Status = d.Status,
                Platform = d.Platform,
                MediaType = d.MediaType,
                ContentTopic = d.ContentTopic,
                SentimentTone = d.SentimentTone,
                UpdatedAt = d.UpdatedAt,
                MediaCount = d.MediaItems.Count
            });

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var draft = await LoadAuthorizedDraft(id);
        if (draft == null)
        {
            return NotFound(new { success = false, message = "Draft not found" });
        }

        return Ok(MapDraft(draft));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertSocialMediaDraftRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "User context missing" });
        }

        var now = DateTime.UtcNow;
        var entity = new SocialMediaDraft
        {
            CreatedById = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        ApplyRequest(entity, request);

        db.Add(entity);
        await db.SaveChangesAsync();

        var created = await db.Set<SocialMediaDraft>()
            .AsNoTracking()
            .Include(d => d.MediaItems)
            .FirstAsync(d => d.DraftId == entity.DraftId);

        return CreatedAtAction(nameof(GetById), new { id = entity.DraftId }, MapDraft(created));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpsertSocialMediaDraftRequest request)
    {
        var draft = await LoadAuthorizedDraft(id, track: true);
        if (draft == null)
        {
            return NotFound(new { success = false, message = "Draft not found" });
        }

        ApplyRequest(draft, request);
        draft.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var updated = await db.Set<SocialMediaDraft>()
            .AsNoTracking()
            .Include(d => d.MediaItems)
            .FirstAsync(d => d.DraftId == id);

        return Ok(MapDraft(updated));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDraft(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { success = false, message = "Delete requires confirm=true" });
        }

        var draft = await LoadAuthorizedDraft(id, track: true);
        if (draft == null)
        {
            return NotFound(new { success = false, message = "Draft not found" });
        }

        foreach (var media in draft.MediaItems)
        {
            if (System.IO.File.Exists(media.StoragePath))
            {
                System.IO.File.Delete(media.StoragePath);
            }
        }

        var draftFolder = Path.Combine(environment.ContentRootPath, "App_Data", "social-drafts", id.ToString());
        if (Directory.Exists(draftFolder))
        {
            Directory.Delete(draftFolder, recursive: true);
        }

        db.Remove(draft);
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Draft deleted" });
    }

    [HttpPost("{id:int}/attachments")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> UploadAttachment(int id, [FromForm] List<IFormFile> files)
    {
        if (files.Count == 0)
        {
            return BadRequest(new { success = false, message = "At least one file is required" });
        }

        var draft = await LoadAuthorizedDraft(id, track: true);
        if (draft == null)
        {
            return NotFound(new { success = false, message = "Draft not found" });
        }

        var draftFolder = Path.Combine(environment.ContentRootPath, "App_Data", "social-drafts", id.ToString());
        Directory.CreateDirectory(draftFolder);

        foreach (var file in files)
        {
            if (file.Length == 0)
            {
                continue;
            }

            var extension = Path.GetExtension(file.FileName);
            var fileToken = $"{Guid.NewGuid():N}{extension}";
            var storagePath = Path.Combine(draftFolder, fileToken);

            await using (var stream = System.IO.File.Create(storagePath))
            {
                await file.CopyToAsync(stream);
            }

            draft.MediaItems.Add(new SocialMediaDraftMedia
            {
                FileName = file.FileName,
                ContentType = file.ContentType,
                MediaKind = ResolveMediaKind(file.ContentType),
                StoragePath = storagePath,
                FileSizeBytes = file.Length,
                UploadedAt = DateTime.UtcNow
            });
        }

        draft.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(MapDraft(draft));
    }

    [HttpDelete("{draftId:int}/attachments/{mediaId:int}")]
    public async Task<IActionResult> DeleteAttachment(int draftId, int mediaId, [FromQuery] bool confirm = false)
    {
        if (!confirm)
        {
            return BadRequest(new { success = false, message = "Delete requires confirm=true" });
        }

        var draft = await LoadAuthorizedDraft(draftId, track: true);
        if (draft == null)
        {
            return NotFound(new { success = false, message = "Draft not found" });
        }

        var media = draft.MediaItems.FirstOrDefault(item => item.MediaId == mediaId);
        if (media == null)
        {
            return NotFound(new { success = false, message = "Attachment not found" });
        }

        if (System.IO.File.Exists(media.StoragePath))
        {
            System.IO.File.Delete(media.StoragePath);
        }

        db.Remove(media);
        draft.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Attachment deleted" });
    }

    [HttpGet("media/{mediaId:int}")]
    public async Task<IActionResult> DownloadMedia(int mediaId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "User context missing" });
        }

        var media = await db.Set<SocialMediaDraftMedia>()
            .Include(m => m.Draft)
            .FirstOrDefaultAsync(m => m.MediaId == mediaId && m.Draft != null && m.Draft.CreatedById == userId);

        if (media == null || !System.IO.File.Exists(media.StoragePath))
        {
            return NotFound(new { success = false, message = "Attachment not found" });
        }

        var stream = System.IO.File.OpenRead(media.StoragePath);
        return File(stream, media.ContentType, enableRangeProcessing: true);
    }

    private async Task<SocialMediaDraft?> LoadAuthorizedDraft(int id, bool track = false)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        IQueryable<SocialMediaDraft> query = db.Set<SocialMediaDraft>().Include(d => d.MediaItems);
        if (!track)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(d => d.DraftId == id && d.CreatedById == userId);
    }

    private static void ApplyRequest(SocialMediaDraft entity, UpsertSocialMediaDraftRequest request)
    {
        entity.Title = request.Title.Trim();
        entity.Stage = request.Stage.Trim();
        entity.Status = "draft";
        entity.Platform = request.Platform.Trim();
        entity.PostType = request.PostType.Trim();
        entity.MediaType = request.MediaType.Trim();
        entity.CallToActionType = request.CallToActionType.Trim();
        entity.ContentTopic = request.ContentTopic.Trim();
        entity.SentimentTone = request.SentimentTone.Trim();
        entity.Hashtags = request.Hashtags.Trim();
        entity.Audience = request.Audience.Trim();
        entity.CampaignName = request.CampaignName.Trim();
        entity.AdditionalInstructions = request.AdditionalInstructions.Trim();
        entity.Headline = request.Headline.Trim();
        entity.Body = request.Body.Trim();
        entity.CtaText = request.CtaText.Trim();
        entity.WebsiteUrl = string.IsNullOrWhiteSpace(request.WebsiteUrl) ? "new-dawn-virid.vercel.app" : request.WebsiteUrl.Trim();
        entity.ScheduledDay = string.IsNullOrWhiteSpace(request.ScheduledDay) ? null : request.ScheduledDay.Trim();
        entity.ScheduledHour = request.ScheduledHour;
        entity.ChatHistoryJson = JsonSerializer.Serialize(request.ChatHistory, JsonOptions);
    }

    private static SocialMediaDraftDto MapDraft(SocialMediaDraft entity)
    {
        var chatHistory = string.IsNullOrWhiteSpace(entity.ChatHistoryJson)
            ? []
            : JsonSerializer.Deserialize<List<SocialMediaDraftChatMessageDto>>(entity.ChatHistoryJson, JsonOptions) ?? [];

        return new SocialMediaDraftDto
        {
            DraftId = entity.DraftId,
            Title = entity.Title,
            Stage = entity.Stage,
            Status = entity.Status,
            Platform = entity.Platform,
            PostType = entity.PostType,
            MediaType = entity.MediaType,
            CallToActionType = entity.CallToActionType,
            ContentTopic = entity.ContentTopic,
            SentimentTone = entity.SentimentTone,
            Hashtags = entity.Hashtags,
            Audience = entity.Audience,
            CampaignName = entity.CampaignName,
            AdditionalInstructions = entity.AdditionalInstructions,
            Headline = entity.Headline,
            Body = entity.Body,
            CtaText = entity.CtaText,
            WebsiteUrl = entity.WebsiteUrl,
            ScheduledDay = entity.ScheduledDay,
            ScheduledHour = entity.ScheduledHour,
            ChatHistory = chatHistory,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
            MediaItems = entity.MediaItems
                .OrderByDescending(item => item.UploadedAt)
                .Select(item => new SocialMediaDraftMediaDto
                {
                    MediaId = item.MediaId,
                    FileName = item.FileName,
                    ContentType = item.ContentType,
                    MediaKind = item.MediaKind,
                    FileSizeBytes = item.FileSizeBytes,
                    UploadedAt = item.UploadedAt
                })
                .ToList()
        };
    }

    private static string ResolveMediaKind(string contentType)
    {
        if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return "image";
        }

        if (contentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
        {
            return "video";
        }

        return "file";
    }
}