using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;

namespace New_Dawn.Controllers;

[ApiController]
[Route("health")]
public class HealthController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet("db")]
    public async Task<IActionResult> CheckDbConnection()
    {
        try
        {
            var sampleValue = await dbContext.ConnectionProbes
                .AsNoTracking()
                .Select(x => x.Value)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                success = true,
                message = "Database connection successful.",
                sampleValue
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                success = false,
                message = "Database connection failed.",
                error = ex.Message
            });
        }
    }
}
