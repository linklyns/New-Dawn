using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("in_kind_donation_items", Schema = "public")]
public class InKindDonationItem
{
    [Key]
    [Column("item_id")]
    public int ItemId { get; set; }

    [Column("donation_id")]
    public int DonationId { get; set; }

    [Column("item_name")]
    public string ItemName { get; set; } = string.Empty;

    [Column("item_category")]
    public string ItemCategory { get; set; } = string.Empty;

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("unit_of_measure")]
    public string UnitOfMeasure { get; set; } = string.Empty;

    [Column("estimated_unit_value")]
    public decimal EstimatedUnitValue { get; set; }

    [Column("intended_use")]
    public string IntendedUse { get; set; } = string.Empty;

    [Column("received_condition")]
    public string ReceivedCondition { get; set; } = string.Empty;

    // Navigation properties
    [ForeignKey("DonationId")]
    public Donation Donation { get; set; } = null!;
}
