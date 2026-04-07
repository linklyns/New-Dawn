using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/incident-reports")]
[Authorize(Roles = "Admin,Staff")]
public class IncidentReportsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? incidentType = null,
        [FromQuery] string? severity = null,
        [FromQuery] bool? resolved = null)
    {
        var query = db.IncidentReports.AsNoTracking().AsQueryable();

        if (residentId.HasValue)
            query = query.Where(ir => ir.ResidentId == residentId.Value);
        if (safehouseId.HasValue)
            query = query.Where(ir => ir.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(incidentType))
            query = query.Where(ir => ir.IncidentType == incidentType);
        if (!string.IsNullOrWhiteSpace(severity))
            query = query.Where(ir => ir.Severity == severity);
        if (resolved.HasValue)
            query = query.Where(ir => ir.Resolved == resolved.Value);

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.IncidentReports.AsNoTracking().FirstOrDefaultAsync(e => e.IncidentId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] IncidentReport entity)
    {
        db.IncidentReports.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.IncidentId }, entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] IncidentReport entity)
    {
        if (id != entity.IncidentId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.IncidentReports.FindAsync(id);
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
        var entity = await db.IncidentReports.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.IncidentReports.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
