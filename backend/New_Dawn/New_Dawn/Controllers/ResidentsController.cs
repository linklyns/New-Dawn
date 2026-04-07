using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize(Roles = "Admin,Staff")]
public class ResidentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? caseStatus = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? caseCategory = null,
        [FromQuery] string? riskLevel = null,
        [FromQuery] string? search = null)
    {
        var query = db.Residents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(caseStatus))
            query = query.Where(r => r.CaseStatus == caseStatus);
        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(caseCategory))
            query = query.Where(r => r.CaseCategory == caseCategory);
        if (!string.IsNullOrWhiteSpace(riskLevel))
            query = query.Where(r => r.CurrentRiskLevel == riskLevel);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.CaseControlNo.Contains(search) || r.InternalCode.Contains(search));

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.Residents.AsNoTracking().FirstOrDefaultAsync(e => e.ResidentId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Resident entity)
    {
        db.Residents.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.ResidentId }, entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Resident entity)
    {
        if (id != entity.ResidentId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.Residents.FindAsync(id);
        if (existing == null) return NotFound(new { success = false, message = "Not found" });

        // Preserve ML-predicted risk level — read-only for manual edits
        var preservedRisk = existing.CurrentRiskLevel;
        db.Entry(existing).CurrentValues.SetValues(entity);
        existing.CurrentRiskLevel = preservedRisk;

        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { success = false, message = "Delete requires confirm=true" });
        var entity = await db.Residents.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.Residents.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
