using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("incident_reports", Schema = "public")]
public class IncidentReport
{
    [Key]
    [Column("incident_id")]
    public int IncidentId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("incident_date")]
    public DateTime IncidentDate { get; set; }

    [Column("incident_type")]
    public string IncidentType { get; set; } = string.Empty;

    [Column("severity")]
    public string Severity { get; set; } = string.Empty;

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("response_taken")]
    public string ResponseTaken { get; set; } = string.Empty;

    [Column("resolved")]
    public bool Resolved { get; set; }

    [Column("resolution_date")]
    public DateTime? ResolutionDate { get; set; }

    [Column("reported_by")]
    public string ReportedBy { get; set; } = string.Empty;

    [Column("follow_up_required")]
    public bool FollowUpRequired { get; set; }

    // Navigation properties
    [ForeignKey("ResidentId")]
    public Resident Resident { get; set; } = null!;

    [ForeignKey("SafehouseId")]
    public Safehouse Safehouse { get; set; } = null!;
}
