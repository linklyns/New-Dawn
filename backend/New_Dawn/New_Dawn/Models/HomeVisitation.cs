using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace New_Dawn.Models;

[Table("home_visitations", Schema = "public")]
public class HomeVisitation
{
    [Key]
    [Column("visitation_id")]
    public int VisitationId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("visit_date")]
    public DateTime VisitDate { get; set; }

    [Column("social_worker")]
    public string SocialWorker { get; set; } = string.Empty;

    [Column("visit_type")]
    public string VisitType { get; set; } = string.Empty;

    [Column("location_visited")]
    public string LocationVisited { get; set; } = string.Empty;

    [Column("family_members_present")]
    public string FamilyMembersPresent { get; set; } = string.Empty;

    [Column("purpose")]
    public string Purpose { get; set; } = string.Empty;

    [Column("observations")]
    public string Observations { get; set; } = string.Empty;

    [Column("family_cooperation_level")]
    public string FamilyCooperationLevel { get; set; } = string.Empty;

    [Column("safety_concerns_noted")]
    public bool SafetyConcernsNoted { get; set; }

    [Column("follow_up_needed")]
    public bool FollowUpNeeded { get; set; }

    [Column("follow_up_notes")]
    public string? FollowUpNotes { get; set; }

    [Column("visit_outcome")]
    public string VisitOutcome { get; set; } = string.Empty;

    // Navigation properties
    [ForeignKey("ResidentId")]
    [ValidateNever]
    public Resident Resident { get; set; } = null!;
}
