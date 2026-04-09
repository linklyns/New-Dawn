using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("notifications", Schema = "public")]
public class Notification
{
    [Key]
    [Column("notification_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int NotificationId { get; set; }

    [Column("type")]
    public string Type { get; set; } = string.Empty;

    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Column("link")]
    public string? Link { get; set; }

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("group_key")]
    public string? GroupKey { get; set; }
}
