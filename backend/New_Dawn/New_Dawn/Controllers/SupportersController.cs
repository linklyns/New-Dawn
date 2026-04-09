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
[Route("api/supporters")]
[Authorize]
public class SupportersController(AppDbContext db, UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? supporterType = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var query = db.Supporters.AsNoTracking().AsQueryable();

        if (!User.IsInRole("Admin"))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var appUser = await userManager.FindByIdAsync(userId!);
            if (appUser == null)
                return Ok(new { items = new List<Supporter>(), totalCount = 0, page, pageSize, totalPages = 0 });

            if (appUser.LinkedSupporterId == null)
            {
                var supporterByEmail = await db.Supporters
                    .FirstOrDefaultAsync(s => s.Email == appUser.Email);

                if (supporterByEmail == null)
                {
                    var nextSupporterId = (await db.Supporters.MaxAsync(s => (int?)s.SupporterId) ?? 0) + 1;
                    var displayName = string.IsNullOrWhiteSpace(appUser.DisplayName)
                        ? (appUser.Email ?? "New Donor")
                        : appUser.DisplayName;
                    var nameParts = displayName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    var firstName = nameParts.Length > 0 ? nameParts[0] : "Donor";
                    var lastName = nameParts.Length > 1 ? string.Join(' ', nameParts.Skip(1)) : "User";

                    supporterByEmail = new Supporter
                    {
                        SupporterId = nextSupporterId,
                        SupporterType = "MonetaryDonor",
                        DisplayName = displayName,
                        FirstName = firstName,
                        LastName = lastName,
                        RelationshipType = "Local",
                        Region = "Unknown",
                        Country = "Philippines",
                        Email = appUser.Email ?? string.Empty,
                        Phone = string.Empty,
                        Status = "Active",
                        CreatedAt = DateTime.UtcNow,
                        FirstDonationDate = DateTime.UtcNow,
                        AcquisitionChannel = "Website",
                    };

                    db.Supporters.Add(supporterByEmail);
                    await db.SaveChangesAsync();
                }

                appUser.LinkedSupporterId = supporterByEmail.SupporterId;
                await userManager.UpdateAsync(appUser);
            }

            query = query.Where(s => s.SupporterId == appUser.LinkedSupporterId.Value);
        }

        if (!string.IsNullOrWhiteSpace(supporterType))
            query = query.Where(s => s.SupporterType == supporterType);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.DisplayName.Contains(search) || s.Email.Contains(search));

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
            if (appUser?.LinkedSupporterId != id)
                return Forbid();
        }

        var entity = await db.Supporters.AsNoTracking().FirstOrDefaultAsync(e => e.SupporterId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Supporter entity)
    {
        if (entity.SupporterId <= 0)
        {
            entity.SupporterId = (await db.Supporters.MaxAsync(s => (int?)s.SupporterId) ?? 0) + 1;
        }
        db.Supporters.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.SupporterId }, entity);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Supporter entity)
    {
        if (id != entity.SupporterId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.Supporters.FindAsync(id);
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
        var entity = await db.Supporters.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.Supporters.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
