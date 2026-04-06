using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/health-records")]
[Authorize(Roles = "Admin")]
public class HealthRecordsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null)
    {
        var query = db.HealthWellbeingRecords.AsNoTracking().AsQueryable();

        if (residentId.HasValue)
            query = query.Where(hw => hw.ResidentId == residentId.Value);

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.HealthWellbeingRecords.AsNoTracking().FirstOrDefaultAsync(e => e.HealthRecordId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] HealthWellbeingRecord entity)
    {
        db.HealthWellbeingRecords.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.HealthRecordId }, entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] HealthWellbeingRecord entity)
    {
        if (id != entity.HealthRecordId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.HealthWellbeingRecords.FindAsync(id);
        if (existing == null) return NotFound(new { success = false, message = "Not found" });
        db.Entry(existing).CurrentValues.SetValues(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { success = false, message = "Delete requires confirm=true" });
        var entity = await db.HealthWellbeingRecords.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.HealthWellbeingRecords.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
