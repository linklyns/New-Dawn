using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/donations")]
[Authorize]
public class DonationsController(AppDbContext db, UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? donationType = null,
        [FromQuery] string? campaignName = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int? supporterId = null)
    {
        var query = db.Donations.AsNoTracking().AsQueryable();

        if (!User.IsInRole("Admin"))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var appUser = await userManager.FindByIdAsync(userId!);
            if (appUser?.LinkedSupporterId == null)
                return Ok(new { items = new List<Donation>(), totalCount = 0, page, pageSize, totalPages = 0 });
            query = query.Where(d => d.SupporterId == appUser.LinkedSupporterId.Value);
        }

        if (!string.IsNullOrWhiteSpace(donationType))
            query = query.Where(d => d.DonationType == donationType);
        if (!string.IsNullOrWhiteSpace(campaignName))
            query = query.Where(d => d.CampaignName == campaignName);
        if (dateFrom.HasValue)
            query = query.Where(d => d.DonationDate >= dateFrom.Value);
        if (dateTo.HasValue)
            query = query.Where(d => d.DonationDate <= dateTo.Value);
        if (supporterId.HasValue)
            query = query.Where(d => d.SupporterId == supporterId.Value);

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!User.IsInRole("Admin"))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var appUser = await userManager.FindByIdAsync(userId!);
            var donation = await db.Donations.AsNoTracking().FirstOrDefaultAsync(d => d.DonationId == id);
            if (donation == null) return NotFound(new { success = false, message = "Not found" });
            if (appUser?.LinkedSupporterId != donation.SupporterId)
                return Forbid();
            return Ok(donation);
        }

        var entity = await db.Donations.AsNoTracking().FirstOrDefaultAsync(e => e.DonationId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Donation entity)
    {
        db.Donations.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.DonationId }, entity);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Donation entity)
    {
        if (id != entity.DonationId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.Donations.FindAsync(id);
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
        var entity = await db.Donations.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.Donations.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
