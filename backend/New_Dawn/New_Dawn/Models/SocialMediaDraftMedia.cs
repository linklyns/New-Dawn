using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("social_media_draft_media", Schema = "public")]
public class SocialMediaDraftMedia
{
    [Key]
    [Column("media_id")]
    public int MediaId { get; set; }

    [Column("draft_id")]
    public int DraftId { get; set; }

    [Column("file_name")]
    public string FileName { get; set; } = string.Empty;

    [Column("content_type")]
    public string ContentType { get; set; } = string.Empty;

    [Column("media_kind")]
    public string MediaKind { get; set; } = string.Empty;

    [Column("storage_path")]
    public string StoragePath { get; set; } = string.Empty;

    [Column("file_size_bytes")]
    public long FileSizeBytes { get; set; }

    [Column("uploaded_at")]
    public DateTime UploadedAt { get; set; }

    [ForeignKey(nameof(DraftId))]
    public SocialMediaDraft? Draft { get; set; }
}