using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Extensions;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/social-media-posts")]
[Authorize(Roles = "Admin")]
public class SocialMediaPostsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? platform = null,
        [FromQuery] string? postType = null,
        [FromQuery] string? contentTopic = null)
    {
        var query = db.SocialMediaPosts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(platform))
            query = query.Where(p => p.Platform == platform);
        if (!string.IsNullOrWhiteSpace(postType))
            query = query.Where(p => p.PostType == postType);
        if (!string.IsNullOrWhiteSpace(contentTopic))
            query = query.Where(p => p.ContentTopic == contentTopic);

        var result = await query.ToPagedResultAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.SocialMediaPosts.AsNoTracking().FirstOrDefaultAsync(e => e.PostId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SocialMediaPost entity)
    {
        db.SocialMediaPosts.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = entity.PostId }, entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] SocialMediaPost entity)
    {
        if (id != entity.PostId) return BadRequest(new { success = false, message = "ID mismatch" });
        var existing = await db.SocialMediaPosts.FindAsync(id);
        if (existing == null) return NotFound(new { success = false, message = "Not found" });
        db.Entry(existing).CurrentValues.SetValues(entity);
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm) return BadRequest(new { success = false, message = "Delete requires confirm=true" });
        var entity = await db.SocialMediaPosts.FindAsync(id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        db.SocialMediaPosts.Remove(entity);
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deleted" });
    }
}
