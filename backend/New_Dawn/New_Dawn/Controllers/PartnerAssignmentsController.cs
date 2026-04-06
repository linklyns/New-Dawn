using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/partner-assignments")]
[Authorize(Roles = "Admin")]
public class PartnerAssignmentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? partnerId = null,
        [FromQuery] int? safehouseId = null)
    {
        var query = db.PartnerAssignments.AsNoTracking().AsQueryable();

        if (partnerId.HasValue)
            query = query.Where(pa => pa.PartnerId == partnerId.Value);
        if (safehouseId.HasValue)
            query = query.Where(pa => pa.SafehouseId == safehouseId.Value);

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.PartnerAssignments.AsNoTracking().FirstOrDefaultAsync(e => e.AssignmentId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PartnerAssignment entity)
    {
        db.PartnerAssignments.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.AssignmentId }, entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PartnerAssignment entity)
    {
        if (id != entity.AssignmentId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.PartnerAssignments.FindAsync(id);
        if (existing == null) return NotFound(new { success = false, message = "Not found" });
        db.Entry(existing).CurrentValues.SetValues(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { success = false, message = "Delete requires confirm=true" });
        var entity = await db.PartnerAssignments.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.PartnerAssignments.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
