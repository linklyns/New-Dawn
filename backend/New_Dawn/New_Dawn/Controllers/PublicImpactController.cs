using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/public-impact")]
public class PublicImpactController(AppDbContext db) : ControllerBase
{
    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStats()
    {
        var girlsServed = await db.Residents.CountAsync();
        var safehouses = await db.Safehouses.CountAsync();
        var donations = await db.Donations.CountAsync();
        var partners = await db.Partners.CountAsync();

        return Ok(new
        {
            girlsServed,
            safehouses,
            donations,
            partners
        });
    }

    [HttpGet("dashboard")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDashboard()
    {
        // Residents by admission year
        var residentsByYear = await db.Residents
            .GroupBy(r => r.DateOfAdmission.Year)
            .Select(g => new { year = g.Key.ToString(), count = g.Count() })
            .OrderBy(x => x.year)
            .ToListAsync();

        // Cumulative total by year
        var cumulative = new List<object>();
        var runningTotal = 0;
        foreach (var item in residentsByYear)
        {
            runningTotal += item.count;
            cumulative.Add(new { item.year, count = runningTotal });
        }

        // Donation allocation by program area
        var donationByProgram = await db.DonationAllocations
            .GroupBy(a => a.ProgramArea)
            .Select(g => new { name = g.Key, value = (int)g.Sum(a => a.AmountAllocated) })
            .OrderByDescending(x => x.value)
            .Take(5)
            .ToListAsync();

        // Safehouse regional data
        var safehouseRegions = await db.Safehouses
            .GroupBy(s => s.Region)
            .Select(g => new
            {
                region = g.Key,
                count = g.Count(),
                occupancy = g.Average(s => s.CurrentOccupancy * 100.0 / (s.CapacityGirls == 0 ? 1 : s.CapacityGirls))
            })
            .ToListAsync();

        return Ok(new
        {
            residentsOverTime = cumulative,
            donationByProgram,
            safehouseRegions
        });
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = db.PublicImpactSnapshots.AsNoTracking();
        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.PublicImpactSnapshots.AsNoTracking().FirstOrDefaultAsync(e => e.SnapshotId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] PublicImpactSnapshot entity)
    {
        db.PublicImpactSnapshots.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.SnapshotId }, entity);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] PublicImpactSnapshot entity)
    {
        if (id != entity.SnapshotId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.PublicImpactSnapshots.FindAsync(id);
        if (existing == null) return NotFound(new { success = false, message = "Not found" });
        db.Entry(existing).CurrentValues.SetValues(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { success = false, message = "Delete requires confirm=true" });
        var entity = await db.PublicImpactSnapshots.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.PublicImpactSnapshots.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
