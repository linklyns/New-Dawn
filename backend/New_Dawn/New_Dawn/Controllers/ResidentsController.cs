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
public class ResidentsController(AppDbContext db, Services.CsvPredictionService csv) : ControllerBase
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
        {
            var predictionRows = csv.GetRiskPredictions();
            var residentsWithPredictions = predictionRows
                .Select(r => ParseInt(r, "resident_id"))
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            var matchingPredictionResidents = predictionRows
                .Where(r => string.Equals(r.GetValueOrDefault("predicted_risk_level", ""), riskLevel, StringComparison.OrdinalIgnoreCase))
                .Select(r => ParseInt(r, "resident_id"))
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            query = query.Where(r =>
                matchingPredictionResidents.Contains(r.ResidentId) ||
                (!residentsWithPredictions.Contains(r.ResidentId) && r.CurrentRiskLevel == riskLevel));
        }
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.CaseControlNo.Contains(search) || r.InternalCode.Contains(search));

        var result = await query.ToPagedResultAsync(page, pageSize);
        ApplyPredictedRiskLevels(result.Items);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await db.Residents.AsNoTracking().FirstOrDefaultAsync(e => e.ResidentId == id);
        if (entity == null) return NotFound(new { success = false, message = "Not found" });
        ApplyPredictedRiskLevel(entity);
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

    private void ApplyPredictedRiskLevels(IEnumerable<Resident> residents)
    {
        var riskMap = csv.GetRiskPredictions()
            .Select(row => new
            {
                ResidentId = ParseInt(row, "resident_id"),
                RiskLevel = row.GetValueOrDefault("predicted_risk_level", "")
            })
            .Where(x => x.ResidentId > 0 && !string.IsNullOrWhiteSpace(x.RiskLevel))
            .GroupBy(x => x.ResidentId)
            .ToDictionary(g => g.Key, g => g.First().RiskLevel);

        foreach (var resident in residents)
            ApplyPredictedRiskLevel(resident, riskMap);
    }

    private void ApplyPredictedRiskLevel(Resident resident)
    {
        var riskMap = csv.GetRiskPredictions()
            .Select(row => new
            {
                ResidentId = ParseInt(row, "resident_id"),
                RiskLevel = row.GetValueOrDefault("predicted_risk_level", "")
            })
            .Where(x => x.ResidentId > 0 && !string.IsNullOrWhiteSpace(x.RiskLevel))
            .GroupBy(x => x.ResidentId)
            .ToDictionary(g => g.Key, g => g.First().RiskLevel);

        ApplyPredictedRiskLevel(resident, riskMap);
    }

    private static void ApplyPredictedRiskLevel(Resident resident, IReadOnlyDictionary<int, string> riskMap)
    {
        if (riskMap.TryGetValue(resident.ResidentId, out var predictedRiskLevel))
            resident.CurrentRiskLevel = predictedRiskLevel;
    }

    private static int ParseInt(Dictionary<string, string> row, string key)
    {
        var val = row.GetValueOrDefault(key, "");
        return int.TryParse(val, out var i)
            ? i
            : (double.TryParse(val, out var d) ? (int)d : 0);
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
