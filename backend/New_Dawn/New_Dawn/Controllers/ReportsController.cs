using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;

namespace New_Dawn.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin,Staff")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    [HttpGet("dashboard-stats")]
    public async Task<IActionResult> DashboardStats()
    {
        var activeResidentsBySafehouse = await db.Residents
            .AsNoTracking()
            .Where(r => r.CaseStatus == "Active")
            .GroupBy(r => new { r.SafehouseId, r.Safehouse.Name })
            .Select(g => new
            {
                safehouseId = g.Key.SafehouseId,
                safehouseName = g.Key.Name,
                activeResidents = g.Count()
            })
            .ToListAsync();

        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var recentDonations = await db.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate >= thirtyDaysAgo)
            .GroupBy(d => 1)
            .Select(g => new
            {
                count = g.Count(),
                total = g.Sum(d => d.EstimatedValue)
            })
            .FirstOrDefaultAsync();

        var openInterventionPlans = await db.InterventionPlans
            .AsNoTracking()
            .CountAsync(ip => ip.Status == "Open" || ip.Status == "In Progress");

        return Ok(new
        {
            activeResidentsBySafehouse,
            recentDonations = recentDonations ?? new { count = 0, total = 0m },
            openInterventionPlans
        });
    }

    [HttpGet("donation-trends")]
    public async Task<IActionResult> DonationTrends([FromQuery] int months = 12)
    {
        months = Math.Clamp(months, 1, 60);
        var cutoff = DateTime.UtcNow.AddMonths(-months);

        var trends = await db.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate >= cutoff)
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                count = g.Count(),
                total = g.Sum(d => d.EstimatedValue)
            })
            .OrderBy(x => x.year)
            .ThenBy(x => x.month)
            .ToListAsync();

        return Ok(trends);
    }

    [HttpGet("education-progress")]
    public async Task<IActionResult> EducationProgress()
    {
        var progress = await db.EducationRecords
            .AsNoTracking()
            .Join(db.Residents, er => er.ResidentId, r => r.ResidentId, (er, r) => new { er, r })
            .Join(db.Safehouses, x => x.r.SafehouseId, s => s.SafehouseId, (x, s) => new { x.er, safehouseName = s.Name, safehouseId = s.SafehouseId })
            .GroupBy(x => new { x.safehouseId, x.safehouseName })
            .Select(g => new
            {
                safehouseId = g.Key.safehouseId,
                safehouseName = g.Key.safehouseName,
                avgProgressPercent = g.Average(x => x.er.ProgressPercent)
            })
            .ToListAsync();

        return Ok(progress);
    }

    [HttpGet("health-trends")]
    public async Task<IActionResult> HealthTrends()
    {
        var trends = await db.HealthWellbeingRecords
            .AsNoTracking()
            .GroupBy(hw => new { hw.RecordDate.Year, hw.RecordDate.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                month = g.Key.Month,
                avgGeneralHealth = g.Average(hw => hw.GeneralHealthScore),
                avgNutrition = g.Average(hw => hw.NutritionScore),
                avgSleepQuality = g.Average(hw => hw.SleepQualityScore),
                avgEnergyLevel = g.Average(hw => hw.EnergyLevelScore)
            })
            .OrderBy(x => x.year)
            .ThenBy(x => x.month)
            .ToListAsync();

        return Ok(trends);
    }

    [HttpGet("reintegration-rates")]
    public async Task<IActionResult> ReintegrationRates()
    {
        var rates = await db.Residents
            .AsNoTracking()
            .Where(r => r.ReintegrationStatus != null)
            .GroupBy(r => new { r.SafehouseId, r.Safehouse.Name })
            .Select(g => new
            {
                safehouseId = g.Key.SafehouseId,
                safehouseName = g.Key.Name,
                totalWithStatus = g.Count(),
                completed = g.Count(r => r.ReintegrationStatus == "Completed"),
                completionRate = g.Count() == 0 ? 0.0 :
                    (double)g.Count(r => r.ReintegrationStatus == "Completed") / g.Count() * 100
            })
            .ToListAsync();

        return Ok(rates);
    }

    [HttpGet("incident-summary")]
    public async Task<IActionResult> IncidentSummary()
    {
        var byType = await db.IncidentReports
            .AsNoTracking()
            .GroupBy(ir => ir.IncidentType)
            .Select(g => new
            {
                incidentType = g.Key,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        var bySeverity = await db.IncidentReports
            .AsNoTracking()
            .GroupBy(ir => ir.Severity)
            .Select(g => new
            {
                severity = g.Key,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        return Ok(new { byType, bySeverity });
    }
}
