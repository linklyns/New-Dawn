using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.DTOs;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/donation-allocations")]
[Authorize]
public class DonationAllocationsController(AppDbContext db, UserManager<ApplicationUser> userManager) : ControllerBase
{
    private async Task<int?> GetLinkedSupporterIdAsync()
    {
        if (User.IsInRole("Admin")) return null; // null means "no filter"
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var appUser = await userManager.FindByIdAsync(userId!);
        return appUser?.LinkedSupporterId;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var linkedId = await GetLinkedSupporterIdAsync();

        // For donors: scope to their donations only
        var donationsQuery = db.Donations.Where(d => d.Amount != null);
        var allocationsQuery = db.DonationAllocations.AsQueryable();

        if (linkedId.HasValue)
        {
            donationsQuery = donationsQuery.Where(d => d.SupporterId == linkedId.Value);
            var donorDonationIds = db.Donations
                .Where(d => d.SupporterId == linkedId.Value)
                .Select(d => d.DonationId);
            allocationsQuery = allocationsQuery.Where(da => donorDonationIds.Contains(da.DonationId));
        }
        else if (!User.IsInRole("Admin"))
        {
            // Donor with no linked supporter — show empty
            return Ok(new { totalDonated = 0m, totalAllocated = 0m, unallocated = 0m });
        }

        var totalDonated = await donationsQuery.SumAsync(d => d.Amount ?? 0m);

        var totalAllocated = await allocationsQuery
            .SumAsync(da => (decimal?)da.AmountAllocated) ?? 0m;

        var allocatedPerDonation = await allocationsQuery
            .GroupBy(da => da.DonationId)
            .Select(g => new { DonationId = g.Key, Total = g.Sum(da => da.AmountAllocated) })
            .ToListAsync();

        var allocatedLookup = allocatedPerDonation.ToDictionary(x => x.DonationId, x => x.Total);

        var donationsWithAmount = await donationsQuery
            .Select(d => new { d.DonationId, Amount = d.Amount ?? 0m })
            .ToListAsync();

        var unallocated = donationsWithAmount.Sum(d =>
        {
            var allocated = allocatedLookup.GetValueOrDefault(d.DonationId, 0m);
            var remaining = d.Amount - allocated;
            return remaining > 0 ? remaining : 0m;
        });

        return Ok(new
        {
            totalDonated,
            totalAllocated,
            unallocated
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? donationId = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? programArea = null)
    {
        var query = db.DonationAllocations.AsNoTracking().AsQueryable();

        // Scope to donor's own donations
        var linkedId = await GetLinkedSupporterIdAsync();
        if (linkedId.HasValue)
        {
            var donorDonationIds = db.Donations
                .Where(d => d.SupporterId == linkedId.Value)
                .Select(d => d.DonationId);
            query = query.Where(da => donorDonationIds.Contains(da.DonationId));
        }
        else if (!User.IsInRole("Admin"))
        {
            return Ok(new { items = new List<DonationAllocation>(), totalCount = 0, page, pageSize, totalPages = 0 });
        }

        if (donationId.HasValue)
            query = query.Where(da => da.DonationId == donationId.Value);
        if (safehouseId.HasValue)
            query = query.Where(da => da.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(programArea))
            query = query.Where(da => da.ProgramArea == programArea);

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.DonationAllocations.AsNoTracking()
            .Include(da => da.Donation)
            .FirstOrDefaultAsync(e => e.AllocationId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });

        // Donor can only view allocations from their own donations
        var linkedId = await GetLinkedSupporterIdAsync();
        if (linkedId.HasValue && entity.Donation.SupporterId != linkedId.Value)
            return Forbid();

        return Ok(entity);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAllocationRequest req)
    {
        var entity = new DonationAllocation
        {
            DonationId = req.DonationId,
            SafehouseId = req.SafehouseId,
            ProgramArea = req.ProgramArea,
            AmountAllocated = req.AmountAllocated,
            AllocationDate = DateTime.Parse(req.AllocationDate),
            AllocationNotes = req.AllocationNotes,
        };
        // Seed data used explicit IDs; ensure sequence is ahead of max
        var maxId = await db.DonationAllocations.MaxAsync(da => (int?)da.AllocationId) ?? 0;
        await db.Database.ExecuteSqlAsync(
            $"SELECT setval(pg_get_serial_sequence('donation_allocations', 'allocation_id'), GREATEST({maxId}, 1))");
        db.DonationAllocations.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.AllocationId }, entity);
    }

    [HttpGet("unallocated-donations")]
    public async Task<IActionResult> GetUnallocatedDonations()
    {
        var allocatedPerDonation = await db.DonationAllocations
            .GroupBy(da => da.DonationId)
            .Select(g => new { DonationId = g.Key, Total = g.Sum(da => da.AmountAllocated) })
            .ToListAsync();

        var allocatedLookup = allocatedPerDonation.ToDictionary(x => x.DonationId, x => x.Total);

        var donations = await db.Donations
            .Where(d => d.Amount != null && d.Amount > 0)
            .Select(d => new { d.DonationId, d.Amount, d.DonationType, d.DonationDate, d.CampaignName })
            .ToListAsync();

        var result = donations
            .Select(d =>
            {
                var allocated = allocatedLookup.GetValueOrDefault(d.DonationId, 0m);
                var remaining = (d.Amount ?? 0m) - allocated;
                return new { d.DonationId, d.Amount, d.DonationType, d.DonationDate, d.CampaignName, remaining };
            })
            .Where(d => d.remaining > 0)
            .OrderByDescending(d => d.remaining)
            .ToList();

        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] DonationAllocation entity)
    {
        if (id != entity.AllocationId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.DonationAllocations.FindAsync(id);
        if (existing == null) return NotFound(new { success = false, message = "Not found" });
        db.Entry(existing).CurrentValues.SetValues(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { success = false, message = "Delete requires confirm=true" });
        var entity = await db.DonationAllocations.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.DonationAllocations.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
