using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;
using New_Dawn.Models;
using New_Dawn.Services;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(AppDbContext db, UserManager<ApplicationUser> userManager, NotificationService notificationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? unreadOnly = null)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(page, 1);

        var user = await userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();

        var roles = await userManager.GetRolesAsync(user);
        var userId = user.Id;

        var query = db.Notifications
            .Where(n => n.UserId == userId
                || (n.UserId == null && n.TargetRole != null && roles.Contains(n.TargetRole))
                || (n.UserId == null && n.TargetRole == null));

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
                n.GroupKey,
                n.UserId,
                n.TargetRole,
                n.ListData
            })
            .ToListAsync();

        var unreadCount = await db.Notifications
            .Where(n => n.UserId == userId
                || (n.UserId == null && n.TargetRole != null && roles.Contains(n.TargetRole))
                || (n.UserId == null && n.TargetRole == null))
            .CountAsync(n => !n.IsRead);

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
        var user = await userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();

        var roles = await userManager.GetRolesAsync(user);
        var userId = user.Id;

        await db.Notifications
            .Where(n => !n.IsRead &&
                (n.UserId == userId
                || (n.UserId == null && n.TargetRole != null && roles.Contains(n.TargetRole))
                || (n.UserId == null && n.TargetRole == null)))
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        return Ok(new { success = true, message = "All notifications marked as read" });
    }

    [HttpPut("{id}/snooze")]
    public async Task<IActionResult> Snooze(int id, [FromQuery] int months = 1)
    {
        if (months != 1 && months != 3 && months != 6)
            return BadRequest(new { success = false, message = "Months must be 1, 3, or 6" });

        var notification = await db.Notifications.FindAsync(id);
        if (notification == null)
            return NotFound(new { success = false, message = "Notification not found" });

        if (notification.Type != "MfaReminder")
            return BadRequest(new { success = false, message = "Only MFA reminders can be snoozed" });

        notification.IsRead = true;

        var user = await userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();

        var snoozeUntil = DateTime.UtcNow.AddMonths(months);
        var snoozeKey = $"mfa-snooze-{user.Id}-{snoozeUntil:yyyy-MM-dd}";

        db.Notifications.Add(new Notification
        {
            Type = "MfaSnooze",
            Title = "MFA Snoozed",
            Message = $"MFA reminder snoozed until {snoozeUntil:MMM dd, yyyy}",
            IsRead = true,
            CreatedAt = DateTime.UtcNow,
            UserId = user.Id,
            GroupKey = snoozeKey
        });

        await db.SaveChangesAsync();

        return Ok(new { success = true, message = $"MFA reminder snoozed for {months} month(s)", snoozeUntil });
    }

    [HttpPut("{id}/unread")]
    public async Task<IActionResult> MarkUnread(int id)
    {
        var notification = await db.Notifications.FindAsync(id);
        if (notification == null)
            return NotFound(new { success = false, message = "Notification not found" });

        notification.IsRead = false;
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Notification marked as unread" });
    }

    [HttpPost("generate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Generate()
    {
        await notificationService.GenerateAllAsync(force: true);
        return Ok(new { success = true, message = "Notification generation triggered" });
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
