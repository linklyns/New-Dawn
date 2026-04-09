using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize(Roles = "Admin")]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? unreadOnly = null)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(page, 1);

        var query = db.Notifications.AsQueryable();

        if (unreadOnly == true)
            query = query.Where(n => !n.IsRead);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new
            {
                n.NotificationId,
                n.Type,
                n.Title,
                n.Message,
                n.Link,
                n.IsRead,
                n.CreatedAt,
                n.GroupKey
            })
            .ToListAsync();

        var unreadCount = await db.Notifications.CountAsync(n => !n.IsRead);

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            unreadCount
        });
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var notification = await db.Notifications.FindAsync(id);
        if (notification == null)
            return NotFound(new { success = false, message = "Notification not found" });

        notification.IsRead = true;
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Notification marked as read" });
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await db.Notifications
            .Where(n => !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        return Ok(new { success = true, message = "All notifications marked as read" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false)
    {
        if (!confirm)
            return BadRequest(new { success = false, message = "Confirm deletion with ?confirm=true" });

        var notification = await db.Notifications.FindAsync(id);
        if (notification == null)
            return NotFound(new { success = false, message = "Notification not found" });

        db.Notifications.Remove(notification);
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Notification deleted" });
    }
}
