using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Models;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController(UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(page, 1);

        var query = userManager.Users.OrderBy(u => u.DisplayName);
        var totalCount = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<object>();
        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            items.Add(new
            {
                id = user.Id,
                email = user.Email,
                displayName = user.DisplayName,
                role = roles.FirstOrDefault() ?? "Donor",
                emailConfirmed = user.EmailConfirmed,
                has2fa = user.TwoFactorEnabled
            });
        }

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpPut("{userId}/role")]
    public async Task<IActionResult> UpdateRole(string userId, [FromBody] UpdateRoleRequest request)
    {
        var validRoles = new[] { "Admin", "Staff", "Donor" };
        if (!validRoles.Contains(request.Role))
            return BadRequest(new { success = false, message = "Invalid role. Must be Admin, Staff, or Donor." });

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound(new { success = false, message = "User not found" });

        var currentRoles = await userManager.GetRolesAsync(user);
        await userManager.RemoveFromRolesAsync(user, currentRoles);
        await userManager.AddToRoleAsync(user, request.Role);

        return Ok(new { success = true, message = $"User role updated to {request.Role}" });
    }
}

public class UpdateRoleRequest
{
    public string Role { get; set; } = string.Empty;
}
