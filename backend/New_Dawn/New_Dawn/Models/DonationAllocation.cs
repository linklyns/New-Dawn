using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("donation_allocations", Schema = "public")]
public class DonationAllocation
{
    [Key]
    [Column("allocation_id")]
    public int AllocationId { get; set; }

    [Column("donation_id")]
    public int DonationId { get; set; }

    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("program_area")]
    public string ProgramArea { get; set; } = string.Empty;

    [Column("amount_allocated")]
    public decimal AmountAllocated { get; set; }

    [Column("allocation_date")]
    public DateTime AllocationDate { get; set; }

    [Column("allocation_notes")]
    public string? AllocationNotes { get; set; }

    // Navigation properties
    [ForeignKey("DonationId")]
    public Donation Donation { get; set; } = null!;

    [ForeignKey("SafehouseId")]
    public Safehouse Safehouse { get; set; } = null!;
}
