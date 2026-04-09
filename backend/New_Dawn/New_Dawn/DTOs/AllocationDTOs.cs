namespace New_Dawn.DTOs;

public class CreateAllocationRequest
{
    public int DonationId { get; set; }
    public int SafehouseId { get; set; }
    public string ProgramArea { get; set; } = string.Empty;
    public decimal AmountAllocated { get; set; }
    public string AllocationDate { get; set; } = string.Empty;
    public string? AllocationNotes { get; set; }
}
