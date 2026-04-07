using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/intervention-plans")]
[Authorize(Roles = "Admin,Staff")]
public class InterventionPlansController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null,
        [FromQuery] string? status = null)
    {
        var query = db.InterventionPlans.AsNoTracking().AsQueryable();

        if (residentId.HasValue)
            query = query.Where(ip => ip.ResidentId == residentId.Value);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(ip => ip.Status == status);

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.InterventionPlans.AsNoTracking().FirstOrDefaultAsync(e => e.PlanId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InterventionPlan entity)
    {
        db.InterventionPlans.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.PlanId }, entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] InterventionPlan entity)
    {
        if (id != entity.PlanId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.InterventionPlans.FindAsync(id);
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
        var entity = await db.InterventionPlans.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.InterventionPlans.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
