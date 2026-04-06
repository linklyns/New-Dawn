using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("public_impact_snapshots", Schema = "public")]
public class PublicImpactSnapshot
{
    [Key]
    [Column("snapshot_id")]
    public int SnapshotId { get; set; }

    [Column("snapshot_date")]
    public DateTime SnapshotDate { get; set; }

    [Column("headline")]
    public string Headline { get; set; } = string.Empty;

    [Column("summary_text")]
    public string SummaryText { get; set; } = string.Empty;

    [Column("metric_payload_json")]
    public string MetricPayloadJson { get; set; } = string.Empty;

    [Column("is_published")]
    public bool IsPublished { get; set; }

    [Column("published_at")]
    public DateTime PublishedAt { get; set; }
}
