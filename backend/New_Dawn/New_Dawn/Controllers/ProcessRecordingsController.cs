using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/process-recordings")]
[Authorize(Roles = "Admin,Staff")]
public class ProcessRecordingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? residentId = null)
    {
        if (!residentId.HasValue)
            return BadRequest(new { success = false, message = "residentId query parameter is required" });

        var query = db.ProcessRecordings.AsNoTracking()
            .Where(pr => pr.ResidentId == residentId.Value);

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.ProcessRecordings.AsNoTracking().FirstOrDefaultAsync(e => e.RecordingId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProcessRecording entity)
    {
        db.ProcessRecordings.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.RecordingId }, entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProcessRecording entity)
    {
        if (id != entity.RecordingId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.ProcessRecordings.FindAsync(id);
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
        var entity = await db.ProcessRecordings.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.ProcessRecordings.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
