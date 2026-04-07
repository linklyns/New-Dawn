using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/donation-allocations")]
[Authorize]
public class DonationAllocationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? donationId = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? programArea = null)
    {
        var query = db.DonationAllocations.AsNoTracking().AsQueryable();

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
        var entity = await db.DonationAllocations.AsNoTracking().FirstOrDefaultAsync(e => e.AllocationId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DonationAllocation entity)
    {
        db.DonationAllocations.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.AllocationId }, entity);
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
