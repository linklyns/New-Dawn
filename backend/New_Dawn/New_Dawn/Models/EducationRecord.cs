using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace New_Dawn.Models;

[Table("education_records", Schema = "public")]
public class EducationRecord
{
    [Key]
    [Column("education_record_id")]
    public int EducationRecordId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("record_date")]
    public DateTime RecordDate { get; set; }

    [Column("education_level")]
    public string EducationLevel { get; set; } = string.Empty;

    [Column("school_name")]
    public string SchoolName { get; set; } = string.Empty;

    [Column("enrollment_status")]
    public string EnrollmentStatus { get; set; } = string.Empty;

    [Column("attendance_rate")]
    public decimal AttendanceRate { get; set; }

    [Column("progress_percent")]
    public decimal ProgressPercent { get; set; }

    [Column("completion_status")]
    public string CompletionStatus { get; set; } = string.Empty;

    [Column("notes")]
    public string Notes { get; set; } = string.Empty;

    // Navigation properties
    [ForeignKey("ResidentId")]
    [ValidateNever]
    public Resident Resident { get; set; } = null!;
}
