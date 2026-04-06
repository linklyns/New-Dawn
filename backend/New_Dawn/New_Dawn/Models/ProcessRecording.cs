using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("process_recordings", Schema = "public")]
public class ProcessRecording
{
    [Key]
    [Column("recording_id")]
    public int RecordingId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("session_date")]
    public DateTime SessionDate { get; set; }

    [Column("social_worker")]
    public string SocialWorker { get; set; } = string.Empty;

    [Column("session_type")]
    public string SessionType { get; set; } = string.Empty;

    [Column("session_duration_minutes")]
    public int SessionDurationMinutes { get; set; }

    [Column("emotional_state_observed")]
    public string EmotionalStateObserved { get; set; } = string.Empty;

    [Column("emotional_state_end")]
    public string EmotionalStateEnd { get; set; } = string.Empty;

    [Column("session_narrative")]
    public string SessionNarrative { get; set; } = string.Empty;

    [Column("interventions_applied")]
    public string InterventionsApplied { get; set; } = string.Empty;

    [Column("follow_up_actions")]
    public string FollowUpActions { get; set; } = string.Empty;

    [Column("progress_noted")]
    public bool ProgressNoted { get; set; }

    [Column("concerns_flagged")]
    public bool ConcernsFlagged { get; set; }

    [Column("referral_made")]
    public bool ReferralMade { get; set; }

    [Column("notes_restricted")]
    public string? NotesRestricted { get; set; }

    // Navigation properties
    [ForeignKey("ResidentId")]
    public Resident Resident { get; set; } = null!;
}
