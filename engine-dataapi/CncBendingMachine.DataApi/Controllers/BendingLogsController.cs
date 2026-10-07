using CncBendingMachine.Core.Entities;
using CncBendingMachine.DataApi.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CncBendingMachine.DataApi.Controllers;

[ApiController]
[Route("api/bending-logs")]
public class BendingLogsController : ControllerBase
{
    private readonly ILogger<BendingLogsController> _logger;
    private readonly AppDbContext _db;

    public BendingLogsController(ILogger<BendingLogsController> logger, AppDbContext db)
    {
        _logger = logger;
        _db = db;
    }

    // POST /api/bending-logs/batch — Bending API'nin BendingLogFlushService bu endpoint'e batch push eder
    [HttpPost("batch")]
    public async Task<IActionResult> CreateBatch([FromBody] List<BendingLog> logs)
    {
        if (logs == null || logs.Count == 0)
            return Ok(new { inserted = 0 });

        foreach (var log in logs)
        {
            log.Id = 0;
            if (log.Timestamp == default)
                log.Timestamp = DateTime.UtcNow;
        }

        await _db.BendingLogs.AddRangeAsync(logs);
        await _db.SaveChangesAsync();
        return Ok(new { inserted = logs.Count });
    }

    // GET /api/bending-logs?jobId=42&category=Step&errorsOnly=true&limit=500
    [HttpGet]
    public async Task<IActionResult> Query(
        [FromQuery] int jobId,
        [FromQuery] string? category = null,
        [FromQuery] bool? errorsOnly = null,
        [FromQuery] int limit = 500)
    {
        if (jobId <= 0)
            return BadRequest(new { error = "jobId zorunlu" });

        var query = _db.BendingLogs.AsNoTracking()
            .Where(l => l.BendingJobId == jobId);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(l => l.Category == category);

        if (errorsOnly == true)
            query = query.Where(l => l.IsError);

        var logs = await query
            .OrderBy(l => l.Timestamp)
            .Take(limit)
            .ToListAsync();

        return Ok(new { jobId, count = logs.Count, logs });
    }
}
