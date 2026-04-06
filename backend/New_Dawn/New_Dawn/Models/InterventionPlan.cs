using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("intervention_plans", Schema = "public")]
public class InterventionPlan
{
    [Key]
    [Column("plan_id")]
    public int PlanId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("plan_category")]
    public string PlanCategory { get; set; } = string.Empty;

    [Column("plan_description")]
    public string PlanDescription { get; set; } = string.Empty;

    [Column("services_provided")]
    public string ServicesProvided { get; set; } = string.Empty;

    [Column("target_value")]
    public decimal TargetValue { get; set; }

    [Column("target_date")]
    public DateTime TargetDate { get; set; }

    [Column("status")]
    public string Status { get; set; } = string.Empty;

    [Column("case_conference_date")]
    public DateTime CaseConferenceDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    [ForeignKey("ResidentId")]
    public Resident Resident { get; set; } = null!;
}
